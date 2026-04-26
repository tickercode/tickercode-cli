import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"

const spawnSyncMock = vi.fn()

vi.mock("node:child_process", () => ({
  spawnSync: spawnSyncMock,
}))

let testDir: string

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  testDir = join(tmpdir(), `tc-setup-test-${process.pid}-${Date.now()}`)
  mkdirSync(testDir, { recursive: true })
  vi.spyOn(process.stdout, "write").mockImplementation(() => true)
  vi.spyOn(process.stderr, "write").mockImplementation(() => true)
})

afterEach(() => {
  vi.restoreAllMocks()
  rmSync(testDir, { recursive: true, force: true })
})

function runArgs(args: Record<string, unknown>) {
  return {
    args: { _: [], ...args },
    cmd: {} as never,
    rawArgs: [],
    data: undefined,
  }
}

describe("setup codex", () => {
  it("writes MCP, plugin marketplace config, and copies skills", async () => {
    const { setupCommand } = await import("../../src/commands/setup")
    const codex = (setupCommand as any).subCommands.codex
    const configPath = join(testDir, "codex", "config.toml")
    const skillsDir = join(testDir, "skills")
    const marketplacePath = join(testDir, "tc-codex-plugin")

    await codex.run?.(
      runArgs({
        "config-path": configPath,
        "skills-dir": skillsDir,
        "marketplace-path": marketplacePath,
        plugin: true,
        force: false,
      }),
    )

    const config = readFileSync(configPath, "utf8")
    expect(config).toContain("[marketplaces.tickercode]")
    expect(config).toContain(`source = "${marketplacePath}"`)
    expect(config).toContain('[plugins."tickercode@tickercode"]')
    expect(config).toContain("[mcp_servers.tickercode]")
    expect(existsSync(join(skillsDir, "tc-research", "SKILL.md"))).toBe(true)
    expect(existsSync(join(skillsDir, "tc-discuss", "SKILL.md"))).toBe(true)
    expect(existsSync(join(skillsDir, "tc-research-idea", "SKILL.md"))).toBe(true)
  })

  it("updates existing plugin marketplace when force is true", async () => {
    const { setupCommand } = await import("../../src/commands/setup")
    const codex = (setupCommand as any).subCommands.codex
    const configPath = join(testDir, "codex", "config.toml")
    const skillsDir = join(testDir, "skills")
    const marketplacePath = join(testDir, "new-marketplace")
    mkdirSync(join(testDir, "codex"), { recursive: true })
    writeFileSync(
      configPath,
      [
        "[marketplaces.tickercode]",
        'source_type = "local"',
        'source = "/old/path"',
        "",
        '[plugins."tickercode@tickercode"]',
        "enabled = false",
        "",
        "[mcp_servers.tickercode]",
        'command = "old-tc"',
        'args = ["old"]',
        "",
      ].join("\n"),
      "utf8",
    )

    await codex.run?.(
      runArgs({
        "config-path": configPath,
        "skills-dir": skillsDir,
        "marketplace-path": marketplacePath,
        plugin: true,
        force: true,
      }),
    )

    const config = readFileSync(configPath, "utf8")
    expect(config).toContain(`source = "${marketplacePath}"`)
    expect(config).toContain('[plugins."tickercode@tickercode"]\nenabled = true')
    expect(config).toContain('[mcp_servers.tickercode]\ncommand = "tc"')
    expect(config).not.toContain("/old/path")
    expect(config).not.toContain('command = "old-tc"')
  })
})

describe("setup claude", () => {
  it("runs Claude Code plugin install commands when --install is set", async () => {
    spawnSyncMock.mockReturnValue({ status: 0, stdout: "ok\n", stderr: "" })
    const { setupCommand } = await import("../../src/commands/setup")
    const claude = (setupCommand as any).subCommands.claude
    const marketplacePath = join(testDir, "tc-claude-plugin")

    await claude.run?.(
      runArgs({
        "marketplace-path": marketplacePath,
        install: true,
        scope: "project",
      }),
    )

    expect(spawnSyncMock).toHaveBeenCalledTimes(3)
    expect(spawnSyncMock).toHaveBeenNthCalledWith(
      1,
      "claude",
      ["plugin", "validate", marketplacePath],
      expect.objectContaining({ encoding: "utf8" }),
    )
    expect(spawnSyncMock).toHaveBeenNthCalledWith(
      2,
      "claude",
      ["plugin", "marketplace", "add", "--scope", "project", marketplacePath],
      expect.objectContaining({ encoding: "utf8" }),
    )
    expect(spawnSyncMock).toHaveBeenNthCalledWith(
      3,
      "claude",
      ["plugin", "install", "--scope", "project", "tickercode@tickercode"],
      expect.objectContaining({ encoding: "utf8" }),
    )
  })

  it("throws when Claude Code plugin command fails", async () => {
    spawnSyncMock.mockReturnValue({ status: 1, stdout: "", stderr: "failed\n" })
    const { setupCommand } = await import("../../src/commands/setup")
    const claude = (setupCommand as any).subCommands.claude

    await expect(
      claude.run?.(
        runArgs({
          "marketplace-path": join(testDir, "tc-claude-plugin"),
          install: true,
          scope: "user",
        }),
      ),
    ).rejects.toThrow("failed with exit code 1")
  })
})
