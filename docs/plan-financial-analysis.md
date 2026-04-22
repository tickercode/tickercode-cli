# tc financial — ローカルキャッシュ + 財務分析計画

作成: 2026-04-21
契機: tc-research 実機検証で `get_financial` が 346K chars 返し context オーバー

## 核となるアイデア

**「1 銘柄 1 ファイル、ダウンロード → ローカル加工」** を徹底する。Unix 哲学と完全に一致。

```
tc financial 7203                    # 一度叩けば ~/.tickercode/cache/financial/7203.json に保存
tc financial 7203 --field pl_net_sales         # ローカルから取り出し、軽い
tc financial 7203 --periods 3                  # 直近 3 期のみ
tc financial 7203 --json | jq '.[0].pl_net_sales'   # 生データを jq で加工
tc trend 7203 pl_net_sales                     # 時系列トレンド分析
tc analyze 7203 --template quality             # 分析テンプレート適用
```

**ポイント**: MCP の context に 346K 流す代わりに、**「ファイルパスを返す」** あるいは **「計算結果だけ返す」** ようにする。

---

## 3 層構造

```
Layer 1: Raw Cache     ~/.tickercode/cache/financial/<code>.json （1 銘柄 = 1 ファイル）
           ↓
Layer 2: Query         tc financial --field X  /  jq で切り出し
           ↓
Layer 3: Analysis      tc trend / tc diff / tc analyze  ← 派生指標の計算
```

### Layer 1 — Raw Cache

- 保存先: `~/.tickercode/cache/financial/{5桁コード}.json`
- スキーマ: API レスポンスそのまま（配列、複数期）
- TTL: **24 時間**（四半期開示なので更新頻度低）
- 強制更新: `--force`
- メタ: `~/.tickercode/cache/financial/.meta.json` で last_fetch を管理

### Layer 2 — Query（軽量切り出し）

```bash
# 期間絞り込み
tc financial 7203 --periods 3                  # 直近 3 期
tc financial 7203 --period-type FY             # 通期のみ
tc financial 7203 --period-type 4Q             # 4Q のみ
tc financial 7203 --from 2023-01 --to 2025-12  # 期間指定

# フィールド絞り込み
tc financial 7203 --fields pl                  # PL 系のみ（pl_* プレフィックス）
tc financial 7203 --fields bs,cf               # BS + CF
tc financial 7203 --field pl_net_sales         # 単一フィールドの全期推移
tc financial 7203 --fields "pl_net_sales,pl_operating_profit_loss,pl_net_income_loss"

# 組み合わせ
tc financial 7203 --periods 5 --fields pl --format csv

# 計算式（軽量な derived）
tc financial 7203 --compute operating_margin   # pl_operating_profit_loss / pl_net_sales
tc financial 7203 --compute "operating_margin,net_margin,gross_margin"

# 生データ + jq
tc financial 7203 --raw | jq '.[0] | {sales, op: .pl_operating_profit_loss}'
```

### Layer 3 — Analysis（派生指標・時系列）

```bash
# トレンド（時系列推移 + YoY + CAGR）
tc trend 7203 pl_net_sales                     # 売上の時系列
tc trend 7203 pl_net_sales --periods 10        # 10 期分
tc trend 7203 pl_operating_profit_loss --with-growth   # YoY%、CAGR を付与
tc trend 7203 "pl_net_sales,pl_operating_profit_loss"  # 複数メトリクス並列

# 期間比較（YoY 差分）
tc diff 7203 --from 2024Q3 --to 2025Q3
tc diff 7203 --latest                          # 最新期 vs 1 年前

# 複数銘柄 × 1 指標 の時系列比較
tc compare-trend 7203 6758 9984 pl_net_sales --periods 5

# 分析テンプレート
tc analyze 7203 --template quality             # 利益の質（OCF/NI, accruals）
tc analyze 7203 --template bs-health           # BS健全性（自己資本比率、流動比率、ICR）
tc analyze 7203 --template cf-analysis         # CF 分析（OCF, FCF, CAPEX, FCF利回り）
tc analyze 7203 --template margin-decomposition # 粗利→販管費→営業利益の分解
tc analyze 7203 --template dcf                 # 簡易 DCF（FCF + WACC + 成長率）
tc analyze 7203 --template moat                # 堀の定量判定（ROIC, gross margin stability）
```

---

## 分析テンプレート（アイデア）

### `quality` — 利益の質
以下を全期について計算：
- **OCF/NI 比率** — 1.0 近傍が健全。営業 CF が純利益に追いついていない企業を検知
- **Accruals Ratio** — (NI - OCF) / Total Assets。高いと会計操作の疑い
- **Working Capital Change** — 売掛・在庫・買掛の変化を可視化
- **特別損益の割合** — 一過性利益に依存していないか

出力例:
```
トヨタ自動車 (7203) — 利益の質チェック
期      OCF/NI   Accruals%  WC変化    特損比率   判定
2026Q3   1.12    -1.2%     +$1.2B   0.8%      ✅ 高品質
2025Q3   0.89    +3.4%     -$2.1B   3.2%      🟡 注意（WC悪化）
...
```

### `bs-health` — 貸借健全性
- **自己資本比率** — `bs_shareholders_equity / bs_total_assets`
- **流動比率** — `bs_current_assets / bs_current_liabilities`
- **Interest Coverage Ratio (ICR)** — `pl_operating_profit / interest_expense`
- **Net Debt / EBITDA** — 有利子負債 - 現金 / EBITDA
- **運転資本回転日数** — 売掛金・在庫・買掛金日数

### `cf-analysis` — キャッシュフロー分析
- **Free Cash Flow** = OCF - CAPEX
- **FCF 利回り** = FCF / 時価総額
- **FCF マージン** = FCF / 売上
- **CAPEX/売上** — 設備投資負担
- **配当性向 (CF base)** = 配当 / FCF

### `margin-decomposition` — マージン分解
```
売上              100%  ────┐
  - 売上原価      -70%       │ 粗利 30%
                                ├ +販管費 -20%
                                │ 営業利益 10%
                                ├ +営業外 +1%
                                │ 経常利益 11%
                                ├ +特別 +0%
                                │ 税前利益 11%
                                ├ -税金 -3%
                                └ 当期純利益 8%
```
時系列で積み上げグラフのような pretty 出力。

### `dcf` — 簡易 DCF
入力: 成長率（user 指定 or FCF 過去 5 年平均）、WACC（既定 8%）、永久成長率（既定 2%）
出力: 理論株価、現在株価との乖離率

### `moat` — 堀の定量判定
- **ROIC 安定性**: 過去 10 年の ROIC の標準偏差 → 低いほど堀あり
- **Gross Margin 安定性**: 過去 10 年の粗利率 → 安定は価格決定力の証
- **売上 CAGR × ROIC**: 資本効率を保ちながら成長しているか
- **堀スコア**: 3 軸の総合評価（1〜5）

### `lynch` — Peter Lynch 式分類
- PEG < 1 でカテゴリ判定:
  - Slow Grower (成長 <5%)
  - Stalwart (5-10%)
  - Fast Grower (>10%)
  - Cyclical（業界特性から判定）
  - Turnaround（赤字から黒字化）
  - Asset Play（資産価値 > 時価総額）

---

## MCP tool 設計（context 軽量化の本質解）

### 現状（問題）
```
get_financial(code) → 346K chars, 9172 行 → context オーバー
```

### 改善案（3 本立て）
```
get_financial_summary(code)
  → 最新期 + 1 年前のキー指標 15 個だけ（~1K chars）

get_financial_trend(code, metric, periods=5)
  → 特定メトリクスの時系列（~500 chars）

get_financial_analysis(code, template)
  → 分析テンプレの計算結果（~2K chars）

get_financial_raw(code, periods=3, fields=["pl", "bs"])
  → 絞り込んだ生データ（~10-50K、期/フィールドで調整）
```

現行の `get_financial` は `get_financial_raw` に rename + default を `periods=3, fields=["pl"]` に。

**LLM にとって ideal**: サマリとトレンドで意思決定 → 必要時だけ raw に drill down。

---

## 実装ロードマップ

### Phase 4A — ローカルキャッシュ（半日）
- [ ] `~/.tickercode/cache/financial/{code}.json` への保存
- [ ] TTL 24h、`--force` で上書き
- [ ] `src/lib/financial-cache.ts`

### Phase 4B — Query 層（1 日）
- [ ] `tc financial --periods N` / `--period-type FY|4Q|3Q|2Q|1Q`
- [ ] `tc financial --fields pl|bs|cf|all` / `--field <name>`
- [ ] `tc financial --compute <metric>`（operating_margin 等 10 個）
- [ ] `tc financial --from YYYY-MM --to YYYY-MM`
- [ ] `tc financial --raw` で生データ表示 → jq にパイプしやすい

### Phase 4C — MCP 拡張（半日）
- [ ] `get_financial_summary` tool
- [ ] `get_financial_trend(metric, periods)` tool
- [ ] 既存 `get_financial` を default で軽量化（periods=3, fields=pl）

### Phase 4D — 分析テンプレ（2〜3 日）
- [ ] `tc trend <code> <metric> [--periods N] [--with-growth]`
- [ ] `tc diff <code> [--latest | --from X --to Y]`
- [ ] `tc analyze <code> --template quality`
- [ ] `tc analyze <code> --template bs-health`
- [ ] `tc analyze <code> --template cf-analysis`
- [ ] `tc analyze <code> --template margin-decomposition`
- [ ] MCP tool 化 `get_financial_analysis(code, template)`

### Phase 4E — 上級テンプレ（将来）
- [ ] `dcf` / `moat` / `lynch` / `graham`

---

## jq との連携パターン

```bash
# 過去 5 期の売上と営業利益率
tc financial 7203 --raw --periods 5 | jq '
  map({
    period: .g_current_period_end_date,
    sales_bn: (.pl_net_sales / 1e9 | floor),
    op_margin: ((.pl_operating_profit_loss / .pl_net_sales * 100) | tostring | .[0:5])
  })
'

# YoY% を計算
tc financial 7203 --raw | jq '
  . as $all |
  $all[0:2] as [$cur, $prev] |
  ($cur.pl_net_sales - $prev.pl_net_sales) / $prev.pl_net_sales * 100
'

# 複数銘柄横並び
for code in 7203 6758 9984; do
  tc financial $code --field pl_net_sales --format csv
done | awk -F, '{ print $0 }'
```

**Agent（Claude）からも同じことが可能**: MCP 経由で軽量 tool を呼び、必要なら raw fallback。

---

## 未確定事項

### Q-1. 現行 `get_financial` MCP tool の扱い
1. **既存を default 軽量化**（periods=3, fields=["pl"]）+ 新 tool 群を追加 ← 推奨
2. 既存を `get_financial_raw` に rename + 新 tool 群を追加
3. 既存を削除 + 新 tool 群のみ

### Q-2. キャッシュ TTL
1. **24 時間**（四半期開示なので十分）← 推奨
2. 4 時間（mini.json と同期）
3. 12 時間（妥協案）
4. 永続（`--force` のみ更新）

### Q-3. `--compute` の実装方式
1. **事前定義した 10 個の metric**（operating_margin, net_margin, gross_margin, roe, roa, fcf, ocf_margin, icr, debt_to_equity, current_ratio） ← 推奨
2. 式 DSL（`--compute "pl_operating_profit_loss / pl_net_sales * 100"`）
3. 両方

### Q-4. 分析テンプレートの実装順
1. **quality → bs-health → cf-analysis → margin-decomposition** ← 推奨（初期投資家ユースケース）
2. dcf → moat → lynch（ペルソナ重視）
3. 全部並行

### Q-5. 出力フォーマット
1. pretty / json / csv / md の 4 種（既存踏襲）← 推奨
2. + tsv を追加（Excel 貼付）
3. + html を追加（レポート埋め込み）

---

## なぜこの設計が良いか

| 課題 | 解決 |
|-----|------|
| MCP context 346K オーバー | 軽量 summary + trend + 必要時に raw に drill down |
| Agent が何度も API を叩く | ローカルキャッシュで 1 回取得 → 何度でも |
| オフライン動作不可 | キャッシュ後はネット不要 |
| 生データを LLM に食わせたくない | 事前に分析テンプレで加工、結論だけ渡す |
| 人間も jq で自在に切り出したい | `--raw` で API レスポンスそのまま出せる |
| dexter との差別化 | 日本の会計体系（FY/4Q/3Q、特損、予想）に最適化した分析テンプレ |

---

## dogfood との接続（即解決できる問題）

| dogfood 発見 | Phase 4 で解決？ |
|-------------|---------------|
| 🔥 `get_financial` 346K 問題 | ✅ Phase 4C で完全解決 |
| 🟡 型混在（string 数値） | ✅ Phase 4B の `--compute` / `--field` で parseFloat 済み |
| 🟡 セクター欠損（ツカダ事業内容） | ❌ 別途 API 追加が必要（tc financial の範疇外） |

---

## 参考

- Unix 哲学: 「小さなツールの組み合わせ」— 生データ → jq → awk → grep → sort
- dexter の scratchpad 設計: `.dexter/scratchpad/*.jsonl` で full data を on-disk 保持
- `get_financial` 346K 問題: `docs/dogfooding-log.md` 2026-04-21
