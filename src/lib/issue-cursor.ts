import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"

function cursorPath(): string {
  return join(homedir(), ".tickercode", "issue_cursor.json")
}

function readAll(): Record<string, number> {
  const path = cursorPath()
  if (!existsSync(path)) return {}
  try {
    const raw = readFileSync(path, "utf8")
    return JSON.parse(raw) as Record<string, number>
  } catch {
    return {}
  }
}

export function readCursor(actorId: string): number | null {
  const data = readAll()
  return data[actorId] ?? null
}

export function writeCursor(actorId: string, ts: number): void {
  const data = readAll()
  data[actorId] = ts
  writeFileSync(cursorPath(), JSON.stringify(data, null, 2), { encoding: "utf8" })
}

export function getDefaultSince(actorId: string): number {
  const ts = readCursor(actorId)
  if (ts !== null) return ts
  return Math.floor(Date.now() / 1000) - 24 * 3600
}
