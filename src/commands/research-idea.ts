import { defineCommand } from "citty"
import pc from "picocolors"
import { existsSync, mkdirSync, writeFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { ensureOverviewLoaded } from "../memory/overview"
import { ensureMiniLoaded, type StockItem } from "../memory/mini"
import {
  parseKeywordsArg,
  searchOverview,
  type SearchMatchMode,
} from "../lib/overview-search"
import {
  buildShortlist,
  generateSlug,
  type ShortlistItem,
} from "../lib/research-idea"
import { buildNumericConditions } from "../lib/screen"
import type { FiscalYearStatus, SegmentDataStatus } from "../memory/overview"

type RunMeta = {
  theme: string
  slug: string
  keywords: string[]
  match_mode: SearchMatchMode
  include_industry: boolean
  include_segments: boolean
  fiscal_status_allow: FiscalYearStatus[] | "all"
  segment_status_allow: SegmentDataStatus[] | "all"
  sector_codes: string[] | null
  target_size: number
  screen_conditions: Array<{ field: string; op: string; value: number }>
  out_dir: string
  generated_at: string
  counts: { hits: number; shortlist: number }
  data_as_of: { overview_generated_at: string | null }
}

function parseNum(v: unknown): number | undefined {
  if (v === undefined || v === null || v === "") return undefined
  const n = Number.parseFloat(String(v))
  return Number.isFinite(n) ? n : undefined
}

function parseCommaList(v: unknown): string[] | undefined {
  if (v === undefined || v === null) return undefined
  const s = String(v).trim()
  if (!s) return undefined
  return s.split(",").map((x) => x.trim()).filter(Boolean)
}

function parseFiscalStatus(raw: unknown): {
  allow: FiscalYearStatus[] | undefined
  display: FiscalYearStatus[] | "all"
} {
  const parts = parseCommaList(raw)
  if (!parts || parts.includes("any")) return { allow: undefined, display: "all" }
  return {
    allow: parts as FiscalYearStatus[],
    display: parts as FiscalYearStatus[],
  }
}

function parseSegmentStatus(raw: unknown): {
  allow: SegmentDataStatus[] | undefined
  display: SegmentDataStatus[] | "all"
} {
  const parts = parseCommaList(raw)
  if (!parts || parts.includes("any")) return { allow: undefined, display: "all" }
  return {
    allow: parts as SegmentDataStatus[],
    display: parts as SegmentDataStatus[],
  }
}

function indexMiniByCode(items: StockItem[]): Map<string, StockItem> {
  const map = new Map<string, StockItem>()
  for (const s of items) {
    if (s.display_code) map.set(s.display_code, s)
    if (s.code) map.set(s.code, s)
  }
  return map
}

function writeFile(path: string, content: string) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, content)
}

function fmtKeywordsMd(theme: string, keywords: string[], matchMode: SearchMatchMode): string {
  return [
    `# 01 · Keywords`,
    "",
    `**Theme**: ${theme}`,
    "",
    `**Match mode**: \`${matchMode}\``,
    "",
    `**Keywords**:`,
    "",
    keywords.map((k) => `- \`${k}\``).join("\n"),
    "",
  ].join("\n")
}

function fmtHitsMd(
  theme: string,
  hits: ReturnType<typeof searchOverview>,
): string {
  const header = `| # | code | company | sector | fiscal | seg | matched | fields |`
  const sep = `|---|------|---------|--------|--------|-----|---------|--------|`
  const rows = hits.map((h, i) =>
    [
      `| ${i + 1}`,
      `| ${h.display_code}`,
      `| ${h.company_name}`,
      `| ${h.sector33_code_name}`,
      `| ${h.fiscal_year_status}`,
      `| ${h.segment_data_status}`,
      `| ${h.matched_keywords.join("、")}`,
      `| ${h.matched_fields.join(", ")} |`,
    ].join(" "),
  )
  return [
    `# 02 · Keyword Hits (${hits.length})`,
    "",
    `Theme: ${theme}`,
    "",
    header,
    sep,
    ...rows,
    "",
  ].join("\n")
}

function fmtNumeric(v: number | null, digits = 2): string {
  if (v === null || !Number.isFinite(v)) return "—"
  return v.toFixed(digits)
}

function fmtYen(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return "—"
  if (v >= 1e12) return `${(v / 1e12).toFixed(2)}兆`
  if (v >= 1e8) return `${(v / 1e8).toFixed(1)}億`
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}百万`
  return String(v)
}

function fmtShortlistMd(
  theme: string,
  shortlist: ShortlistItem[],
  screenConditions: Array<{ field: string; op: string; value: number }>,
): string {
  const cond =
    screenConditions.length > 0
      ? `Filters: ${screenConditions
          .map((c) => `\`${c.field} ${c.op} ${c.value}\``)
          .join(" AND ")}`
      : "Filters: (none)"
  const header =
    `| # | code | company | sector | mcap | fwd PER | PBR | fwd ROE | 3y sales | matched |`
  const sep = `|---|------|---------|--------|------|---------|-----|---------|----------|---------|`
  const rows = shortlist.map((s, i) =>
    [
      `| ${i + 1}`,
      `| ${s.display_code}`,
      `| ${s.company_name}`,
      `| ${s.sector33_code_name}`,
      `| ${fmtYen(s.market_capitalization)}`,
      `| ${fmtNumeric(s.i_forward_per)}`,
      `| ${fmtNumeric(s.i_pbr)}`,
      `| ${fmtNumeric(s.i_forward_roe)}`,
      `| ${fmtNumeric(s.yoy3y_sales)}`,
      `| ${s.matched_keywords.join("、")} |`,
    ].join(" "),
  )
  return [
    `# 03 · Shortlist (${shortlist.length})`,
    "",
    `Theme: ${theme}`,
    "",
    cond,
    "",
    header,
    sep,
    ...rows,
    "",
  ].join("\n")
}

function fmtFinalMdSkeleton(
  theme: string,
  slug: string,
  counts: { hits: number; shortlist: number },
  shortlist: ShortlistItem[],
): string {
  const codeList = shortlist
    .slice(0, 10)
    .map((s) => `- [ ] ${s.display_code} ${s.company_name}`)
    .join("\n")
  return [
    `# ${theme} — 候補分析レポート`,
    "",
    `> Slug: \`${slug}\`  |  Hits: ${counts.hits}  |  Shortlist: ${counts.shortlist}  |  Generated: ${new Date().toISOString()}`,
    "",
    `## テーマの全体像`,
    "",
    `<!-- Agent: このテーマが今なぜ重要か、背景と前提を 2-3 段落で書く -->`,
    "",
    `## 選定フロー`,
    "",
    `1. Keyword: 02-hits.md (${counts.hits} 社)`,
    `2. Shortlist: 03-shortlist.md (${counts.shortlist} 社)`,
    `3. 深堀り候補 (top 10 予定):`,
    "",
    codeList,
    "",
    `## 最終候補 top N`,
    "",
    `<!-- Agent: shortlist から深堀りした上で、投資テーマに純粋に当たる企業を選出し、1 段落/社 で書く -->`,
    "",
    `## スコア表`,
    "",
    `<!-- Agent: 4 軸 (テーマ整合性 / 成長性 / バリュエーション / 収益性) で 5 点満点採点 -->`,
    "",
    `## 勝ち / 負けシナリオ`,
    "",
    `<!-- Agent: テーマが追い風/逆風になるケース別に、候補群の期待値を描く -->`,
    "",
    `## リスク要因`,
    "",
    `<!-- Agent: セクター共通の逆風、個別企業の脆弱性 -->`,
    "",
    `## データソース / 基準日`,
    "",
    `- overview.json: \`cdn.ticker-code.com/cache/api/full/list/overview.json\``,
    `- mini.json: 直近指標 (i_forward_*, yoy3y_*)`,
    `- 深堀り: \`tc memory fetch\` + \`tc stock\` / \`tc financial\``,
    "",
  ].join("\n")
}

export const researchIdeaCommand = defineCommand({
  meta: {
    name: "research-idea",
    description:
      "Theme-driven candidate discovery: keyword search → shortlist → report skeleton. CLI orchestrator (Agent provides keywords).",
  },
  args: {
    theme: {
      type: "positional",
      description: "Free-form investment theme (e.g. 'AI 時代の受益者')",
      required: true,
    },
    keywords: {
      type: "string",
      description: "Comma-separated keywords (e.g. 'AI,機械学習,LLM')",
      required: true,
    },
    match: { type: "string", description: "any | all (default any)", default: "any" },
    "no-industry": {
      type: "boolean",
      description: "Exclude industry field from search",
    },
    "no-segments": {
      type: "boolean",
      description: "Exclude segment names from search",
    },
    "fiscal-status": {
      type: "string",
      description:
        "Allowed fiscal_year_status comma list or 'any'. Default: current",
      default: "current",
    },
    "segment-status": {
      type: "string",
      description:
        "Allowed segment_data_status comma list or 'any'. Default: any",
      default: "any",
    },
    sector: { type: "string", description: "sector33_code filter (comma list)" },
    "target-size": {
      type: "string",
      description: "Max shortlist size (default 50)",
      default: "50",
    },
    "screen-per-lt": { type: "string" },
    "screen-per-gt": { type: "string" },
    "screen-pbr-lt": { type: "string" },
    "screen-roe-gt": { type: "string" },
    "screen-roe-lt": { type: "string" },
    "screen-growth3y-gt": { type: "string" },
    "screen-op-growth3y-gt": { type: "string" },
    "screen-mcap-gt": { type: "string" },
    "screen-mcap-lt": { type: "string" },
    "screen-dy-gt": { type: "string" },
    "include-null": {
      type: "boolean",
      description: "Include null values in screen filters",
    },
    slug: { type: "string", description: "Override auto-generated slug" },
    out: {
      type: "string",
      description: "Output root (default: research/idea)",
      default: "research/idea",
    },
    overwrite: {
      type: "boolean",
      description: "Allow overwriting an existing slug directory",
    },
  },
  async run({ args }) {
    const theme = String(args.theme).trim()
    if (!theme) {
      process.stderr.write(pc.red("<theme> is required\n"))
      process.exit(1)
    }

    const keywords = parseKeywordsArg(String(args.keywords))
    if (keywords.length === 0) {
      process.stderr.write(pc.red("--keywords is required\n"))
      process.exit(1)
    }

    const matchMode = String(args.match) as SearchMatchMode
    if (matchMode !== "any" && matchMode !== "all") {
      process.stderr.write(pc.red("--match must be 'any' or 'all'\n"))
      process.exit(1)
    }

    const slug = generateSlug({ theme, override: args.slug ? String(args.slug) : undefined })
    const outRoot = resolve(String(args.out))
    const ideaDir = join(outRoot, slug)
    if (existsSync(ideaDir) && !args.overwrite) {
      process.stderr.write(
        pc.red(
          `Directory already exists: ${ideaDir}\n` +
            `Use --overwrite to replace, or --slug <new-name> to make a fresh one.\n`,
        ),
      )
      process.exit(1)
    }
    mkdirSync(ideaDir, { recursive: true })

    const { allow: fiscalAllow, display: fiscalDisplay } = parseFiscalStatus(
      args["fiscal-status"],
    )
    const { allow: segmentAllow, display: segmentDisplay } = parseSegmentStatus(
      args["segment-status"],
    )
    const sectorCodes = parseCommaList(args.sector)

    process.stdout.write(
      `${pc.dim("[1/5] Loading overview.json + mini.json…")}\n`,
    )
    const [overview, mini] = await Promise.all([
      ensureOverviewLoaded(),
      ensureMiniLoaded(),
    ])

    process.stdout.write(`${pc.dim("[2/5] Keyword search…")}\n`)
    const hits = searchOverview(overview.items, {
      keywords,
      matchMode,
      includeIndustry: !args["no-industry"],
      includeSegmentNames: !args["no-segments"],
      fiscalStatusAllow: fiscalAllow,
      segmentStatusAllow: segmentAllow,
      sectorCodes: sectorCodes ?? undefined,
    })

    process.stdout.write(`${pc.dim("[3/5] Shortlist + screen filters…")}\n`)
    const miniByCode = indexMiniByCode(mini.items)
    const numericFlags: Record<string, number | undefined> = {
      "per-lt": parseNum(args["screen-per-lt"]),
      "per-gt": parseNum(args["screen-per-gt"]),
      "pbr-lt": parseNum(args["screen-pbr-lt"]),
      "roe-gt": parseNum(args["screen-roe-gt"]),
      "roe-lt": parseNum(args["screen-roe-lt"]),
      "growth3y-gt": parseNum(args["screen-growth3y-gt"]),
      "op-growth3y-gt": parseNum(args["screen-op-growth3y-gt"]),
      "mcap-gt": parseNum(args["screen-mcap-gt"]),
      "mcap-lt": parseNum(args["screen-mcap-lt"]),
      "dy-gt": parseNum(args["screen-dy-gt"]),
    }
    const numericConditions = buildNumericConditions(numericFlags)
    const targetSize = Number.parseInt(String(args["target-size"]), 10) || 50
    const shortlist = buildShortlist({
      hits,
      miniByCode,
      numericConditions,
      includeNull: Boolean(args["include-null"]),
      targetSize,
    })

    process.stdout.write(`${pc.dim("[4/5] Writing artifacts…")}\n`)
    writeFile(join(ideaDir, "01-keywords.md"), fmtKeywordsMd(theme, keywords, matchMode))
    writeFile(join(ideaDir, "02-hits.md"), fmtHitsMd(theme, hits))
    writeFile(
      join(ideaDir, "03-shortlist.md"),
      fmtShortlistMd(
        theme,
        shortlist,
        numericConditions.map((c) => ({ field: c.field, op: c.op, value: c.value })),
      ),
    )
    writeFile(
      join(ideaDir, "final.md"),
      fmtFinalMdSkeleton(
        theme,
        slug,
        { hits: hits.length, shortlist: shortlist.length },
        shortlist,
      ),
    )

    const meta: RunMeta = {
      theme,
      slug,
      keywords,
      match_mode: matchMode,
      include_industry: !args["no-industry"],
      include_segments: !args["no-segments"],
      fiscal_status_allow: fiscalDisplay,
      segment_status_allow: segmentDisplay,
      sector_codes: sectorCodes ?? null,
      target_size: targetSize,
      screen_conditions: numericConditions.map((c) => ({
        field: c.field,
        op: c.op,
        value: c.value,
      })),
      out_dir: ideaDir,
      generated_at: new Date().toISOString(),
      counts: { hits: hits.length, shortlist: shortlist.length },
      data_as_of: { overview_generated_at: overview.meta?.generated_at ?? null },
    }
    writeFile(join(ideaDir, "meta.json"), JSON.stringify(meta, null, 2))

    process.stdout.write(`${pc.dim("[5/5] Done.")}\n\n`)
    process.stdout.write(
      `${pc.green("✓")} research-idea  ${pc.cyan(slug)}\n` +
        `  theme:     ${theme}\n` +
        `  keywords:  ${keywords.join(", ")} (${matchMode})\n` +
        `  hits:      ${pc.cyan(String(hits.length))}\n` +
        `  shortlist: ${pc.cyan(String(shortlist.length))}\n` +
        `  output:    ${pc.dim(ideaDir)}\n`,
    )
  },
})
