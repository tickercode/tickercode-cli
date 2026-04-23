import { describe, it, expect } from "vitest"
import {
  applyFilters,
  sortBy,
  screen,
  toNumber,
  buildNumericConditions,
} from "../src/lib/screen"

const items = [
  {
    code: "1",
    i_forward_per: "10.0",
    i_forward_roe: "15.0",
    market_capitalization: 100_000_000_000,
    sector33_code: "5250",
  },
  {
    code: "2",
    i_forward_per: "25.5",
    i_forward_roe: "8.0",
    market_capitalization: 50_000_000_000,
    sector33_code: "5250",
  },
  {
    code: "3",
    i_forward_per: null,
    i_forward_roe: "20.0",
    market_capitalization: 30_000_000_000,
    sector33_code: "3700",
  },
  {
    code: "4",
    i_forward_per: "abc",
    i_forward_roe: null,
    market_capitalization: null,
    sector33_code: "5250",
  },
  {
    code: "5",
    i_forward_per: "30.0",
    i_forward_roe: "5.0",
    market_capitalization: 200_000_000_000,
    sector33_code: "3700",
  },
]

describe("toNumber", () => {
  it("parses string numeric", () => {
    expect(toNumber("9.14")).toBe(9.14)
    expect(toNumber("0")).toBe(0)
  })
  it("passes through finite numbers", () => {
    expect(toNumber(3.14)).toBe(3.14)
  })
  it("returns null for null / undefined / empty / non-numeric / NaN / Infinity", () => {
    expect(toNumber(null)).toBe(null)
    expect(toNumber(undefined)).toBe(null)
    expect(toNumber("")).toBe(null)
    expect(toNumber("abc")).toBe(null)
    expect(toNumber(Number.NaN)).toBe(null)
    expect(toNumber(Number.POSITIVE_INFINITY)).toBe(null)
  })
})

describe("applyFilters", () => {
  it("exact match on sector", () => {
    const out = applyFilters(items, {
      exact: [{ field: "sector33_code", value: "5250" }],
    })
    expect(out.map((i) => i.code)).toEqual(["1", "2", "4"])
  })

  it("numeric lt excludes null/NaN by default", () => {
    const out = applyFilters(items, {
      numeric: [{ field: "i_forward_per", op: "lt", value: 20 }],
    })
    expect(out.map((i) => i.code)).toEqual(["1"])
  })

  it("numeric lt includes null when includeNull=true", () => {
    const out = applyFilters(items, {
      numeric: [{ field: "i_forward_per", op: "lt", value: 20 }],
      includeNull: true,
    })
    expect(out.map((i) => i.code)).toEqual(["1", "3", "4"])
  })

  it("combines exact + multiple numeric (AND)", () => {
    const out = applyFilters(items, {
      exact: [{ field: "sector33_code", value: "5250" }],
      numeric: [
        { field: "i_forward_per", op: "lt", value: 30 },
        { field: "i_forward_roe", op: "gt", value: 10 },
      ],
    })
    expect(out.map((i) => i.code)).toEqual(["1"])
  })

  it("returns all when no filters", () => {
    expect(applyFilters(items, {}).length).toBe(items.length)
  })

  it("mcap range", () => {
    const out = applyFilters(items, {
      numeric: [
        { field: "market_capitalization", op: "gt", value: 40_000_000_000 },
      ],
    })
    expect(out.map((i) => i.code)).toEqual(["1", "2", "5"])
  })
})

describe("sortBy", () => {
  it("desc by i_forward_per, nulls last", () => {
    const out = sortBy(items, { field: "i_forward_per", order: "desc" })
    expect(out.map((i) => i.code)).toEqual(["5", "2", "1", "3", "4"])
  })

  it("asc by market_capitalization, nulls last", () => {
    const out = sortBy(items, { field: "market_capitalization", order: "asc" })
    expect(out.map((i) => i.code)).toEqual(["3", "2", "1", "5", "4"])
  })

  it("does not mutate input", () => {
    const before = items.map((i) => i.code)
    sortBy(items, { field: "i_forward_per", order: "desc" })
    expect(items.map((i) => i.code)).toEqual(before)
  })
})

describe("screen (full pipeline)", () => {
  it("filter + sort + limit", () => {
    const out = screen(items, {
      exact: [{ field: "sector33_code", value: "5250" }],
      sort: { field: "i_forward_per", order: "asc" },
      limit: 2,
    })
    expect(out.map((i) => i.code)).toEqual(["1", "2"])
  })

  it("offset + limit pagination", () => {
    const out = screen(items, {
      sort: { field: "market_capitalization", order: "desc" },
      offset: 1,
      limit: 2,
    })
    expect(out.map((i) => i.code)).toEqual(["1", "2"])
  })
})

describe("buildNumericConditions", () => {
  it("maps known flag names", () => {
    const out = buildNumericConditions({
      "per-lt": 20,
      "roe-gt": 10,
      "mcap-gt": 50_000_000_000,
    })
    expect(out).toEqual([
      { field: "i_forward_per", op: "lt", value: 20 },
      { field: "i_forward_roe", op: "gt", value: 10 },
      { field: "market_capitalization", op: "gt", value: 50_000_000_000 },
    ])
  })

  it("ignores undefined flags", () => {
    const out = buildNumericConditions({ "per-lt": undefined, "roe-gt": 10 })
    expect(out).toHaveLength(1)
    expect(out[0]).toMatchObject({ field: "i_forward_roe", op: "gt", value: 10 })
  })

  it("adds custom metric gt/lt", () => {
    const out = buildNumericConditions(
      {},
      { field: "yoy3y_net_profit", gt: 5, lt: 50 },
    )
    expect(out).toEqual([
      { field: "yoy3y_net_profit", op: "gt", value: 5 },
      { field: "yoy3y_net_profit", op: "lt", value: 50 },
    ])
  })
})
