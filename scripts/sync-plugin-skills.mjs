import { cpSync, existsSync, rmSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const source = join(root, ".claude", "skills")
const targets = [
  join(root, "plugins", "claude-code", "plugins", "tickercode", "skills"),
  join(root, "plugins", "codex", "plugins", "tickercode", "skills"),
]

if (!existsSync(source)) {
  throw new Error(`Skill source not found: ${source}`)
}

for (const target of targets) {
  rmSync(target, { recursive: true, force: true })
  cpSync(source, target, { recursive: true })
  process.stdout.write(`synced ${source} -> ${target}\n`)
}
