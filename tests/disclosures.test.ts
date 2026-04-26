import { describe, it, expect } from "vitest"
import { VALID_DOC_TYPES } from "../src/commands/disclosures"

/**
 * tc disclosures (Phase 1) — canonical doc_type 集合の lock テスト。
 * BE 側 (disclosure-repository.ts: CANONICAL_DOC_TYPES) と完全一致している必要がある。
 *
 * 参照: .tickercode/issues/cli-disclosures-command/issue.md
 */
describe("VALID_DOC_TYPES (canonical doc type set)", () => {
  it("Phase 1 既存 6 種 + 2026-04-26 追加 10 種 + tdnet_other = 17 種", () => {
    expect(VALID_DOC_TYPES).toEqual([
      // 既存 6 種 (業績・配当系)
      "earnings",
      "forecast",
      "dividend",
      "buyback",
      "presentation",
      "plan",
      // 新 10 種 (analyst Team 依頼で追加)
      "ma",
      "monthly",
      "tob",
      "large_shareholder",
      "split",
      "bond",
      "stock_option",
      "trouble",
      "personnel",
      "contract",
      // 最後の網
      "tdnet_other",
    ])
  })

  it("重複は無い", () => {
    const unique = Array.from(new Set(VALID_DOC_TYPES))
    expect(unique.length).toBe(VALID_DOC_TYPES.length)
  })
})
