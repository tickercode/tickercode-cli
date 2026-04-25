import { defineCommand } from "citty"
import pc from "picocolors"
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  copyFileSync,
  readdirSync,
  statSync,
} from "node:fs"
import { join, dirname } from "node:path"
import { homedir } from "node:os"
import { fileURLToPath } from "node:url"

const SKILL_NAMES = ["tc-discuss", "tc-research", "tc-research-idea"]

const TOML_SECTION = `
[mcp_servers.tickercode]
command = "tc"
args = ["mcp"]
env = { TICKERCODE_API_KEY = "$TICKERCODE_API_KEY" }
`.trim()

function getSkillSourceRoot(): string {
  const here = dirname(fileURLToPath(import.meta.url))
  for (const candidate of [
    join(here, "..", "..", ".claude", "skills"),
    join(here, "..", ".claude", "skills"),
    join(here, "..", "..", "..", ".claude", "skills"),
  ]) {
    if (existsSync(candidate)) return candidate
  }
  throw new Error(
    `skill source not found near ${here}. Expected .claude/skills/ adjacent to the CLI package.`,
  )
}

function copyDirRecursive(src: string, dst: string): number {
  let count = 0
  if (!existsSync(dst)) mkdirSync(dst, { recursive: true })
  for (const entry of readdirSync(src)) {
    const s = join(src, entry)
    const d = join(dst, entry)
    if (statSync(s).isDirectory()) {
      count += copyDirRecursive(s, d)
    } else {
      copyFileSync(s, d)
      count++
    }
  }
  return count
}

const codexCommand = defineCommand({
  meta: {
    name: "codex",
    description: "Setup tickercode skills + MCP server for Codex CLI",
  },
  args: {
    "skills-dir": {
      type: "string",
      description: "Where to copy skill bundles (default: ~/.agents/skills)",
    },
    "config-path": {
      type: "string",
      description: "Codex config TOML path (default: ~/.codex/config.toml)",
    },
    force: {
      type: "boolean",
      description: "Overwrite existing [mcp_servers.tickercode] section",
      default: false,
    },
  },
  async run({ args }) {
    const skillsDir = args["skills-dir"]
      ? String(args["skills-dir"])
      : join(homedir(), ".agents", "skills")
    const configPath = args["config-path"]
      ? String(args["config-path"])
      : join(homedir(), ".codex", "config.toml")

    process.stdout.write(pc.bold("Setting up tickercode for Codex CLI…\n"))

    // 1. config.toml: append [mcp_servers.tickercode]
    const configDir = dirname(configPath)
    if (!existsSync(configDir)) mkdirSync(configDir, { recursive: true })
    const existingToml = existsSync(configPath)
      ? readFileSync(configPath, "utf8")
      : ""
    const hasSection = existingToml.includes("[mcp_servers.tickercode]")
    if (hasSection && !args.force) {
      process.stdout.write(
        pc.dim(`  - ${configPath} に既存、skip（--force で上書き）\n`),
      )
    } else if (hasSection && args.force) {
      const replaced = existingToml.replace(
        /\[mcp_servers\.tickercode\][\s\S]*?(?=\n\[|\Z)/,
        `${TOML_SECTION}\n`,
      )
      writeFileSync(configPath, replaced, "utf8")
      process.stdout.write(`  ${pc.green("✓")} ${configPath} の既存セクションを更新\n`)
    } else {
      const sep =
        existingToml && !existingToml.endsWith("\n\n")
          ? existingToml.endsWith("\n")
            ? "\n"
            : "\n\n"
          : ""
      const newToml = existingToml + sep + TOML_SECTION + "\n"
      writeFileSync(configPath, newToml, "utf8")
      process.stdout.write(
        `  ${pc.green("✓")} ${configPath} に MCP server 設定を追記\n`,
      )
    }

    // 2. Copy skills to ~/.agents/skills/
    const skillSrcRoot = getSkillSourceRoot()
    let totalCopied = 0
    for (const name of SKILL_NAMES) {
      const src = join(skillSrcRoot, name)
      const dst = join(skillsDir, name)
      if (!existsSync(src)) {
        process.stdout.write(pc.dim(`  - ${name}: source not found, skip\n`))
        continue
      }
      const n = copyDirRecursive(src, dst)
      totalCopied += n
      process.stdout.write(
        `  ${pc.green("✓")} ${name} → ${dst} (${n} files)\n`,
      )
    }

    process.stdout.write(`\n${pc.bold("完了")}: ${totalCopied} files copied\n`)
    process.stdout.write(
      pc.dim(`  - tc auth login（未実行なら）で API key を設定\n`),
    )
    process.stdout.write(
      pc.dim(`  - codex を起動し「6594 のディスカッション」と打ってみる\n`),
    )
  },
})

export const setupCommand = defineCommand({
  meta: {
    name: "setup",
    description: "Setup tickercode for various CLI clients (codex / gemini)",
  },
  subCommands: {
    codex: codexCommand,
  },
})
