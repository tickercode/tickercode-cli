import { describe, it, expect } from "vitest"
import { VALID_DOC_TYPES } from "../src/commands/disclosures"

/**
 * tc disclosures (Phase 1) — canonical doc_type 集合の lock テスト。
 * BE 側 (disclosure-repository.ts: CANONICAL_DOC_TYPES) と完全一致している必要がある。
 *
 * 参照: .tickercode/issues/cli-disclosures-command/issue.md
 */
describe("VALID_DOC_TYPES (canonical doc type set)", () => {
  it("依頼書 Phase 1 仕様の 7 種別を含む", () => {
    expect(VALID_DOC_TYPES).toEqual([
      "earnings",
      "forecast",
      "dividend",
      "buyback",
      "presentation",
      "plan",
      "tdnet_other",
    ])
  })

  it("重複は無い", () => {
    const unique = Array.from(new Set(VALID_DOC_TYPES))
    expect(unique.length).toBe(VALID_DOC_TYPES.length)
  })
})
