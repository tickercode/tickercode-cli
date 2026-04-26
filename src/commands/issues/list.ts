import { defineCommand } from "citty"
import pc from "picocolors"
import { listIssues } from "../../lib/issues-client"

export const listIssuesCommand = defineCommand({
  meta: {
    name: "list",
    description: "List issues",
  },
  args: {
    mine: {
      type: "boolean",
      description: "Show only my issues",
      default: false,
    },
    status: {
      type: "string",
      description: "Filter by status (open / closed)",
    },
    "updated-since": {
      type: "string",
      description: "Filter issues updated since timestamp (unix seconds) or 'auto'",
    },
    json: {
      type: "boolean",
      description: "Output as JSON",
      default: false,
    },
  },
  async run({ args }) {
    const items = await listIssues({
      mine: args.mine || undefined,
      status: args.status ? String(args.status) : undefined,
    })

    if (args.json) {
      process.stdout.write(JSON.stringify(items, null, 2))
      return
    }

    if (items.length === 0) {
      process.stdout.write(pc.dim("イシューがありません。\n"))
      return
    }

    process.stdout.write(`${pc.bold("Issues")} (${items.length})\n\n`)
    for (const item of items) {
      const status = item.status === "open" ? pc.green(item.status) : pc.dim(item.status)
      process.stdout.write(`  TC-${item.id}  ${status}  ${item.title}\n`)
    }
  },
})
