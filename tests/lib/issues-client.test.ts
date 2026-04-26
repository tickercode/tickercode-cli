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

beforeEach(() => {
  vi.clearAllMocks()
  process.env.TICKERCODE_API_KEY = "test-token"
  process.env.TICKERCODE_API_BASE = "https://api.ticker-code.com"
})

describe("formatTcId", () => {
  it('formats numeric id 42 as "TC-42"', async () => {
    const { formatTcId } = await import("../../src/lib/issues-client")
    expect(formatTcId(42)).toBe("TC-42")
  })

  it('formats numeric id 1 as "TC-1"', async () => {
    const { formatTcId } = await import("../../src/lib/issues-client")
    expect(formatTcId(1)).toBe("TC-1")
  })
})

describe("parseTcId", () => {
  it('parses "TC-42" to 42', async () => {
    const { parseTcId } = await import("../../src/lib/issues-client")
    expect(parseTcId("TC-42")).toBe(42)
  })

  it('returns null for "TC-" (no number)', async () => {
    const { parseTcId } = await import("../../src/lib/issues-client")
    expect(parseTcId("TC-")).toBeNull()
  })

  it('returns null for arbitrary string', async () => {
    const { parseTcId } = await import("../../src/lib/issues-client")
    expect(parseTcId("not-an-id")).toBeNull()
  })

  it('returns null for empty string', async () => {
    const { parseTcId } = await import("../../src/lib/issues-client")
    expect(parseTcId("")).toBeNull()
  })
})

describe("listIssues", () => {
  it("POSTs to /issues/list endpoint", async () => {
    const responseData = { success: true, data: { items: [] } }
    mockFetch.mockResolvedValueOnce(makeOkResponse(responseData))

    const { listIssues } = await import("../../src/lib/issues-client")
    await listIssues({})

    expect(mockFetch).toHaveBeenCalledOnce()
    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe("https://api.ticker-code.com/issues/list")
    expect(opts.method).toBe("POST")
  })

  it("sends Authorization: Bearer header with personal token", async () => {
    const responseData = { success: true, data: { items: [] } }
    mockFetch.mockResolvedValueOnce(makeOkResponse(responseData))

    const { listIssues } = await import("../../src/lib/issues-client")
    await listIssues({ mine: true })

    const [, opts] = mockFetch.mock.calls[0] as [string, RequestInit]
    const headers = opts.headers as Record<string, string>
    expect(headers["Authorization"]).toBe("Bearer test-token")
  })

  it("sends mine filter in request body when mine=true", async () => {
    const responseData = { success: true, data: { items: [] } }
    mockFetch.mockResolvedValueOnce(makeOkResponse(responseData))

    const { listIssues } = await import("../../src/lib/issues-client")
    await listIssues({ mine: true })

    const [, opts] = mockFetch.mock.calls[0] as [string, RequestInit]
    const body = JSON.parse(opts.body as string)
    expect(body.mine).toBe(true)
  })

  it("returns items from API response", async () => {
    const items = [{ id: 1, title: "Test Issue", status: "open" }]
    mockFetch.mockResolvedValueOnce(makeOkResponse({ success: true, data: { items } }))

    const { listIssues } = await import("../../src/lib/issues-client")
    const result = await listIssues({})
    expect(result).toEqual(items)
  })
})
