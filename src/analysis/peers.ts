import { ensureMiniLoaded, findByCode, type StockItem } from "../memory/mini"
import { normalizeCode, displayCode } from "../lib/code"

const n = (v: string | number | null | undefined): number | null => {
  if (v === null || v === undefined) return null
  const parsed = typeof v === "number" ? v : parseFloat(v)
  return Number.isFinite(parsed) ? parsed : null
}

const pick = (s: StockItem) => ({
  code: s.display_code,
  name: s.company_name,
  sector33: s.sector33_code,
  mcap: s.market_capitalization ?? null,
  trailing_per: n(s.i_trailing_per ?? null),
  forward_per: n(s.i_forward_per ?? null),
  pbr: n(s.i_pbr ?? null),
  trailing_roe: n(s.i_trailing_roe ?? null),
  forward_roe: n(s.i_forward_roe ?? null),
  roic: n(s.i_roic ?? null),
  trailing_dy: n(s.i_trailing_dividend_yield ?? null),
  forward_dy: n(s.i_forward_dividend_yield ?? null),
  gross_margin: n(s.i_gross_margin ?? null),
  trailing_op_margin: n(s.i_trailing_operating_margin ?? null),
  forward_op_margin: n(s.i_forward_operating_margin ?? null),
  trailing_net_margin: n(s.i_trailing_net_margin ?? null),
  forward_net_margin: n(s.i_forward_net_margin ?? null),
  yoy3y_sales: n(s.yoy3y_sales ?? null),
  yoy3y_op: n(s.yoy3y_op_profit ?? null),
  yoy3y_net: n(s.yoy3y_net_profit ?? null),
  fcf_yield: n(s.i_fcf_yield ?? null),
  equity_ratio: n(s.i_equity_ratio ?? null),
})

const median = (arr: (number | null)[]): number | null => {
  const nums = arr.filter((x): x is number => x !== null).sort((a, b) => a - b)
  if (nums.length === 0) return null
  const mid = Math.floor(nums.length / 2)
  return nums.length % 2 === 0
    ? +(((nums[mid - 1] + nums[mid]) / 2).toFixed(2))
    : +nums[mid].toFixed(2)
}

export type PeerMatchBy = "sector" | "mcap" | "both" | "growth"

export async function findPeers(
  codeInput: string,
  opts: { limit?: number; by?: PeerMatchBy; mcapBand?: number } = {},
) {
  await ensureMiniLoaded()
  const code5 = normalizeCode(codeInput)
  const display = displayCode(code5)

  const target = findByCode(display) ?? findByCode(code5)
  if (!target) {
    throw new Error(`Stock ${display} not found in mini.json`)
  }

  const { items } = await ensureMiniLoaded()

  const by: PeerMatchBy = opts.by ?? "both"
  const band = opts.mcapBand ?? 0.5
  const targetMcap = target.market_capitalization ?? 0

  const candidates = items.filter((s) => {
    if (s.display_code === target.display_code) return false
    if (by === "sector" || by === "both") {
      if (s.sector33_code !== target.sector33_code) return false
    }
    if (by === "mcap" || by === "both") {
      if (!targetMcap || !s.market_capitalization) return false
      const ratio = s.market_capitalization / targetMcap
      if (ratio < 1 - band || ratio > 1 + band) return false
    }
    if (by === "growth") {
      const selfGrowth = n(target.yoy3y_sales ?? null)
      const itGrowth = n(s.yoy3y_sales ?? null)
      if (selfGrowth === null || itGrowth === null) return false
      if (Math.abs(itGrowth - selfGrowth) > 15) return false
    }
    return true
  })

  const ranked = candidates
    .sort((a, b) => {
      if (by === "mcap" || by === "both") {
        const da = Math.abs((a.market_capitalization ?? 0) - targetMcap)
        const db = Math.abs((b.market_capitalization ?? 0) - targetMcap)
        return da - db
      }
      return (b.market_capitalization ?? 0) - (a.market_capitalization ?? 0)
    })
    .slice(0, opts.limit ?? 5)

  const peers = ranked.map(pick)
  const targetPicked = pick(target)

  const bench = {
    sector33: target.sector33_code,
    peer_count: peers.length,
    median_trailing_per: median(peers.map((p) => p.trailing_per)),
    median_forward_per: median(peers.map((p) => p.forward_per)),
    median_pbr: median(peers.map((p) => p.pbr)),
    median_trailing_roe: median(peers.map((p) => p.trailing_roe)),
    median_forward_roe: median(peers.map((p) => p.forward_roe)),
    median_roic: median(peers.map((p) => p.roic)),
    median_trailing_op_margin: median(peers.map((p) => p.trailing_op_margin)),
    median_forward_op_margin: median(peers.map((p) => p.forward_op_margin)),
    median_yoy3y_sales: median(peers.map((p) => p.yoy3y_sales)),
  }

  return { target: targetPicked, peers, bench, by, band }
}
