import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync, chmodSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"

export interface Credentials {
  api_key: string
  created_at: string
  user?: {
    id: number
    email: string
    role: string
  }
}

function credentialsDir(): string {
  return join(homedir(), ".tickercode")
}

function credentialsPath(): string {
  return join(credentialsDir(), "credentials.json")
}

export function loadCredentials(): Credentials | null {
  const path = credentialsPath()
  if (!existsSync(path)) return null
  try {
    const raw = readFileSync(path, "utf8")
    return JSON.parse(raw) as Credentials
  } catch {
    return null
  }
}

export function saveCredentials(cred: Credentials): void {
  const dir = credentialsDir()
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  const path = credentialsPath()
  writeFileSync(path, JSON.stringify(cred, null, 2), { encoding: "utf8" })
  chmodSync(path, 0o600)
}

export function clearCredentials(): void {
  const path = credentialsPath()
  if (existsSync(path)) {
    rmSync(path)
  }
}
