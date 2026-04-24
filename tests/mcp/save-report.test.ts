import { describe, it, expect, vi, beforeEach } from "vitest"

const mockFetch = vi.fn()
vi.stubGlobal("fetch", mockFetch)

function makeOkResponse(body: unknown) {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response
}

function makeErrorResponse(status: number, bodyText: string) {
  return {
    ok: false,
    status,
    statusText: String(status),
    json: async () => { throw new Error("not json") },
    text: async () => bodyText,
  } as unknown as Response
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.TICKERCODE_API_KEY = "test-key"
  process.env.TICKERCODE_API_BASE = "https://api.ticker-code.com"
})

describe("saveReportTool handler", () => {
  it("returns { id, slug, url } on success", async () => {
    mockFetch.mockResolvedValueOnce(
      makeOkResponse({ success: true, data: { id: "abc", slug: "my-slug" } }),
    )

    const { saveReportTool } = await import("../../src/mcp/tools/save-report")
    const result = await saveReportTool.handler({
      title: "Toyota 分析",
      body_markdown: "# Toyota\n分析内容",
      stock_code: "7203",
      is_public: false,
    })

    expect(result.isError).toBeUndefined()
    const parsed = JSON.parse(result.content[0].text)
    expect(parsed.id).toBe("abc")
    expect(parsed.slug).toBe("my-slug")
    expect(parsed.url).toBe("https://ticker-code.com/report/my-slug")
  })

  it("sends source=agent_cli in request body", async () => {
    mockFetch.mockResolvedValueOnce(
      makeOkResponse({ success: true, data: { id: "x", slug: "x" } }),
    )

    const { saveReportTool } = await import("../../src/mcp/tools/save-report")
    await saveReportTool.handler({
      title: "Test",
      body_markdown: "body",
    })

    const [, opts] = mockFetch.mock.calls[0] as [string, RequestInit]
    const body = JSON.parse(opts.body as string)
    expect(body.source).toBe("agent_cli")
  })

  it("defaults is_public to false when not provided", async () => {
    mockFetch.mockResolvedValueOnce(
      makeOkResponse({ success: true, data: { id: "y", slug: "y" } }),
    )

    const { saveReportTool } = await import("../../src/mcp/tools/save-report")
    await saveReportTool.handler({
      title: "Private test",
      body_markdown: "body",
    })

    const [, opts] = mockFetch.mock.calls[0] as [string, RequestInit]
    const body = JSON.parse(opts.body as string)
    expect(body.is_public).toBe(false)
  })

  it("passes optional fields when provided", async () => {
    mockFetch.mockResolvedValueOnce(
      makeOkResponse({ success: true, data: { id: "z", slug: "z" } }),
    )

    const { saveReportTool } = await import("../../src/mcp/tools/save-report")
    await saveReportTool.handler({
      title: "Multi-stock",
      body_markdown: "body",
      one_liner: "一行サマリ",
      summary: "段落サマリ",
      stock_codes: ["7203", "9984"],
      tags: ["バリュー", "テック"],
      is_public: true,
    })

    const [, opts] = mockFetch.mock.calls[0] as [string, RequestInit]
    const body = JSON.parse(opts.body as string)
    expect(body.one_liner).toBe("一行サマリ")
    expect(body.summary).toBe("段落サマリ")
    expect(body.stock_codes).toEqual(["7203", "9984"])
    expect(body.tags).toEqual(["バリュー", "テック"])
    expect(body.is_public).toBe(true)
  })

  it("returns isError=true on 401", async () => {
    mockFetch.mockResolvedValueOnce(makeErrorResponse(401, "Unauthorized"))

    const { saveReportTool } = await import("../../src/mcp/tools/save-report")
    const result = await saveReportTool.handler({
      title: "Test",
      body_markdown: "body",
    })

    expect(result.isError).toBe(true)
    const parsed = JSON.parse(result.content[0].text)
    expect(parsed.error).toContain("401")
  })

  it("returns isError=true with FORBIDDEN_PRIVATE_PLAN message on 403", async () => {
    mockFetch.mockResolvedValueOnce(
      makeErrorResponse(403, JSON.stringify({ code: "FORBIDDEN_PRIVATE_PLAN" })),
    )

    const { saveReportTool } = await import("../../src/mcp/tools/save-report")
    const result = await saveReportTool.handler({
      title: "Test",
      body_markdown: "body",
      is_public: false,
    })

    expect(result.isError).toBe(true)
    const parsed = JSON.parse(result.content[0].text)
    expect(parsed.error).toContain("FORBIDDEN_PRIVATE_PLAN")
  })

  it("returns isError=true on network error", async () => {
    mockFetch.mockRejectedValueOnce(new Error("ECONNREFUSED"))

    const { saveReportTool } = await import("../../src/mcp/tools/save-report")
    const result = await saveReportTool.handler({
      title: "Test",
      body_markdown: "body",
    })

    expect(result.isError).toBe(true)
    const parsed = JSON.parse(result.content[0].text)
    expect(parsed.error).toContain("ECONNREFUSED")
  })
})

describe("saveReportTool metadata", () => {
  it("has correct name", async () => {
    const { saveReportTool } = await import("../../src/mcp/tools/save-report")
    expect(saveReportTool.name).toBe("save_report")
  })

  it("description mentions explicit user request", async () => {
    const { saveReportTool } = await import("../../src/mcp/tools/save-report")
    expect(saveReportTool.config.description).toContain("明示的")
  })
})
