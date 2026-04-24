# tickercode-cli overview.json jsonb 新スキーマ適応 設計メモ

作成日: 2026-04-24
ステータス: 設計確定 / 実装未着手
正式イシュー: `../../docs/issues/cli-overview-jsonb-adaptation/issue.md`（親リポジトリ）

## 概要

BE 側で `overview-api-jsonb-source-switch` が完了し、`overview.json` の item shape が:
- **旧**: item 直下に `segments[]` / `segment_count` / `total_sales` / `fiscal_year` / `fiscal_year_status` / `segment_data_status` がフラット
- **新**: すべて `item.segment` jsonb 配下に集約、`segment.segments[].numbers.latest` に numeric data + YoY + CAGR、`segment.segments[].analysis` に AI 散文、`segment.insights` に全体評価

CLI は旧 shape のまま。実 CDN を読むと undefined が大量発生して `tc research-idea` が silent に機能しない状態。

## 影響ファイル (6)

- `src/memory/overview.ts` — OverviewItem 型
- `src/lib/overview-search.ts` — keyword grep 対象
- `src/lib/research-idea.ts` — shortlist / format
- `src/commands/overview.ts` — 表示
- `src/commands/research-idea.ts` — フィルタ
- `src/mcp/tools/overview-search.ts` — MCP tool

## 要点サマリ（詳細は親イシューへ）

### 新 OverviewItem 型（抜粋）

```typescript
type OverviewItem = {
  code: string
  display_code: string
  company_name: string
  short_name: string | null
  sector33_code: string
  sector33_code_name: string
  market_code_name: string
  narratives: OverviewNarratives | null
  segment: OverviewSegment | null  // ← 新: jsonb が丸ごと入る
  analysis_as_of: string | null
}

type OverviewSegment = {
  schema_version: 1
  fiscal_year: string
  total_sales: number | null
  segment_count: number
  segments: Array<{
    name: string
    normalized_name: string
    numbers: {
      latest: { revenue, revenue_share, operating_income, operating_margin,
                gross_profit, gross_margin, assets,
                revenue_yoy, operating_income_yoy, gross_profit_yoy, assets_yoy,
                revenue_cagr_2y, operating_income_cagr_2y, ... }
      history: Array<{ fiscal_year, revenue, operating_income, gross_profit, assets }>
    }
    analysis: string | null
  }>
  insights: string | null
  last_refreshed_at: string
}
```

### 新規 helpers

- `src/lib/overview-status.ts` — `computeFiscalYearStatus` / `computeSegmentDataStatus`（BE 側から削除された派生値を CLI 側で計算）
- `src/lib/overview-accessors.ts` — `getDominantSegment` / `getLatestRevenueYoy` / `getTotalSales` 等の共通アクセサ

### 追加機能（jsonb で可能になった）

- keyword 検索対象に `segment.insights` と `segment.segments[].analysis`（AI 散文）を追加
- `--min-revenue-yoy` / `--require-ai-analysis` オプション
- shortlist 表示に YoY / CAGR / dominant segment 情報を含める

## Phase

1. **型 + fixture 更新**（0.5 日）
2. **ライブラリ適応**（1 日）
3. **コマンド適応**（1 日）
4. **追加機能**（0.5 日）
5. **結合確認**（0.5 日）

**合計: 3.5 日**

## 参照

- 親イシュー（実装チェックリスト + 詳細工数）: `../../docs/issues/cli-overview-jsonb-adaptation/issue.md`
- BE 変更: `overview-api-jsonb-source-switch`（done）
- 大元の設計: `./plan-research-idea.md`
