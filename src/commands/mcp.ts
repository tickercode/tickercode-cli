import { defineCommand } from "citty"
import { startMcpServer } from "../mcp/server"

export const mcpCommand = defineCommand({
  meta: {
    name: "mcp",
    description:
      "Run the tickercode MCP server over stdio (for Claude Code / Desktop / Cursor)",
  },
  async run() {
    await startMcpServer()
  },
})
