const DEFAULT_API_BASE = "https://api.ticker-code.com"

export function getApiBase(): string {
  return process.env.TICKERCODE_API_BASE ?? DEFAULT_API_BASE
}

export function getAuthHeaders(): Record<string, string> {
  const apiKey = process.env.TICKERCODE_API_KEY
  return apiKey ? { Authorization: `Bearer ${apiKey}` } : {}
}

export async function postJson<T = unknown>(path: string, body: unknown): Promise<T> {
  const url = `${getApiBase()}${path}`
  let res: Response
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify(body),
    })
  } catch (err) {
    throw new Error(`Network error calling ${url}: ${(err as Error).message}`)
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`API ${res.status} ${res.statusText} — ${path}\n${text.slice(0, 500)}`)
  }
  return (await res.json()) as T
}
