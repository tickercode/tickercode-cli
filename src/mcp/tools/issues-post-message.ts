import { z } from "zod"
import { getApiBase, getAuthHeaders } from "../../lib/api-client"

const description =
  "イシューにメッセージ（コメント）を投稿する。issue_id と body は必須。meta はオプションのメタデータ。"
const inputSchema = {
  type: "object",
  required: ["issue_id", "body"],
  properties: {
    issue_id: {
      type: "number",
      description: "イシューの数値 ID",
    },
    body: {
      type: "string",
      description: "メッセージ本文",
    },
    meta: {
      type: "object",
      description: "オプションのメタデータ",
      additionalProperties: true,
    },
  },
  additionalProperties: false,
}

export const issuesPostMessageTool = {
  name: "tc_issues_post_message",
  description,
  inputSchema,
  config: {
    title: "Post TickerCode Issue Message",
    description,
    inputSchema: {
      issue_id: z.number().describe("イシューの数値 ID"),
      body: z.string().describe("メッセージ本文"),
      meta: z.record(z.string(), z.unknown()).optional().describe("オプションのメタデータ"),
    },
  },
  async handler(input: { issue_id: number; body: string; meta?: Record<string, unknown> }) {
    const payload: Record<string, unknown> = { issue_id: input.issue_id, body: input.body }
    if (input.meta !== undefined) payload.meta = input.meta

    const url = `${getApiBase()}/issues/post-message`
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(payload),
      })
      const json = (await res.json()) as { success: boolean; data: { id: number } }
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ message_id: json.data.id }, null, 2) }],
      }
    } catch (err) {
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ error: (err as Error).message }) }],
        isError: true,
      }
    }
  },
} as const
