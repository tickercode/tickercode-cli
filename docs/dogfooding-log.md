# ドッグフードログ

`@tickercode/cli` + MCP + Skills を実際に使いながら発見した改善点を記録する。週次で `docs/issues/` に重要なものをエスカレーションする。

フォーマット:

```
- YYYY-MM-DD [カテゴリ] 一行サマリ  --  引き金 / 影響
```

カテゴリ:
- `API` — tickercode-api 側の改善候補
- `CLI` — @tickercode/cli の改善
- `MCP` — MCP tool 設計の改善
- `SKILL` — skill 定義の改善
- `DOCS` — ドキュメント不足

---

## 2026-04-21

- 2026-04-21 [API] `i_per` / `stock_price` 等が string 型で返る（例: `"9.14"`）一方 `market_capitalization` は number。型が混在 — Agent 処理時 `parseFloat()` 強制。統一を検討  --  Phase 0 動作確認中に発見
- 2026-04-21 [CLI] `tc financial` の pretty 出力は多数期の配列が巨大。`--period 3y` 等の絞り込み引数が欲しい  --  Sony 6758 で 3Q 財務を見た時に気付く
- 2026-04-21 [SKILL] tc-research の tool namespace（`mcp__tickercode__get_stock`）はクライアント依存。Claude Code で実際に接続して確認する必要あり  --  Phase 2B 作成時の仮定
- 2026-04-21 [SKILL] ✅ **tool namespace `mcp__tickercode__*` は Claude Code で想定通り動作**  --  tc-research 2418 実機検証で確定
- 2026-04-21 [MCP] 🔥 **重大: `get_financial` レスポンスが巨大すぎる（346K chars / 9172 行）**。context token limit を超えてファイル保存フォールバックされる = MCP tool として実用不可  --  tc-research 2418 実機検証で発覚。→ **対策必須**: サーバー側で `period_limit`（直近 N 期）や `fields`（PL のみ / BS のみ）パラメータを追加、または summary モードをデフォルトに
- 2026-04-21 [API] 事業内容が取得できない。ツカダ GHD は「情報通信・サービスその他 / サービス業」としか返らず、ブライダル・ホテル事業が主という情報が欠落。`business_description` や `main_segments` フィールドが欲しい  --  tc-research 2418 の「企業概要」作成時
- 2026-04-21 [SKILL] `--persona` 未指定時にセクション 6 をスキップするルールを明文化すべき  --  今回は frontmatter に `persona: なし` と書いて対応

## 2026-04-22

- 2026-04-22 [SKILL] tc-research 1 本化（tc-project/tc-moat/tc-peers 削除）後、5592 の 5 年 PL 予測が 2 シナリオで自動生成されるのを確認。Agent が判断フレーム（定量/定性・過去/未来）通りに動いた
- 2026-04-22 [TOOL] 🔥 **project_pl の PER 既定値が trailing（i_per=14.83）だったため、forward EPS との整合が崩れて理論株価が +32% 過大評価された**。既定を forward PER（i_forecast_per=11.21）に変更、assumptions.per_kind / trailing_per / forward_per を返して Agent が明示できるよう修正  --  5592 実機検証で発覚（ユーザー指摘）
- 2026-04-22 [FIX] 5592 5年後理論株価: 9,383 → **7,092 円**（forward PER 11.21 基準）
- 2026-04-22 [SCHEMA] 🔥 **根治策: `i_*` / `i_forecast_*` → `i_trailing_*` / `i_forward_*` rename 計画発動**。Agent の pattern-match による `i_per` 誤選択を構造的に排除。9 ペア 18 フィールド + peg + 新規 3 = 22 行のスキーマ変更。`docs/plan-rename-trailing-forward.md`（workspace 直下）参照。tickercode-cli 側は Phase 5 で追従予定
- 2026-04-22 [SCHEMA] ✅ **Phase 5 完了 — cli 側を新 schema に追従**。事故（forward EPS × trailing PER で理論株価 +32% 過大評価）の根治策として schema 対称命名（i_trailing_* / i_forward_*）を api に反映、cli もそれに追従。StockItem 型・summary keys・peers pick/bench・project_pl の PER 選択・moat の ROE 参照・MCP tool description を全て新名に置換。Agent が field 名を見た瞬間に「trailing / forward の 2 択」として認識するメンタルモデルを SKILL.md / CLAUDE.md に明記。構造的 2 択認識により同種事故の再発を防止。
