import Table from "cli-table3"
import pc from "picocolors"
import { unwrap } from "./index"

function toCell(v: unknown): string {
  if (v === null || v === undefined) return pc.dim("—")
  if (typeof v === "object") {
    const kind = Array.isArray(v) ? `array(${(v as unknown[]).length})` : "object"
    return pc.dim(`(${kind})`)
  }
  if (typeof v === "number") return pc.yellow(String(v))
  if (typeof v === "boolean") return pc.magenta(String(v))
  return String(v)
}

function kvTable(payload: Record<string, unknown>, title?: string): string {
  const table = new Table({
    head: [pc.cyan("field"), pc.cyan("value")],
    style: { head: [], border: [] },
  })
  for (const [k, v] of Object.entries(payload)) {
    table.push([pc.gray(k), toCell(v)])
  }
  const heading = title ? `${pc.bold(pc.white(title))}\n` : ""
  return heading + table.toString()
}

export function formatPrettyStock(data: unknown): string {
  const payload = unwrap(data)
  if (!payload || typeof payload !== "object") {
    return pc.yellow("No data")
  }
  const obj = payload as Record<string, unknown>
  const code = String(obj.code ?? obj.display_code ?? "")
  const name = String(obj.name ?? obj.company_name ?? "")
  const title = `${pc.bold("Stock")} ${pc.green(code)} ${name ? pc.white(name) : ""}`.trim()
  return kvTable(obj, title)
}

export function formatPrettyStockList(
  items: Record<string, unknown>[],
  columns: string[],
  title?: string,
): string {
  if (items.length === 0) {
    return pc.yellow("No matches.")
  }
  const cols = columns.length > 0 ? columns : ["display_code", "company_name"]
  const table = new Table({
    head: cols.map((c) => pc.cyan(c)),
    style: { head: [], border: [] },
  })
  for (const item of items) {
    table.push(cols.map((c) => toCell(item[c])))
  }
  const heading = title
    ? `${pc.bold(pc.white(title))}  ${pc.dim(`(${items.length} rows)`)}\n`
    : `${pc.dim(`(${items.length} rows)`)}\n`
  return heading + table.toString()
}

export function formatPrettyFinancial(data: unknown): string {
  const payload = unwrap(data)
  if (!payload || typeof payload !== "object") {
    return pc.yellow("No data")
  }
  if (Array.isArray(payload)) {
    const sections: string[] = []
    for (const [i, row] of payload.entries()) {
      if (row && typeof row === "object") {
        sections.push(kvTable(row as Record<string, unknown>, `[${i}]`))
      }
    }
    return sections.join("\n\n")
  }
  return kvTable(payload as Record<string, unknown>, pc.bold("Financial"))
}
