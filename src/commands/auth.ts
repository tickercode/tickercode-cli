import { defineCommand } from "citty"
import pc from "picocolors"
import { createInterface } from "node:readline"
import { loadCredentials, saveCredentials, clearCredentials } from "../lib/credentials"
import { getApiBase } from "../lib/api-client"

const API_KEY_PATTERN = /^ak_(cli|mcp|web)_[a-f0-9]{32}$/

async function promptApiKey(): Promise<string> {
  if (!process.stdin.isTTY) {
    process.stderr.write(pc.red("非対話環境では tc auth login は使用できません。TICKERCODE_API_KEY 環境変数を設定してください。\n"))
    process.exit(1)
  }

  const rl = createInterface({ input: process.stdin, output: process.stderr })
  return new Promise((resolve) => {
    rl.question("API Key (ak_cli_...): ", (answer) => {
      rl.close()
      resolve(answer.trim())
    })
  })
}

async function fetchMe(apiKey: string): Promise<{ id: number; email: string; role: string } | null> {
  const url = `${getApiBase()}/api/user/me`
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({}),
    })
    if (!res.ok) return null
    const json = (await res.json()) as { success?: boolean; data?: { id: number; email: string; role: string } }
    if (!json.success || !json.data) return null
    return json.data
  } catch {
    return null
  }
}

// --- login ---

const loginCommand = defineCommand({
  meta: {
    name: "login",
    description: "Authenticate with a Tickercode API key",
  },
  async run() {
    const apiKey = await promptApiKey()

    if (!API_KEY_PATTERN.test(apiKey)) {
      process.stderr.write(
        pc.red("無効な API Key 形式です。ak_cli_<32桁16進数> の形式で入力してください。\n"),
      )
      process.exit(1)
    }

    process.stderr.write(pc.dim("認証確認中…\n"))
    const user = await fetchMe(apiKey)

    if (!user) {
      process.stderr.write(
        pc.red("認証に失敗しました。API Key が無効か、サーバーに接続できません。\n"),
      )
      process.exit(1)
    }

    saveCredentials({
      api_key: apiKey,
      created_at: new Date().toISOString(),
      user,
    })

    process.stdout.write(
      `${pc.green("✓")} ログイン完了: ${pc.cyan(user.email)} (${user.role})\n`,
    )
  },
})

// --- whoami ---

const whoamiCommand = defineCommand({
  meta: {
    name: "whoami",
    description: "Show currently authenticated user",
  },
  async run() {
    const cred = loadCredentials()
    if (!cred?.api_key) {
      process.stdout.write(pc.dim("not logged in\n"))
      process.stdout.write(pc.dim("  tc auth login で認証してください。\n"))
      return
    }

    const user = await fetchMe(cred.api_key)
    if (!user) {
      process.stdout.write(pc.yellow("API Key は保存されていますが、認証確認に失敗しました。\n"))
      process.stdout.write(pc.dim("  tc auth login で再認証してください。\n"))
      return
    }

    process.stdout.write(
      `${pc.green("✓")} Logged in as ${pc.cyan(user.email)} (${user.role})\n`,
    )
  },
})

// --- logout ---

const logoutCommand = defineCommand({
  meta: {
    name: "logout",
    description: "Remove stored credentials",
  },
  async run() {
    clearCredentials()
    process.stdout.write(`${pc.green("✓")} ログアウトしました。\n`)
  },
})

// --- top-level auth command ---

export const authCommand = defineCommand({
  meta: {
    name: "auth",
    description: "Manage authentication (login / whoami / logout)",
  },
  subCommands: {
    login: loginCommand,
    whoami: whoamiCommand,
    logout: logoutCommand,
  },
})
