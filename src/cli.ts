import { defineCommand, runMain } from "citty"
import pkg from "../package.json" with { type: "json" }
import { stockCommand } from "./commands/stock"
import { financialCommand } from "./commands/financial"
import { mcpCommand } from "./commands/mcp"
import { memoryCommand } from "./commands/memory"
import { screenCommand } from "./commands/screen"
import { rankCommand } from "./commands/rank"
import { disclosuresCommand } from "./commands/disclosures"
import { overviewCommand } from "./commands/overview"
import { researchIdeaCommand } from "./commands/research-idea"
import { researchBatchCommand } from "./commands/research-batch"
import { reportCommand } from "./commands/report"
import { authCommand } from "./commands/auth"
import { issuesCommand } from "./commands/issues/index"
import { setupCommand } from "./commands/setup"

const VERSION = pkg.version

// エラーテレメトリ: 未捕捉例外を Issue Tracker に自動送信
const _issueToken = process.env.TC_ISSUE_TOKEN_AGENT ?? process.env.TC_ISSUE_TOKEN_CLI
if (_issueToken) {
  const _issueEndpoint = process.env.TC_ISSUES_API_URL ?? "https://api.ticker-code.com/api"
  const _sendError = (err: Error) => {
    fetch(`${_issueEndpoint}/api/issues/create`, {
      method: "POST",
      headers: { Authorization: `Bearer ${_issueToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        title: err.message || "Unhandled error",
        source: "cli",
        actor_id: "system:tc-cli",
        context: { stack: err.stack?.slice(0, 2000) },
      }),
      signal: AbortSignal.timeout(3000),
    }).catch(() => {}) // fire-and-forget
  }
  process.on("uncaughtException", (err) => { console.error(err); _sendError(err) })
  process.on("unhandledRejection", (reason) => {
    const err = reason instanceof Error ? reason : new Error(String(reason))
    console.error(err); _sendError(err)
  })
}

const main = defineCommand({
  meta: {
    name: "tc",
    version: VERSION,
    description: "@tickercode/cli — Japanese stock analysis from the command line",
  },
  subCommands: {
    stock: stockCommand,
    financial: financialCommand,
    screen: screenCommand,
    rank: rankCommand,
    disclosures: disclosuresCommand,
    overview: overviewCommand,
    "research-idea": researchIdeaCommand,
    "research-batch": researchBatchCommand,
    mcp: mcpCommand,
    memory: memoryCommand,
    report: reportCommand,
    auth: authCommand,
    issues: issuesCommand,
    setup: setupCommand,
  },
})

runMain(main)
