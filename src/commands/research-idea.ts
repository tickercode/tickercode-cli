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
  fmtKeywordsMd,
  fmtHitsMd,
  fmtShortlistMd,
  fmtFinalMdSkeleton,
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
  hits_limit: number
  top_n: number
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

function parseFiscalStatus(raw: unknown, includeStale: boolean): {
  allow: FiscalYearStatus[] | undefined
  display: FiscalYearStatus[] | "all"
} {
  if (includeStale) return { allow: undefined, display: "all" }
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
    "include-stale": {
      type: "boolean",
      description:
        "Shortcut to include stale_2y+ fiscal years (overrides --fiscal-status)",
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
    "hits-limit": {
      type: "string",
      description: "Max rows to write in 02-hits.md (default 200). hits.json always has all.",
      default: "200",
    },
    "top-n": {
      type: "string",
      description: "Number of deep-dive candidates listed in final.md (default 10)",
      default: "10",
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
      Boolean(args["include-stale"]),
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
    const hitsLimit = Number.parseInt(String(args["hits-limit"]), 10) || 200
    const topN = Number.parseInt(String(args["top-n"]), 10) || 10
    const shortlist = buildShortlist({
      hits,
      miniByCode,
      numericConditions,
      includeNull: Boolean(args["include-null"]),
      targetSize,
    })

    process.stdout.write(`${pc.dim("[4/5] Writing artifacts…")}\n`)
    writeFile(
      join(ideaDir, "01-keywords.md"),
      fmtKeywordsMd(theme, keywords, matchMode),
    )
    writeFile(join(ideaDir, "02-hits.md"), fmtHitsMd(theme, hits, hitsLimit))
    writeFile(
      join(ideaDir, "hits.json"),
      JSON.stringify({ count: hits.length, items: hits }, null, 2),
    )
    writeFile(
      join(ideaDir, "03-shortlist.md"),
      fmtShortlistMd(
        theme,
        shortlist,
        numericConditions.map((c) => ({ field: c.field, op: c.op, value: c.value })),
      ),
    )
    writeFile(
      join(ideaDir, "shortlist.json"),
      JSON.stringify({ count: shortlist.length, items: shortlist }, null, 2),
    )
    writeFile(
      join(ideaDir, "final.md"),
      fmtFinalMdSkeleton(
        theme,
        slug,
        { hits: hits.length, shortlist: shortlist.length },
        shortlist,
        topN,
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
      hits_limit: hitsLimit,
      top_n: topN,
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
        `  hits:      ${pc.cyan(String(hits.length))}${hits.length > hitsLimit ? pc.dim(` (02-hits.md shows first ${hitsLimit})`) : ""}\n` +
        `  shortlist: ${pc.cyan(String(shortlist.length))}\n` +
        `  top-n:     ${pc.cyan(String(topN))}\n` +
        `  output:    ${pc.dim(ideaDir)}\n`,
    )
  },
})
