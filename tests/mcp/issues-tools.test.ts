import { describe, it, expect } from "vitest"

type TestTool = {
  name: string
  description?: string
  inputSchema?: { required?: string[] }
}

describe("MCP issues tools registration", () => {
  it("getMcpTools returns all 6 issue tools", async () => {
    const { tools } = await import("../../src/mcp/tools/index")
    const testTools = tools as readonly TestTool[]
    const names = testTools.map((t) => t.name)

    expect(names).toContain("tc_issues_list")
    expect(names).toContain("tc_issues_create")
    expect(names).toContain("tc_issues_get")
    expect(names).toContain("tc_issues_post_message")
    expect(names).toContain("tc_issues_update")
    expect(names).toContain("tc_issues_resolve")
  })

  it("each issue tool has a non-empty description", async () => {
    const { tools } = await import("../../src/mcp/tools/index")
    const testTools = tools as readonly TestTool[]
    const issueToolNames = [
      "tc_issues_list",
      "tc_issues_create",
      "tc_issues_get",
      "tc_issues_post_message",
      "tc_issues_update",
      "tc_issues_resolve",
    ]

    for (const name of issueToolNames) {
      const tool = testTools.find((t) => t.name === name)
      expect(tool, `tool ${name} should be registered`).toBeDefined()
      expect(typeof tool?.description).toBe("string")
      expect(tool?.description?.length, `tool ${name} description should not be empty`).toBeGreaterThan(0)
    }
  })

  it("tc_issues_create inputSchema requires title", async () => {
    const { tools } = await import("../../src/mcp/tools/index")
    const testTools = tools as readonly TestTool[]
    const createTool = testTools.find((t) => t.name === "tc_issues_create")

    expect(createTool).toBeDefined()
    const schema = createTool?.inputSchema
    expect(schema?.required).toBeDefined()
    expect(schema?.required).toContain("title")
  })
})
