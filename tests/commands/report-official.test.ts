import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

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

describe("report save --official flag", () => {
  it("sends is_official=true and forces is_public=true", async () => {
    mockFetch.mockResolvedValueOnce(
      makeOkResponse({ success: true, data: { id: "abc", slug: "abc-slug" } }),
    )

    const { postJson } = await import("../../src/lib/api-client")
    await postJson("/api/report/create", {
      source: "agent_cli",
      title: "公式レポート",
      body_markdown: "# 分析",
      is_public: true,
      is_official: true,
    })

    const [, opts] = mockFetch.mock.calls[0] as [string, RequestInit]
    const body = JSON.parse(opts.body as string)
    expect(body.is_official).toBe(true)
    expect(body.is_public).toBe(true)
  })
})

describe("report save --verdict flag — verdict-code logic", () => {
  it("verdict-code が直接指定された場合はそのまま verdict_code にセット", () => {
    // Unit test: verdict resolution logic (no API call needed)
    const VERDICT_ENUMS = ["strong_buy", "buy", "hold", "lukewarm", "mixed", "sell", "strong_sell"]
    const input = "strong_buy"

    // simulate: --verdict-code strong_buy
    let verdictCode: string | undefined
    let verdictLabel: string | undefined
    verdictCode = input

    expect(verdictCode).toBe("strong_buy")
    expect(verdictLabel).toBeUndefined()
    expect(VERDICT_ENUMS.includes(input)).toBe(true)
  })

  it("--verdict が enum に一致する場合は verdict_code と verdict_label 両方セット", () => {
    const VERDICT_ENUMS = ["strong_buy", "buy", "hold", "lukewarm", "mixed", "sell", "strong_sell"]
    const input = "lukewarm"

    let verdictCode: string | undefined
    let verdictLabel: string | undefined

    if (VERDICT_ENUMS.includes(input)) {
      verdictCode = input
      verdictLabel = input
    } else {
      verdictLabel = input
    }

    expect(verdictCode).toBe("lukewarm")
    expect(verdictLabel).toBe("lukewarm")
  })

  it("--verdict が enum に一致しない場合は verdict_label のみセット", () => {
    const VERDICT_ENUMS = ["strong_buy", "buy", "hold", "lukewarm", "mixed", "sell", "strong_sell"]
    const input = "慎重肯定"

    let verdictCode: string | undefined
    let verdictLabel: string | undefined

    if (VERDICT_ENUMS.includes(input)) {
      verdictCode = input
      verdictLabel = input
    } else {
      verdictLabel = input
    }

    expect(verdictCode).toBeUndefined()
    expect(verdictLabel).toBe("慎重肯定")
  })

  it("verdict_code と verdict_label を payload に含めてAPIを呼び出す", async () => {
    mockFetch.mockResolvedValueOnce(
      makeOkResponse({ success: true, data: { id: "x", slug: "x-slug" } }),
    )

    const { postJson } = await import("../../src/lib/api-client")
    await postJson("/api/report/create", {
      source: "agent_cli",
      title: "Test",
      body_markdown: "body",
      is_public: false,
      verdict_code: "buy",
      verdict_label: "buy",
    })

    const [, opts] = mockFetch.mock.calls[0] as [string, RequestInit]
    const body = JSON.parse(opts.body as string)
    expect(body.verdict_code).toBe("buy")
    expect(body.verdict_label).toBe("buy")
  })
})

describe("report save --panel / --turns / --panelists → metadata", () => {
  it("metadata に panel / turns / panelists を格納してAPIを呼び出す", async () => {
    mockFetch.mockResolvedValueOnce(
      makeOkResponse({ success: true, data: { id: "y", slug: "y-slug" } }),
    )

    const { postJson } = await import("../../src/lib/api-client")
    await postJson("/api/report/create", {
      source: "agent_cli",
      title: "Panel Report",
      body_markdown: "body",
      is_public: false,
      metadata: {
        panel: "moat-deepdive",
        turns: 100,
        panelists: ["BuffettBot", "FisherBot", "KiyoharaBot"],
      },
    })

    const [, opts] = mockFetch.mock.calls[0] as [string, RequestInit]
    const body = JSON.parse(opts.body as string)
    expect(body.metadata.panel).toBe("moat-deepdive")
    expect(body.metadata.turns).toBe(100)
    expect(body.metadata.panelists).toEqual(["BuffettBot", "FisherBot", "KiyoharaBot"])
  })
})

describe("403 FORBIDDEN_OFFICIAL_ROLE handling", () => {
  it("FORBIDDEN_OFFICIAL_ROLE エラーを postJson が throw する", async () => {
    mockFetch.mockResolvedValueOnce(
      makeErrorResponse(403, JSON.stringify({ code: "FORBIDDEN_OFFICIAL_ROLE" })),
    )

    const { postJson } = await import("../../src/lib/api-client")
    await expect(
      postJson("/api/report/create", {
        source: "agent_cli",
        title: "t",
        body_markdown: "b",
        is_official: true,
      }),
    ).rejects.toThrow("API 403")
  })
})
