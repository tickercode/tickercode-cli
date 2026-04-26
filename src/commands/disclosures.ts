import { defineCommand } from "citty"
import pc from "picocolors"
import { postJson } from "../lib/api-client"
import { unwrap } from "../lib/format"

const financialCommand = defineCommand({
  meta: {
    name: "financial",
    description:
      "Fetch structured forecast revision (revised + prior + delta + actual_ytd) for a disclosure.",
  },
  args: {
    "doc-id": {
      type: "positional",
      description: "Disclosure ID (TDNet 18-digit e.g. 140120260424509954, or JPX 14-digit e.g. 20260424509954)",
      required: true,
    },
    format: {
      type: "string",
      description: "Output format: json (Phase 1 only)",
      default: "json",
      alias: "f",
    },
  },
  async run({ args }) {
    const docId = String(args["doc-id"]).trim()
    if (!/^\d{14,18}$/.test(docId)) {
      process.stderr.write(
        pc.red(`Invalid doc-id: ${docId} (expected 14-18 digits)\n`),
      )
      process.exit(1)
    }
    const format = String(args.format)
    if (format !== "json") {
      process.stderr.write(
        pc.yellow(`--format json only is supported (got: ${format})\n`),
      )
      process.exit(1)
    }

    const res = await postJson<unknown>(
      "/api/disclosure/financial",
      { disclosure_id: docId },
    )
    const data = unwrap(res)
    process.stdout.write(`${JSON.stringify(data, null, 2)}\n`)
  },
})

export const VALID_DOC_TYPES = [
  "earnings",
  "forecast",
  "dividend",
  "buyback",
  "presentation",
  "plan",
  "tdnet_other",
] as const

export type DocType = typeof VALID_DOC_TYPES[number]

type SearchResponse = {
  items: Record<string, unknown>[]
  total: number
}

function parseIntOr(v: unknown, fallback: number): number {
  const n = Number.parseInt(String(v ?? ""), 10)
  return Number.isFinite(n) ? n : fallback
}

export const disclosuresCommand = defineCommand({
  meta: {
    name: "disclosures",
    description:
      "Fetch market-wide TDnet disclosures. Sub: financial (forecast revision diff).",
  },
  subCommands: {
    financial: financialCommand,
  },
  args: {
    days: {
      type: "string",
      description: "Days to look back (default: 7, max: 90)",
      default: "7",
    },
    limit: {
      type: "string",
      description: "Max records (default: 100, 0 = no limit / up to 500)",
      default: "100",
    },
    "doc-type": {
      type: "string",
      description: `Filter by canonical doc type (${VALID_DOC_TYPES.join(" | ")})`,
    },
    code: {
      type: "string",
      description: "Filter by ticker code (4 or 5 digits, e.g. 7203 or 72030)",
    },
    format: {
      type: "string",
      description: "Output format (Phase 1: json only)",
      default: "json",
      alias: "f",
    },
  },
  async run({ args }) {
    const days = Math.max(1, Math.min(parseIntOr(args.days, 7), 90))
    const rawLimit = parseIntOr(args.limit, 100)
    const limit = rawLimit === 0 ? 500 : Math.max(1, Math.min(rawLimit, 500))
    const docType = args["doc-type"] ? String(args["doc-type"]) : undefined
    const code = args.code ? String(args.code).trim() : undefined
    const format = String(args.format)

    if (code && !/^\d{4,5}$/.test(code)) {
      process.stderr.write(pc.red(`Invalid --code: ${code} (expected 4 or 5 digits)\n`))
      process.exit(1)
    }

    if (docType && !(VALID_DOC_TYPES as readonly string[]).includes(docType)) {
      process.stderr.write(pc.red(`Invalid --doc-type: ${docType}\n`))
      process.stderr.write(pc.dim(`Valid: ${VALID_DOC_TYPES.join(", ")}\n`))
      process.exit(1)
    }

    if (format !== "json") {
      process.stderr.write(
        pc.yellow(
          `Phase 1 では --format json のみ対応しています (--format=${format} は Phase 2 予定)\n`,
        ),
      )
      process.exit(1)
    }

    const body: Record<string, unknown> = { days, limit }
    if (docType) body.doc_types = [docType]
    if (code) body.code = code

    const res = await postJson<unknown>("/api/disclosure/search", body)
    const data = unwrap(res) as SearchResponse | null
    const items = data?.items ?? []

    process.stdout.write(`${JSON.stringify(items, null, 2)}\n`)
  },
})
