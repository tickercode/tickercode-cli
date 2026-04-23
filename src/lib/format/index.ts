import {
  formatPrettyStock,
  formatPrettyFinancial,
  formatPrettyStockList,
} from "./pretty"

export type Format = "pretty" | "json" | "md"
export type Kind = "stock" | "financial" | "stock-list"

export type FormatOpts = {
  kind: Kind
  format: Format
  columns?: string[]
  title?: string
}

export function formatOutput(data: unknown, opts: FormatOpts): void {
  const out = render(data, opts)
  process.stdout.write(`${out}\n`)
}

function render(data: unknown, opts: FormatOpts): string {
  if (opts.format === "json") {
    return JSON.stringify(data, null, 2)
  }
  if (opts.format === "md") {
    if (opts.kind === "stock-list" && Array.isArray(data)) {
      return renderStockListMarkdown(
        data as Record<string, unknown>[],
        opts.columns ?? [],
        opts.title,
      )
    }
    return `# ${opts.kind}\n\n\`\`\`json\n${JSON.stringify(unwrap(data), null, 2)}\n\`\`\``
  }
  if (opts.kind === "stock-list") {
    return formatPrettyStockList(
      data as Record<string, unknown>[],
      opts.columns ?? [],
      opts.title,
    )
  }
  if (opts.kind === "stock") return formatPrettyStock(data)
  return formatPrettyFinancial(data)
}

function renderStockListMarkdown(
  items: Record<string, unknown>[],
  columns: string[],
  title?: string,
): string {
  const cols = columns.length > 0 ? columns : ["display_code", "company_name"]
  const header = `| ${cols.join(" | ")} |`
  const sep = `| ${cols.map(() => "---").join(" | ")} |`
  const rows = items.map(
    (item) =>
      `| ${cols.map((c) => formatCell(item[c])).join(" | ")} |`,
  )
  const heading = title ? `# ${title}\n\n` : ""
  return `${heading}${header}\n${sep}\n${rows.join("\n")}`
}

function formatCell(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—"
  return String(v)
}

export function unwrap(data: unknown): unknown {
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>
    if ("data" in obj && ("success" in obj || "ok" in obj)) {
      return obj.data
    }
  }
  return data
}
