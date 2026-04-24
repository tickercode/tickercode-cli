/**
 * Web Search tools — Brave API + CF Browser Rendering 経由
 *
 * `/api/web-search/*` 3 endpoints の MCP wrapper:
 * - web_search  → keyword 検索 (Brave API)
 * - web_fetch   → URL 本文取得（静的抽出、失敗時 BR 自動 fallback）
 * - web_render  → CF Browser Rendering で強制再取得（SPA 向け）
 */

import { z } from "zod"
import { postJson } from "../../lib/api-client"

// ApiResponse<T> ラッパー
type ApiResponse<T> = { success: boolean; data?: T; error?: string }

// ============================================================================
// web_search
// ============================================================================

type SearchResponse = {
  query: string
  results: Array<{
    title: string
    url: string
    snippet: string
    age?: string
    published_at?: string | null
    source_domain: string
    source_favicon?: string | null
    language?: string | null
  }>
  meta: { total: number; source: string; cached: boolean; cached_at?: string }
}

export const webSearchTool = {
  name: "web_search",
  config: {
    title: "Web Search (Brave)",
    description:
      "Search the web via Brave Search API. Returns a list of URLs + snippets. " +
      "Useful for finding news, company pages, industry reports. Japanese query OK. " +
      "Use with `web_fetch` to retrieve article bodies for specific URLs.",
    inputSchema: {
      query: z.string().describe("Search query (Japanese OK), e.g. 'ニデック 2025 決算'"),
      limit: z.number().optional().describe("Max results (default 10, max 20)"),
      freshness: z
        .enum(["pd", "pw", "pm", "py"])
        .optional()
        .describe("Filter by recency: pd=24h, pw=7d, pm=30d, py=365d"),
      country: z
        .enum(["JP", "US", "ALL"])
        .optional()
        .describe("Country bias (default JP)"),
      site: z
        .string()
        .optional()
        .describe("Limit results to one domain, e.g. 'ir.nidec.com'"),
      exclude_sites: z
        .array(z.string())
        .optional()
        .describe("Exclude these domains, e.g. ['pinterest.com']"),
    },
  },
  async handler(input: {
    query: string
    limit?: number
    freshness?: "pd" | "pw" | "pm" | "py"
    country?: "JP" | "US" | "ALL"
    site?: string
    exclude_sites?: string[]
  }) {
    const res = await postJson<ApiResponse<SearchResponse>>(
      "/api/web-search/search",
      input,
    )
    if (!res.success || !res.data) {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ error: res.error ?? "Search failed" }),
          },
        ],
        isError: true,
      }
    }
    return {
      content: [{ type: "text" as const, text: JSON.stringify(res.data, null, 2) }],
    }
  },
} as const

// ============================================================================
// web_fetch
// ============================================================================

type FetchResponse = {
  url: string
  final_url: string
  title: string | null
  content: string
  excerpt: string | null
  author: string | null
  published_at: string | null
  language: string | null
  meta: {
    renderer: "static" | "browser" | "browser-failed"
    http_status: number
    content_length: number
    cached: boolean
    fetched_at: string
  }
}

export const webFetchTool = {
  name: "web_fetch",
  config: {
    title: "Web Fetch (extract body)",
    description:
      "Fetch the body text of a URL. Tries static HTTP first, then falls back to " +
      "CF Browser Rendering if extraction fails. Returns clean markdown (default) " +
      "or plain text / raw HTML. Use for article content, press releases, IR pages.",
    inputSchema: {
      url: z.string().describe("Full URL to fetch (http/https only)"),
      format: z
        .enum(["text", "markdown", "html"])
        .optional()
        .describe("Output format (default 'markdown')"),
      max_length: z
        .number()
        .optional()
        .describe("Max content length (default 20000, max 50000)"),
      include_links: z
        .boolean()
        .optional()
        .describe("Include [text](url) markdown links (default false)"),
      force_browser: z
        .boolean()
        .optional()
        .describe(
          "Skip static fetch and use CF Browser Rendering directly (default false)",
        ),
    },
  },
  async handler(input: {
    url: string
    format?: "text" | "markdown" | "html"
    max_length?: number
    include_links?: boolean
    force_browser?: boolean
  }) {
    const res = await postJson<ApiResponse<FetchResponse>>(
      "/api/web-search/fetch",
      input,
    )
    if (!res.success || !res.data) {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ error: res.error ?? "Fetch failed" }),
          },
        ],
        isError: true,
      }
    }
    return {
      content: [{ type: "text" as const, text: JSON.stringify(res.data, null, 2) }],
    }
  },
} as const

// ============================================================================
// web_render (explicit CF Browser Rendering)
// ============================================================================

export const webRenderTool = {
  name: "web_render",
  config: {
    title: "Web Render (CF Browser Rendering)",
    description:
      "Explicitly fetch a URL via CF Browser Rendering, bypassing static fetch. " +
      "Use when `web_fetch` returned empty/short content (SPA, JS-heavy sites). " +
      "Slower (~3-5s) but works for sites that need JavaScript execution.",
    inputSchema: {
      url: z.string().describe("Full URL to render"),
      format: z.enum(["text", "markdown", "html"]).optional(),
      max_length: z.number().optional(),
      include_links: z.boolean().optional(),
    },
  },
  async handler(input: {
    url: string
    format?: "text" | "markdown" | "html"
    max_length?: number
    include_links?: boolean
  }) {
    const res = await postJson<ApiResponse<FetchResponse>>(
      "/api/web-search/render",
      input,
    )
    if (!res.success || !res.data) {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ error: res.error ?? "Render failed" }),
          },
        ],
        isError: true,
      }
    }
    return {
      content: [{ type: "text" as const, text: JSON.stringify(res.data, null, 2) }],
    }
  },
} as const
