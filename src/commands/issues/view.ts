import { defineCommand } from "citty"
import pc from "picocolors"
import { getIssue, parseTcId } from "../../lib/issues-client"

export const viewIssueCommand = defineCommand({
  meta: {
    name: "view",
    description: "View an issue by TC-N ID",
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

    const { issue, messages } = await getIssue(n)

    process.stdout.write(
      `${pc.bold(issue.title)}\n` +
        `ID:      TC-${issue.id}\n` +
        `Status:  ${issue.status}\n` +
        (issue.priority ? `Priority: ${issue.priority}\n` : "") +
        (issue.source ? `Source:  ${issue.source}\n` : "") +
        `\n`,
    )

    if (messages.length > 0) {
      process.stdout.write(`${pc.bold("Messages")} (${messages.length})\n`)
      for (const msg of messages) {
        process.stdout.write(`${pc.dim("─".repeat(40))}\n${msg.body}\n`)
      }
    }
  },
})
