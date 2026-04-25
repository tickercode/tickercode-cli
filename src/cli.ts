import { defineCommand, runMain } from "citty"
import { stockCommand } from "./commands/stock"
import { financialCommand } from "./commands/financial"
import { mcpCommand } from "./commands/mcp"
import { memoryCommand } from "./commands/memory"
import { screenCommand } from "./commands/screen"
import { rankCommand } from "./commands/rank"
import { overviewCommand } from "./commands/overview"
import { researchIdeaCommand } from "./commands/research-idea"
import { researchBatchCommand } from "./commands/research-batch"
import { reportCommand } from "./commands/report"
import { authCommand } from "./commands/auth"
import { issuesCommand } from "./commands/issues/index"
import { setupCommand } from "./commands/setup"

const VERSION = "0.0.1"

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
