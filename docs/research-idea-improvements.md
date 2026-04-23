# `tc research-idea` 改善点リスト

最終更新: 2026-04-24
ステータス: Phase 2c 完了、Phase 2d 未着手
関連: `plan-research-idea.md` / `commands/research-idea.ts`

## 背景

Phase 2b 完了直後（2026-04-23 commit `78d3fa0`）の dogfood で、`tc research-idea "AI 時代の受益者"` を走らせて発見した改善点をまとめる。

以降 Phase 2c（本ドキュメント作成と同時）で 5 件を即修正、残りは将来送り。

---

## Phase 2c（実施済、2026-04-24）

### #1 `02-hits.md` が肥大化して読みにくい

**現象**: AI テーマで 563 hits が 57KB の md に吐き出され、Agent / 人間共に一覧できない。

**対応**: `--hits-limit N`（既定 200）を追加。超過分は `hits.json` に残り、md 先頭に "Showing first N of M hits" ノート。

実測: limit 50 で `02-hits.md` が 5.3KB に縮小（90% 減）。

---

### #2 `final.md` の深堀り候補が top 10 固定

**現象**: `fmtFinalMdSkeleton` が shortlist の先頭 10 件しか列挙せず、テーマによっては不十分。

**対応**: `--top-n N`（既定 10）を追加。`fmtFinalMdSkeleton(..., topN)` の第 5 引数で上書き可能。final.md 内の見出しも `"深堀り候補 (top {N})"` に動的化。

---

### #3 slug 日付が UTC で JST と乖離

**現象**: 2026-04-24 00:25 JST に実行したのに slug が `ai-20260423-...`（UTC では 15:25 で 4/23）。利用者視点で混乱。

**対応**: `generateSlug` 内で `date.getTime() + 9h` → JST 時刻から Y/M/D 抽出。境界テスト 2 本追加（UTC 14:59 / 15:00）。

---

### #4 `--fiscal-status current` 既定で大企業を取りこぼす

**現象**: fiscal_year_status = `stale_2y+` の 521 社（13.9%）が常に除外される。特に非 3 月決算の大手（BE 側 backfill 待ちの間、ユーザーが上書きしたい場面あり）。

**対応**: `--include-stale` shortcut flag を追加。true なら `fiscal-status` 指定を無視して全 status を許可。meta.json の `fiscal_status_allow` に `"all"` を記録。

---

### #5 shortlist にセクター分布の集計がない

**現象**: 「shortlist 20 社のうち 8 社が IT セクター」のような偏りが一目で分からない。

**対応**: `sectorBreakdown(items) → SectorStat[]`（pure）を追加。03-shortlist.md の先頭に「## セクター分布」を自動挿入、テーブル形式（sector / code / count / share）で表示、銘柄一覧の直前。

実測: AI テーマで サービス業 40% / 情報・通信業 35% / 建設業 20% / 不動産業 5% の偏重が即可視化。

---

### #6 MCP 版と CLI 版の成果物が非対称

**現象**: CLI は 01-keywords.md / 02-hits.md / 03-shortlist.md / final.md + meta.json + hits.json / shortlist.json を書くが、MCP 版は meta.json / hits.json / shortlist.json のみ。Agent から呼んだ時に人間向けの md が生成されない。

**対応**: MD writer 群（`fmtKeywordsMd` / `fmtHitsMd` / `fmtShortlistMd` / `fmtFinalMdSkeleton`）を `src/lib/research-idea.ts` に移設して pure 化。command と MCP tool の両方から同じ関数を呼び、成果物を対称化。

---

## Phase 2d（将来送り）

### #7 `--resume` による差分再実行

**動機**: 同じ theme + 同じ keywords で slug 衝突した時、毎回 `--overwrite` または新 slug を強いられる。途中で落ちた場合の続行もできない。

**設計案**:
- meta.json の実行パラメータを hash 化し、一致する既存 slug があれば中間成果物を再利用
- 差分再実行: keywords / screen 条件が変わった step だけ再計算
- スコープ広く注意（中間成果物のハッシュキー設計が肝）

**工数見積**: 90〜120 分。

---

### #8 複数テーマ並行実行

**動機**: `tc research-idea "AI"` と `tc research-idea "半導体"` を同時に走らせたい。

**設計案**: `tc research-batch themes.yaml` のような subcommand か、`tc research-idea` 自体に `--batch file.yaml` flag。`Promise.all` で並行、slug はテーマごとに生成。

**工数見積**: 45〜60 分。

---

### #9 Boilerplate blocklist 統合

**動機**: BE 側の AI 生成 narrative に「財務基盤が安定」「競争が激化」系の boilerplate が多く、キーワード検索で 100+ 社ヒットしてノイズになる。

**BE 依頼**: `overview-json-quality-audit.md` P1 に記載済。BE 側で `narrative_quality` メタフィールド or boilerplate blocklist を出すのを待つ。

**CLI 側暫定対応案**: `~/.tickercode/data/boilerplate-blocklist.json` をローカル管理して検索 hit に match_quality スコアを付ける。ただし BE 対応が本筋なので優先度は低い。

---

### #10 シナリオ別レポート生成

**動機**: 同じ shortlist から「勝ちシナリオ」「負けシナリオ」で別レポートを生成したい。現状は final.md 1 本。

**設計案**: `--scenarios win,lose,neutral` で複数 final-*.md を生成、shortlist は共有。

---

## Phase 2c 実装記録

| 改善点 | コミット | 追加テスト |
|---|---|---|
| #1 hits-limit | (本コミット) | fmtHitsMd truncation 3 本 |
| #2 top-n | (本コミット) | fmtFinalMdSkeleton topN 3 本 |
| #3 JST slug | (本コミット) | JST 境界 2 本 |
| #4 include-stale | (本コミット) | （コマンド層のみ、lib 変更なし） |
| #5 sector breakdown | (本コミット) | sectorBreakdown 2 本 + fmtShortlistMd 2 本 |
| #6 MCP 対称化 | (本コミット) | （integration smoke でのみ確認） |

テスト総数: 58 → **70**（+12）。typecheck clean。

実測 dogfood（AI テーマ）:
- hits 563 / shortlist 20 / top-n 5 / hits-limit 50
- 02-hits.md: 57KB → **5.3KB**（90% 減）
- slug: `ai-20260424-943c988c`（JST 反映）
- sector breakdown: サービス業 40% / IT 35% / 建設 20% / 不動産 5%
