import { defineCommand } from "citty"
import pc from "picocolors"
import { readFileSync } from "node:fs"
import { createIssue } from "../../lib/issues-client"

export const createIssueCommand = defineCommand({
  meta: {
    name: "create",
    description: "Create a new issue",
  },
  args: {
    title: {
      type: "string",
      description: "Issue title (required)",
      alias: "t",
      required: true,
    },
    body: {
      type: "string",
      description: "Issue body or @file path",
      alias: "b",
    },
    priority: {
      type: "string",
      description: "Priority: low / medium / high / critical",
    },
    source: {
      type: "string",
      description: "Source identifier",
    },
    labels: {
      type: "string",
      description: "Comma-separated labels",
    },
  },
  async run({ args }) {
    const title = String(args.title)

    let body: string | undefined
    if (args.body) {
      const raw = String(args.body)
      if (raw.startsWith("@")) {
        try {
          body = readFileSync(raw.slice(1), "utf8")
        } catch (err) {
          process.stderr.write(pc.red(`File read error: ${(err as Error).message}\n`))
          process.exit(1)
        }
      } else {
        body = raw
      }
    }

    const labels = args.labels
      ? String(args.labels).split(",").map((s) => s.trim()).filter(Boolean)
      : undefined

    const tcId = await createIssue({
      title,
      body,
      priority: args.priority ? String(args.priority) : undefined,
      source: args.source ? String(args.source) : undefined,
      labels,
    })

    process.stdout.write(`${pc.green("✓")} Created ${pc.cyan(tcId)}\n`)
  },
})
