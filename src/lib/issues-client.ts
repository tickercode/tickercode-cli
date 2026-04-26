import { getApiBase, getAuthHeaders } from "./api-client"

export interface Issue {
  id: number
  title: string
  status: string
  source?: string
  priority?: string
  labels?: string[]
  actor_id?: string
  created_at?: string
  updated_at?: string
}

export interface IssueMessage {
  id: number
  issue_id: number
  body: string
  actor_id?: string
  meta?: Record<string, unknown>
  created_at?: string
}

export interface ListIssuesOptions {
  mine?: boolean
  status?: string
  source?: string
  updatedSince?: number
}

export interface CreateIssueOptions {
  title: string
  source?: string
  body?: string
  priority?: string
  labels?: string[]
  actorId?: string
}

export interface UpdateIssuePatch {
  title?: string
  status?: string
  priority?: string
  labels?: string[]
}

export function formatTcId(n: number): string {
  return `TC-${n}`
}

export function parseTcId(s: string): number | null {
  const match = /^TC-(\d+)$/.exec(s)
  if (!match) return null
  const n = Number.parseInt(match[1], 10)
  return Number.isNaN(n) ? null : n
}

async function post<T = unknown>(path: string, body: unknown): Promise<T> {
  const url = `${getApiBase()}${path}`
  let res: Response
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify(body),
    })
  } catch (err) {
    throw new Error(`Network error calling ${url}: ${(err as Error).message}`)
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`API ${res.status} ${res.statusText} — ${path}\n${text.slice(0, 500)}`)
  }

  return (await res.json()) as T
}

export async function listIssues(opts: ListIssuesOptions): Promise<Issue[]> {
  const body: Record<string, unknown> = {}
  if (opts.mine !== undefined) body.mine = opts.mine
  if (opts.status !== undefined) body.status = opts.status
  if (opts.source !== undefined) body.source = opts.source
  if (opts.updatedSince !== undefined) body.updated_since = opts.updatedSince

  const res = await post<{ success: boolean; data: { items: Issue[] } }>("/issues/list", body)
  return res.data?.items ?? []
}

export async function getIssue(id: number): Promise<{ issue: Issue; messages: IssueMessage[] }> {
  const res = await post<{ success: boolean; data: { issue: Issue; messages: IssueMessage[] } }>(
    "/issues/get",
    { id },
  )
  return res.data
}

export async function createIssue(opts: CreateIssueOptions): Promise<string> {
  const body: Record<string, unknown> = { title: opts.title }
  if (opts.source !== undefined) body.source = opts.source
  if (opts.body !== undefined) body.body = opts.body
  if (opts.priority !== undefined) body.priority = opts.priority
  if (opts.labels !== undefined) body.labels = opts.labels
  if (opts.actorId !== undefined) body.actor_id = opts.actorId

  const res = await post<{ success: boolean; data: { id: number } }>("/issues/create", body)
  return formatTcId(res.data.id)
}

export async function postMessage(
  issueId: number,
  body: string,
  meta?: Record<string, unknown>,
): Promise<number> {
  const payload: Record<string, unknown> = { issue_id: issueId, body }
  if (meta !== undefined) payload.meta = meta

  const res = await post<{ success: boolean; data: { id: number } }>("/issues/post-message", payload)
  return res.data.id
}

export async function updateIssue(id: number, patch: UpdateIssuePatch): Promise<void> {
  await post("/issues/update", { id, ...patch })
}

export async function resolveIssue(id: number): Promise<void> {
  await post("/issues/resolve", { id })
}
