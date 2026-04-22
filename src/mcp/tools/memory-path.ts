import { z } from "zod"
import { resolvePath } from "../../memory/query"
import { ENDPOINTS, type EndpointName } from "../../memory/paths"

const ENDPOINT_KEYS = Object.keys(ENDPOINTS) as EndpointName[]

export const memoryPathTool = {
  name: "memory_path",
  config: {
    title: "Get Memory File Path",
    description:
      "Return the absolute path to a cached endpoint file (or stock directory when endpoint is omitted). Use this to feed the path into the Read tool so the agent can inspect raw data without loading it into context via MCP.",
    inputSchema: {
      code: z.string().describe("Ticker code, or 'mini' for mini.json"),
      endpoint: z
        .enum(["overview", "financial", "edinet", "disclosure", "news", "mini"])
        .optional()
        .describe(`Endpoint name: ${ENDPOINT_KEYS.join(", ")} or 'mini'`),
    },
  },
  async handler({ code, endpoint }: { code: string; endpoint?: EndpointName | "mini" }) {
    const path = resolvePath(code, endpoint)
    return {
      content: [{ type: "text" as const, text: JSON.stringify({ path }) }],
    }
  },
} as const
