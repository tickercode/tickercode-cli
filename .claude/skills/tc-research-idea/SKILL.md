---
name: tc-research-idea
description: 投資テーマ (自由文) から候補銘柄を抽出し、深堀りレポートを生成する 7 ステップワークフロー。tc research-idea CLI + overview.json narrative 検索 + Agent による再ランキング/narrative 執筆の協調でテーマ整合性の高い final.md を仕上げる。
---

# tc-research-idea — テーマ起点の銘柄調査スキル

投資テーマ（例: 「AI 時代の受益者」「コンサル系で AI の恩恵を受ける会社」「インバウンド再加速」）を自由文で受け取り、**候補抽出 → 絞り込み → 深堀り → レポート執筆**を一気通貫で行う指南書。

単一コード深堀りは `tc-research` スキルを使う。本スキルはテーマ横断で複数銘柄を扱う。

---

## 核となる前提

1. **CLI と Agent の役割分担を守る**
   - CLI (`tc research-idea`): keyword → hits → shortlist の機械的処理、md 雛形生成
   - Agent: キーワード生成、再ランキング、narrative 執筆、スコアリング
2. **助言ではなく情報提供** — 「買うべき」「売るべき」は絶対禁止。「候補」「恩恵を受けやすい」等の中立表現
3. **データソース明記** — 数値の出典 (overview.json / mini.json) と基準日を末尾に記載
4. **context 圧迫を避ける** — raw hits.json (290KB) は read しない、narrative は必要銘柄だけ extract
5. **matched_fields 数 = テーマ純度の proxy** — 5/6 > 4/6 > 3/6 > 2/6、2 以下は慎重解釈

---

## 7 ステップワークフロー

```
Step 1  Agent: 自由文 → keywords 生成 (3-20 個)
Step 2  CLI: tc research-idea で overview.json 横断検索 + shortlist 生成
Step 3  Agent: shortlist.json を読んで matched_fields + 指標で re-rank → top 5
Step 4  CLI: overview.json から top 5 の narrative を extract
Step 5  Agent: narrative を読み込み Type X/Y/Z 等で分類
Step 6  Agent: 4 軸スコアリング (テーマ整合 / 成長 / バリュ / 収益)
Step 7  Agent: final.md を書き直す (skeleton を上書き)
```

---

## Step 1: キーワード生成（最も Agent の腕が試される）

### 原則

- **3-20 個**、OR / AND のどちらを使うかを先に決める
- **日英混在 OK**（AI ⇔ 人工知能、LLM ⇔ 大規模言語モデル）
- **上位概念・下位概念・同義語**を含める
- **substring match 前提**でキーワードを選ぶ（「AI」は「KAI」にもマッチする副作用あり）
- **名詞優先**（動詞・形容詞は narrative での出現が限定的）

### match モードの選び方

| 状況 | match | 典型 hits 数 | 用途 |
|---|---|---|---|
| テーマが広い (例: 「AI 関連」) | `any` (OR) | 500+ | 幅広く拾って screen でしぼる |
| テーマが狭い (例: 「コンサル × AI」) | `all` (AND) | 30-200 | 初手から精度重視 |
| 特化テーマ (例: 「半導体製造装置」) | `any` with 2-3 keyword | 100-300 | 同義語列挙で漏れ防止 |

### 良い keyword セットの例

```
「AI 時代の受益者」 → any ["AI", "機械学習", "LLM", "人工知能"]
「半導体装置」 → any ["半導体製造装置", "半導体装置", "半導体製造"]
「インバウンド消費」 → any ["インバウンド", "訪日", "観光客"]
「コンサル系で AI の恩恵」 → all ["コンサル", "AI"]
「脱炭素」 → any ["脱炭素", "カーボンニュートラル", "GHG", "再生可能エネルギー"]
```

### 悪い例（避ける）

- `"DX"` 単独 (一般名詞すぎて 1,000 社ヒット)
- `"リスク"` (全企業が narrative で言及)
- `"成長"` (全 narrative に出現する boilerplate)
- 動詞形 `"活用する"` (narrative は名詞中心)

### 実行前の hits 数プレビュー（推奨）

keyword セットが広すぎ/狭すぎていないか、本実行前に確認:

```bash
tc overview search --keywords "コンサル,AI" --match all --fiscal-status current --format json | jq '.count'
```

→ 64 なら OK、5 なら狭すぎ (keyword 緩める)、500 なら広すぎ (AND にするか keyword 削る)。

---

## Step 2: CLI で shortlist 生成

### 標準コマンド

```bash
tc research-idea "<theme>" \
  --keywords "a,b,c" \
  --match any \              # または all
  --fiscal-status current \  # 既定、stale_2y+ 除外
  --screen-roe-gt 10 \       # 任意、ROE > 10%
  --screen-mcap-gt 10000000000 \  # 100 億円以上（小さすぎ除外）
  --target-size 25 \         # shortlist 上限
  --hits-limit 50 \          # 02-hits.md の md 行数
  --top-n 5 \                # final.md の深堀り候補数
  --out /tmp/research/idea   # 出力ディレクトリ
```

### screen flags の選び方

| テーマ | 推奨 screen | 理由 |
|---|---|---|
| 高成長狙い | `--screen-roe-gt 15 --screen-growth3y-gt 10` | 成長 + 収益性 |
| バリュー狙い | `--screen-per-lt 20 --screen-pbr-lt 2` | 割安フィルタ |
| 大手限定 | `--screen-mcap-gt 100000000000` | 時価総額 1000 億以上 |
| クオリティ | `--screen-roe-gt 10 --screen-op-growth3y-gt 5` | 収益 + 継続成長 |

### 実行結果の読み方

```
✓ research-idea  ai-20260424-943c988c
  theme:     AI 時代の受益者
  hits:      563 (02-hits.md shows first 50)
  shortlist: 20
  top-n:     5
  output:    /tmp/research/idea/ai-20260424-943c988c
```

- `hits` が 10 未満: keyword 狭すぎ → 緩める
- `hits` が 1000 以上: keyword 広すぎ → AND にするか削る
- `shortlist` が `target_size` 未満: 定量フィルタが厳しすぎる
- `shortlist` が 0: フィルタ緩める or 対象 theme に合った指標に変える

---

## Step 3: shortlist 再ランキング

`03-shortlist.md` は**コード順ソート**なので、Agent が再ランキングする必要がある。

### ランキングキー（優先順）

1. **matched_fields 数**（narrative の複数フィールドで AI 関連性が確認できるか）
2. **matched_keywords 数**（複数キーワードにヒットしている）
3. **セグメントに theme キーワードが入っている**（segments.name 内マッチは事業本丸の証拠）
4. 指標バランス: ROE / 成長率 / PER の各分位

### jq での確認コマンド

```bash
jq '[.items[] | {code: .display_code, name: .company_name, flds: (.matched_fields | length), fields: (.matched_fields | join(",")), per: .i_forward_per, roe: .i_forward_roe, g3y: .yoy3y_sales}] | sort_by(-.flds, -.roe) | .[:10]' /tmp/research/idea/<slug>/shortlist.json
```

### Top 5 選定の原則

- セクター多様性を意識（全員 IT だと「IT セクター」推奨と変わらない）
- リスクタイプの分散（純 AI 1 社 + AI 活用 2 社 + AI 追い風 1 社 + etc）
- 時価総額レンジも分散（小型 + 中型 + 大型）

---

## Step 4: Narrative 抽出（context 省資源）

top 5 の narrative だけを overview.json から extract する。**`tc overview status` で overview.json の場所を確認し、jq で必要銘柄だけ抽出**。raw を context に流さない。

```bash
# overview.json の絶対パス
ls ~/.tickercode/memory/overview.json

jq --arg codes "480A,4011,3798,208A,296A" '
  ($codes | split(",")) as $targets |
  .items[] | select(.display_code as $dc | $targets | index($dc)) |
  {
    code: .display_code,
    name: .company_name,
    sector: .sector33_code_name,
    summary: .narratives.summary,
    industry: .narratives.industry,
    strengths: .narratives.strengths,
    weaknesses: .narratives.weaknesses,
    segments: [.segments[] | {name, share: .revenue_share}]
  }
' ~/.tickercode/memory/overview.json
```

注: 上記 overview.json は既に **ApiResponse を剥がした後の data 部分**が保存されている。`.items[]` で直接アクセス。

---

## Step 5: Type X / Y / Z 分類

narrative から**テーマとの関わり方**を 3 類型に分類する。用語は theme ごとに変えて良い。

### 汎用パターン（AI テーマの例）

- **Type A (Pure)**: テーマそのものが事業の核。segments 名にキーワードが入っている
- **Type B (Embedded)**: テーマを既存事業に組み込んで付加価値化。narrative で明示
- **Type C (Beneficiary)**: テーマ普及で追い風を受ける、事業の核ではない

### コンサル × AI の例

- **Type X (Pure Consulting)**: 経営コンサル本業、AI が受注拡大要因
- **Type Y (AI-Integrated)**: IT コンサルで AI を組み込み
- **Type Z (Specialty)**: 経理・法務等で AI 活用

### 分類する利点

- ポートフォリオ分散の軸として使える
- リスク類型が異なる（Type A は単一テーマ依存、Type C はテーマ失速でも損失限定的）
- 読者が自分のリスク許容度に合う銘柄を選べる

---

## Step 6: 4 軸スコアリング

5 点満点 × 4 軸 = 20 点満点。感覚的に付けて良いが、根拠は narrative / 指標に紐付ける。

| 軸 | 5 点の条件 | 1 点の条件 |
|---|---|---|
| **テーマ整合** | segments 名にキーワード、narrative 5/6 field ヒット | 間接言及のみ、matched_fields 2 以下 |
| **成長性** | 3y CAGR > 20% or 明確な成長ドライバー | マイナス成長 or 成熟 |
| **バリュ** | PER < 15 かつ ROE > 15 | PER > 40 or 割高感強い |
| **収益性** | ROE > 20 かつ利益率改善 | ROE < 10 or 赤字 |

### 表形式で出す

```
| コード | 企業 | テーマ整合 | 成長性 | バリュ | 収益性 | 合計 |
|---|---|---|---|---|---|---|
| 480A | リブ・コンサル | 5 | 4 | 5 | 5 | 19 |
| 3798 | ULS グループ | 5 | 5 | 4 | 4 | 18 |
```

---

## Step 7: final.md の執筆

CLI が吐いた `final.md` の skeleton を**全面的に書き直す**。構造は skeleton を踏襲しつつ、実データで埋める。

### 必須セクション

1. **テーマの全体像**（2-3 段落）: なぜ今このテーマ、Type 分類の枠組み、hits/shortlist 件数
2. **選定フロー**（箇条書き + セクター分布表）
3. **Top 5 深堀り**（各社: 指標表 + 事業構造 + テーマ適合性 + 魅力 + 懸念）
4. **スコアリング表**
5. **勝ち / 負けシナリオ**（各社 1 行で勝ち方・負け方）
6. **リスク要因**（テーマ共通 + 銘柄個別 + データ品質）
7. **次のアクション提案**（tc memory fetch / find_peers / project_pl で追加調査の呼びかけ）
8. **データソース / 基準日 / 再現手順**

### 書き方のルール

- **断定禁止**: 「○○すべき」「買うべき」は使わず「~と考えられる」「~する余地がある」
- **数値は読みやすく**: 円は億/兆単位、% は小数第 2 位
- **対比で価値を示す**: 「shortlist 内最安」「サービス業 8 社中 ROE 最高」等の相対位置
- **出典明示**: `overview.json (generated_at YYYY-MM-DD)` を冒頭と末尾に

### 冒頭の免責表記（必須）

```markdown
> ※ 本レポートは情報提供を目的としており、特定銘柄の購入/売却を推奨するものではありません。
```

---

## 実戦例（前回 dogfood の成果物）

- `research/samples/ai-era/` — 「AI 時代の受益者」、OR 563 hits → 20 shortlist → top 5
- `research/samples/consulting-ai/`（本 skill 適用後） — 「コンサル × AI」、AND 64 hits → 25 → top 5

両者を比較すると、**AND の方がテーマ純度が高い shortlist になる**ことが実証できる。`--match all` は絞り込みに有効。

---

## 複数テーマ一括実行

3 テーマ以上を並行したいときは `tc research-batch <config.json>`:

```json
{
  "defaults": { "target_size": 25, "top_n": 5, "screen": { "roe_gt": 10, "mcap_gt": 10000000000 } },
  "themes": [
    { "theme": "AI 時代の受益者", "keywords": ["AI","機械学習","LLM"] },
    { "theme": "半導体装置", "keywords": ["半導体","製造装置"] }
  ]
}
```

→ `research/batch/{batch-slug}/summary.md` にクロステーマ overlap が自動出力される。同時多面的な調査を 1 回で済ませたい時に使う。

---

## 禁止事項

- ❌ 「買うべき」「売るべき」断言
- ❌ `hits.json` 全体を context に読み込む（290KB、重い）
- ❌ CLI 実行前に keyword 数を検証しない（0 ヒット / 広すぎで shortlist が破綻）
- ❌ 03-shortlist.md の順番で top 5 を決める（コード順で恣意性なし）
- ❌ 上場浅い銘柄 (2024 IPO) の成長率データを「ない」と結論づけずに IPO 時期を明記せず書く
- ❌ 複数テーマを個別に走らせる（`tc research-batch` を使う）

---

## 保存先

- **一時作業用**: `/tmp/research/idea/{slug}/`
- **永続化したい**: `research/samples/{slug-short-name}/` にコピーしてコミット
  - `hits.json` (290KB) は除外
  - `final.md` は Agent 完成版を保存

---

## 呼び出しパターン

ユーザーが `/tc-research-idea <テーマ自由文>` と入力したら、以下を実行:

1. Step 1: keywords をユーザーに提示して承認を取る（省略可、直感で OK なら skip）
2. Step 2: hits 数プレビュー → 実行
3. Step 3-7: 一連の処理を通し、最後に final.md の場所 + top 5 要約を出力

所要時間: 軽量版 (Step 1-3) で 30 秒、フル版 (Step 1-7) で 5-10 分 (narrative 深読み + 執筆)。
