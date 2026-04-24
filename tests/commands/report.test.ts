import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// Mock fetch globally
const mockFetch = vi.fn()
vi.stubGlobal("fetch", mockFetch)

// Stub process.env
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

describe("report save — POST /api/report/create", () => {
  it("sends correct payload with source=agent_cli", async () => {
    const responseData = { success: true, data: { id: "abc123", slug: "my-report-abc123" } }
    mockFetch.mockResolvedValueOnce(makeOkResponse(responseData))

    const { postJson } = await import("../../src/lib/api-client")
    const result = await postJson("/api/report/create", {
      source: "agent_cli",
      title: "テストレポート",
      body_markdown: "# 分析\n内容",
      is_public: false,
    })

    expect(mockFetch).toHaveBeenCalledOnce()
    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe("https://api.ticker-code.com/api/report/create")
    expect(opts.method).toBe("POST")
    const body = JSON.parse(opts.body as string)
    expect(body.source).toBe("agent_cli")
    expect(body.title).toBe("テストレポート")
    expect(body.is_public).toBe(false)
    expect((result as { success: boolean }).success).toBe(true)
  })

  it("sends Authorization header when TICKERCODE_API_KEY is set", async () => {
    mockFetch.mockResolvedValueOnce(makeOkResponse({ success: true, data: { id: "x", slug: "x" } }))

    const { postJson } = await import("../../src/lib/api-client")
    await postJson("/api/report/create", { source: "agent_cli", title: "t", body_markdown: "b" })

    const [, opts] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect((opts.headers as Record<string, string>)["Authorization"]).toBe("Bearer test-key")
  })

  it("throws on 401 network error propagation", async () => {
    mockFetch.mockResolvedValueOnce(makeErrorResponse(401, "Unauthorized"))

    const { postJson } = await import("../../src/lib/api-client")
    await expect(
      postJson("/api/report/create", { source: "agent_cli", title: "t", body_markdown: "b" }),
    ).rejects.toThrow("API 401")
  })

  it("throws on 403 response", async () => {
    mockFetch.mockResolvedValueOnce(makeErrorResponse(403, JSON.stringify({ code: "FORBIDDEN_PRIVATE_PLAN" })))

    const { postJson } = await import("../../src/lib/api-client")
    await expect(
      postJson("/api/report/create", { source: "agent_cli", title: "t", body_markdown: "b" }),
    ).rejects.toThrow("API 403")
  })
})

describe("report list — POST /api/report/list", () => {
  it("sends limit and mine_only", async () => {
    const responseData = {
      success: true,
      data: [
        { id: "id1", slug: "slug1", title: "Report 1", is_public: false, created_at: "2026-04-24T00:00:00Z" },
      ],
    }
    mockFetch.mockResolvedValueOnce(makeOkResponse(responseData))

    const { postJson } = await import("../../src/lib/api-client")
    const result = await postJson("/api/report/list", { limit: 20, mine_only: true })

    const [, opts] = mockFetch.mock.calls[0] as [string, RequestInit]
    const body = JSON.parse(opts.body as string)
    expect(body.limit).toBe(20)
    expect(body.mine_only).toBe(true)
    expect((result as { success: boolean; data: unknown[] }).data).toHaveLength(1)
  })
})

describe("report publish — POST /api/report/update", () => {
  it("sends is_public=true", async () => {
    mockFetch.mockResolvedValueOnce(
      makeOkResponse({ success: true, data: { id: "id1", slug: "slug1" } }),
    )

    const { postJson } = await import("../../src/lib/api-client")
    await postJson("/api/report/update", { id: "id1", is_public: true })

    const [, opts] = mockFetch.mock.calls[0] as [string, RequestInit]
    const body = JSON.parse(opts.body as string)
    expect(body.is_public).toBe(true)
    expect(body.id).toBe("id1")
  })
})

describe("report delete — POST /api/report/delete", () => {
  it("sends id and expects success", async () => {
    mockFetch.mockResolvedValueOnce(makeOkResponse({ success: true }))

    const { postJson } = await import("../../src/lib/api-client")
    const result = await postJson("/api/report/delete", { id: "id-to-delete" })

    const [, opts] = mockFetch.mock.calls[0] as [string, RequestInit]
    const body = JSON.parse(opts.body as string)
    expect(body.id).toBe("id-to-delete")
    expect((result as { success: boolean }).success).toBe(true)
  })
})
