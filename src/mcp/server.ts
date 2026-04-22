import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { tools } from "./tools"

const SERVER_NAME = "tickercode"
const SERVER_VERSION = "0.0.1"

export async function startMcpServer(): Promise<void> {
  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  })

  for (const tool of tools) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    server.registerTool(tool.name, tool.config as any, tool.handler as any)
  }

  const transport = new StdioServerTransport()
  await server.connect(transport)
}
