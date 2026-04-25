import { defineCommand } from "citty"
import pc from "picocolors"
import { readFileSync } from "node:fs"
import { readFile } from "node:fs/promises"
import { parse as parseYaml } from "yaml"
import { getApiBase, getAuthHeaders } from "../lib/api-client"

const API_PATH_CREATE = "/api/report/create"
const API_PATH_LIST = "/api/report/list"
const API_PATH_SHOW = "/api/report/show"
const API_PATH_UPDATE = "/api/report/update"
const API_PATH_DELETE = "/api/report/delete"

function getWebBase(): string {
  // Derive web base from API base
  const apiBase = getApiBase()
  if (apiBase.includes("api.ticker-code.com")) return "https://ticker-code.com"
  return apiBase.replace(/^https?:\/\/api\./, "https://")
}

async function apiPost<T = unknown>(path: string, body: unknown): Promise<T> {
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

  if (res.status === 401) {
    process.stderr.write(
      pc.red(
        "認証エラー (401): 認証情報が未設定または無効です。\n" +
          "  tc auth login で認証してください。\n",
      ),
    )
    process.exit(1)
  }
  if (res.status === 403) {
    const text = await res.text().catch(() => "")
    let detail = ""
    try {
      const json = JSON.parse(text)
      const code = json?.error?.code ?? json?.code ?? ""
      if (code === "LOCKED" || text.includes("LOCKED")) {
        detail =
          "アカウントがロックされています (403 LOCKED)。サポートにお問い合わせください。"
      } else if (code === "FORBIDDEN_PRIVATE_PLAN" || text.includes("FORBIDDEN_PRIVATE_PLAN")) {
        detail =
          "このプランでは private レポートは作成できません (403 FORBIDDEN_PRIVATE_PLAN)。\n  上位プランにアップグレードするか --public を付けて公開レポートとして保存してください。"
      } else if (code === "FORBIDDEN_OFFICIAL_ROLE" || text.includes("FORBIDDEN_OFFICIAL_ROLE")) {
        detail =
          "この API Key には report:official scope がありません (403 FORBIDDEN_OFFICIAL_ROLE)。\n  Web の設定画面で scope を付与するか、ADMIN ロールで再発行してください。"
      } else {
        detail = `アクセス拒否 (403): ${text.slice(0, 200)}`
      }
    } catch {
      detail = `アクセス拒否 (403): ${text.slice(0, 200)}`
    }
    process.stderr.write(pc.red(`${detail}\n`))
    process.exit(1)
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`API ${res.status} ${res.statusText} — ${path}\n${text.slice(0, 500)}`)
  }
  return (await res.json()) as T
}

// --- save ---

const saveCommand = defineCommand({
  meta: {
    name: "save",
    description: "Save a report from stdin or a markdown file",
  },
  args: {
    title: {
      type: "string",
      description: "Report title (required if not in frontmatter)",
      alias: "t",
    },
    body: {
      type: "string",
      description: "Path to markdown file. Reads stdin if omitted.",
      alias: "b",
    },
    "one-liner": {
      type: "string",
      description: "One-line summary (≤80 chars)",
    },
    summary: {
      type: "string",
      description: "Short paragraph summary",
    },
    "stock-code": {
      type: "string",
      description: "Primary stock code (4 or 5 digits)",
    },
    "stock-codes": {
      type: "string",
      description: "Comma-separated stock codes for multi-stock reports",
    },
    tags: {
      type: "string",
      description: "Comma-separated tags",
    },
    public: {
      type: "boolean",
      description: "Publish as public report (default: private)",
      default: false,
    },
    official: {
      type: "boolean",
      description: "Mark as official report (requires ADMIN role or report:official scope)",
      default: false,
    },
    verdict: {
      type: "string",
      description: "Verdict text or enum code (e.g. 'strong_buy' / '慎重肯定')",
    },
    "verdict-code": {
      type: "string",
      description: "Explicit verdict enum code: strong_buy|buy|hold|lukewarm|mixed|sell|strong_sell",
    },
    panel: {
      type: "string",
      description: "Panel type (e.g. moat-deepdive / value-debate / jp-classic)",
    },
    turns: {
      type: "string",
      description: "Number of discussion turns",
    },
    panelists: {
      type: "string",
      description: "Comma-separated panelist names (e.g. BuffettBot,FisherBot,KiyoharaBot)",
    },
  },
  async run({ args }) {
    let bodyMarkdown: string

    if (args.body) {
      try {
        bodyMarkdown = readFileSync(String(args.body), "utf8")
      } catch (err) {
        process.stderr.write(
          pc.red(`File read error: ${(err as Error).message}\n`),
        )
        process.exit(1)
      }
    } else {
      // Read from stdin
      const chunks: Buffer[] = []
      for await (const chunk of process.stdin) {
        chunks.push(chunk as Buffer)
      }
      bodyMarkdown = Buffer.concat(chunks).toString("utf8")
    }

    bodyMarkdown = bodyMarkdown.trim()
    if (!bodyMarkdown) {
      process.stderr.write(pc.red("本文が空です。--body <file> か stdin で markdown を渡してください。\n"))
      process.exit(1)
    }

    const title = args.title ? String(args.title) : ""
    if (!title) {
      process.stderr.write(pc.red("--title は必須です。\n"))
      process.exit(1)
    }

    const stockCodes = args["stock-codes"]
      ? String(args["stock-codes"]).split(",").map((s) => s.trim()).filter(Boolean)
      : undefined
    const tags = args.tags
      ? String(args.tags).split(",").map((s) => s.trim()).filter(Boolean)
      : undefined

    // verdict resolution
    const VERDICT_ENUMS = ["strong_buy", "buy", "hold", "lukewarm", "mixed", "sell", "strong_sell"]
    let verdictCode: string | undefined
    let verdictLabel: string | undefined
    if (args["verdict-code"]) {
      verdictCode = String(args["verdict-code"])
    } else if (args.verdict) {
      const v = String(args.verdict)
      if (VERDICT_ENUMS.includes(v)) {
        verdictCode = v
        verdictLabel = v
      } else {
        verdictLabel = v
      }
    }

    // metadata for panel info
    const metadata: Record<string, unknown> = {}
    if (args.panel) metadata.panel = String(args.panel)
    if (args.turns) metadata.turns = Number(args.turns)
    if (args.panelists) {
      metadata.panelists = String(args.panelists).split(",").map((s) => s.trim()).filter(Boolean)
    }

    const isOfficial = Boolean(args.official)

    const payload: Record<string, unknown> = {
      source: "agent_cli",
      title,
      body_markdown: bodyMarkdown,
      is_public: isOfficial ? true : Boolean(args.public),
    }
    if (isOfficial) payload.is_official = true
    if (verdictCode !== undefined) payload.verdict_code = verdictCode
    if (verdictLabel !== undefined) payload.verdict_label = verdictLabel
    if (args["one-liner"]) payload.one_liner = String(args["one-liner"])
    if (args.summary) payload.summary = String(args.summary)
    if (args["stock-code"]) payload.stock_code = String(args["stock-code"])
    if (stockCodes) payload.stock_codes = stockCodes
    if (tags) payload.tags = tags
    if (Object.keys(metadata).length > 0) payload.metadata = metadata

    process.stdout.write(pc.dim("Saving report…\n"))

    const res = await apiPost<{ success: boolean; data: { id: string; short_id: string; slug: string } }>(
      API_PATH_CREATE,
      payload,
    )

    if (!res.success) {
      process.stderr.write(pc.red("保存に失敗しました。\n"))
      process.exit(1)
    }

    const { id, short_id: shortId, slug } = res.data
    const url = `${getWebBase()}/report/${shortId}/${slug}`
    const effectivePublic = isOfficial ? true : Boolean(args.public)
    process.stdout.write(
      `${pc.green("✓")} レポート保存完了\n` +
        `  id:   ${pc.cyan(id)}\n` +
        `  slug: ${pc.cyan(slug)}\n` +
        `  url:  ${pc.cyan(url)}\n` +
        `  公開: ${effectivePublic ? pc.green("public") : pc.dim("private")}\n` +
        (isOfficial ? `  公式: ${pc.yellow("official")}\n` : "") +
        (verdictCode ? `  verdict_code: ${pc.cyan(verdictCode)}\n` : "") +
        (verdictLabel ? `  verdict_label: ${pc.cyan(verdictLabel)}\n` : ""),
    )
  },
})

// --- list ---

const listCommand = defineCommand({
  meta: {
    name: "list",
    description: "List saved reports",
  },
  args: {
    limit: {
      type: "string",
      description: "Max number of reports to show (default: 20)",
      default: "20",
    },
    "mine-only": {
      type: "boolean",
      description: "Only show your own reports (default: true)",
      default: true,
    },
  },
  async run({ args }) {
    const limit = Number.parseInt(String(args.limit), 10) || 20
    const mineOnly = Boolean(args["mine-only"])

    const res = await apiPost<{
      success: boolean
      data: Array<{ id: string; short_id: string; slug: string; title: string; is_public: boolean; created_at: string }>
    }>(API_PATH_LIST, { limit, mine_only: mineOnly })

    if (!res.success || !res.data) {
      process.stderr.write(pc.red("取得に失敗しました。\n"))
      process.exit(1)
    }

    const reports = res.data
    if (reports.length === 0) {
      process.stdout.write(pc.dim("レポートがありません。\n"))
      return
    }

    const webBase = getWebBase()
    process.stdout.write(`${pc.bold("Reports")} (${reports.length})\n\n`)
    for (const r of reports) {
      const vis = r.is_public ? pc.green("public ") : pc.dim("private")
      const date = r.created_at ? r.created_at.slice(0, 10) : "      "
      process.stdout.write(
        `  ${pc.cyan(r.id.slice(0, 8))}  ${vis}  ${date}  ${r.title}\n` +
          `           ${pc.dim(`${webBase}/report/${r.short_id}/${r.slug}`)}\n`,
      )
    }
  },
})

// --- show ---

const showCommand = defineCommand({
  meta: {
    name: "show",
    description: "Show a report by ID",
  },
  args: {
    id: {
      type: "positional",
      description: "Report ID",
      required: true,
    },
  },
  async run({ args }) {
    const res = await apiPost<{
      success: boolean
      data: { id: string; short_id: string; slug: string; title: string; body_markdown: string; is_public: boolean; created_at: string }
    }>(API_PATH_SHOW, { id: String(args.id) })

    if (!res.success || !res.data) {
      process.stderr.write(pc.red("取得に失敗しました。\n"))
      process.exit(1)
    }

    const r = res.data
    const webBase = getWebBase()
    process.stdout.write(
      `${pc.bold(r.title)}\n` +
        `id:      ${r.id}\n` +
        `slug:    ${r.slug}\n` +
        `公開:    ${r.is_public ? pc.green("public") : pc.dim("private")}\n` +
        `作成日:  ${r.created_at?.slice(0, 10) ?? "—"}\n` +
        `url:     ${pc.cyan(`${webBase}/report/${r.short_id}/${r.slug}`)}\n\n` +
        `${pc.dim("─".repeat(60))}\n\n` +
        `${r.body_markdown}\n`,
    )
  },
})

// --- publish ---

const publishCommand = defineCommand({
  meta: {
    name: "publish",
    description: "Set a report to public (is_public=true)",
  },
  args: {
    id: {
      type: "positional",
      description: "Report ID",
      required: true,
    },
  },
  async run({ args }) {
    const res = await apiPost<{ success: boolean; data: { id: string; short_id: string; slug: string } }>(
      API_PATH_UPDATE,
      { id: String(args.id), is_public: true },
    )

    if (!res.success) {
      process.stderr.write(pc.red("更新に失敗しました。\n"))
      process.exit(1)
    }

    const { id, short_id: shortId, slug } = res.data
    const url = `${getWebBase()}/report/${shortId}/${slug}`
    process.stdout.write(
      `${pc.green("✓")} レポートを公開しました\n` +
        `  id:  ${pc.cyan(id)}\n` +
        `  url: ${pc.cyan(url)}\n`,
    )
  },
})

// --- delete ---

const deleteCommand = defineCommand({
  meta: {
    name: "delete",
    description: "Delete a report by ID",
  },
  args: {
    id: {
      type: "positional",
      description: "Report ID",
      required: true,
    },
  },
  async run({ args }) {
    const res = await apiPost<{ success: boolean }>(API_PATH_DELETE, {
      id: String(args.id),
    })

    if (!res.success) {
      process.stderr.write(pc.red("削除に失敗しました。\n"))
      process.exit(1)
    }

    process.stdout.write(`${pc.green("✓")} レポートを削除しました (id: ${pc.cyan(String(args.id))})\n`)
  },
})

// --- batch-save ---

type BatchEntry = {
  title: string
  body_markdown?: string
  body_file?: string
  stock_code?: string
  stock_codes?: string[]
  tags?: string[]
  is_public?: boolean
  is_official?: boolean
  verdict?: string
  verdict_code?: string
  verdict_label?: string
  one_liner?: string
  summary?: string
  metadata?: Record<string, unknown>
}

const VERDICT_ENUMS_SET = new Set(["strong_buy", "buy", "hold", "lukewarm", "mixed", "sell", "strong_sell"])

async function buildBatchPayload(entry: BatchEntry, baseDir: string): Promise<Record<string, unknown>> {
  let bodyMarkdown: string
  if (entry.body_file) {
    const resolved = entry.body_file.startsWith("/")
      ? entry.body_file
      : `${baseDir}/${entry.body_file}`
    bodyMarkdown = await readFile(resolved, "utf8")
  } else if (entry.body_markdown) {
    bodyMarkdown = entry.body_markdown
  } else {
    throw new Error(`entry "${entry.title}": body_markdown または body_file が必要です`)
  }

  // verdict resolution
  let verdictCode: string | undefined
  let verdictLabel: string | undefined
  if (entry.verdict_code) {
    verdictCode = entry.verdict_code
  } else if (entry.verdict) {
    if (VERDICT_ENUMS_SET.has(entry.verdict)) {
      verdictCode = entry.verdict
      verdictLabel = entry.verdict
    } else {
      verdictLabel = entry.verdict
    }
  }
  if (entry.verdict_label) verdictLabel = entry.verdict_label

  const isOfficial = Boolean(entry.is_official)
  const payload: Record<string, unknown> = {
    source: "agent_cli",
    title: entry.title,
    body_markdown: bodyMarkdown.trim(),
    is_public: isOfficial ? true : Boolean(entry.is_public),
  }
  if (isOfficial) payload.is_official = true
  if (verdictCode !== undefined) payload.verdict_code = verdictCode
  if (verdictLabel !== undefined) payload.verdict_label = verdictLabel
  if (entry.one_liner) payload.one_liner = entry.one_liner
  if (entry.summary) payload.summary = entry.summary
  if (entry.stock_code) payload.stock_code = entry.stock_code
  if (entry.stock_codes) payload.stock_codes = entry.stock_codes
  if (entry.tags) payload.tags = entry.tags
  if (entry.metadata && Object.keys(entry.metadata).length > 0) payload.metadata = entry.metadata

  return payload
}

const batchSaveCommand = defineCommand({
  meta: {
    name: "batch-save",
    description: "Bulk-save reports from a YAML or JSON file",
  },
  args: {
    file: {
      type: "string",
      description: "Path to YAML or JSON file containing an array of report entries",
      alias: "f",
      required: true,
    },
  },
  async run({ args }) {
    const filePath = String(args.file)
    let fileContent: string
    try {
      fileContent = readFileSync(filePath, "utf8")
    } catch (err) {
      process.stderr.write(pc.red(`File read error: ${(err as Error).message}\n`))
      process.exit(1)
    }

    let entries: BatchEntry[]
    try {
      const parsed = filePath.endsWith(".json") ? JSON.parse(fileContent) : parseYaml(fileContent)
      if (!Array.isArray(parsed)) {
        process.stderr.write(pc.red("ファイルのルートは配列である必要があります。\n"))
        process.exit(1)
      }
      entries = parsed as BatchEntry[]
    } catch (err) {
      process.stderr.write(pc.red(`Parse error: ${(err as Error).message}\n`))
      process.exit(1)
    }

    if (entries.length === 0) {
      process.stdout.write(pc.dim("エントリがありません。\n"))
      return
    }

    // base dir for resolving relative body_file paths
    const baseDir = filePath.includes("/") ? filePath.replace(/\/[^/]+$/, "") : "."

    process.stdout.write(pc.dim(`Batch saving ${entries.length} report(s)…\n`))

    let succeeded = 0
    const failures: Array<{ title: string; reason: string }> = []

    for (const entry of entries) {
      const label = entry.title ?? "(no title)"
      try {
        const payload = await buildBatchPayload(entry, baseDir)
        const res = await apiPost<{ success: boolean; data: { id: string; short_id: string; slug: string } }>(
          API_PATH_CREATE,
          payload,
        )
        if (!res.success) throw new Error("API returned success=false")
        succeeded++
        process.stdout.write(`  ${pc.green("✓")} ${label}\n`)
      } catch (err) {
        const reason = (err as Error).message
        failures.push({ title: label, reason })
        process.stdout.write(`  ${pc.red("✗")} ${label}: ${pc.dim(reason)}\n`)
      }
    }

    process.stdout.write(`\n${pc.bold("Batch save results:")}\n`)
    process.stdout.write(`  ${pc.green("✓")} ${succeeded} succeeded\n`)
    if (failures.length > 0) {
      process.stdout.write(`  ${pc.red("✗")} ${failures.length} failed\n`)
      for (const f of failures) {
        process.stdout.write(`     - ${f.title}: ${pc.dim(f.reason)}\n`)
      }
    }
  },
})

// --- top-level report command ---

export const reportCommand = defineCommand({
  meta: {
    name: "report",
    description: "Manage analysis reports (save / list / show / publish / delete / batch-save)",
  },
  subCommands: {
    save: saveCommand,
    list: listCommand,
    show: showCommand,
    publish: publishCommand,
    delete: deleteCommand,
    "batch-save": batchSaveCommand,
  },
})
