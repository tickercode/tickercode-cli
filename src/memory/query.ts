import { existsSync, readFileSync, readdirSync, statSync, rmSync } from "node:fs"
import { join } from "node:path"
import {
  MEMORY_ROOT,
  CODE_ROOT,
  MINI_JSON_PATH,
  codeDir,
  endpointPath,
  type EndpointName,
} from "./paths"
import { readIndex, readStockMeta } from "./meta"

export function readEndpointFile(
  displayCode: string,
  endpoint: EndpointName,
): string | null {
  const path = endpointPath(displayCode, endpoint)
  if (!existsSync(path)) return null
  return readFileSync(path, "utf8")
}

export function resolvePath(
  displayCode: string,
  endpoint?: EndpointName | "mini",
): string {
  if (displayCode === "mini" || endpoint === undefined && displayCode === "mini") {
    return MINI_JSON_PATH
  }
  if (endpoint === "mini") return MINI_JSON_PATH
  if (endpoint === undefined) return codeDir(displayCode)
  return endpointPath(displayCode, endpoint)
}

export function listCodes(): string[] {
  return readIndex().codes
}

export function memoryStats() {
  const codes = listCodes()
  let totalBytes = 0
  let fileCount = 0
  for (const code of codes) {
    const dir = codeDir(code)
    if (!existsSync(dir)) continue
    for (const f of readdirSync(dir)) {
      try {
        totalBytes += statSync(join(dir, f)).size
        fileCount += 1
      } catch {}
    }
  }
  let miniBytes = 0
  if (existsSync(MINI_JSON_PATH)) {
    try {
      miniBytes = statSync(MINI_JSON_PATH).size
    } catch {}
  }
  return {
    root: MEMORY_ROOT,
    total_codes: codes.length,
    total_files: fileCount,
    total_bytes: totalBytes,
    mini_json_bytes: miniBytes,
    total_mb: +((totalBytes + miniBytes) / (1024 * 1024)).toFixed(2),
  }
}

export function cleanCode(displayCode: string) {
  const dir = codeDir(displayCode)
  if (existsSync(dir)) {
    rmSync(dir, { recursive: true, force: true })
  }
}

export function showMeta(displayCode: string) {
  return readStockMeta(displayCode)
}

export { CODE_ROOT }
