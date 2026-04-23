import { createHash } from "node:crypto"
import { dirname, join } from "node:path"
import { mkdirSync, writeFileSync } from "node:fs"
import { z } from "zod"
import type { OverviewData, FiscalYearStatus, SegmentDataStatus } from "../memory/overview"
import type { MiniData } from "../memory/mini"
import {
  generateSlug,
  runOneTheme,
  type ThemeRunResult,
} from "./research-idea"
import {
  buildNumericConditions,
  type NumericCondition,
} from "./screen"
import type { SearchMatchMode } from "./overview-search"

const screenSchema = z
  .object({
    per_lt: z.number().optional(),
    per_gt: z.number().optional(),
    pbr_lt: z.number().optional(),
    roe_gt: z.number().optional(),
    roe_lt: z.number().optional(),
    roa_gt: z.number().optional(),
    roic_gt: z.number().optional(),
    growth3y_gt: z.number().optional(),
    op_growth3y_gt: z.number().optional(),
    mcap_gt: z.number().optional(),
    mcap_lt: z.number().optional(),
    dy_gt: z.number().optional(),
    dy_lt: z.number().optional(),
  })
  .passthrough()
  .optional()

const fiscalEnum = z.enum(["current", "stale_2y+", "missing"])
const segEnum = z.enum(["complete", "partial", "unavailable"])

const commonThemeSchema = z.object({
  match_mode: z.enum(["any", "all"]).optional(),
  target_size: z.number().int().positive().optional(),
  hits_limit: z.number().int().positive().optional(),
  top_n: z.number().int().positive().optional(),
  include_industry: z.boolean().optional(),
  include_segments: z.boolean().optional(),
  include_null: z.boolean().optional(),
  include_stale: z.boolean().optional(),
  fiscal_status: z
    .union([z.literal("any"), z.array(fiscalEnum), fiscalEnum])
    .optional(),
  segment_status: z
    .union([z.literal("any"), z.array(segEnum), segEnum])
    .optional(),
  sector: z
    .union([z.array(z.string()), z.string()])
    .optional()
    .describe("sector33_code or comma list"),
  screen: screenSchema,
})

const themeEntrySchema = commonThemeSchema.extend({
  theme: z.string().min(1),
  keywords: z.array(z.string().min(1)).min(1),
  slug: z.string().optional(),
})

export const batchConfigSchema = z.object({
  defaults: commonThemeSchema.optional(),
  themes: z.array(themeEntrySchema).min(1),
})

export type BatchConfig = z.infer<typeof batchConfigSchema>
export type ThemeEntry = z.infer<typeof themeEntrySchema>
export type CommonThemeOptions = z.infer<typeof commonThemeSchema>

export function parseBatchConfig(json: unknown): BatchConfig {
  return batchConfigSchema.parse(json)
}

export type ResolvedThemeOptions = {
  theme: string
  keywords: string[]
  matchMode: SearchMatchMode
  includeIndustry: boolean
  includeSegmentNames: boolean
  fiscalStatusAllow: FiscalYearStatus[] | undefined
  segmentStatusAllow: SegmentDataStatus[] | undefined
  sectorCodes: string[] | undefined
  targetSize: number
  hitsLimit: number
  topN: number
  numericConditions: NumericCondition[]
  includeNull: boolean
  slugOverride: string | undefined
}

function normalizeFiscal(
  raw: CommonThemeOptions["fiscal_status"],
  includeStale: boolean | undefined,
): FiscalYearStatus[] | undefined {
  if (includeStale) return undefined
  if (raw === undefined) return ["current"]
  if (raw === "any") return undefined
  if (typeof raw === "string") return [raw as FiscalYearStatus]
  return raw
}

function normalizeSeg(
  raw: CommonThemeOptions["segment_status"],
): SegmentDataStatus[] | undefined {
  if (raw === undefined || raw === "any") return undefined
  if (typeof raw === "string") return [raw as SegmentDataStatus]
  return raw
}

function normalizeSector(
  raw: CommonThemeOptions["sector"],
): string[] | undefined {
  if (raw === undefined) return undefined
  if (Array.isArray(raw)) return raw
  return String(raw)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
}

function buildNumericFromScreen(
  screen: CommonThemeOptions["screen"] | undefined,
): NumericCondition[] {
  if (!screen) return []
  const flags: Record<string, number | undefined> = {}
  const mapping: Array<[keyof typeof screen & string, string]> = [
    ["per_lt", "per-lt"],
    ["per_gt", "per-gt"],
    ["pbr_lt", "pbr-lt"],
    ["roe_gt", "roe-gt"],
    ["roe_lt", "roe-lt"],
    ["roa_gt", "roa-gt"],
    ["roic_gt", "roic-gt"],
    ["growth3y_gt", "growth3y-gt"],
    ["op_growth3y_gt", "op-growth3y-gt"],
    ["mcap_gt", "mcap-gt"],
    ["mcap_lt", "mcap-lt"],
    ["dy_gt", "dy-gt"],
    ["dy_lt", "dy-lt"],
  ]
  for (const [src, dst] of mapping) {
    const v = (screen as Record<string, unknown>)[src]
    if (typeof v === "number" && Number.isFinite(v)) flags[dst] = v
  }
  return buildNumericConditions(flags)
}

export function resolveTheme(
  entry: ThemeEntry,
  defaults: CommonThemeOptions = {},
): ResolvedThemeOptions {
  const merged: CommonThemeOptions = { ...defaults, ...entry }
  const mergedScreen = { ...(defaults.screen ?? {}), ...(entry.screen ?? {}) }

  return {
    theme: entry.theme,
    keywords: entry.keywords,
    matchMode: (merged.match_mode ?? "any") as SearchMatchMode,
    includeIndustry: merged.include_industry ?? true,
    includeSegmentNames: merged.include_segments ?? true,
    fiscalStatusAllow: normalizeFiscal(merged.fiscal_status, merged.include_stale),
    segmentStatusAllow: normalizeSeg(merged.segment_status),
    sectorCodes: normalizeSector(merged.sector),
    targetSize: merged.target_size ?? 50,
    hitsLimit: merged.hits_limit ?? 200,
    topN: merged.top_n ?? 10,
    numericConditions: buildNumericFromScreen(mergedScreen),
    includeNull: merged.include_null ?? false,
    slugOverride: entry.slug,
  }
}

export type BatchSlugInput = {
  date?: Date
  hashSeed: string
  override?: string
}

const JST_OFFSET_MS = 9 * 60 * 60 * 1000

export function generateBatchSlug({
  date = new Date(),
  hashSeed,
  override,
}: BatchSlugInput): string {
  if (override && override.trim()) return override.trim()
  const jst = new Date(date.getTime() + JST_OFFSET_MS)
  const y = jst.getUTCFullYear()
  const m = String(jst.getUTCMonth() + 1).padStart(2, "0")
  const d = String(jst.getUTCDate()).padStart(2, "0")
  const hh = String(jst.getUTCHours()).padStart(2, "0")
  const mm = String(jst.getUTCMinutes()).padStart(2, "0")
  const hash = createHash("sha1").update(hashSeed).digest("hex").slice(0, 6)
  return `batch-${y}${m}${d}-${hh}${mm}-${hash}`
}

export type BatchRunInput = {
  config: BatchConfig
  outRoot: string
  batchSlug: string
  overwrite?: boolean
}

export type CrossThemeOverlap = {
  code: string
  themes: string[]
}

export function findOverlaps(results: ThemeRunResult[]): CrossThemeOverlap[] {
  const map = new Map<string, Set<string>>()
  for (const r of results) {
    for (const code of r.shortlist_codes) {
      if (!map.has(code)) map.set(code, new Set())
      map.get(code)!.add(r.theme)
    }
  }
  const overlaps: CrossThemeOverlap[] = []
  for (const [code, themes] of map) {
    if (themes.size > 1) {
      overlaps.push({ code, themes: Array.from(themes).sort() })
    }
  }
  overlaps.sort((a, b) => b.themes.length - a.themes.length || a.code.localeCompare(b.code))
  return overlaps
}

export type BatchManifest = {
  batch_slug: string
  generated_at: string
  overview_generated_at: string | null
  total_themes: number
  themes: Array<{
    theme: string
    slug: string
    idea_dir: string
    hits: number
    shortlist: number
    top_sector: { name: string; code: string; share: number } | null
  }>
  overlaps: CrossThemeOverlap[]
}

function fmtPct(share: number): string {
  return `${(share * 100).toFixed(1)}%`
}

export function fmtBatchSummaryMd(manifest: BatchManifest): string {
  const header = `| # | theme | hits | shortlist | top sector | slug |`
  const sep = `|---|-------|------|-----------|-----------|------|`
  const rows = manifest.themes.map((t, i) =>
    [
      `| ${i + 1}`,
      `| ${t.theme}`,
      `| ${t.hits}`,
      `| ${t.shortlist}`,
      `| ${t.top_sector ? `${t.top_sector.name} (${fmtPct(t.top_sector.share)})` : "—"}`,
      `| \`${t.slug}\` |`,
    ].join(" "),
  )

  let overlapSection = "## Cross-Theme Overlap\n\n"
  if (manifest.overlaps.length === 0) {
    overlapSection += "No stock appears in more than one shortlist.\n"
  } else {
    overlapSection += `${manifest.overlaps.length} stocks appear in multiple themes.\n\n`
    overlapSection += `| code | themes |\n`
    overlapSection += `|------|--------|\n`
    for (const o of manifest.overlaps) {
      overlapSection += `| ${o.code} | ${o.themes.join(", ")} |\n`
    }
  }

  const links = manifest.themes
    .map((t) => `- **${t.theme}** → \`${t.idea_dir}\``)
    .join("\n")

  return [
    `# Research Batch Summary`,
    "",
    `> Batch: \`${manifest.batch_slug}\` | Themes: ${manifest.total_themes} | Generated: ${manifest.generated_at}`,
    `> Overview data: \`${manifest.overview_generated_at ?? "—"}\``,
    "",
    `## Per-Theme Results`,
    "",
    header,
    sep,
    ...rows,
    "",
    overlapSection,
    "",
    `## Links`,
    "",
    links,
    "",
  ].join("\n")
}

function writeFileSafe(path: string, content: string) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, content)
}

export async function runBatch(
  input: BatchRunInput,
  overview: OverviewData,
  mini: MiniData,
): Promise<{ manifest: BatchManifest; batchDir: string }> {
  const batchDir = join(input.outRoot, "batch", input.batchSlug)
  mkdirSync(batchDir, { recursive: true })

  writeFileSafe(
    join(batchDir, "config.json"),
    JSON.stringify(input.config, null, 2),
  )

  const ideaRoot = join(input.outRoot, "idea")
  const defaults = input.config.defaults ?? {}

  const runs = input.config.themes.map((entry) => {
    const resolved = resolveTheme(entry, defaults)
    const slug = generateSlug({
      theme: resolved.theme,
      override: resolved.slugOverride,
    })
    const ideaDir = join(ideaRoot, slug)
    return { resolved, slug, ideaDir }
  })

  const results = await Promise.all(
    runs.map(({ resolved, slug, ideaDir }) =>
      Promise.resolve(
        runOneTheme(
          {
            theme: resolved.theme,
            keywords: resolved.keywords,
            matchMode: resolved.matchMode,
            includeIndustry: resolved.includeIndustry,
            includeSegmentNames: resolved.includeSegmentNames,
            fiscalStatusAllow: resolved.fiscalStatusAllow,
            segmentStatusAllow: resolved.segmentStatusAllow,
            sectorCodes: resolved.sectorCodes,
            targetSize: resolved.targetSize,
            hitsLimit: resolved.hitsLimit,
            topN: resolved.topN,
            numericConditions: resolved.numericConditions,
            includeNull: resolved.includeNull,
            ideaDir,
            slug,
          },
          overview,
          mini,
        ),
      ),
    ),
  )

  const overlaps = findOverlaps(results)

  const manifest: BatchManifest = {
    batch_slug: input.batchSlug,
    generated_at: new Date().toISOString(),
    overview_generated_at: overview.meta?.generated_at ?? null,
    total_themes: results.length,
    themes: results.map((r) => ({
      theme: r.theme,
      slug: r.slug,
      idea_dir: r.idea_dir,
      hits: r.counts.hits,
      shortlist: r.counts.shortlist,
      top_sector: r.top_sector
        ? {
            name: r.top_sector.sector_name,
            code: r.top_sector.sector_code,
            share: r.top_sector.share,
          }
        : null,
    })),
    overlaps,
  }

  writeFileSafe(join(batchDir, "manifest.json"), JSON.stringify(manifest, null, 2))
  writeFileSafe(join(batchDir, "summary.md"), fmtBatchSummaryMd(manifest))

  return { manifest, batchDir }
}
