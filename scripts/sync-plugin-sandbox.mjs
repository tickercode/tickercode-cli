import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const workspaceRoot = dirname(root)
const sandboxRoot = join(workspaceRoot, "sandbox")

const pairs = [
  {
    source: join(root, "plugins", "claude-code"),
    target: join(sandboxRoot, "tc-claude-plugin"),
  },
  {
    source: join(root, "plugins", "codex"),
    target: join(sandboxRoot, "tc-codex-plugin"),
  },
]

mkdirSync(sandboxRoot, { recursive: true })

for (const { source, target } of pairs) {
  if (!existsSync(source)) {
    throw new Error(`Plugin source not found: ${source}`)
  }
  rmSync(target, { recursive: true, force: true })
  cpSync(source, target, { recursive: true })
  process.stdout.write(`synced ${source} -> ${target}\n`)
}
