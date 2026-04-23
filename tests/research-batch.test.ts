import { describe, it, expect } from "vitest"
import {
  batchConfigSchema,
  findOverlaps,
  fmtBatchSummaryMd,
  generateBatchSlug,
  parseBatchConfig,
  resolveTheme,
  type BatchManifest,
} from "../src/lib/research-batch"
import type { ThemeRunResult } from "../src/lib/research-idea"

describe("parseBatchConfig", () => {
  it("accepts minimal valid config", () => {
    const config = parseBatchConfig({
      themes: [{ theme: "AI", keywords: ["AI"] }],
    })
    expect(config.themes).toHaveLength(1)
    expect(config.themes[0].theme).toBe("AI")
  })

  it("accepts defaults + per-theme overrides", () => {
    const config = parseBatchConfig({
      defaults: { target_size: 30, match_mode: "any" },
      themes: [
        { theme: "AI", keywords: ["AI"] },
        { theme: "半導体", keywords: ["半導体"], match_mode: "all" },
      ],
    })
    expect(config.defaults?.target_size).toBe(30)
    expect(config.themes[1].match_mode).toBe("all")
  })

  it("rejects empty themes array", () => {
    expect(() =>
      parseBatchConfig({ themes: [] }),
    ).toThrow()
  })

  it("rejects theme with no keywords", () => {
    expect(() =>
      parseBatchConfig({ themes: [{ theme: "X", keywords: [] }] }),
    ).toThrow()
  })

  it("rejects invalid match_mode", () => {
    expect(() =>
      parseBatchConfig({
        themes: [{ theme: "X", keywords: ["a"], match_mode: "fuzzy" }],
      }),
    ).toThrow()
  })

  it("accepts screen filter block", () => {
    const config = parseBatchConfig({
      themes: [
        {
          theme: "X",
          keywords: ["a"],
          screen: { per_lt: 20, roe_gt: 10, mcap_gt: 1e10 },
        },
      ],
    })
    expect(config.themes[0].screen?.per_lt).toBe(20)
  })
})

describe("resolveTheme", () => {
  it("merges defaults with per-theme overrides", () => {
    const resolved = resolveTheme(
      { theme: "X", keywords: ["a"], match_mode: "all" },
      { target_size: 30, match_mode: "any", top_n: 5 },
    )
    expect(resolved.matchMode).toBe("all")
    expect(resolved.targetSize).toBe(30)
    expect(resolved.topN).toBe(5)
  })

  it("merges screen conditions from defaults + per-theme", () => {
    const resolved = resolveTheme(
      { theme: "X", keywords: ["a"], screen: { per_lt: 20 } },
      { screen: { roe_gt: 10 } },
    )
    const fields = resolved.numericConditions.map((c) => c.field).sort()
    expect(fields).toEqual(["i_forward_per", "i_forward_roe"])
  })

  it("per-theme screen overrides defaults for same key", () => {
    const resolved = resolveTheme(
      { theme: "X", keywords: ["a"], screen: { per_lt: 30 } },
      { screen: { per_lt: 10 } },
    )
    const per = resolved.numericConditions.find((c) => c.field === "i_forward_per")
    expect(per?.value).toBe(30)
  })

  it("include_stale overrides fiscal_status", () => {
    const resolved = resolveTheme(
      { theme: "X", keywords: ["a"], include_stale: true },
      { fiscal_status: "current" },
    )
    expect(resolved.fiscalStatusAllow).toBeUndefined()
  })

  it("fiscal_status: 'any' maps to undefined", () => {
    const resolved = resolveTheme({ theme: "X", keywords: ["a"], fiscal_status: "any" })
    expect(resolved.fiscalStatusAllow).toBeUndefined()
  })

  it("default fiscal_status is ['current']", () => {
    const resolved = resolveTheme({ theme: "X", keywords: ["a"] })
    expect(resolved.fiscalStatusAllow).toEqual(["current"])
  })

  it("sector list as string splits on comma", () => {
    const resolved = resolveTheme({
      theme: "X",
      keywords: ["a"],
      sector: "5250, 3650",
    })
    expect(resolved.sectorCodes).toEqual(["5250", "3650"])
  })
})

describe("generateBatchSlug", () => {
  const fixedDate = new Date(Date.UTC(2026, 3, 24, 6, 30, 0)) // JST 15:30

  it("uses override when provided", () => {
    expect(
      generateBatchSlug({ hashSeed: "x", date: fixedDate, override: "my-run" }),
    ).toBe("my-run")
  })

  it("encodes JST date + time + hash", () => {
    const s = generateBatchSlug({ hashSeed: "seed1", date: fixedDate })
    expect(s).toMatch(/^batch-20260424-1530-[0-9a-f]{6}$/)
  })

  it("deterministic for same seed + date", () => {
    const a = generateBatchSlug({ hashSeed: "x", date: fixedDate })
    const b = generateBatchSlug({ hashSeed: "x", date: fixedDate })
    expect(a).toBe(b)
  })
})

describe("findOverlaps", () => {
  function mkResult(theme: string, codes: string[]): ThemeRunResult {
    return {
      theme,
      slug: theme,
      idea_dir: "/tmp/ignore",
      counts: { hits: 0, shortlist: codes.length },
      top_sector: null,
      shortlist_codes: codes,
      overview_generated_at: null,
    }
  }

  it("detects stocks appearing in >1 theme", () => {
    const res = findOverlaps([
      mkResult("AI", ["1", "2", "3"]),
      mkResult("半導体", ["2", "3", "4"]),
      mkResult("EV", ["3", "5"]),
    ])
    expect(res.map((o) => o.code).sort()).toEqual(["2", "3"])
    const three = res.find((o) => o.code === "3")
    expect(three?.themes).toEqual(["AI", "EV", "半導体"])
  })

  it("empty when no overlap", () => {
    const res = findOverlaps([
      mkResult("A", ["1"]),
      mkResult("B", ["2"]),
    ])
    expect(res).toEqual([])
  })

  it("sorts by theme-count desc, then code asc", () => {
    const res = findOverlaps([
      mkResult("A", ["x", "y"]),
      mkResult("B", ["y"]),
      mkResult("C", ["y", "x"]),
    ])
    expect(res[0].code).toBe("y")
    expect(res[0].themes).toEqual(["A", "B", "C"])
    expect(res[1].code).toBe("x")
  })
})

describe("fmtBatchSummaryMd", () => {
  const manifest: BatchManifest = {
    batch_slug: "batch-20260424-1530-abcdef",
    generated_at: "2026-04-24T06:30:00Z",
    overview_generated_at: "2026-04-23T13:26:02Z",
    total_themes: 2,
    themes: [
      {
        theme: "AI",
        slug: "ai-20260424-111",
        idea_dir: "/tmp/research/idea/ai-20260424-111",
        hits: 100,
        shortlist: 20,
        top_sector: { name: "情報・通信業", code: "5250", share: 0.4 },
      },
      {
        theme: "半導体",
        slug: "theme-20260424-222",
        idea_dir: "/tmp/research/idea/theme-20260424-222",
        hits: 50,
        shortlist: 15,
        top_sector: { name: "電気機器", code: "3650", share: 0.6 },
      },
    ],
    overlaps: [{ code: "7203", themes: ["AI", "半導体"] }],
  }

  it("includes batch slug and per-theme rows", () => {
    const md = fmtBatchSummaryMd(manifest)
    expect(md).toContain("batch-20260424-1530-abcdef")
    expect(md).toContain("| 1 | AI | 100 | 20 | 情報・通信業 (40.0%)")
    expect(md).toContain("| 2 | 半導体 | 50 | 15 | 電気機器 (60.0%)")
  })

  it("renders overlap section when overlaps exist", () => {
    const md = fmtBatchSummaryMd(manifest)
    expect(md).toContain("1 stocks appear in multiple themes.")
    expect(md).toContain("| 7203 | AI, 半導体 |")
  })

  it("shows 'no overlap' message when empty", () => {
    const md = fmtBatchSummaryMd({ ...manifest, overlaps: [] })
    expect(md).toContain("No stock appears in more than one shortlist.")
  })
})

describe("batchConfigSchema zod", () => {
  it("exposed for direct use", () => {
    const res = batchConfigSchema.safeParse({
      themes: [{ theme: "T", keywords: ["k"] }],
    })
    expect(res.success).toBe(true)
  })
})
