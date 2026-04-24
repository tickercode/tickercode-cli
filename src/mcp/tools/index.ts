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
import { screenTool } from "./screen"
import { rankTool } from "./rank"
import { overviewSearchTool } from "./overview-search"
import { overviewSyncTool, overviewStatusTool } from "./overview-sync"
import { researchIdeaTool } from "./research-idea"
import { researchBatchTool } from "./research-batch"
import { webSearchTool, webFetchTool, webRenderTool } from "./web-search"
import { saveReportTool } from "./save-report"

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
  screenTool,
  rankTool,
  overviewSyncTool,
  overviewStatusTool,
  overviewSearchTool,
  researchIdeaTool,
  researchBatchTool,
  webSearchTool,
  webFetchTool,
  webRenderTool,
  saveReportTool,
]
