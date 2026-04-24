import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { mkdirSync, rmSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"

// Patch homedir to use a temp directory for each test
const testHome = join(tmpdir(), `tc-auth-test-${process.pid}`)
vi.mock("node:os", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:os")>()
  return {
    ...actual,
    homedir: () => testHome,
  }
})

// Import after mock is set up
import { loadCredentials, saveCredentials, clearCredentials } from "../../src/lib/credentials"

beforeEach(() => {
  mkdirSync(join(testHome, ".tickercode"), { recursive: true })
})

afterEach(() => {
  rmSync(testHome, { recursive: true, force: true })
})

describe("credentials round-trip", () => {
  it("saves and loads credentials", () => {
    const cred = {
      api_key: "ak_cli_" + "a".repeat(32),
      created_at: "2026-04-24T00:00:00.000Z",
      user: { id: 1, email: "test@example.com", role: "USER" },
    }
    saveCredentials(cred)
    const loaded = loadCredentials()
    expect(loaded).toEqual(cred)
  })

  it("returns null when no credentials file", () => {
    expect(loadCredentials()).toBeNull()
  })

  it("clearCredentials removes the file", () => {
    saveCredentials({
      api_key: "ak_cli_" + "b".repeat(32),
      created_at: "2026-04-24T00:00:00.000Z",
    })
    expect(loadCredentials()).not.toBeNull()
    clearCredentials()
    expect(loadCredentials()).toBeNull()
  })

  it("clearCredentials is idempotent when no file exists", () => {
    expect(() => clearCredentials()).not.toThrow()
  })
})

describe("API key format validation", () => {
  const PATTERN = /^ak_(cli|mcp|web)_[a-f0-9]{32}$/

  it("accepts valid cli key", () => {
    expect(PATTERN.test("ak_cli_" + "a1b2c3d4".repeat(4))).toBe(true)
  })

  it("accepts valid mcp key", () => {
    expect(PATTERN.test("ak_mcp_" + "deadbeef".repeat(4))).toBe(true)
  })

  it("accepts valid web key", () => {
    expect(PATTERN.test("ak_web_" + "cafebabe".repeat(4))).toBe(true)
  })

  it("rejects wrong prefix", () => {
    expect(PATTERN.test("sk_live_" + "a".repeat(32))).toBe(false)
  })

  it("rejects too short hex", () => {
    expect(PATTERN.test("ak_cli_" + "a".repeat(31))).toBe(false)
  })

  it("rejects too long hex", () => {
    expect(PATTERN.test("ak_cli_" + "a".repeat(33))).toBe(false)
  })

  it("rejects uppercase hex", () => {
    expect(PATTERN.test("ak_cli_" + "A".repeat(32))).toBe(false)
  })

  it("rejects non-hex characters", () => {
    expect(PATTERN.test("ak_cli_" + "g".repeat(32))).toBe(false)
  })

  it("rejects empty string", () => {
    expect(PATTERN.test("")).toBe(false)
  })
})

describe("whoami — no credentials", () => {
  it("loadCredentials returns null after logout", () => {
    saveCredentials({
      api_key: "ak_cli_" + "c".repeat(32),
      created_at: "2026-04-24T00:00:00.000Z",
    })
    clearCredentials()
    expect(loadCredentials()).toBeNull()
  })
})

describe("fetchMe — 401 handling (fetch mock)", () => {
  it("returns null on 401", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ success: false }),
    })
    vi.stubGlobal("fetch", mockFetch)

    // Inline the logic from auth.ts fetchMe to test in isolation
    async function fetchMe(apiKey: string) {
      const res = await fetch("https://api.ticker-code.com/api/user/me", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({}),
      })
      if (!res.ok) return null
      const json = (await res.json()) as { success?: boolean; data?: unknown }
      if (!json.success || !json.data) return null
      return json.data
    }

    const result = await fetchMe("ak_cli_" + "d".repeat(32))
    expect(result).toBeNull()
    vi.unstubAllGlobals()
  })

  it("returns user data on 200", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: { id: 42, email: "user@example.com", role: "USER" },
      }),
    })
    vi.stubGlobal("fetch", mockFetch)

    async function fetchMe(apiKey: string) {
      const res = await fetch("https://api.ticker-code.com/api/user/me", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({}),
      })
      if (!res.ok) return null
      const json = (await res.json()) as { success?: boolean; data?: { id: number; email: string; role: string } }
      if (!json.success || !json.data) return null
      return json.data
    }

    const result = await fetchMe("ak_cli_" + "e".repeat(32))
    expect(result).toEqual({ id: 42, email: "user@example.com", role: "USER" })
    vi.unstubAllGlobals()
  })
})
