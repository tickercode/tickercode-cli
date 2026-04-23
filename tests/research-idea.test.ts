import { describe, it, expect } from "vitest"
import {
  buildShortlist,
  generateSlug,
  joinHitsWithMini,
  parseMaybeNumber,
  themeToAsciiSlug,
} from "../src/lib/research-idea"
import type { SearchHit } from "../src/lib/overview-search"
import type { StockItem } from "../src/memory/mini"

function hit(partial: Partial<SearchHit>): SearchHit {
  return {
    code: "00000",
    display_code: "0000",
    company_name: "Test",
    sector33_code: "5250",
    sector33_code_name: "情報・通信業",
    market_code_name: "プライム",
    fiscal_year: "2025-03-31",
    fiscal_year_status: "current",
    segment_data_status: "complete",
    analysis_as_of: "2026-03-01",
    matched_keywords: ["AI"],
    matched_fields: ["summary"],
    ...partial,
  }
}

function miniItem(partial: Partial<StockItem>): StockItem {
  return {
    code: "00000",
    display_code: "0000",
    company_name: "Test",
    ...partial,
  } as StockItem
}

describe("parseMaybeNumber", () => {
  it("parses strings and numbers", () => {
    expect(parseMaybeNumber("9.14")).toBe(9.14)
    expect(parseMaybeNumber(3)).toBe(3)
  })
  it("returns null for null / undefined / empty / invalid", () => {
    expect(parseMaybeNumber(null)).toBe(null)
    expect(parseMaybeNumber(undefined)).toBe(null)
    expect(parseMaybeNumber("")).toBe(null)
    expect(parseMaybeNumber("abc")).toBe(null)
    expect(parseMaybeNumber(Number.NaN)).toBe(null)
  })
})

describe("themeToAsciiSlug", () => {
  it("keeps lowercase letters and digits", () => {
    expect(themeToAsciiSlug("ai era 2026")).toBe("ai-era-2026")
  })
  it("drops CJK, returns empty", () => {
    expect(themeToAsciiSlug("AI 時代の受益者")).toBe("ai")
  })
  it("truncates long strings to 24 chars", () => {
    expect(themeToAsciiSlug("a".repeat(50)).length).toBe(24)
  })
})

describe("generateSlug", () => {
  const fixedDate = new Date(Date.UTC(2026, 3, 24))

  it("uses override when provided", () => {
    expect(generateSlug({ theme: "anything", override: "my-slug" })).toBe(
      "my-slug",
    )
  })

  it("generates deterministic slug with date + hash", () => {
    const s = generateSlug({ theme: "AI 時代の受益者", date: fixedDate })
    expect(s).toMatch(/^ai-20260424-[0-9a-f]{8}$/)
  })

  it("generates consistent hash for same theme", () => {
    const a = generateSlug({ theme: "same", date: fixedDate })
    const b = generateSlug({ theme: "same", date: fixedDate })
    expect(a).toBe(b)
  })

  it("uses 'theme-' prefix when theme has no ASCII chars", () => {
    const s = generateSlug({ theme: "半導体", date: fixedDate })
    expect(s).toMatch(/^theme-20260424-[0-9a-f]{8}$/)
  })
})

describe("joinHitsWithMini", () => {
  it("enriches hits with mini data", () => {
    const hits = [hit({ display_code: "7203", company_name: "トヨタ" })]
    const mini = new Map<string, StockItem>([
      [
        "7203",
        miniItem({
          display_code: "7203",
          i_forward_per: "10.5",
          market_capitalization: 50_000_000_000_000,
        }),
      ],
    ])
    const out = joinHitsWithMini(hits, mini)
    expect(out[0].i_forward_per).toBe(10.5)
    expect(out[0].market_capitalization).toBe(50_000_000_000_000)
  })

  it("fills null when mini missing", () => {
    const hits = [hit({ display_code: "9999" })]
    const mini = new Map<string, StockItem>()
    const out = joinHitsWithMini(hits, mini)
    expect(out[0].i_forward_per).toBe(null)
    expect(out[0].market_capitalization).toBe(null)
  })
})

describe("buildShortlist", () => {
  const hits = [
    hit({ display_code: "1" }),
    hit({ display_code: "2" }),
    hit({ display_code: "3" }),
    hit({ display_code: "4" }),
  ]
  const mini = new Map<string, StockItem>([
    ["1", miniItem({ display_code: "1", i_forward_per: "10", i_forward_roe: "20" })],
    ["2", miniItem({ display_code: "2", i_forward_per: "30", i_forward_roe: "5" })],
    ["3", miniItem({ display_code: "3", i_forward_per: "15", i_forward_roe: "12" })],
    ["4", miniItem({ display_code: "4", i_forward_per: null, i_forward_roe: "25" })],
  ])

  it("applies numeric filters and respects targetSize cap", () => {
    const out = buildShortlist({
      hits,
      miniByCode: mini,
      numericConditions: [{ field: "i_forward_per", op: "lt", value: 20 }],
      targetSize: 50,
    })
    expect(out.map((i) => i.display_code)).toEqual(["1", "3"])
  })

  it("caps at targetSize", () => {
    const out = buildShortlist({
      hits,
      miniByCode: mini,
      numericConditions: [],
      targetSize: 2,
    })
    expect(out).toHaveLength(2)
  })

  it("excludes null numerics by default", () => {
    const out = buildShortlist({
      hits,
      miniByCode: mini,
      numericConditions: [{ field: "i_forward_per", op: "lt", value: 100 }],
      targetSize: 50,
    })
    expect(out.map((i) => i.display_code)).not.toContain("4")
  })

  it("includes null with includeNull=true", () => {
    const out = buildShortlist({
      hits,
      miniByCode: mini,
      numericConditions: [{ field: "i_forward_per", op: "lt", value: 100 }],
      includeNull: true,
      targetSize: 50,
    })
    expect(out.map((i) => i.display_code)).toContain("4")
  })
})
