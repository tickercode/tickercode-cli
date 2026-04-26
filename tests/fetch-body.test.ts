import { describe, it, expect } from "vitest"
import { bodyFor } from "../src/memory/fetch"
import { ENDPOINTS } from "../src/memory/paths"

/**
 * Regression tests for endpoint body schemas.
 * BE 側の仕様確認 (2026-04-24) に基づき、以下 5 endpoint の body schema を lock する。
 * 変更時は api-contract.md と併せて確認すること。
 *
 * 参照: .tickercode/issues/cli-per-code-endpoint-verification/issue.md
 */

const CODE5 = "72030"

describe("ENDPOINTS mapping (api-contract.md 準拠)", () => {
  it("overview → /api/full/stock", () => {
    expect(ENDPOINTS.overview).toBe("/api/full/stock")
  })
  it("financial → /api/full/financials", () => {
    expect(ENDPOINTS.financial).toBe("/api/full/financials")
  })
  it("edinet → /api/edinet/text", () => {
    expect(ENDPOINTS.edinet).toBe("/api/edinet/text")
  })
  it("disclosure → /api/disclosure/list (NOT /recent, /recent は市場全体用)", () => {
    expect(ENDPOINTS.disclosure).toBe("/api/disclosure/list")
  })
  it("news → /api/news/feed", () => {
    expect(ENDPOINTS.news).toBe("/api/news/feed")
  })
})

describe("bodyFor: endpoint 毎の body schema regression", () => {
  it("overview: { stock_code }", () => {
    expect(bodyFor("overview", CODE5)).toEqual({ stock_code: CODE5 })
  })

  it("financial: { stock_code }", () => {
    expect(bodyFor("financial", CODE5)).toEqual({ stock_code: CODE5 })
  })

  it("edinet: { stock_code } — code ではなく stock_code", () => {
    const body = bodyFor("edinet", CODE5) as Record<string, unknown>
    expect(body.stock_code).toBe(CODE5)
    expect(body.code).toBeUndefined()
  })

  it("disclosure: { stock_code, limit: 30 }", () => {
    const body = bodyFor("disclosure", CODE5) as Record<string, unknown>
    expect(body.stock_code).toBe(CODE5)
    expect(body.limit).toBe(30)
    expect(body.code).toBeUndefined()
  })

  it("news: { stock_code, limit: 20 }", () => {
    const body = bodyFor("news", CODE5) as Record<string, unknown>
    expect(body.stock_code).toBe(CODE5)
    expect(body.limit).toBe(20)
    expect(body.code).toBeUndefined()
  })
})

describe("bodyFor: stock_code / code の使い分けルール", () => {
  const stockCodeEndpoints = ["overview", "financial", "disclosure", "news", "edinet"] as const

  it.each(stockCodeEndpoints)("%s は stock_code を使う", (endpoint) => {
    const body = bodyFor(endpoint, CODE5) as Record<string, unknown>
    expect(body.stock_code).toBe(CODE5)
    expect(body.code).toBeUndefined()
  })
})
