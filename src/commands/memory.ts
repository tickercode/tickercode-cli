import { defineCommand } from "citty"
import pc from "picocolors"
import { ENDPOINTS, type EndpointName } from "../memory/paths"
import { fetchStock } from "../memory/fetch"
import {
  readEndpointFile,
  resolvePath,
  listCodes,
  memoryStats,
  cleanCode,
  showMeta,
} from "../memory/query"
import { syncMini, readMiniMeta } from "../memory/mini"

const ENDPOINT_KEYS = Object.keys(ENDPOINTS) as EndpointName[]

const fetchCmd = defineCommand({
  meta: { name: "fetch", description: "Download endpoints for one or more codes into ~/.tickercode/memory" },
  args: {
    codes: { type: "positional", description: "Ticker codes (space separated)", required: true },
    only: { type: "string", description: `Comma-separated endpoints (${ENDPOINT_KEYS.join(",")})` },
    force: { type: "boolean", description: "Ignore TTL and re-fetch" },
  },
  async run({ args, rawArgs }) {
    const codes = (rawArgs ?? []).filter((a) => /^\d{4,5}$/.test(a))
    if (codes.length === 0) codes.push(String(args.codes))
    const endpoints = args.only
      ? (String(args.only).split(",").map((s) => s.trim()) as EndpointName[])
      : undefined

    for (const code of codes) {
      const result = await fetchStock(code, { endpoints, force: Boolean(args.force) })
      const ok = result.fetched.length
      const sk = result.skipped.length
      const err = result.failed.length
      process.stdout.write(
        `${pc.cyan(result.display_code)}  ${pc.green(`✓ ${ok} fetched`)}  ${pc.gray(`↷ ${sk} skipped`)}  ${err ? pc.red(`✗ ${err} failed`) : ""}\n`,
      )
      if (err > 0) {
        for (const f of result.failed) {
          process.stdout.write(`    ${pc.red("!")} ${f.endpoint}: ${f.error}\n`)
        }
      }
      process.stdout.write(`    ${pc.dim(result.dir)}\n`)
    }
  },
})

const listCmd = defineCommand({
  meta: { name: "list", description: "List cached codes" },
  async run() {
    const codes = listCodes()
    if (codes.length === 0) {
      process.stdout.write(pc.gray("(no codes cached — run `tc memory fetch <code>`)\n"))
      return
    }
    for (const c of codes) {
      const meta = showMeta(c)
      const name = meta?.name ?? ""
      const eps = Object.keys(meta?.endpoints ?? {}).join(",")
      process.stdout.write(`${pc.cyan(c)}  ${name}  ${pc.dim(eps)}\n`)
    }
  },
})

const statsCmd = defineCommand({
  meta: { name: "stats", description: "Show memory footprint" },
  async run() {
    const s = memoryStats()
    process.stdout.write(JSON.stringify(s, null, 2) + "\n")
  },
})

const catCmd = defineCommand({
  meta: { name: "cat", description: "Print endpoint JSON file to stdout" },
  args: {
    code: { type: "positional", required: true },
    endpoint: { type: "positional", required: true, description: `One of: ${ENDPOINT_KEYS.join(",")}` },
  },
  async run({ args }) {
    const text = readEndpointFile(String(args.code), String(args.endpoint) as EndpointName)
    if (!text) {
      process.stderr.write(pc.red(`Not cached. Run: tc memory fetch ${args.code} --only ${args.endpoint}\n`))
      process.exit(1)
    }
    process.stdout.write(text + "\n")
  },
})

const whereCmd = defineCommand({
  meta: { name: "where", description: "Print absolute path of cached file or directory" },
  args: {
    code: { type: "positional", required: true, description: "Ticker code or 'mini'" },
    endpoint: { type: "positional", required: false, description: "Endpoint name (omit for directory)" },
  },
  async run({ args }) {
    const path = resolvePath(
      String(args.code),
      args.endpoint ? (String(args.endpoint) as EndpointName) : undefined,
    )
    process.stdout.write(path + "\n")
  },
})

const showCmd = defineCommand({
  meta: { name: "show", description: "Show .meta.json for a code" },
  args: { code: { type: "positional", required: true } },
  async run({ args }) {
    const meta = showMeta(String(args.code))
    if (!meta) {
      process.stderr.write(pc.red(`Not cached: ${args.code}\n`))
      process.exit(1)
    }
    process.stdout.write(JSON.stringify(meta, null, 2) + "\n")
  },
})

const cleanCmd = defineCommand({
  meta: { name: "clean", description: "Remove cached data for a code" },
  args: { code: { type: "positional", required: true } },
  async run({ args }) {
    cleanCode(String(args.code))
    process.stdout.write(pc.green(`Removed: ${args.code}\n`))
  },
})

const syncMiniCmd = defineCommand({
  meta: {
    name: "sync-mini",
    description: "Download mini.json (3750 stocks summary) from R2 CDN",
  },
  args: {
    force: { type: "boolean", description: "Ignore TTL and re-fetch" },
  },
  async run({ args }) {
    const meta = await syncMini(Boolean(args.force))
    process.stdout.write(
      `${pc.green("✓")} mini.json  ${pc.cyan(String(meta.items_count))} items, ${pc.cyan(String(meta.tags_count))} tags, ${pc.dim(`${(meta.bytes / 1024 / 1024).toFixed(2)} MB`)}\n`,
    )
  },
})

const miniStatusCmd = defineCommand({
  meta: { name: "mini-status", description: "Show mini.json cache status" },
  async run() {
    const meta = readMiniMeta()
    if (!meta) {
      process.stdout.write(pc.gray("(mini.json not cached — run `tc memory sync-mini`)\n"))
      return
    }
    process.stdout.write(JSON.stringify(meta, null, 2) + "\n")
  },
})

export const memoryCommand = defineCommand({
  meta: {
    name: "memory",
    description: "Manage local cache of stock data (~/.tickercode/memory/)",
  },
  subCommands: {
    fetch: fetchCmd,
    list: listCmd,
    stats: statsCmd,
    cat: catCmd,
    where: whereCmd,
    show: showCmd,
    clean: cleanCmd,
    "sync-mini": syncMiniCmd,
    "mini-status": miniStatusCmd,
  },
})
