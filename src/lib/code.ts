export function normalizeCode(input: string): string {
  const trimmed = input.trim()
  if (!/^\d+$/.test(trimmed)) {
    throw new Error(`Invalid ticker code: "${input}" (digits only)`)
  }
  if (trimmed.length === 4) return `${trimmed}0`
  if (trimmed.length === 5) return trimmed
  throw new Error(`Invalid ticker code length: "${input}" (expected 4 or 5 digits)`)
}

export function displayCode(code5: string): string {
  if (code5.length === 5 && code5.endsWith("0")) return code5.slice(0, 4)
  return code5
}
