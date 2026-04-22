# 分析 Skill 群 計画（Phase 4）

作成: 2026-04-21
契機: ユーザー要望「くすりの窓口 5592 で PL予測 / moat / AI 影響 / 脅威機会 / 勝負シナリオ / 競合分析 に応えたい」

## 要求分析

| # | 要求 | 必要な能力 | 既存対応 | 新規必要 |
|---|-----|---------|---------|---------|
| 1 | 5 年 PL 予測 + PER ベース株価 | 過去 CAGR 計算 + 予測 + 時価評価 | 一部（trend tool） | project_pl tool + skill |
| 2 | moat 分析 | ROIC/粗利の安定性 + 定性判定 | なし | calculate_moat tool + skill |
| 3 | Claude Code が開発コスト激減した影響 | 事業理解 + 定性推論 | なし（汎用 AI impact） | ai-impact skill |
| 4 | 脅威 / 機会 | edinet + 業界理解 | なし | swot skill |
| 5 | 勝ち / 負けシナリオ | 4 の拡張 + narrative | なし | scenarios skill |
| 6 | 競合他社分析 | セクター内 peer 自動抽出 | なし | find_peers tool + skill |

## 新 MCP tools（3 本）

### `project_pl(code, years, pattern?)`
- 入力: 銘柄コード、予測年数、成長パターン（CAGR / YoY / flat / custom）
- 計算:
  - 過去 3〜5 年の CAGR を自動計算
  - 年ごとに売上・営業利益・純利益を投影
  - 営業利益率・純利益率は直近値で固定（または 3 年平均）
  - 純利益 × 現在の PER → 理論株価
- 出力 ~1KB:
```json
{
  "code": "5592",
  "base_year": "2025-03",
  "projection": [
    { "year": "2026", "sales": 123, "op_profit": 15, "net_income": 10, "eps": 300, "theoretical_price": 4500 },
    ...
  ],
  "assumptions": { "cagr_sales": 15.2, "op_margin": 12.3, "net_margin": 8.1, "per": 25.0 }
}
```

### `calculate_moat(code)`
- 入力: 銘柄コード
- 計算:
  - ROIC 標準偏差（10 年）→ 低いほど堀
  - 粗利率標準偏差（10 年）→ 価格決定力
  - 売上 CAGR × ROIC → 資本効率付き成長
  - 営業利益率の中央値・レンジ
  - 5 段階堀スコア
- 出力 ~1KB:
```json
{
  "code": "5592",
  "moat_score": 3.5,
  "components": {
    "roic_stability":  { "stdev": 2.1, "rating": 4 },
    "margin_stability": { "stdev": 1.8, "rating": 4 },
    "capital_efficient_growth": { "value": 18.5, "rating": 3 },
    "op_margin_median": 10.2
  },
  "interpretation": "..."
}
```

### `find_peers(code, limit?, by?)`
- 入力: 銘柄コード、件数、マッチ基準（sector / mcap / both / growth）
- 処理:
  - mini.json から同じ sector33 を抽出
  - 時価総額 ±50% のバンドでフィルタ
  - PER / PBR / DY / ROE を取得
- 出力 ~3KB:
```json
{
  "code": "5592",
  "peers": [
    { "code": "3382", "name": "セブン&アイ", "mcap": 3200000000000, "per": 22.1, "dy": 2.3, "roe": 8.1 },
    ...
  ],
  "bench": { "sector": "小売業", "peer_median_per": 18.5, "peer_median_dy": 1.8 }
}
```

**mini.json のダウンロード機能（`tc memory sync-mini`）も同時に必要**

## 新 Skills（6 本）

### `/tc-project` — PL 予測
```
/tc-project 5592                              # 5 年予測（既定）
/tc-project 5592 --years 3                    # 3 年
/tc-project 5592 --pattern 3y-cagr            # 3 年 CAGR で投影
/tc-project 5592 --pattern custom --growth 20 # カスタム成長率 20%
/tc-project 5592 --persona buffet             # 保守的シナリオ追加
```
- `project_pl` tool を呼び、markdown テーブル + 感度分析（成長率 ±5%）
- 3 シナリオ: 楽観 / 標準 / 保守

### `/tc-moat` — 堀分析
```
/tc-moat 5592
```
- `calculate_moat` + `get_financial_trend`（gross margin, ROE）
- 5 段階スコア + 定性解釈（edinet.json を Read で事業理解）
- バフェット・フィッシャー視点の統合

### `/tc-peers` — 競合分析
```
/tc-peers 5592                                # 同 sector 5 社
/tc-peers 5592 --limit 10 --by growth         # 成長率で似てる 10 社
```
- `find_peers` + 各社に対して summary を横並び
- 対象銘柄が peer 比でどこに位置するか（分位表示）

### `/tc-swot` — 脅威・機会分析
```
/tc-swot 5592                                 # SWOT 4 象限
/tc-swot 5592 --external-news 10              # 直近ニュース 10 件を加味
```
- get_stock + edinet（事業リスク、リスク要因セクション）+ news を読む
- Agent が narrative を生成: Strengths / Weaknesses / Opportunities / Threats

### `/tc-scenarios` — 勝ち / 負けシナリオ
```
/tc-scenarios 5592                            # 3 年先 2 シナリオ
/tc-scenarios 5592 --years 5                  # 5 年先
```
- SWOT の発展版
- 勝ちシナリオ: 機会 × 強み → 売上・EPS・株価
- 負けシナリオ: 脅威 × 弱み → 収益悪化の時間軸
- 各シナリオに project_pl で数値裏付け

### `/tc-ai-impact` — AI/Claude Code 影響分析
```
/tc-ai-impact 5592                            # 汎用
/tc-ai-impact 5592 --scenario "ソフトウェア開発コスト 80%削減"
```
- 事業理解（edinet から）+ 定性 narrative
- コスト構造のどこに AI が効くか（人件費・外注・研究開発）
- Before/After の営業利益率変化を数値で試算

## 統合コマンド

```
/tc-deep 5592                                 # 全 6 skills を順次実行、1 つの統合レポートに
```
- tc-project → tc-moat → tc-peers → tc-swot → tc-scenarios → tc-ai-impact を並列/直列で実行
- 結果を `research/code/5592/YYYY-MM-DD-deep.md` に保存

## 依存関係

```
mini.json 同期
  ↓
find_peers ──────┐
                 ├── tc-peers
calculate_moat ──┼── tc-moat
                 ├── tc-scenarios（peer 比較で裏付け）
project_pl ──────┤
                 ├── tc-project
                 ├── tc-scenarios
edinet Read ─────┼── tc-swot
                 ├── tc-ai-impact
                 └── tc-moat（定性部分）
news Read ───────┴── tc-swot
                     tc-scenarios
```

## ロードマップ（Phase 4）

### Phase 4A — mini.json 取得 + find_peers（1 日）
- [ ] `src/memory/mini.ts` — R2 CDN から mini.json 取得
- [ ] `tc memory sync-mini` サブコマンド
- [ ] `src/mcp/tools/find-peers.ts` — セクター + 時価総額で peer 抽出
- [ ] 動作確認: find_peers("5592") で妥当な peer が 5 社返る

### Phase 4B — project_pl + calculate_moat（1 日）
- [ ] `src/analysis/project.ts` — CAGR 計算 + 投影
- [ ] `src/analysis/moat.ts` — 堀スコア計算
- [ ] MCP tool 2 本追加
- [ ] 動作確認: 7203 で 5 年予測が妥当、moat スコアが 3.5〜4.0

### Phase 4C — 基本 skills 3 本（1 日）
- [ ] `/tc-project` skill（計算系）
- [ ] `/tc-moat` skill（計算系）
- [ ] `/tc-peers` skill（比較系）

### Phase 4D — narrative skills 3 本（2 日）
- [ ] `/tc-swot` skill（narrative + edinet Read）
- [ ] `/tc-scenarios` skill（narrative + 数値裏付け）
- [ ] `/tc-ai-impact` skill（narrative のみ）

### Phase 4E — 統合 skill（半日）
- [ ] `/tc-deep` — 6 skill を統合実行 → 1 つのレポート
- [ ] 5592 で実機検証

## 未確定事項

### Q-1. 実装順序
1. **Phase 4A → 4B → 4C → 4D → 4E（計 5〜6 日）** ← 推奨
2. 要求の 6 項目を skill ファースト（プレースホルダー tool + narrative 優先）
3. 5592 向けに試作実装してから一般化

### Q-2. narrative skills の LLM 依存度
1. **Claude 本体の推論に任せる**（tool はデータ提供のみ） ← 推奨
2. 構造化テンプレート（SWOT 4 象限を必ず埋める、など）
3. 両立（構造 + 自由記述）

### Q-3. AI impact の汎用性
1. **Claude Code / AI 全般の汎用 skill として作る**（業種別に分岐） ← 推奨
2. 5592 専用のドキュメントを作り、そこから汎化
3. 作らない（ユーザーが都度質問する形）

### Q-4. mini.json のサイズ感（メモリ）
1. 6.5MB → load のたび JSON.parse（遅い可能性）
2. **初回 load 後 in-memory キャッシュ**（Node プロセス内） ← 推奨
3. sqlite に展開してクエリ

## 最初にやる「くすりの窓口 5592」実験

Phase 4A〜4C 完了時点で以下を実行:

```bash
tc memory fetch 5592
tc memory sync-mini
```

Claude Code で:
```
/tc-project 5592 --years 5
/tc-moat 5592
/tc-peers 5592
```

これだけで、ユーザー要求 6 項目のうち **定量系 3 項目は完成**。
残り 3 項目（narrative）は Phase 4D で。
