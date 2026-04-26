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

describe("tc issues list --json", () => {
  it("outputs parseable JSON when --json flag is used", async () => {
    const items = [
      { id: 1, title: "Issue A", status: "open", created_at: "2024-01-01T00:00:00Z" },
    ]
    mockFetch.mockResolvedValueOnce(makeOkResponse({ success: true, data: { items } }))

    // Capture stdout
    const chunks: string[] = []
    const origWrite = process.stdout.write.bind(process.stdout)
    vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
      chunks.push(String(chunk))
      return true
    })

    const { listIssuesCommand } = await import("../../../src/commands/issues/list")
    await listIssuesCommand.run?.({ args: { _: [], json: true, mine: false, status: "", "updated-since": "" }, cmd: {} as never, rawArgs: [], data: undefined })

    process.stdout.write = origWrite

    const output = chunks.join("")
    const parsed = JSON.parse(output)
    expect(Array.isArray(parsed)).toBe(true)
    expect(parsed[0].id).toBe(1)
  })

  it("sends mine=true filter when --mine flag is set", async () => {
    const items: unknown[] = []
    mockFetch.mockResolvedValueOnce(makeOkResponse({ success: true, data: { items } }))

    vi.spyOn(process.stdout, "write").mockImplementation(() => true)

    const { listIssuesCommand } = await import("../../../src/commands/issues/list")
    await listIssuesCommand.run?.({ args: { _: [], json: false, mine: true, status: "", "updated-since": "" }, cmd: {} as never, rawArgs: [], data: undefined })

    expect(mockFetch).toHaveBeenCalledOnce()
    const [, opts] = mockFetch.mock.calls[0] as [string, RequestInit]
    const body = JSON.parse(opts.body as string)
    expect(body.mine).toBe(true)
  })
})
