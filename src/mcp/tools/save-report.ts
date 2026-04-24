import { z } from "zod"
import { getApiBase, getAuthHeaders } from "../../lib/api-client"

const API_PATH_CREATE = "/api/report/create"

function getWebBase(): string {
  const apiBase = getApiBase()
  if (apiBase.includes("api.ticker-code.com")) return "https://ticker-code.com"
  return apiBase.replace(/^https?:\/\/api\./, "https://")
}

async function postReport(payload: unknown): Promise<{ id: string; slug: string }> {
  const url = `${getApiBase()}${API_PATH_CREATE}`
  let res: Response
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify(payload),
    })
  } catch (err) {
    throw new Error(`Network error calling ${url}: ${(err as Error).message}`)
  }

  if (res.status === 401) {
    throw new Error(
      "認証エラー (401): TICKERCODE_API_KEY が未設定または無効です。",
    )
  }
  if (res.status === 403) {
    const text = await res.text().catch(() => "")
    let detail = ""
    try {
      const json = JSON.parse(text)
      const code = json?.error?.code ?? json?.code ?? ""
      if (code === "LOCKED" || text.includes("LOCKED")) {
        detail = "アカウントがロックされています (403 LOCKED)。サポートにお問い合わせください。"
      } else if (code === "FORBIDDEN_PRIVATE_PLAN" || text.includes("FORBIDDEN_PRIVATE_PLAN")) {
        detail =
          "このプランでは private レポートは作成できません (403 FORBIDDEN_PRIVATE_PLAN)。is_public=true にするか上位プランにアップグレードしてください。"
      } else {
        detail = `アクセス拒否 (403): ${text.slice(0, 200)}`
      }
    } catch {
      detail = `アクセス拒否 (403): ${text.slice(0, 200)}`
    }
    throw new Error(detail)
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`API ${res.status} ${res.statusText} — ${API_PATH_CREATE}\n${text.slice(0, 500)}`)
  }

  const json = (await res.json()) as { success: boolean; data: { id: string; slug: string } }
  if (!json.success) {
    throw new Error("レポート保存に失敗しました (success=false)")
  }
  return json.data
}

export const saveReportTool = {
  name: "save_report",
  config: {
    title: "Save Report",
    description:
      "分析結果を web の report として保存する。ユーザーが明示的に「レポートにして」「保存して」と依頼した時のみ使用。勝手に呼ばない。保存後は id, url, slug を返す。",
    inputSchema: {
      title: z
        .string()
        .max(120)
        .describe("レポートのタイトル（60 文字以内推奨）"),
      body_markdown: z
        .string()
        .describe("レポート本文（会話で生成した分析 markdown）"),
      one_liner: z
        .string()
        .max(120)
        .optional()
        .describe("1行サマリ（80 文字以内推奨）"),
      summary: z
        .string()
        .optional()
        .describe("短い段落サマリ"),
      stock_code: z
        .string()
        .optional()
        .describe("主要銘柄コード（1 銘柄の場合）"),
      stock_codes: z
        .array(z.string())
        .optional()
        .describe("複数銘柄コードのリスト"),
      tags: z
        .array(z.string())
        .optional()
        .describe("タグリスト"),
      is_public: z
        .boolean()
        .optional()
        .describe("true = 公開。デフォルト false（private）。ユーザーが明示的に公開を希望した時のみ true にする"),
    },
  },
  async handler({
    title,
    body_markdown,
    one_liner,
    summary,
    stock_code,
    stock_codes,
    tags,
    is_public,
  }: {
    title: string
    body_markdown: string
    one_liner?: string
    summary?: string
    stock_code?: string
    stock_codes?: string[]
    tags?: string[]
    is_public?: boolean
  }) {
    const payload: Record<string, unknown> = {
      source: "agent_cli",
      title,
      body_markdown,
      is_public: is_public ?? false,
    }
    if (one_liner) payload.one_liner = one_liner
    if (summary) payload.summary = summary
    if (stock_code) payload.stock_code = stock_code
    if (stock_codes?.length) payload.stock_codes = stock_codes
    if (tags?.length) payload.tags = tags

    try {
      const { id, slug } = await postReport(payload)
      const url = `${getWebBase()}/report/${slug}`
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ id, slug, url }, null, 2),
          },
        ],
      }
    } catch (err) {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ error: (err as Error).message }),
          },
        ],
        isError: true,
      }
    }
  },
} as const
