/**
 * Overview segment の派生 status helpers
 *
 * BE 側で fiscal_year_status / segment_data_status を item 直下から削除したため、
 * CLI 側で segment jsonb から派生計算する。
 */

import type {
  FiscalYearStatus,
  SegmentDataStatus,
  OverviewSegmentData,
} from "../memory/overview"

/**
 * segment.fiscal_year の新鮮度を判定
 * - missing: segment が null or fiscal_year が空/不正
 * - stale_2y+: fiscal_year が 2 年以上古い
 * - current: 2 年以内
 */
export function computeFiscalYearStatus(
  segment: OverviewSegmentData | null,
): FiscalYearStatus {
  if (!segment?.fiscal_year) return "missing"
  const fy = new Date(segment.fiscal_year)
  if (Number.isNaN(fy.getTime())) return "missing"
  const ageYears = (Date.now() - fy.getTime()) / (365.25 * 86_400_000)
  return ageYears > 2 ? "stale_2y+" : "current"
}

/**
 * segment 配下の numeric data 充足度を判定
 * - unavailable: segments 配列が 0 件、または全 segment で revenue/op_income が両方 null
 * - partial: 一部 segment で revenue or operating_income が null（トヨタ型）
 * - complete: 全 segment で revenue / operating_income が両方埋まっている
 */
export function computeSegmentDataStatus(
  segment: OverviewSegmentData | null,
): SegmentDataStatus {
  if (!segment || segment.segments.length === 0) return "unavailable"
  const segs = segment.segments
  const bothNull = segs.filter(
    (s) =>
      s.numbers.latest.revenue == null && s.numbers.latest.operating_income == null,
  ).length
  if (bothNull === segs.length) return "unavailable"
  const anyNull = segs.filter(
    (s) =>
      s.numbers.latest.revenue == null || s.numbers.latest.operating_income == null,
  ).length
  return anyNull === 0 ? "complete" : "partial"
}
