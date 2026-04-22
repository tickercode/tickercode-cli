import { getStockTool } from "./get-stock"
import { normalizeCodeTool } from "./normalize-code"
import { fetchStockTool } from "./fetch-stock"
import { memoryPathTool } from "./memory-path"
import { memoryListTool } from "./memory-list"
import { getFinancialSummaryTool } from "./get-financial-summary"
import { getFinancialTrendTool } from "./get-financial-trend"
import { findPeersTool } from "./find-peers"
import { projectPLTool } from "./project-pl"
import { calculateMoatTool } from "./calculate-moat"

export const tools = [
  getStockTool,
  normalizeCodeTool,
  fetchStockTool,
  memoryPathTool,
  memoryListTool,
  getFinancialSummaryTool,
  getFinancialTrendTool,
  findPeersTool,
  projectPLTool,
  calculateMoatTool,
]
