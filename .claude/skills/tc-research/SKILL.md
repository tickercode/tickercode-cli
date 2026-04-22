---
name: tc-research
description: 日本株の銘柄分析に関するあらゆる質問に答えるための指南書。ユーザーが自由な質問をしてくる前提で、tickercode MCP の 10 ツールを柔軟に組み合わせてレポートを生成する。数値系は MCP で、定性系は edinet/news を Read で読んで narrative に仕立てる。
---

# tc-research — 柔軟な銘柄調査アシスタント

銘柄コードに関する **どんな質問にも応える** ための指南書。

このスキルは「固定の workflow」ではない。ユーザーの質問を理解し、下記の 10 ツールを自由に組み合わせて応える。

## 核となる前提

1. **ユーザーの質問が最優先** — テンプレートに押し込まない
2. **context 圧迫を避ける** — raw データは memory ファイルに、context には summary だけ
3. **定量 × 定性** — 数値（MCP tool）と narrative（edinet/news を Read）を両輪で
4. **助言ではなく情報提供** — 「買い / 売り」の断定はしない
5. **データソースを明記** — 数値の出典は tickercode API（基準日を併記）

## ⚠️ スキーマ命名規約 (重要: 構造的 2 択認識)

API は `i_trailing_*` (実績) と `i_forward_*` (予想) の完全対称命名。
見た瞬間に 2 択として認識し、適切に選ぶこと。

### Rule 1: ペアを必ず両方意識
`i_trailing_*` を見たら → 必ず `i_forward_*` が対で存在する (peg を除く)
`i_forward_*` を見たら → 必ず `i_trailing_*` が対で存在する (peg を除く)

### Rule 2: hybrid 性質
`i_forward_roe` / `i_forward_roa` は **hybrid** (forecast 純利益 ÷ trailing 自己資本/総資産)。
分母が trailing であることを分析レポートに必ず明記する。

### Rule 3: prefix なし据え置き
`i_*` (prefix なし) は forward 版が存在しない:
- i_pbr (予想 BPS 算出不可)
- i_gross_margin (pl_forcast_cost_of_sales 全企業 null)
- i_roic (予想 NOPAT + 投下資本 不可)
- i_ev_ebitda (depreciation / interest_bearing_debt 全企業 null)
- 他: i_equity_ratio, i_ocf_yield, i_fcf_yield, i_ebitda, i_bps, i_kiyohara_net_cash_ratio

ユーザーが「予想 PBR は？」と聞いても「データなし」と返答する (推定計算しない)。

### tool 既定値
| tool | PER 既定 | 理由 |
|-----|-------|------|
| project_pl | i_forward_per | 将来 EPS に掛けるので forward が整合 |
| get_stock | 両方返却 | Agent が文脈で判断 |
| get_financial_summary | forecast セクションで forward | |

## ツールカタログ（10 本）

### データ取得（まず 1 回呼ぶ）

| tool | 役割 | 返す量 |
|------|------|-------|
| `mcp__tickercode__fetch_stock(code, endpoints?)` | 5 endpoint を ~/.tickercode/memory/code/{code}/ に保存 | ~300B |
| `mcp__tickercode__memory_path(code, endpoint?)` | ファイル絶対パス → Read ツールで読める | ~100B |

### 軽量サマリ（意思決定用）

| tool | 役割 | 返す量 |
|------|------|-------|
| `mcp__tickercode__get_stock(code)` | 銘柄 overview（価格・指標・セクター・成長率） | ~1KB |
| `mcp__tickercode__get_financial_summary(code)` | 最新 FY + 前年 + YoY + forecast | ~1KB |
| `mcp__tickercode__get_financial_trend(code, metric, periods)` | 特定メトリクスの時系列 + CAGR | ~500B |

### 計算・比較

| tool | 役割 | 返す量 |
|------|------|-------|
| `mcp__tickercode__project_pl(code, years, pattern)` | 売上・利益・EPS・理論株価 の N 年投影 + 感度 | ~2KB |
| `mcp__tickercode__calculate_moat(code)` | 堀 1〜5 + 4 要素スコア | ~1.5KB |
| `mcp__tickercode__find_peers(code, limit, by)` | 同セクター peer + 中央値ベンチ | ~3KB |

### ヘルパー

| tool | 役割 |
|------|------|
| `mcp__tickercode__normalize_code(code)` | 4↔5 桁変換 |
| `mcp__tickercode__memory_list()` | キャッシュ済み銘柄一覧 |

### 生データ（Read ツール）

- `memory_path(code, "edinet")` → `Read(path)` で有報テキスト（事業概要・リスク・セグメント）
- `memory_path(code, "disclosure")` → 適時開示（決算短信等）
- `memory_path(code, "news")` → 関連ニュース
- `memory_path(code, "financial")` → 全期 PL/BS/CF（必要なら Bash `cat | jq` で特定期抽出）

## 質問パターン別の組み立て方

### パターン A: 「○○ の PL を N 年予測して」「理論株価は？」
```
project_pl(code, years: N, pattern: "3y-cagr")
→ projection + sensitivity を表で
→ 現在株価との乖離率 + 成長率の持続性コメント
```

**PER の選び方**: tool の default は **forward PER（i_forward_per）**。予想 EPS をベースに市場が付けている倍率で、将来 EPS の投影と整合する。trailing PER（i_trailing_per）を使いたい場合は `per_override` で明示指定。assumptions.per_kind / trailing_per / forward_per が返り値に含まれるので、Agent はどちらを使ったか確認してレポートに明記する。

### パターン B: 「○○ の moat / 堀 / 競争優位は？」
```
1. calculate_moat(code) で 4 要素スコア
2. memory_path(code, "edinet") + Read で事業構造
3. find_peers(code) で peer 比較（ROE/margin/成長の相対位置）
4. バフェット視点の堀タイプ（ブランド / ネットワーク / スイッチングコスト / 規模 / 規制）で整理
```

### パターン C: 「○○ の競合他社分析」「peer と比べて」
```
find_peers(code, limit: 5, by: "both")
→ 自社 vs peer 中央値 の差分表
→ 強み（median 以上）/ 弱み（median 以下）をリスト化
```

### パターン D: 「○○ の脅威と機会」「SWOT」
```
1. get_stock(code) + get_financial_summary(code) で現状把握
2. memory_path(code, "edinet") + Read で「事業等のリスク」セクション抽出
3. memory_path(code, "news") + Read で直近トピック
4. 4 象限で narrative:
   - Strengths: 数値的に peer を上回る点
   - Weaknesses: peer 以下 or 構造的制約
   - Opportunities: edinet + news から
   - Threats: edinet「リスク要因」+ セクター動向
```

### パターン E: 「○○ の勝ち / 負けシナリオ」
```
1. SWOT を下敷きに
2. 勝ち: 機会 × 強み を重ねる → project_pl(pattern: "custom", growth: 楽観値)
3. 負け: 脅威 × 弱み → project_pl(pattern: "custom", growth: 保守値 / マイナス)
4. 各シナリオの 3〜5 年後の売上・利益・株価を並べる
```

### パターン F: 「○○ で AI（Claude Code など）が普及したら？」
```
1. memory_path(code, "edinet") + Read でコスト構造を把握
   （人件費比率、外注比率、R&D 比率は pl_i_labor_ratio / pl_i_rd_ratio 等）
2. AI が置き換えうる領域を特定:
   - ソフトウェア開発 → 開発コスト削減
   - 顧客対応 → 人件費削減
   - 研究開発 → R&D 効率化
3. 営業利益率の Before/After を定量試算
4. 競合が同じ効果を享受するので、相対優位は別途考察
```

### パターン G: 「○○ を簡単に教えて」（オーバービュー）
```
get_stock(code)
→ 1 段落の要約（company_name / sector / 時価総額 / PER / 直近株価動向）
```

### パターン H: 「セクター内で最も伸びてる銘柄は？」「低 PER × 高成長」など
```
mini.json がロード済みなら、Bash で直接 jq で絞り込み:
  jq '.items[] | select(.sector33_code=="5250" and (.i_forward_per | tonumber) < 15)' \
    ~/.tickercode/memory/mini.json
```
または find_peers(code, by: "growth") で成長段階が似た 5 社を抽出。

## Agent としての判断フレーム

質問を受けたら以下を考える:

1. **定量 or 定性 or 両方?**
   - 数値だけで答えられる → MCP tool を数本叩けば終わり
   - 定性が必要 → edinet / news を Read
   - 両方 → tool + Read を並列

2. **どの粒度?**
   - 1 段落の要約 → `get_stock` だけ
   - 1 ページのレポート → summary + trend を 2〜3 本
   - 深堀りレポート → fetch_stock + summary + trend + moat + peers + edinet Read

3. **過去 or 未来?**
   - 過去（実績）→ get_financial_summary / trend
   - 未来（予測）→ project_pl
   - 両方 → 過去トレンド → 予測の地続き

4. **単体 or 比較?**
   - 単体 → 時系列
   - 比較 → find_peers
   - セクター全体 → mini.json を jq で横断

## 出力の基本

### 必ず両方
1. **ファイル保存**: `research/code/{4桁}/{YYYY-MM-DD}-{slug}.md`
   - slug はトピックに応じて: `overview` / `project` / `moat` / `swot` / `deep` など
   - 再実行は連番付与（`-02.md`）
   - 先頭に frontmatter: `code` / `company_name` / `date` / `topic` / `data_as_of`
2. **会話にも Markdown**: 長文は折りたたみ or 要約 + ファイルパス提示

### 数値の書き方
- 通貨単位: 百万円 / 十億円 / 兆円 に丸めて読みやすく（生数字より）
- % は小数第 2 位まで
- 日付は API 基準日を末尾に注記

## データモデルの注意点（dogfood で発覚済み）

### 財務フィールド名の落とし穴

| 用途 | 正しいフィールド名 | 間違いやすい名前 |
|-----|--------------------|--------------|
| 純利益 | `pl_net_profit` | `pl_net_income_loss`（null が多い） |
| 営業利益率 | `pl_i_operating_margin`（pre-computed）または 計算 | — |
| 粗利率 | `pl_i_gross_margin`（pre-computed） | — |
| ROE per period | `pl_net_profit / bs_shareholders_equity` で計算 | `pl_i_roe`（存在しない） |

### 型が混在
PER / 株価 / 配当利回りなど多くは **string**（`"9.14"`）、時価総額は **number**。MCP tool は parseFloat 済みの数値を返すので基本は tool 経由で。raw JSON を触る時のみ `parseFloat` 必要。

### mini.json と financial.json で指標が違うケース
`i_gross_margin`（mini.json: 会社全体の最新値）vs `pl_i_gross_margin`（financial.json: 期別）。文脈に応じて使い分ける。

## 禁止事項

- ❌ 投資助言（「買うべき」「売るべき」断言）
- ❌ データ捏造（API 未取得フィールドを推測で埋める）
- ❌ raw データを会話にそのまま貼る（300 行の配列など）
- ❌ 財務予測で PER を未来値に勝手に調整（特記しない限り現在値を維持）
- ❌ 直列で tool を呼ぶ（独立なら並列で）
- ❌ 1 銘柄の調査に 10 tool 全部使う（過剰）

## サンプル呼び出し

```
/tc-research 5592                                # オーバービュー
/tc-research 5592 PL を 5 年予測して              # project_pl
/tc-research 5592 堀は？                        # calculate_moat + edinet
/tc-research 5592 競合と比べて                   # find_peers
/tc-research 5592 SWOT で                       # get_stock + edinet + news
/tc-research 5592 AI が普及したら                # edinet Read + 推論
/tc-research 5592 勝ち負けシナリオ              # SWOT + project_pl × 2
```

引数に code 以外の自然言語が含まれる場合、それが **質問本体**。パターン表（A〜H）を参考に適切な tool chain を組む。

## 保存先

`research/code/{4桁コード}/{YYYY-MM-DD}-{topic-slug}.md`
