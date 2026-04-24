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
6. **ユーザーとの対話は番号選択**（AskUserQuestion は使わず、CLAUDE.md 規約に従う。詳細は次節「対話パターン」）
7. **実行後は必ずチャットに要約を表示**（詳細は「実行後の報告」節）

---

## 対話パターン (番号選択フォーマット)

ワークフロー中に**判断が分かれる / 曖昧な場面**が出たら、処理を止めてユーザーに番号選択で問う。AskUserQuestion ツールは**使わない**（CLAUDE.md 規約）。

### 聞き方のフォーマット

```
質問: ○○はどうしますか？
1. 選択肢 A — なぜ良いか / どういう時に選ぶか
2. 選択肢 B — 対比ポイント
3. 選択肢 C — etc.
4. 選択肢 D — 既定/推奨（★ を付ける）
5. 選択肢 E — その他（ユーザー自由入力も歓迎）

番号で回答してください。
```

- 1 問 3〜8 選択肢、推奨には ★ を付けて誘導
- 「番号 + 補足」にも対応（「3 + 4 両方」などの compound response は承認扱い）

### 聞くべきタイミング

#### Step 1 終了時（キーワード生成後）

- **hits 数が想定外**（10 未満 or 500 超）のとき → keyword を緩める / 絞る / OR/AND 切替を選ばせる
- **テーマ解釈が複数ある**とき（例: 「EV」→ 自動車メーカー / 部品 / 充電インフラ どれ？）→ 明示的に候補セットを 3-4 案提示して選ばせる

```
質問: 「EV 関連」のテーマ解釈を確定させてください。
1. 完成車メーカー（トヨタ、日産 等）— OEM 側
2. 電池・モーター部品 — サプライチェーン中流
3. 充電インフラ・サービス — 普及の裾野
4. ★ 全部を横串で（OR 幅広、あとで matched_fields 順で絞る）

番号で回答してください。
```

#### Step 2 終了時（shortlist 生成後、0 件 / target-size 未満のとき）

- 定量フィルタが厳しすぎで 0 件 → ROE/mcap 閾値を緩めるか、include-stale で対象拡大するかを聞く

#### Step 3 終了時（再ランキング後、top 5 選定前）

- **top 1 候補が 2 つ以上タイ**のとき、または **matched_fields 低いが注目銘柄**のとき → どちらを優先するか聞く

```
質問: top 5 の編成方針は？
1. matched_fields 純度優先（narrative で厚く言及される銘柄のみ）
2. ROE / 成長率など定量指標優先（多少 matched_fields が低くても強い業績）
3. ★ 両者のバランス（純度 3+ かつ ROE > 15% の両立）
4. セクター多様性優先（同セクター集中を避ける）

番号で回答してください。
```

#### Step 5 終了時（Type 分類後、深堀りが重いとき）

- **top 5 の深堀りに時間がかかる**見込み（narrative が短く edinet 目視が必要等）→ どこまで深掘るか選ばせる

### 聞かなくてよいタイミング

- hits 数が目標レンジ内（30-300）で、テーマ解釈が明確なとき → そのまま進む
- 定番テーマ（AI / インバウンド / 半導体 等）で過去 dogfood と同じパターンが通用するとき → そのまま進む
- 時間短縮を優先する場面（ユーザーが「任せる」「まるっと」と言った場合）→ 推奨案で突き進む

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

### ⚠️ 落とし穴: matched_fields だけで判定しない

**matched_fields 数は narrative 言及の厚みの proxy であり、市場認識と乖離することがある。**

実例（2026-04-24 インバウンドテーマ dogfood）:

- **2222 寿スピリッツ**: matched_fields **1/6** だが、ROE 30% × 3y 売上 CAGR +32% で shortlist 最高水準。実質的にはインバウンド象徴銘柄（お土産菓子王、白い恋人ポジション）
- 一方で **matched_fields 4-5 の銘柄でも**、segments/strengths でキーワード言及があるだけで**実業績は連動していない**ケースもある

### 対策: 定量 × 定性の併記チェック

top 5 選定時に以下を並行評価:

1. **matched_fields 数**（narrative 言及の厚み）
2. **ROE / 3y CAGR / PER** の定量指標（業績が theme の追い風で動いているか）
3. **セグメント名 + 事業構造**（事業本丸で theme に関わるか）
4. **市場認識**（投資家にとっての「定番テーマ銘柄」か、Agent の知識ベースから判断）

matched_fields 1-2 でも定量指標が突出している銘柄は top 5 候補に残す価値あり。逆に matched_fields 4-5 でも指標が平凡なら順位を下げる。

### ⚠️ 落とし穴 (2): trailing / forward ROE 乖離による楽観バイアス

**mini.json の `i_forward_*` は会社予想（楽観的）、`i_trailing_*` は実績値。両者の乖離が大きい銘柄は narrative も楽観的に書かれている可能性が高い。**

### 実例（2026-04-24 SaaS×AI テーマ dogfood）

**3905 データセクション**:

| 項目 | 値 |
|---|---|
| `i_forward_roe` | 17.19%（会社予想） |
| `i_trailing_roe` | **-31.21%**（実績） |
| 乖離 | **48 ポイント** |
| narrative の記述 | 「ROE -4.01% と低い」（実態より約 7 倍甘い） |
| 実際の財務 | **7 期連続営業赤字**、通期予想達成は 4Q で純利益 44 億必要 = 非現実的 |

→ narrative + forward 指標だけ見ると「テーマ整合 5/5 + 将来 ROE 17%」で魅力的に見えるが、実態は**構造的な赤字企業**で、会社予想の実現性が極めて低い。

### 対策: 乖離フラグルール

Step 3 の再ランキング時、shortlist.json から以下を確認:

```bash
# overview.json から trailing/forward ROE を両方取得して乖離を計算
jq '[.items[] | {
  code: .display_code,
  name: .company_name,
  forward_roe: .i_forward_roe,
  trailing_roe: .i_trailing_roe,
  gap: ((.i_forward_roe | tonumber?) - (.i_trailing_roe | tonumber?))
}] | map(select(.gap != null and (.gap | fabs) > 20))' ~/.tickercode/memory/mini.json
```

- **乖離 > 20 ポイント**: ⚠️ フラグ、final.md で警告表記必須
- **乖離 > 40 ポイント**: 🚨 下方修正候補、top 5 から除外検討
- **trailing < 0 かつ forward > 0**: 赤字 → 黒字化予想、達成リスク高

乖離が大きい場合の深堀りコマンド:

```bash
tc memory fetch <code>              # 全 endpoint 取得
# 財務時系列を確認
jq 'sort_by(.g_current_period_end_date)[-8:] | .[] | {
  period: .g_current_period_end_date,
  type: .g_type_of_current_period,
  sales: .pl_net_sales,
  op: .pl_operating_profit_loss,
  net: .pl_net_profit,
  forcast_sales: .pl_forcast_net_sales,
  forcast_net: .pl_forcast_profit
}' ~/.tickercode/memory/code/<code>/financial.json
```

### narrative × edinet 照合パターン（新規、2026-04-24 追加）

**2026-04-24 の CLI 修正で `tc memory fetch` の edinet endpoint が正常動作**。narrative の楽観バイアスを有価証券報告書本文と照合できるようになった。narrative が AI 生成（2026-02〜04）なのに対し、edinet は**企業自身が当局に提出した一次情報**なので、両者の差分から narrative の粉飾 / 漏れを検知できる。

#### edinet.json の構造

```typescript
{
  stock_code: string,
  sections: Array<{
    section_type: string,  // 下記 15 種
    section_label: string, // 日本語ラベル（例: "事業等のリスク"）
    content: string,       // HTML エスケープ済み本文（&lt; &gt; 等のエンティティ込み）
    doc_id: string,        // EDINET 書類 ID（例: "S100OA6Q"）
    sec_code: string,      // 5 桁コード
    word_count: number,
  }>,
}
```

#### 15 種類の section_type と narrative 照合の対応

| section_type | section_label | narrative フィールド | 照合で見るべきもの |
|---|---|---|---|
| `business_overview` | 事業の概況 | summary / segments | 事業セグメントの定義 + 構成比の実態 |
| `management_discussion` | 経営者による分析 (MD&A) | summary / strengths | 直近業績の詳細、成長ドライバーの企業自認識 |
| `risk_factors` | 事業等のリスク | weaknesses | narrative 未記載の重要リスクの有無 |
| `research_development` | 研究開発活動 | strengths | AI / 技術系テーマで具体的な R&D 投資先 |
| `management_policy` | 経営方針 | strengths | 中期経営計画との整合性 |
| `sustainability` | サステナビリティ | — | ESG テーマの裏取り |
| `affiliated_entities` | 関係会社 | segments | セグメント構成の企業単位での確認 |
| `employees` | 従業員 | — | 人的資本、成長を支える人員構成 |
| `major_facilities` | 主要な設備 | — | AI データセンター / 半導体設備などの物理的実体 |
| `capital_expenditures` | 設備投資 | — | 成長ストーリーの裏付け（計画通り投資してるか） |
| `corporate_governance` | コーポレートガバナンス | — | — |
| `company_history` | 沿革 | — | — |
| `critical_contracts` | 重要な契約 | — | — |
| `officers` | 役員 | — | — |
| `dividend_policy` | 配当政策 | — | — |

#### 照合の実行パターン（4 パターン）

##### パターン 1: リスクの裏取り（narrative の weaknesses が甘くないか）

narrative weaknesses 3-5 項目 vs edinet 「事業等のリスク」全文。edinet の方が包括的で、narrative が触れていない**重要リスク**を捕捉できる。

```bash
jq '[.sections[] | select(.section_type == "risk_factors")][0] | .content' \
  ~/.tickercode/memory/code/<code>/edinet.json | \
  sed 's/&lt;/</g; s/&gt;/>/g; s/&amp;/\&/g' | \
  sed 's/<[^>]*>//g' | head -100
```

→ 「narrative で言及されてない経営戦略リスク」「規制リスク」「為替 / 地政学リスク」等を抽出して final.md の懸念セクションに反映。

##### パターン 2: 事業実態の確認（narrative の summary が具体的か）

narrative summary の「〜事業を展開」記述 vs edinet 「事業の概況」。**narrative が Type A と書いているが実態は Type C だった**ケースを検知。

```bash
jq '[.sections[] | select(.section_type == "business_overview")][0] | .content' \
  ~/.tickercode/memory/code/<code>/edinet.json | \
  sed 's/&lt;/</g; s/&gt;/>/g; s/&amp;/\&/g; s/<[^>]*>//g' | head -150
```

→ 事業の主軸と**テーマキーワードがどれくらい具体的に紐付いているか**を評価。

##### パターン 3: 成長ドライバーの検証（MD&A との照合）

narrative strengths の「〜で成長」記述 vs edinet 「経営者による分析」。企業自身が成長要因をどう認識しているかで narrative の解釈を補正。

```bash
jq '[.sections[] | select(.section_type == "management_discussion")][0] | .content' \
  ~/.tickercode/memory/code/<code>/edinet.json | \
  sed 's/&lt;/</g; s/&gt;/>/g; s/&amp;/\&/g; s/<[^>]*>//g' | head -200
```

→ 「narrative は楽観的に書いているが、MD&A では具体的な数値目標やタイムラインがない」等のギャップを final.md に記載。

##### パターン 4: R&D 投資の実体（AI / 技術テーマで必須）

narrative strengths の「AI 技術に積極投資」vs edinet 「研究開発活動」。**研究開発費の絶対額と重点領域**を edinet から抽出すれば、narrative の根拠の厚みを評価できる。

```bash
jq '[.sections[] | select(.section_type == "research_development")][0] | .content' \
  ~/.tickercode/memory/code/<code>/edinet.json | \
  sed 's/&lt;/</g; s/&gt;/>/g; s/&amp;/\&/g; s/<[^>]*>//g' | head -150
```

→ 「narrative は AI データセンター向け水冷モジュールを強調しているが、edinet の R&D では既存モーター改良が中心だった」等のギャップを final.md に記載。

#### 実戦 tips

- **content は HTML エスケープ済み**（`&lt;` `&gt;` `&amp;` 等）。sed で復元してから `<tag>` も sed で除去する 2 段階が最短
- **section_type で filter → head で先頭 100-200 行**で十分。多くの edinet は 1 section で 10-50KB あるため、全文を context に流すと浪費
- **AI テーマでは risk_factors + research_development が最有益**。構造改革テーマでは risk_factors + management_discussion、バリューテーマでは management_discussion + capital_expenditures
- **edinet は空セクションもある**（`word_count: 0`）。`select(.content | length > 0)` で絞ると無駄が減る

#### Step 3 チェックリスト（2026-04-24 更新）

再ランキング時に以下を**全部**確認:

- [ ] `matched_fields` 数で 1 次ランキング
- [ ] セグメント名にキーワード入っているか
- [ ] trailing / forward ROE 乖離が 20 ポイント以上ないか
- [ ] trailing が赤字なのに forward が黒字予想の銘柄は慎重解釈
- [ ] 市場認識と matched_fields のギャップ
- [ ] **top 5 候補のうち matched_fields 3 以下の銘柄は edinet risk_factors と照合**（narrative の粉飾検知）
- [ ] **テーマ純度判定に迷う銘柄は edinet business_overview で事業実態を確認**

### Step 3 補助ツール: web_search (2026-04-24 追加)

narrative は 2026-02〜04 生成で**最大 2 ヶ月のラグ**がある。shortlist top 5 の銘柄について、**直近 1-2 ヶ月の事業動向 / 経営者発言 / メディア報道**を裏取りしたい時は、以下の MCP ツールを使う:

- `mcp__tickercode__web_search` — Brave API で keyword 検索（max 20 件）
- `mcp__tickercode__web_fetch` — URL の本文抽出（静的 + 失敗時 CF Browser Rendering fallback）
- `mcp__tickercode__web_render` — SPA 向けの強制 BR 再取得

#### 推奨クエリパターン

```
web_search("<企業名> <テーマキーワード> 2026", freshness: "pm", site: "ir.<domain>")
# 例: "ニデック 水冷モジュール 2026" + "ir.nidec.com" で公式 IR ページ限定

web_search("<銘柄コード> 決算 最新", freshness: "pd")
# 例: "6594 決算" で 24h 以内のニュース

web_search("<業界名> 中国シェア 推移", freshness: "py")
# 例: "精密小型モータ 中国シェア" で 1 年以内の業界記事
```

#### 使い所

- narrative と実態の**ギャップ検出**（narrative は楽観、web は悲観な記事がある場合 = 警戒）
- **事業リスクの追加補強**（edinet だけでは最新の訴訟/事故/規制変更を取れない）
- **経営者の最新発言**（IR 面談 / インタビュー / 決算説明会の書き起こし）
- **業界トレンド**（外資アナリスト / メディア / SNS による市場認識）

#### Claude 組込 WebSearch との使い分け

まず Claude 組込の WebSearch を試す（無料・速い）。結果が不十分 or 最新性が足りない時に `web_search` MCP を使う（Brave API、freshness 絞り可、site 限定可）。

#### 料金注意

- Brave API: $5 / 1k queries、Free tier 2k/月
- 1 銘柄の深堀りで `web_search` 3-5 回、`web_fetch` 3-8 回が目安
- top 5 全員を web で裏取りすると 20-40 queries 消費 → 月 2k の 1-2% 程度

#### 仕様書

BE の `.claude/shared/api-contract.md`「Web Search」セクション。

### なぜ narrative が楽観的になるのか

- overview.json の narrative は AI 生成（2026-02〜04 時点）
- 生成時点の「参考指標」として会社予想を引用しがち（決算短信の社内計画に引きずられる）
- 実績の赤字期が長期化していても、narrative は「今期黒字化予想」を肯定的に記述する傾向
- **結果: narrative が事実の最悪値を隠蔽する**

### Step 3 チェックリスト（更新版）

再ランキング時に以下を**全部**確認:

- [ ] `matched_fields` 数で 1 次ランキング
- [ ] セグメント名にキーワード入っているか
- [ ] **trailing / forward ROE 乖離が 20 ポイント以上ないか**（新規）
- [ ] **trailing が赤字なのに forward が黒字予想の銘柄は慎重解釈**（新規）
- [ ] 市場認識と matched_fields のギャップ（前節の落とし穴）

top 5 選定時、乖離フラグの銘柄は必ず `tc memory fetch` で実績を検証、final.md の懸念セクションで明示的に警告する。

### Top 5 選定の原則

- セクター多様性を意識（全員 IT だと「IT セクター」推奨と変わらない）
- リスクタイプの分散（純 AI 1 社 + AI 活用 2 社 + AI 追い風 1 社 + etc）
- 時価総額レンジも分散（小型 + 中型 + 大型）
- **matched_fields + 定量指標の両軸でふるい分け**（上記の落とし穴対策）

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

## 実戦例（dogfood の成果物）

| サンプル | キーワード戦略 | hits | top 1 スコア | 特徴・学び |
|---|---|---|---|---|
| `research/samples/ai-era/` | OR 4 keyword | 563 | 17（タイ 2 社） | 広すぎでウォッシング疑義多い、matched_fields で絞る必要 |
| `research/samples/consulting-ai/` (未永続) | AND 2 keyword | 64 | 19 | AND で純度高い shortlist、テーマ整合性最強 |
| `research/samples/inbound/` | OR 3 keyword | 223 | 18 | narrative 健全、ただし matched_fields 1 の寿スピリッツが象徴銘柄の罠 |
| `saas-ai` (未永続) | AND 2 keyword | 29 | 18 | セクター 92% IT に集中、trailing/forward ROE 48 ポイント乖離でデータセクション (3905) の narrative 楽観バイアス発覚 |

### 比較から得られる教訓

- **AND は hits が小さく（<100）なるがテーマ純度最強**。2 軸以上のテーマ（"X × Y"）に有効
- **OR は hits が多く（200-500）な**るが、screen flag で絞ることで質を保てる。1 軸テーマ（"X 関連"）に適する
- **OR でも matched_keywords 数や matched_fields 数で再ランキング**すれば純度は確保できる
- **matched_fields 1-2 でも象徴銘柄が隠れている**（インバウンドの寿スピリッツ等）、定量指標と並行判断必須

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

## 実行後の報告（チャット出力）

final.md を書き終わったら**必ずチャットに要約を表示する**。ユーザーが md ファイルを開かなくても、結果が一目で把握できるように。

### 最低限含める要素

1. **保存先パス**（`/tmp/research/idea/{slug}/final.md` or `research/idea/{slug}/final.md`）
2. **hits / shortlist / top-n の数**（選定のボリューム感）
3. **Top 5 ランキング表**: コード / 企業名 / Type 分類 / スコア / ハイライト 1 行
4. **4 軸スコアリング表**（本文に同じ表があるが要約として再提示）
5. **勝ち / 負けシナリオの要旨**（各 2-3 行の tldr）
6. **次のアクション候補**（番号選択形式、サンプル永続化、別テーマ実行、深堀り等）

### 報告フォーマット例

```
完了 → `research/idea/{slug}/final.md`

## レポートサマリ

### 選定結果（N hits → M shortlist → top 5）

| Rank | コード | 企業 | タイプ | スコア | ハイライト |
|---|---|---|---|---|---|
| 🥇 | 0000 | 企業名 | Type A 純プレイ | 18/20 | PER 10.x × ROE 22% × 3y +81% |
| 🥈 | 0001 | 企業名 | Type B 大手 | 16/20 | ... |
| ... |

### 前回 / 他テーマとの比較（任意、複数 dogfood がある場合）

| テーマ | hits | match | top1 スコア | 特徴 |
|---|---|---|---|---|

### 今回の学び（任意、skill 更新候補があれば）

- 例: matched_fields N の銘柄で定量指標が突出しているケースがあった

---

次のアクション候補

1. このレポートを `research/samples/{theme}/` に永続化 + commit
2. 別テーマで dogfood を継続
3. top X 銘柄の深堀り（`tc memory fetch` → edinet / moat / project_pl）
4. ここで停止

番号で回答してください。
```

### 要約時の粒度

- **詳細は final.md に残し、チャットは「スキャンで読める長さ」を守る**
- Top 5 の各社で 1 行（ハイライトのみ）、full narrative は md 側
- シナリオは勝ち/負け各 1 段落まで
- チャット全体で 50-80 行目安

---

## 改善点・他プロジェクト依頼の扱い

dogfood や深堀り検証中に BE / FE / CLI 側の改善点・バグが見つかった時は、CLAUDE.md（CLI）の規約に従う:

### 1. 改善点は `.tickercode/issues/{slug}/issue.md` に記載

- CLI リポ内の `.tickercode/issues/` 配下に slug 命名した md を作成
- ワークスペース側 `tickercode/docs/issues/` には**書かない**（CLI 文脈の改善点は CLI 内で管理）
- フォーマット: `# Issue: <title>` + 作成日 / 優先度 / 背景 / スコープ / Agent Team アサイン / 影響 / 完了条件 / 関連

実例: `.tickercode/issues/cli-per-code-endpoint-verification/issue.md`（2026-04-24、disclosure/news/edinet 銘柄別フィルタ観測）

### 2. BE / FE / CLI 指示はチャットで提示

- 他プロジェクト（BE=tickercode-api、FE=tickercode-web）や CLI 自身への指示・依頼・確認事項は、Agent は**チャットに明示的に書く**
- ユーザーが確認 → 必要に応じて Slack / Issue / PR にコピペする二段構え
- Agent 側で api-contract.md 等の共有仕様書を直接編集するのも**原則禁止**（まずはチャット提案 + issue.md 記載）

### 3. Slack 自動投稿は禁止

- `bun run send:dev-tc` 等は Agent が自主的に実行しない
- Slack 草稿も、チャットに提示 → ユーザーが手動送信する運用
- 外部通知（Telegram / Discord / メール 等）も同様

### 調査 final.md の扱い

- **投資レポート本体** → `research/samples/{slug}/final.md` に commit（これは Agent が書く、成果物）
- **調査中に見つけたシステム改善点** → `.tickercode/issues/{slug}/issue.md` に分離
- 2 つは**別ファイル**として扱う（final.md は読者向け、issue.md は開発者向け）

---

## 禁止事項

- ❌ 「買うべき」「売るべき」断言
- ❌ `hits.json` 全体を context に読み込む（290KB、重い）
- ❌ CLI 実行前に keyword 数を検証しない（0 ヒット / 広すぎで shortlist が破綻）
- ❌ 03-shortlist.md の順番で top 5 を決める（コード順で恣意性なし）
- ❌ 上場浅い銘柄 (2024 IPO) の成長率データを「ない」と結論づけずに IPO 時期を明記せず書く
- ❌ 複数テーマを個別に走らせる（`tc research-batch` を使う）
- ❌ final.md 完成後にチャット要約を出さない（「ファイルに書いたから終わり」ではダメ、読者体験が損なわれる）
- ❌ AskUserQuestion ツールの使用（代わりに番号選択フォーマット）
- ❌ **改善点を `tickercode/docs/issues/` に書く**（CLI 文脈は `.tickercode/issues/` 一択）
- ❌ **BE / FE / CLI 指示を Slack / メール等に自動送信**（チャット提示のみ、ユーザーがゲートキーピング）
- ❌ **api-contract.md の BE 仕様に Agent が直接編集を加える**（まずは issue.md + チャット提案）

---

## 保存先

- **一時作業用**: `/tmp/research/idea/{slug}/`
- **永続化したい**: `research/samples/{slug-short-name}/` にコピーしてコミット
  - `hits.json` (290KB) は除外
  - `final.md` は Agent 完成版を保存

---

## 呼び出しパターン

ユーザーが `/tc-research-idea <テーマ自由文>` と入力したら、以下を実行:

1. **Step 1**: keyword セットを Agent が生成 → hits 数プレビュー
   - 目標レンジ (30-300) 内なら承認不要で進行
   - **範囲外 or テーマ解釈が複数ある時は番号選択で問う**（「対話パターン」節参照）
2. **Step 2**: CLI 実行。shortlist 0 件 or target-size 未満なら緩和案を選択肢で提示
3. **Step 3**: 再ランキング。top 1 候補がタイ / matched_fields 低いが注目銘柄等、判断割れる時は番号選択で問う
4. **Step 4-6**: narrative 抽出 → Type 分類 → 4 軸スコア（基本は Agent 判断で進む）
5. **Step 7**: final.md 執筆
6. **実行後**: **必ずチャットに要約を表示**（「実行後の報告」節のフォーマットに従う）+ 次のアクション候補を番号選択で提示

所要時間:
- 軽量版 (Step 1-3 のみ + チャット要約): 1 分以内
- フル版 (Step 1-7 + narrative 深読み + final.md 執筆 + チャット要約): 5-10 分

### 対話の総量制御

1 回の呼び出しで**番号選択の質問は最大 2 回まで**が目安（初期のテーマ解釈確認 + 最終アクション選択）。途中で頻繁に聞くと流れが止まり UX が悪くなる。判断がつかない時は推奨案 (★) で進み、最後のアクション選択でユーザーが軌道修正できるようにする。
