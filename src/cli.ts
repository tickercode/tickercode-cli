import { defineCommand, runMain } from "citty"
import { stockCommand } from "./commands/stock"
import { financialCommand } from "./commands/financial"
import { mcpCommand } from "./commands/mcp"
import { memoryCommand } from "./commands/memory"
import { screenCommand } from "./commands/screen"
import { rankCommand } from "./commands/rank"

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
    mcp: mcpCommand,
    memory: memoryCommand,
  },
})

runMain(main)
