import { describe, it, expect } from "vitest"
import { searchOverview, parseKeywordsArg } from "../src/lib/overview-search"
import type { OverviewItem } from "../src/memory/overview"

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
      summary: "",
      industry: "",
      strengths: [],
      weaknesses: [],
    },
    segments: [],
    segment_count: 0,
    total_sales: null,
    fiscal_year: "2025-03-31",
    fiscal_year_status: "current",
    segment_data_status: "complete",
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
  segments: [{ name: "AI プラットフォーム事業", revenue: 100, revenue_share: 1, op_profit: 10, op_margin: 0.1 }],
  segment_count: 1,
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
    weaknesses: [],
  },
  segments: [{ name: "装置事業", revenue: 1, revenue_share: 1, op_profit: 0, op_margin: 0 }],
  segment_count: 1,
})

const nullNarrativeCo = makeItem({
  code: "556A0",
  display_code: "556A",
  company_name: "新規上場",
  narratives: null,
  segments: [],
  segment_count: 0,
  fiscal_year: null,
  fiscal_year_status: "missing",
  segment_data_status: "unavailable",
})

const staleCo = makeItem({
  code: "99990",
  display_code: "9999",
  company_name: "Stale Data Co",
  narratives: {
    summary: "AI 活用型企業。",
    industry: "情報通信業界。",
    strengths: [],
    weaknesses: [],
  },
  fiscal_year_status: "stale_2y+",
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
    const partialCo = makeItem({
      code: "11110",
      display_code: "1111",
      company_name: "Partial Co",
      narratives: {
        summary: "AI で新領域に挑戦。",
        industry: "テスト",
        strengths: [],
        weaknesses: [],
      },
      segment_data_status: "partial",
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
