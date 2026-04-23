import { defineCommand } from "citty"
import pc from "picocolors"
import {
  ensureOverviewLoaded,
  readOverviewMeta,
  syncOverview,
} from "../memory/overview"
import {
  parseKeywordsArg,
  searchOverview,
  type SearchMatchMode,
} from "../lib/overview-search"
import { formatOutput, type Format } from "../lib/format"
import type { FiscalYearStatus, SegmentDataStatus } from "../memory/overview"

const DEFAULT_COLUMNS = [
  "display_code",
  "company_name",
  "sector33_code_name",
  "fiscal_year_status",
  "segment_data_status",
  "matched_keywords",
  "matched_fields",
]

function parseStatusList<T extends string>(
  raw: string | undefined,
  allValue: string,
  allowed: readonly T[],
): T[] | undefined {
  if (!raw) return undefined
  if (raw === allValue) return undefined
  const parts = raw.split(",").map((s) => s.trim()).filter(Boolean) as T[]
  for (const p of parts) {
    if (!allowed.includes(p)) {
      throw new Error(`Invalid status value: ${p}. Allowed: ${allowed.join(", ")}, ${allValue}`)
    }
  }
  return parts
}

function normalizeHitsForOutput(
  hits: ReturnType<typeof searchOverview>,
): Record<string, unknown>[] {
  return hits.map((h) => ({
    ...h,
    matched_keywords: h.matched_keywords.join("|"),
    matched_fields: h.matched_fields.join("|"),
  }))
}

const syncCmd = defineCommand({
  meta: {
    name: "sync",
    description: "Download overview.json (3,753 stocks narrative+segment) from R2 CDN",
  },
  args: {
    force: { type: "boolean", description: "Ignore TTL and re-fetch" },
  },
  async run({ args }) {
    const meta = await syncOverview(Boolean(args.force))
    process.stdout.write(
      `${pc.green("✓")} overview.json  ${pc.cyan(String(meta.items_count))} items, ${pc.dim(
        `${(meta.bytes / 1024 / 1024).toFixed(2)} MB`,
      )}  ${pc.dim(`generated_at=${meta.generated_at ?? "—"}`)}\n`,
    )
  },
})

const statusCmd = defineCommand({
  meta: { name: "status", description: "Show overview.json cache status" },
  async run() {
    const meta = readOverviewMeta()
    if (!meta) {
      process.stdout.write(
        pc.gray("(overview.json not cached — run `tc overview sync`)\n"),
      )
      return
    }
    process.stdout.write(JSON.stringify(meta, null, 2) + "\n")
  },
})

const FISCAL_STATUSES: readonly FiscalYearStatus[] = ["current", "stale_2y+", "missing"]
const SEG_STATUSES: readonly SegmentDataStatus[] = ["complete", "partial", "unavailable"]

const searchCmd = defineCommand({
  meta: {
    name: "search",
    description:
      "Search overview.json narratives + segments by keywords. AND/OR, status filters, sector filter.",
  },
  args: {
    keywords: {
      type: "string",
      description: "Comma-separated keywords (e.g. 'AI,機械学習,LLM')",
      required: true,
    },
    match: {
      type: "string",
      description: "Match mode: any (OR) | all (AND). Default: any",
      default: "any",
    },
    "no-industry": {
      type: "boolean",
      description: "Exclude industry field from search (default: include)",
    },
    "no-segments": {
      type: "boolean",
      description: "Exclude segment names from search (default: include)",
    },
    "fiscal-status": {
      type: "string",
      description:
        "Allowed fiscal_year_status (comma list): current,stale_2y+,missing OR 'any'. Default: current",
      default: "current",
    },
    "segment-status": {
      type: "string",
      description:
        "Allowed segment_data_status (comma list): complete,partial,unavailable OR 'any'. Default: any",
      default: "any",
    },
    sector: { type: "string", description: "sector33_code filter (comma list OK)" },
    limit: { type: "string", description: "Max hits (default no limit)" },
    columns: {
      type: "string",
      description: "Comma-separated column names (pretty / md only)",
    },
    format: {
      type: "string",
      description: "Output format: pretty | json | md",
      default: "pretty",
      alias: "f",
    },
  },
  async run({ args }) {
    const overview = await ensureOverviewLoaded()

    const keywords = parseKeywordsArg(String(args.keywords))
    if (keywords.length === 0) {
      process.stderr.write(pc.red("--keywords is required (comma-separated)\n"))
      process.exit(1)
    }

    const matchMode = String(args.match) as SearchMatchMode
    if (matchMode !== "any" && matchMode !== "all") {
      process.stderr.write(pc.red("--match must be 'any' or 'all'\n"))
      process.exit(1)
    }

    const fiscalStatusAllow = parseStatusList(
      String(args["fiscal-status"]),
      "any",
      FISCAL_STATUSES,
    )
    const segmentStatusAllow = parseStatusList(
      String(args["segment-status"]),
      "any",
      SEG_STATUSES,
    )

    const sectorCodes = args.sector
      ? String(args.sector).split(",").map((s) => s.trim()).filter(Boolean)
      : undefined

    const limit = args.limit ? Number.parseInt(String(args.limit), 10) : undefined

    const hits = searchOverview(overview.items, {
      keywords,
      matchMode,
      includeIndustry: !args["no-industry"],
      includeSegmentNames: !args["no-segments"],
      fiscalStatusAllow,
      segmentStatusAllow,
      sectorCodes,
      limit,
    })

    const format = String(args.format) as Format

    if (format === "json") {
      process.stdout.write(
        JSON.stringify({ count: hits.length, items: hits }, null, 2) + "\n",
      )
      return
    }

    if (hits.length === 0) {
      process.stdout.write(pc.yellow("No matches.\n"))
      return
    }

    const columns = args.columns
      ? String(args.columns).split(",").map((s) => s.trim()).filter(Boolean)
      : DEFAULT_COLUMNS

    formatOutput(normalizeHitsForOutput(hits), {
      kind: "stock-list",
      format,
      columns,
      title: `tc overview search "${keywords.join(" " + matchMode.toUpperCase() + " ")}"`,
    })
  },
})

export const overviewCommand = defineCommand({
  meta: {
    name: "overview",
    description:
      "Cross-stock overview bulk dump: sync R2 CDN + keyword search over narratives/segments",
  },
  subCommands: {
    sync: syncCmd,
    status: statusCmd,
    search: searchCmd,
  },
})
