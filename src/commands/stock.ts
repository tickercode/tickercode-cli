import { defineCommand } from "citty"
import { postJson } from "../lib/api-client"
import { normalizeCode } from "../lib/code"
import { formatOutput, type Format } from "../lib/format"

export const stockCommand = defineCommand({
  meta: {
    name: "stock",
    description: "Fetch stock overview (price + key metrics) for a ticker code",
  },
  args: {
    code: {
      type: "positional",
      description: "4-digit or 5-digit ticker code (e.g. 2418)",
      required: true,
    },
    format: {
      type: "string",
      description: "Output format: pretty | json | md",
      default: "pretty",
      alias: "f",
    },
  },
  async run({ args }) {
    const code5 = normalizeCode(String(args.code))
    const data = await postJson("/api/full/stock", { code: code5 })
    formatOutput(data, {
      kind: "stock",
      format: String(args.format) as Format,
    })
  },
})
