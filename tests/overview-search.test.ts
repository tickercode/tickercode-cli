import { describe, it, expect } from "vitest"
import { searchOverview, parseKeywordsArg } from "../src/lib/overview-search"
import type { OverviewItem } from "../src/memory/overview"

const RECENT_FY = new Date().toISOString().slice(0, 10) // 今日の日付（current とみなされる）
const STALE_FY = "2022-03-31" // 2 年以上前（stale_2y+）

type SegBuild = {
  name: string
  revenue: number | null
  revenue_share: number | null
  operating_income: number | null
  operating_margin: number | null
}

function buildSegment(
  fy: string,
  segs: SegBuild[],
): OverviewItem["segment"] {
  if (segs.length === 0) return null
  return {
    schema_version: 1,
    fiscal_year: fy,
    total_sales: segs.reduce((sum, s) => sum + (s.revenue ?? 0), 0) || null,
    segment_count: segs.length,
    segments: segs.map((s) => ({
      name: s.name,
      normalized_name: s.name,
      numbers: {
        latest: {
          fiscal_year: fy,
          revenue: s.revenue,
          revenue_share: s.revenue_share,
          operating_income: s.operating_income,
          operating_margin: s.operating_margin,
          gross_profit: null,
          gross_margin: null,
          assets: null,
          revenue_yoy: null,
          operating_income_yoy: null,
          gross_profit_yoy: null,
          assets_yoy: null,
          revenue_cagr_2y: null,
          operating_income_cagr_2y: null,
          gross_profit_cagr_2y: null,
          assets_cagr_2y: null,
        },
        history: [],
      },
      analysis: null,
    })),
    insights: null,
    last_refreshed_at: new Date().toISOString(),
  }
}

function makeItem(over: Partial<OverviewItem>): OverviewItem {
  return {
    code: "00000",
    display_code: "0000",
    company_name: "Test Corp",
    short_name: null,
    sector33_code: "5250",
    sector33_code_name: "情報・通信業",
    market_code_name: "プライム",
    narratives: {
      summary: null,
      industry: null,
      strengths: null,
      weaknesses: null,
    },
    segment: null,
    analysis_as_of: "2026-03-01 00:00:00",
    ...over,
  }
}

const aiCo = makeItem({
  code: "12340",
  display_code: "1234",
  company_name: "AI Solutions",
  narratives: {
    summary: "AI と機械学習で業務自動化を提供する企業です。",
    industry: "情報通信業界は DX 需要が拡大中。",
    strengths: ["独自の LLM モデル"],
    weaknesses: ["競争激化"],
  },
  segment: buildSegment(RECENT_FY, [
    { name: "AI プラットフォーム事業", revenue: 100, revenue_share: 1, operating_income: 10, operating_margin: 0.1 },
  ]),
})

const semiCo = makeItem({
  code: "56780",
  display_code: "5678",
  company_name: "Semi Works",
  sector33_code: "3650",
  sector33_code_name: "電気機器",
  narratives: {
    summary: "半導体製造装置を開発・販売。",
    industry: "半導体市況は強い。",
    strengths: ["高シェア"],
    weaknesses: null,
  },
  segment: buildSegment(RECENT_FY, [
    { name: "装置事業", revenue: 1, revenue_share: 1, operating_income: 0, operating_margin: 0 },
  ]),
})

const nullNarrativeCo = makeItem({
  code: "556A0",
  display_code: "556A",
  company_name: "新規上場",
  narratives: null,
  segment: null,
})

const staleCo = makeItem({
  code: "99990",
  display_code: "9999",
  company_name: "Stale Data Co",
  narratives: {
    summary: "AI 活用型企業。",
    industry: "情報通信業界。",
    strengths: null,
    weaknesses: null,
  },
  segment: buildSegment(STALE_FY, [
    { name: "旧事業", revenue: 50, revenue_share: 1, operating_income: 5, operating_margin: 0.1 },
  ]),
})

const items: OverviewItem[] = [aiCo, semiCo, nullNarrativeCo, staleCo]

describe("searchOverview", () => {
  it("finds keyword in summary", () => {
    const hits = searchOverview(items, { keywords: ["機械学習"] })
    expect(hits.map((h) => h.display_code)).toEqual(["1234"])
    expect(hits[0].matched_fields).toContain("summary")
    expect(hits[0].matched_keywords).toEqual(["機械学習"])
  })

  it("OR search (any) returns union", () => {
    const hits = searchOverview(items, {
      keywords: ["機械学習", "半導体"],
      matchMode: "any",
    })
    expect(hits.map((h) => h.display_code).sort()).toEqual(["1234", "5678"])
  })

  it("stale_2y+ excluded by default filter", () => {
    const hits = searchOverview(items, {
      keywords: ["AI"],
      fiscalStatusAllow: ["current", "missing"],
    })
    expect(hits.map((h) => h.display_code)).not.toContain("9999")
  })

  it("AND search (all) requires every keyword to match", () => {
    const hits = searchOverview(items, {
      keywords: ["機械学習", "自動化"],
      matchMode: "all",
    })
    expect(hits.map((h) => h.display_code)).toEqual(["1234"])
  })

  it("AND search fails if one keyword missing", () => {
    const hits = searchOverview(items, {
      keywords: ["機械学習", "半導体"],
      matchMode: "all",
    })
    expect(hits).toEqual([])
  })

  it("skips items with null narratives and no segments", () => {
    const hits = searchOverview(items, {
      keywords: ["新規上場"],
    })
    expect(hits).toEqual([])
  })

  it("matches against industry when includeIndustry=true (default)", () => {
    const hits = searchOverview(items, { keywords: ["DX"] })
    expect(hits[0].matched_fields).toContain("industry")
  })

  it("excludes industry when includeIndustry=false", () => {
    const hits = searchOverview(items, {
      keywords: ["DX"],
      includeIndustry: false,
    })
    expect(hits).toEqual([])
  })

  it("matches segment names when enabled (default)", () => {
    const hits = searchOverview(items, { keywords: ["プラットフォーム"] })
    expect(hits[0].matched_fields).toContain("segments")
  })

  it("sector filter narrows results", () => {
    const hits = searchOverview(items, {
      keywords: ["AI"],
      sectorCodes: ["3650"],
    })
    expect(hits.map((h) => h.display_code)).toEqual([])
  })

  it("returns empty on empty keywords", () => {
    expect(searchOverview(items, { keywords: [] })).toEqual([])
    expect(searchOverview(items, { keywords: ["", "  "] })).toEqual([])
  })

  it("respects limit", () => {
    const hits = searchOverview(items, {
      keywords: ["AI", "半導体"],
      limit: 1,
    })
    expect(hits).toHaveLength(1)
  })

  it("case-insensitive by default (English keyword)", () => {
    const hits = searchOverview(items, { keywords: ["ai"] })
    expect(hits.map((h) => h.display_code)).toContain("1234")
  })

  it("segment_data_status filter", () => {
    // partial: 1 segment has null revenue, 1 has values → computeSegmentDataStatus = "partial"
    const partialCo = makeItem({
      code: "11110",
      display_code: "1111",
      company_name: "Partial Co",
      narratives: {
        summary: "AI で新領域に挑戦。",
        industry: "テスト",
        strengths: null,
        weaknesses: null,
      },
      segment: buildSegment(RECENT_FY, [
        { name: "A", revenue: 100, revenue_share: 0.5, operating_income: 10, operating_margin: 0.1 },
        { name: "B", revenue: null, revenue_share: null, operating_income: 5, operating_margin: null },
      ]),
    })
    const hits = searchOverview([...items, partialCo], {
      keywords: ["AI"],
      segmentStatusAllow: ["complete"],
    })
    expect(hits.map((h) => h.display_code)).not.toContain("1111")
  })
})

describe("parseKeywordsArg", () => {
  it("splits comma", () => {
    expect(parseKeywordsArg("AI,機械学習,LLM")).toEqual(["AI", "機械学習", "LLM"])
  })
  it("trims whitespace", () => {
    expect(parseKeywordsArg("  AI , 機械学習 ")).toEqual(["AI", "機械学習"])
  })
  it("ignores empties", () => {
    expect(parseKeywordsArg("AI,,機械学習,")).toEqual(["AI", "機械学習"])
  })
  it("undefined returns empty", () => {
    expect(parseKeywordsArg(undefined)).toEqual([])
  })
})
