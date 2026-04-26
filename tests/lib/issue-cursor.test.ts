import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { mkdirSync, rmSync, existsSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"

const TEST_HOME = join(tmpdir(), `tc-cursor-test-${process.pid}`)

vi.mock("node:os", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:os")>()
  return { ...actual, homedir: () => TEST_HOME }
})

beforeEach(() => {
  mkdirSync(join(TEST_HOME, ".tickercode"), { recursive: true })
})

afterEach(() => {
  if (existsSync(TEST_HOME)) {
    rmSync(TEST_HOME, { recursive: true, force: true })
  }
})

describe("readCursor", () => {
  it("returns null when cursor file does not exist", async () => {
    const { readCursor } = await import("../../src/lib/issue-cursor")
    const result = readCursor("actor-1")
    expect(result).toBeNull()
  })

  it("returns null for unknown actor even if file exists", async () => {
    const { readCursor, writeCursor } = await import("../../src/lib/issue-cursor")
    writeCursor("actor-1", 1700000000)
    const result = readCursor("actor-2")
    expect(result).toBeNull()
  })
})

describe("writeCursor / readCursor round-trip", () => {
  it("returns the same timestamp after write", async () => {
    const { readCursor, writeCursor } = await import("../../src/lib/issue-cursor")
    const ts = 1700000000
    writeCursor("actor-1", ts)
    expect(readCursor("actor-1")).toBe(ts)
  })

  it("overwrites previous value for same actor", async () => {
    const { readCursor, writeCursor } = await import("../../src/lib/issue-cursor")
    writeCursor("actor-1", 1700000000)
    writeCursor("actor-1", 1700001234)
    expect(readCursor("actor-1")).toBe(1700001234)
  })

  it("different actors do not interfere", async () => {
    const { readCursor, writeCursor } = await import("../../src/lib/issue-cursor")
    writeCursor("actor-a", 1111111111)
    writeCursor("actor-b", 2222222222)
    expect(readCursor("actor-a")).toBe(1111111111)
    expect(readCursor("actor-b")).toBe(2222222222)
  })
})

describe("getDefaultSince", () => {
  it("returns cursor ts when cursor exists", async () => {
    const { getDefaultSince, writeCursor } = await import("../../src/lib/issue-cursor")
    const ts = 1700000000
    writeCursor("actor-1", ts)
    const result = getDefaultSince("actor-1")
    expect(result).toBe(ts)
  })

  it("returns a timestamp ~24h in the past when cursor is absent", async () => {
    const { getDefaultSince } = await import("../../src/lib/issue-cursor")
    const before = Math.floor(Date.now() / 1000) - 24 * 3600
    const result = getDefaultSince("no-such-actor")
    expect(result).toBeGreaterThanOrEqual(before - 5)
    expect(result).toBeLessThanOrEqual(before + 5)
  })
})
