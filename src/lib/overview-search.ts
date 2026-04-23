import type {
  FiscalYearStatus,
  OverviewItem,
  SegmentDataStatus,
} from "../memory/overview"

export type SearchMatchMode = "any" | "all"

export type SearchOptions = {
  keywords: string[]
  matchMode?: SearchMatchMode
  includeIndustry?: boolean
  includeSegmentNames?: boolean
  fiscalStatusAllow?: FiscalYearStatus[]
  segmentStatusAllow?: SegmentDataStatus[]
  sectorCodes?: string[]
  caseSensitive?: boolean
  limit?: number
}

export type SearchHit = {
  code: string
  display_code: string
  company_name: string
  sector33_code: string
  sector33_code_name: string
  market_code_name: string
  fiscal_year: string | null
  fiscal_year_status: FiscalYearStatus
  segment_data_status: SegmentDataStatus
  analysis_as_of: string | null
  matched_keywords: string[]
  matched_fields: string[]
}

type FieldSource = { field: string; text: string }

function collectFields(
  item: OverviewItem,
  includeIndustry: boolean,
  includeSegmentNames: boolean,
): FieldSource[] {
  const out: FieldSource[] = []
  if (item.narratives) {
    out.push({ field: "summary", text: item.narratives.summary })
    if (includeIndustry) {
      out.push({ field: "industry", text: item.narratives.industry })
    }
    out.push({
      field: "strengths",
      text: item.narratives.strengths.join(" "),
    })
    out.push({
      field: "weaknesses",
      text: item.narratives.weaknesses.join(" "),
    })
  }
  if (includeSegmentNames && item.segments.length > 0) {
    out.push({
      field: "segments",
      text: item.segments.map((s) => s.name).join(" "),
    })
  }
  return out
}

function matches(needle: string, haystack: string, caseSensitive: boolean): boolean {
  if (caseSensitive) return haystack.includes(needle)
  return haystack.toLowerCase().includes(needle.toLowerCase())
}

export function searchOverview(
  items: OverviewItem[],
  opts: SearchOptions,
): SearchHit[] {
  const {
    keywords,
    matchMode = "any",
    includeIndustry = true,
    includeSegmentNames = true,
    fiscalStatusAllow,
    segmentStatusAllow,
    sectorCodes,
    caseSensitive = false,
    limit,
  } = opts

  if (keywords.length === 0) return []
  const normalizedKeywords = keywords.map((k) => k.trim()).filter(Boolean)
  if (normalizedKeywords.length === 0) return []

  const hits: SearchHit[] = []
  for (const item of items) {
    if (
      fiscalStatusAllow &&
      !fiscalStatusAllow.includes(item.fiscal_year_status)
    ) {
      continue
    }
    if (
      segmentStatusAllow &&
      !segmentStatusAllow.includes(item.segment_data_status)
    ) {
      continue
    }
    if (sectorCodes && !sectorCodes.includes(item.sector33_code)) {
      continue
    }

    const sources = collectFields(item, includeIndustry, includeSegmentNames)
    if (sources.length === 0) continue

    const matchedKeywords = new Set<string>()
    const matchedFields = new Set<string>()
    for (const kw of normalizedKeywords) {
      for (const src of sources) {
        if (matches(kw, src.text, caseSensitive)) {
          matchedKeywords.add(kw)
          matchedFields.add(src.field)
        }
      }
    }

    if (matchMode === "all" && matchedKeywords.size !== normalizedKeywords.length) {
      continue
    }
    if (matchedKeywords.size === 0) continue

    hits.push({
      code: item.code,
      display_code: item.display_code,
      company_name: item.company_name,
      sector33_code: item.sector33_code,
      sector33_code_name: item.sector33_code_name,
      market_code_name: item.market_code_name,
      fiscal_year: item.fiscal_year,
      fiscal_year_status: item.fiscal_year_status,
      segment_data_status: item.segment_data_status,
      analysis_as_of: item.analysis_as_of,
      matched_keywords: Array.from(matchedKeywords),
      matched_fields: Array.from(matchedFields),
    })
    if (limit && hits.length >= limit) break
  }
  return hits
}

export function parseKeywordsArg(arg: string | undefined): string[] {
  if (!arg) return []
  return arg
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
}
