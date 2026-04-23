# overview.json 品質監査レポート

監査日: 2026-04-23
対象: `https://cdn.ticker-code.com/cache/api/full/list/overview.json`
generated_at: 2026-04-23T12:18:26.106Z
総銘柄数: 3,753
監査者: Claude Agent（tickercode-cli 視点）
監査目的: `tc research-idea` ワークフローでの使用に耐える品質か評価する

---

## ⚡ 2026-04-23 更新: P0 トリアージ完了

BE チーム（龍五郎）が P0 2 件をトリアージし、**即応策として status フィールド 2 本を追加**しました（commit `7f6e58e`、R2 本番反映済）。

### 追加フィールド（2026-04-23 13:26 UTC 生成）

| フィールド | 値 | 件数 | 割合 |
|---|---|---|---|
| `fiscal_year_status` | `current` | 2,981 | 79.4% |
| | `stale_2y+` | 521 | 13.9% |
| | `missing` | 251 | 6.7% |
| `segment_data_status` | `complete` | 2,975 | 79.3% |
| | `partial` | 480 | 12.8% |
| | `unavailable` | 298 | 7.9% |

### 根本原因（BE 分析済）

- **P0 #1**: EDINET 収集で 2022-2024 の非 6 月 submit 分（非 3 月決算企業）の annual report が DB に欠損
- **P0 #2**: XBRL parser の売上 tag list 不足（業種固有 extension tag 未対応、coverage 82%）

### 残タスク（次スプリント、BE 側）

- P0 #1 本修正: EDINET backfill（521 銘柄 → 0 を目指す）
- P0 #2 本修正: XBRL tag list 拡張（parser coverage 82% → 95%+）
- P1/P2: boilerplate blocklist、`narrative_quality` field、cadence 明確化

### CLI 側の対応

`tc research-idea` の MVP 実装は **status フラグで分岐すれば即着手可能**。詳細は `plan-research-idea.md` §5.1.3 参照。

```typescript
// 研究対象集合（デフォルト）: 2,508 銘柄（66.8%）
const safeSet = items.filter(i =>
  i.narratives != null
  && i.fiscal_year_status === "current"
  && i.segment_data_status === "complete"
);
```

以下、原文の監査レポート（履歴保全のためそのまま残す）。

---

## 評価サマリ

| カテゴリ | 評価 | コメント |
|---|---|---|
| データ完備性 | ✅ Excellent | 3,751 / 3,753 が narrative 充足（99.95%） |
| スキーマ整合性 | ✅ Good | ApiResponse<T> 規約準拠、field 命名整理済 |
| コード一意性 | ✅ Perfect | 3,753 unique codes / display_codes |
| narrative 独自性 (summary/industry) | ✅ Good | 3,751 unique（完全重複ゼロ） |
| セグメント構造整合性 | ⚠️ Medium | 181 社で全フィールド null、6 社で share 合計乖離 |
| narrative 独自性 (strengths/weaknesses) | ⚠️ Medium | 上位 boilerplate 18 フレーズで 530 回露出 |
| narrative 品質一貫性 | ⚠️ Medium | 2 種のパイプライン混在（curated vs AI template） |
| **fiscal_year 正確性** | ❌ **Critical Bug** | 458 銘柄（12.2%）で 2021 年にロック |
| **segments 数値充足性** | ❌ **High** | 181 社で name は埋まるが revenue / op_profit 全 null |
| 鮮度 | ⚠️ Medium | 67% が 2026-02 生成（~2 ヶ月前） |
| キーワード分布 | ✅ Good | AI=656, 半導体=252, ESG=468 等、過剰偏重なし |

**総合判定**: `tc research-idea` の MVP 実装は可能だが、**critical/high 2 件の修正なしには最終レポートの信頼性が損なわれる**。特に 2 件目（segments 数値 null）は「セグメント内で AI 事業を何 % 持つ」系の絞り込みを不能にする。

---

## 🚨 Critical — 即時修正依頼

### Issue #1: `fiscal_year` が 2021 年にロックされている（458 銘柄 / 12.2%）

**観測**:
- 515 銘柄が `fiscal_year < "2024-01-01"`
- 458 銘柄が `fiscal_year` が `"2021-*"` で始まる

**サンプル**（実データ）:

| code | 企業名 | セクター | fiscal_year | analysis_as_of | segments |
|---|---|---|---|---|---|
| 1376 | カネコ種苗 | 水産・農林業 | **2021-05-31** | 2026-03-25 | 4 件（生花, 種子・苗木 等） |
| 1377 | サカタのタネ | 水産・農林業 | **2021-05-31** | 2026-03-05 | 4 件（国内卸売, 海外卸売 等） |
| 1407 | ウエストHD | 建設業 | **2021-08-31** | 2026-03-05 | 5 件（再エネ, 省エネ 等） |
| 1419 | タマホーム | 建設業 | **2021-05-31** | 2026-03-05 | 5 件（住宅, エネルギー 等） |

**共通パターン**: 非 3 月決算（2, 5, 8, 9, 11 月等）の企業で発生。narrative / segments / analysis_as_of はすべて 2026 年の最新データなのに、`fiscal_year` の年部分だけが 2021 にロック。

**推定原因**:
1. fiscal_year 抽出ロジックが `{year: 2021}` を定数で持っている
2. 非 3 月決算の決算期を DB から取得する時、旧データ（4 年前）の行を SELECT している
3. 何らかの schema migration 残骸

**影響**:
- 「直近決算が新しい銘柄だけ」のフィルタが壊れる
- fiscal_year でソートすると 2021 決算が最古として現れる
- Agent が「古い情報では？」と判断して除外する誤動作

**修正依頼**:
- 458 銘柄の `fiscal_year` を最新決算期（おそらく 2025-05-31, 2025-08-31 等）に修正
- 生成 pipeline の fiscal_year 抽出ロジックを確認・修正

---

### Issue #2: `segments[]` の name は埋まるが数値が全 null（181 銘柄 / 4.8%）

**観測**:
- 181 銘柄で `segments.length > 0` かつ **全要素**の `revenue`, `revenue_share`, `op_profit`, `op_margin` が **すべて null**

**サンプル**:

| code | 企業名 | セクター | segments |
|---|---|---|---|
| 2282 | 日本ハム | 食料品 | 4 件（加工食品, 新鮮肉類, 海外事業, ボールパーク） |
| 2484 | 出前館 | サービス業 | 1 件（出前館事業） |
| 7203 | トヨタ自動車 | 輸送用機器 | 3 件（自動車, ファイナンシャル, Other）※ op_profit のみあり |
| 190A | Chordia Therapeutics | 医薬品 | 1 件 |
| 244A | グロースエクスパートナーズ | 情報・通信 | 1 件（エンタープライズDX事業） |

**注**: トヨタは `op_profit` だけ埋まっている特殊ケース。他 180 社は全フィールド null。

**推定原因**:
1. EDINET/XBRL の segment 情報パースで数値欄の抽出に失敗
2. 海外決算準拠（IFRS 等）でフィールドマッピングが異なる
3. 連結 vs 単体の扱い混在

**影響**:
- 「セグメント内に AI 事業を X% 以上持つ企業」のような **セグメント寄与度フィルタが無効化**
- `revenue_share` の合計 null を除外判定に使うと false negative

**修正依頼**:
- 181 銘柄のセグメント数値欄を埋める。不可能なら理由を明記（schema に `segment_data_status: "complete" | "partial" | "unavailable"` 等）
- トヨタ型（部分欠損）も同様のフラグで分類

---

## ⚠️ High — 使い勝手に影響

### Issue #3: strengths / weaknesses の boilerplate 濃縮

**観測**:

```
strengths 上位 boilerplate:
  112 回: "自己資本比率が高く、財務基盤が安定している。"
   85 回: "多様な事業セグメントを持ち、リスク分散が図られている。"
   52 回: "中期経営計画に基づく明確な成長戦略を持っている。"
   ... (上位 10 件で 437 回)

weaknesses 上位 boilerplate:
  103 回: "競争が激化する中で、価格競争に巻き込まれるリスクがある。"
   42 回: "競争が激化する中で、価格競争に巻き込まれる可能性がある。"
   29 回: "過去3年間の純利益成長率が大幅にマイナスである。"
   ... (「価格競争」系の言い換え合計で 300+ 銘柄)

10 回以上出現するフレーズ: 18 個、延べ 530 回（strengths の 3.0%）
```

**影響**:
- キーワード検索で「競争激化」「財務基盤」等を打つと**数百社ヒット**し、シグナルが埋没
- Agent の絞り込み精度が低下、reflection ループで keyword 調整を繰り返す必要
- 最終レポートで「強み」をそのまま引用すると平均化・当たり障りない内容に

**修正依頼（優先順）**:
1. **短期**: 上位 50 boilerplate フレーズを blocklist 化、生成時に再プロンプトで具体化を促す
2. **中期**: プロンプトに「他社と被らない具体的な事業・技術・製品・顧客に基づく強み」を明示
3. **長期**: 類似度検出（embeddings）で他社と 80% 以上重複する bullet を自動再生成

---

### Issue #4: narrative 品質の不均一（2 パイプライン混在）

**観測**:
- 17 銘柄が `strengths.length === 1` で **高品質な curated narrative**
- 3,002 銘柄が `strengths.length === 5` で **AI テンプレート**

**高品質サンプル**（strengths 1 件）:
```
1376 カネコ種苗:
  "最大の強みは、グローバル市場で通用する高品質な野菜・花き等のオリジナル品種を開発する
  「研究開発力」です。種苗、薬剤、施設材の各部門が連携し、ハード（施設）とソフト
  （種苗・技術）を組み合わせた次世代農業システムを提案できる点も競合他社にはない
  優位性です..."
```

**テンプレサンプル**（strengths 5 件）:
```
7203 トヨタ自動車:
  "広範な製品ラインアップを持ち、様々な顧客ニーズに応えることができる。"
  "グローバルな販売網を有し、世界各国での市場シェアを確保している。"
  "高い品質と安全性を誇る製品を提供し、顧客からの信頼を得ている。"
  ...（トヨタに限らず多くの自動車・製造業で使い回せる文面）
```

**影響**:
- 同じ「strengths」field でも粒度が違うため、Agent が「中身の濃さ」を判定できない
- 高品質版は具体的すぎて keyword マッチしにくい可能性（固有名詞や技術名中心）
- テンプレ版は generic すぎて差別化できない

**修正依頼**:
- メタフィールド `narrative_quality: "curated" | "ai_generated"` を追加
- 将来的にテンプレ版も curated 水準に寄せる（コスト・時間と天秤）

---

## 📊 Medium — 改善余地

### Issue #5: narrative 鮮度（67% が 2 ヶ月前）

**観測**:
- 2026-02 生成: 2,497 銘柄（66.5%）
- 2026-03 生成: 1,158 銘柄（30.9%）
- 2026-04 生成: 96 銘柄（2.6%）
- 最古: 2026-02-25 00:16:17
- 最新: 2026-04-21 13:04:21

**懸念**:
- 2 ヶ月前の業界分析だと「AI ブーム」「半導体相場」の文脈が古い
- 決算発表後の narrative 更新 trigger が組まれているか不明

**修正依頼**:
- narrative 再生成の cadence を明示化（例: 四半期 or 決算後 14 日以内）
- `analysis_as_of` を見て古い順から再生成する cron を追加

---

### Issue #6: 一部 narrative が generic / 情報量不足

**観測**（industry 最短クラス）:
```
194A WOLVES HAND: "動物医療業界は、ペットの家族化や高齢化により成長が期待される分野です。
  市場は堅調で、飼い主の医療支出が増加している一方で、競争環境は厳しさを増しています。
  今後は、高度医療の提供や新たなサービスの開発が鍵となるでしょう。"
```
→ 業界レポート 1 行目に書くような一般論のみ。この企業固有の競争ポジションや差別化要因が欠落。

**影響**:
- keyword マッチはするが、深堀り材料にならない
- Agent がこの narrative だけで投資判断の情報を得られない

**修正依頼**:
- プロンプトに「業界内でのこの企業の相対ポジション（シェア、ランク、差別化要因）を必ず含める」を追加

---

### Issue #7: 超稀少 edge case

- `narratives === null`: 2 銘柄（556A 犬猫生活, 558A SQUEEZE）→ 新規上場直後。許容。
- segment_count=0 かつ fiscal_year=null: 251 銘柄。上記と重複し許容（データなし銘柄）。

---

## ✅ Good — 現状維持で OK

| 項目 | 値 |
|---|---|
| 総銘柄数 | 3,753（ACTIVE 全量、ETF/REIT 除外済み） |
| code / display_code 一意性 | 3,753 / 3,753 |
| narrative null 率 | 0.05% (2/3753) |
| narrative 空文字率 | 0% |
| summary/industry 完全重複 | 0 件 |
| segments 合計 share ≈ 1.0 | 3,293 / 3,299 数値埋済 (99.8%) |
| ApiResponse ラッパー準拠 | ✅ |
| ETag / Last-Modified | 配信あり（差分 DL 可） |
| Cache-Control | `public, max-age=3600` |
| gzip 配信 | ✅ |
| 転送サイズ | gzip 2.0MB / raw 9.3MB |
| キーワード分布 | AI=656 半導体=252 ESG=468 インバウンド=243 クラウド=318 ロボット=199 EV=138 |

---

## CLI 側の回避策（BE 修正待ちの間に必要）

1. **fiscal_year フィルタは使わない** or `.fiscal_year > "2024-01-01"` 判定で 12% 除外されることを前提に扱う
2. **segments 数値フィルタは `null` 除外**し、name のみに依存
3. **boilerplate bullet は検索 signal から除外**（事前に blocklist 定義、~/.tickercode/data/boilerplate-blocklist.json）
4. **narrative が 2 ヶ月以上古い場合の警告**を最終レポートに付記

---

## 改善依頼まとめ（BE チーム向け、優先順）

| 優先度 | Issue | 内容 | 担当 |
|---|---|---|---|
| 🚨 P0 | #1 | fiscal_year が 2021 にロック（458 銘柄）— 抽出ロジック修正 | 龍五郎 |
| 🚨 P0 | #2 | segments 数値全 null（181 銘柄）— XBRL パース修正 or ステータスフラグ追加 | 龍五郎 |
| ⚠️ P1 | #3 | boilerplate blocklist + 生成プロンプト改善 | 龍五郎 + 白川 |
| ⚠️ P1 | #4 | `narrative_quality` メタフィールド追加 | 龍五郎 |
| 📊 P2 | #5 | narrative 再生成 cadence 明示化 + 古い順 cron | 龍五郎 |
| 📊 P2 | #6 | プロンプトに相対ポジション明示要件を追加 | 白川 |

P0 2 件が解決すれば、CLI 側は本実装に進める。P1/P2 は `tc research-idea` v1 リリース後に順次改善でよい。
