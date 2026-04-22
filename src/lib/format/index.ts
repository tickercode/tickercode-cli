import { formatPrettyStock, formatPrettyFinancial } from "./pretty"

export type Format = "pretty" | "json" | "md"
export type Kind = "stock" | "financial"

export function formatOutput(data: unknown, opts: { kind: Kind; format: Format }): void {
  const out = render(data, opts)
  process.stdout.write(`${out}\n`)
}

function render(data: unknown, opts: { kind: Kind; format: Format }): string {
  if (opts.format === "json") {
    return JSON.stringify(data, null, 2)
  }
  if (opts.format === "md") {
    return `# ${opts.kind}\n\n\`\`\`json\n${JSON.stringify(unwrap(data), null, 2)}\n\`\`\``
  }
  if (opts.kind === "stock") return formatPrettyStock(data)
  return formatPrettyFinancial(data)
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
