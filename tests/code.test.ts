import { describe, it, expect } from "vitest"
import { normalizeCode, displayCode } from "../src/lib/code"

describe("normalizeCode", () => {
  it("4 digit -> 5 digit (append 0)", () => {
    expect(normalizeCode("2418")).toBe("24180")
    expect(normalizeCode("7203")).toBe("72030")
  })

  it("5 digit -> unchanged", () => {
    expect(normalizeCode("24180")).toBe("24180")
    expect(normalizeCode("13010")).toBe("13010")
  })

  it("trims whitespace", () => {
    expect(normalizeCode("  2418  ")).toBe("24180")
  })

  it("rejects non-digits", () => {
    expect(() => normalizeCode("abc")).toThrow(/digits only/)
    expect(() => normalizeCode("24a8")).toThrow(/digits only/)
  })

  it("rejects wrong length", () => {
    expect(() => normalizeCode("241")).toThrow(/length/)
    expect(() => normalizeCode("241800")).toThrow(/length/)
  })
})

describe("displayCode", () => {
  it("5 digit ending with 0 -> 4 digit", () => {
    expect(displayCode("24180")).toBe("2418")
    expect(displayCode("72030")).toBe("7203")
  })

  it("5 digit not ending with 0 -> unchanged", () => {
    expect(displayCode("24185")).toBe("24185")
  })

  it("other lengths -> unchanged", () => {
    expect(displayCode("2418")).toBe("2418")
  })
})
