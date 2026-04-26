import { defineCommand } from "citty"
import pc from "picocolors"
import { readFileSync } from "node:fs"
import { postMessage, parseTcId } from "../../lib/issues-client"

export const commentIssueCommand = defineCommand({
  meta: {
    name: "comment",
    description: "Post a comment on an issue",
  },
  args: {
    id: {
      type: "positional",
      description: "Issue ID (e.g. TC-42)",
      required: true,
    },
    body: {
      type: "string",
      description: "Comment body or @file path",
      alias: "b",
    },
  },
  async run({ args }) {
    const n = parseTcId(String(args.id))
    if (n === null) {
      process.stderr.write(pc.red(`Invalid issue ID: ${args.id}\n`))
      process.exit(1)
    }

    let body: string
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
    } else {
      process.stderr.write(pc.red("--body は必須です。\n"))
      process.exit(1)
    }

    const msgId = await postMessage(n, body)
    process.stdout.write(`${pc.green("✓")} Comment posted (id: ${pc.cyan(String(msgId))})\n`)
  },
})
