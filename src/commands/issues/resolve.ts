import { defineCommand } from "citty"
import pc from "picocolors"
import { resolveIssue, parseTcId } from "../../lib/issues-client"

export const resolveIssueCommand = defineCommand({
  meta: {
    name: "resolve",
    description: "Resolve an issue",
  },
  args: {
    id: {
      type: "positional",
      description: "Issue ID (e.g. TC-42)",
      required: true,
    },
  },
  async run({ args }) {
    const n = parseTcId(String(args.id))
    if (n === null) {
      process.stderr.write(pc.red(`Invalid issue ID: ${args.id}\n`))
      process.exit(1)
    }

    await resolveIssue(n)
    process.stdout.write(`${pc.green("✓")} Resolved TC-${n}\n`)
  },
})
