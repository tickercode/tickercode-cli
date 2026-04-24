import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { parse as parseYaml } from "yaml"

const mockFetch = vi.fn()
vi.stubGlobal("fetch", mockFetch)

const originalEnv = { ...process.env }

function makeOkResponse(body: unknown) {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response
}

function makeErrorResponse(status: number, body: string) {
  return {
    ok: false,
    status,
    statusText: String(status),
    json: async () => { throw new Error("not json") },
    text: async () => body,
  } as unknown as Response
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.TICKERCODE_API_KEY = "test-key"
  process.env.TICKERCODE_API_BASE = "https://api.ticker-code.com"
})

afterEach(() => {
  process.env = { ...originalEnv }
})

describe("YAML parse for batch-save", () => {
  it("YAML 配列を正しくパースできる", () => {
    const yaml = `
- title: ニデック 6594 moat 分析
  body_markdown: "# 分析内容"
  stock_code: "6594"
  is_official: true
  verdict: lukewarm
  metadata:
    panel: moat-deepdive
    turns: 100
    panelists: [BuffettBot, FisherBot, KiyoharaBot]
- title: ツカダ 2418 value 議論
  body_markdown: "# ツカダ"
  stock_code: "2418"
  is_official: false
`
    const entries = parseYaml(yaml) as Array<Record<string, unknown>>
    expect(Array.isArray(entries)).toBe(true)
    expect(entries).toHaveLength(2)

    const first = entries[0]
    expect(first.title).toBe("ニデック 6594 moat 分析")
    expect(first.stock_code).toBe("6594")
    expect(first.is_official).toBe(true)
    expect(first.verdict).toBe("lukewarm")
    expect((first.metadata as Record<string, unknown>).panel).toBe("moat-deepdive")
    expect((first.metadata as Record<string, unknown>).turns).toBe(100)
    expect((first.metadata as Record<string, unknown>).panelists).toEqual(["BuffettBot", "FisherBot", "KiyoharaBot"])
  })

  it("JSON 配列も正しくパースできる", () => {
    const json = JSON.stringify([
      { title: "Test A", body_markdown: "# A", stock_code: "1234", is_official: false },
      { title: "Test B", body_markdown: "# B", stock_code: "5678", is_official: true },
    ])
    const entries = JSON.parse(json) as Array<Record<string, unknown>>
    expect(entries).toHaveLength(2)
    expect(entries[1].is_official).toBe(true)
  })
})

describe("batch-save API calls", () => {
  it("複数エントリを順次 POST し成功を集計する", async () => {
    mockFetch
      .mockResolvedValueOnce(makeOkResponse({ success: true, data: { id: "id1", slug: "slug1" } }))
      .mockResolvedValueOnce(makeOkResponse({ success: true, data: { id: "id2", slug: "slug2" } }))

    const { postJson } = await import("../../src/lib/api-client")

    const entries = [
      { title: "Report A", body_markdown: "# A", is_public: false },
      { title: "Report B", body_markdown: "# B", is_official: true },
    ]

    let succeeded = 0
    const failures: Array<{ title: string; reason: string }> = []

    for (const entry of entries) {
      try {
        const res = await postJson<{ success: boolean; data: { id: string; slug: string } }>(
          "/api/report/create",
          { source: "agent_cli", ...entry },
        )
        if (!res.success) throw new Error("API returned success=false")
        succeeded++
      } catch (err) {
        failures.push({ title: entry.title, reason: (err as Error).message })
      }
    }

    expect(succeeded).toBe(2)
    expect(failures).toHaveLength(0)
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it("一部失敗した場合に失敗を集計する", async () => {
    mockFetch
      .mockResolvedValueOnce(makeOkResponse({ success: true, data: { id: "id1", slug: "slug1" } }))
      .mockResolvedValueOnce(makeErrorResponse(403, JSON.stringify({ code: "FORBIDDEN_OFFICIAL_ROLE" })))

    const { postJson } = await import("../../src/lib/api-client")

    const entries = [
      { title: "Report OK", body_markdown: "# OK", is_public: false },
      { title: "山岡家 3399", body_markdown: "# 山岡家", is_official: true },
    ]

    let succeeded = 0
    const failures: Array<{ title: string; reason: string }> = []

    for (const entry of entries) {
      try {
        const res = await postJson<{ success: boolean; data: { id: string; slug: string } }>(
          "/api/report/create",
          { source: "agent_cli", ...entry },
        )
        if (!res.success) throw new Error("API returned success=false")
        succeeded++
      } catch (err) {
        failures.push({ title: entry.title, reason: (err as Error).message })
      }
    }

    expect(succeeded).toBe(1)
    expect(failures).toHaveLength(1)
    expect(failures[0].title).toBe("山岡家 3399")
    expect(failures[0].reason).toMatch(/403/)
  })
})
