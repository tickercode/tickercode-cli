# tickercode-cli — プロジェクト計画

最終更新: 2026-04-21

## 1. 目的 / ビジョン

**「ティッカーコード（ticker-code.com）の全データを CLI と Agent から自在に扱える」** を実現する npm パッケージ。

### 二つの顔
1. **プロダクト**: `npm i -g tickercode` で誰でも使える公開 CLI。日本株の調査・スクリーニングをターミナルから完結させる。
2. **ドッグフード**: 自分自身（daikissdd + Claude Agent）が使って、ticker-code.com 本体の欠陥・改善点を発見する。

### tickercode-analyst との関係

| 項目 | tickercode-analyst | tickercode-cli |
|------|-------------------|----------------|
| 立ち位置 | **ticker-code.com の編集部**（社内ツール） | **公開 CLI**（npm パッケージ） |
| 役割 | 銘柄・業界レポートを公式コンテンツとして生成 | 一般投資家 + Agent が API/データを叩く |
| 配布 | リポジトリ内のみ（公開しない） | npm registry |
| 成果物 | ticker-code.com 上に掲載するレポート | 標準出力 / JSON / MCP 経由のデータ |
| データ保存 | `database/{code}_{name}/`（編集作業用） | 標準出力 / 任意パス（利用者側） |
| 読み手 | ticker-code.com の閲覧ユーザー | CLI 利用者 + Agent |

**両者は独立**。tickercode-analyst は「コンテンツ供給側」、tickercode-cli は「データ利用側」。

ただし、analyst の **データ取得部分（API fetch）は cli の API client / MCP server に依存させる** のが自然。Phase 4 で analyst の `scripts/fetch-data.ts` を tickercode-cli 経由に書き換えて重複を解消する余地がある（レポート生成ロジック本体は analyst に残す）。

---

## 2. ゴール / 非ゴール

### ゴール
- ✅ `tc <command>` で主要 API を叩ける（stock / financials / search / screen）
- ✅ 人間向けの見やすい table/chart 出力 と Agent 向けの `--json` 出力を両立
- ✅ Claude Agent から MCP サーバーとして呼び出せる
- ✅ Docker/Bun なしで動く（pure Node.js 互換）
- ✅ ドッグフードで見つけた欠陥を issue/docs にフィードバック

### 非ゴール（v1）
- ❌ 注文執行・売買（読み取り専用）
- ❌ リアルタイム WebSocket
- ❌ 有料課金システム（認証はあるが課金は ticker-code.com 側）
- ❌ tickercode-analyst のレポート生成ロジックをそのまま移植する

---

## 3. 技術スタック

| 項目 | 選定 | 理由 |
|------|------|------|
| Runtime | Node.js ≥ 20（Bun でも動く） | npm 互換の最大公約数 |
| 言語 | TypeScript | プロジェクト共通規約 |
| ビルド | tsup (ESM + CJS デュアル) | npm 配布の標準 |
| CLI parser | citty または commander | サブコマンド + 型補完 |
| 出力整形 | chalk + cli-table3 + ora | 定番 |
| HTTP | fetch (native) | Node 20+ 組み込み |
| MCP | `@modelcontextprotocol/sdk` | Claude 標準 |
| テスト | vitest | 高速・ESM 親和 |
| Lint | biome | プロジェクト共通 |

**class 禁止・関数ベース** は共通ルールとして継承。

---

## 4. パッケージ設計

### 4.1 CLI コマンド（初期セット）

```bash
# 認証
tc login                           # better-auth の API key 発行フロー
tc logout
tc whoami

# 基本情報
tc stock 7203                      # 銘柄サマリ（価格 + 主要指標）
tc stock 7203 --json               # Agent 向け raw
tc stock 7203 --tab financials     # 財務タブ相当

# 財務
tc financials 7203                 # 損益・BS・CF の複数期比較
tc financials 7203 --period 5y
tc segments 7203                   # セグメント別

# 検索 / スクリーニング
tc search "AI"                     # 銘柄名検索
tc screen --per "<15" --dy ">3"    # 条件スクリーニング
tc theme "半導体"                  # テーマ別

# 開示 / ニュース
tc disclosure 7203                 # 適時開示
tc news 7203                       # 関連ニュース

# analyst レポート連携（読み取り専用）
tc reports "2418"                  # 銘柄に紐づくレポート一覧（id / title / published_at）
tc report "<report_id>"            # レポート本文
tc report "<report_id>" --md       # Markdown で取得（貼付用）

# Agent 統合
tc chat 7203                       # Claude Agent インタラクティブ
tc mcp                             # MCP サーバーとして起動
```

### 4.2 出力モード

```
--pretty  (default) 人間向け table + 色
--json              Agent/パイプ向け raw JSON
--md                Markdown（レポート貼付用）
--csv               表計算貼付用
```

### 4.3 MCP サーバー

`tc mcp` で stdio MCP サーバーを起動し、Claude Desktop / Claude Code から tools として呼べる：

- `get_stock(code)` / `get_financials(code, period)` / `search(query)` / `screen(filter)` / `get_disclosure(code)` …

tickercode-analyst の `/tca-data-fetch` が MCP 経由で薄く書き直せる想定。

### 4.4 ディレクトリ構成

```
tickercode-cli/
├── src/
│   ├── cli.ts                 # エントリ (bin)
│   ├── commands/              # 各サブコマンド
│   │   ├── stock.ts
│   │   ├── financials.ts
│   │   ├── screen.ts
│   │   └── ...
│   ├── lib/
│   │   ├── api-client.ts      # tickercode-api ラッパー
│   │   ├── auth.ts            # better-auth 連携 + token 保存
│   │   ├── config.ts          # ~/.config/tickercode/config.json
│   │   └── format/            # table / json / md / csv
│   └── mcp/
│       └── server.ts          # MCP stdio
├── docs/
│   ├── plan.md                # 本書
│   ├── commands.md            # コマンドリファレンス
│   └── dogfooding-log.md      # ドッグフードで発見した欠陥
├── tests/
├── package.json               # "bin": { "tc": "./dist/cli.js" }
├── tsup.config.ts
├── tsconfig.json
├── README.md
└── CLAUDE.md                  # プロジェクト専用ルール
```

---

## 4.5 銘柄コードの扱い

tickercode-api は **5 桁の内部コード**（例: `24180`）、ユーザーは **4 桁表示コード**（例: `2418`）を使う。

- `tc stock "2418"` — 4 桁入力 → API 呼び出し時に末尾 "0" を足して 5 桁化（analyst と同じロジック）
- `tc stock "24180"` — 5 桁入力はそのまま通す
- クォートは任意（shell エスケープの都合で推奨）

---

## 5. API / 認証方針

### 候補
1. **公開エンドポイントのみ**（認証不要の read-only）
   - 利点: 誰でもすぐ使える / 実装が軽い
   - 欠点: レート制限・匿名利用のみ
2. **API キー方式（better-auth 発行）** ← 推奨
   - 利点: 既存認証基盤を再利用 / レート制限・課金基盤に乗る
   - 欠点: `tc login` の UX 設計が必要
3. **OAuth デバイスフロー**
   - 利点: ブラウザ連携でスムーズ
   - 欠点: 実装コスト大、Phase 2 以降で検討

**結論**: Phase 1 は API キー方式。`tc login` で ticker-code.com の設定画面を開き、貼り付ける形が最速。

トークン保存: `~/.config/tickercode/config.json` (mode 600)。環境変数 `TICKERCODE_API_KEY` も対応。

---

## 6. フェーズ計画

### ✅ Phase 0 — 土台（2026-04-21 完了）

**前提**: tickercode-api の `/api/full/stock` と `/api/full/financials` は認証不要で叩ける。Phase 0 では認証機構を組まず、公開 API のみ使う。

- [x] `tickercode-cli/` に package.json（`@tickercode/cli`, bin: `tc`, type: `module`）/ tsconfig / tsup 初期化
- [x] `src/cli.ts` の citty スケルトン（`tc --help` / `tc --version`）
- [x] `src/lib/api-client.ts` — `postJson(path, body)` + `TICKERCODE_API_KEY` / `TICKERCODE_API_BASE` 対応
- [x] `src/lib/code.ts` — 4→5 桁正規化 + 逆変換
- [x] `src/commands/stock.ts` — `tc stock <code>` で `/api/full/stock`
- [x] `src/commands/financial.ts` — `tc financial <code>` で `/api/full/financials`
- [x] `src/lib/format/` — pretty (cli-table3 + picocolors) / json / md
- [x] `tests/code.test.ts` — vitest 8 件 PASS
- [x] `tickercode-cli/CLAUDE.md` 作成
- [x] `README.md` の最小版
- [x] `bun run build` → `dist/cli.mjs` + `dist/cli.cjs` 成功、`node dist/cli.mjs stock "2418"` も動作
- [x] 実 API への疎通確認（`tc stock "2418"` / `tc financial "2418"`）

**成果物**: `tc stock "2418"` / `tc financial "2418"` が pretty / json / md の 3 モードで動作。tsup ビルドも成功。typecheck クリーン。

### Phase 1 — 読み取り系コマンド MVP（3〜5日）
- [ ] `stock` / `financials` / `segments` / `disclosure` / `news`
- [ ] `search` / `screen` / `theme`
- [ ] 認証: `tc login` + トークン保存
- [ ] 出力 formatter (pretty / json / md / csv)
- [ ] エラー整形 + --debug フラグ
- [ ] README + commands.md

### Phase 2 — MCP + Skills（dexter 参照、`/Users/daikissdd/.claude/plans/1-mcp-shimmying-shell.md`）

**三層構造**: Claude Code（agent） → Skills（段取り） → MCP tools（道具） → `@tickercode/cli` API client

#### ✅ Phase 2A — MCP stdio サーバー（2026-04-21 完了）
- [x] `bun add @modelcontextprotocol/sdk@1.29` + `zod@4.3` を追加
- [x] `src/mcp/server.ts` — McpServer + StdioServerTransport で stdio サーバー起動
- [x] `src/mcp/tools/` — 3 tools 実装（`get_stock`, `get_financial`, `normalize_code`）
- [x] `src/commands/mcp.ts` — `tc mcp` サブコマンド登録
- [x] `docs/mcp.md` — `.mcp.json` 設定例 + トラブルシュート
- [x] 動作確認: JSON-RPC で initialize / tools/list / tools/call（get_stock 7203）が成功
- [x] typecheck / test 8件 / build すべてクリーン

#### ✅ Phase 2B — Skill 初版 `tc-research`（2026-04-21 作成、実機検証待ち）
- [x] `tickercode-cli/.claude/skills/tc-research/SKILL.md` 作成（7 セクションのレポートテンプレ + ペルソナ別所見）
- [x] `.mcp.json` 作成（`node ./dist/cli.mjs mcp`、dev 用）
- [x] `docs/dogfooding-log.md` 作成（発見した API 型混在問題を初回記録）
- [ ] **実機検証**: Claude Code を再起動 → `/mcp` で `tickercode` が listed → `/tc-research 7203` 実行 → 出力を dogfooding-log に記録
- [ ] tool namespace（`mcp__tickercode__get_stock` 等）が Claude Code で実際どの名前になるか確認、必要なら SKILL.md を修正

#### Phase 2C — Eval 基盤（Phase 2A/2B 完了後、1 日）
- [ ] `tests/evals/` — 銘柄分析の回帰テスト fixture
- [ ] 10 銘柄 × 1 workflow（tc-research のみ）= 10 テストケース
- [ ] LLM-as-judge（Claude）で 80% PASS を目標
- [ ] CI 統合（毎日 1 回）

#### Phase 2D（将来）— `tickercode/tickercode-skills` repo に昇格
昇格条件が揃った時点で別タスク:
- Skill 3 本以上動作確認済み
- 他者が install できる形にしたい需要
- `.claude-plugin/plugin.json` + `mcp.json` の整備

### Phase 3 — 公開 + ドッグフード（3〜5日）
- [ ] npm publish（organization: `@tickercode` or plain `tickercode`）
- [ ] GitHub Actions で `npm version + publish` 自動化
- [ ] 自分で毎日 `tc screen` → 発見した欠陥を `dogfooding-log.md` に
- [ ] docs/issues/ に CLI 由来の改善 issue を流し込む

### Phase 4 — 拡張（継続）
- [ ] tickercode-analyst の `scripts/fetch-data.ts` を tickercode-cli の API client / MCP 経由に差し替え（データ取得層の重複解消）
- [ ] Watchlist 同期（ticker-code.com アカウントと）
- [ ] ポートフォリオ分析（ローカル CSV 読み込み）
- [ ] シェル補完（zsh/bash/fish）

### Phase 5 — `i_trailing_*` / `i_forward_*` schema rename 追従

tickercode-api 側の rename（`docs/plan-rename-trailing-forward.md` 参照）が deploy されたら以下を更新:

- [ ] `src/memory/mini.ts` の StockItem 型から `i_per` / `i_forecast_*` 系を削除、`i_trailing_*` / `i_forward_*` に差し替え
- [ ] `src/memory/summary.ts` の SUMMARY_OVERVIEW_KEYS 更新
- [ ] `src/analysis/peers.ts` の pick() マッピング更新（trailing と forward を別フィールドとして両方返す）
- [ ] `src/analysis/project.ts` の PER 選択ロジック更新（`miniItem?.i_forward_per` / `miniItem?.i_trailing_per`）
- [ ] `src/analysis/moat.ts` 影響確認（直接参照は少ないはず）
- [ ] 全 MCP tool description を trailing/forward 明示に更新
- [ ] `.claude/skills/tc-research/SKILL.md` / `CLAUDE.md` に Agent メンタルモデル（3 ルール）を明記
- [ ] `~/.tickercode/memory/` の既存 cache は `tc memory clean --all` で再取得推奨（or マイグレーションスクリプト）
- [ ] dogfooding-log.md に追記

---

## 7. ドッグフードで狙う改善

CLI を毎日使うことで、Web UI では見えない欠陥が浮く想定：

- API レスポンスの **欠損・不整合**（null 混入、単位ずれ、古いデータ）
- 銘柄横断の **一貫性破れ**（片方は円、片方は百万円 など）
- Agent が「使いにくい」と文句を言う **レスポンス構造**
- Web にはあるが API で取れない情報 → API 追加タスク
- ドキュメント化されていない endpoint

発見内容は `docs/dogfooding-log.md` に 1 行ずつ記録し、週次で `docs/issues/` にエスカレーション。

---

## 8. 決定事項 / 未確定事項

### ✅ 確定（2026-04-21）

| Q | 決定 | 備考 |
|---|------|------|
| Q1 | **`@tickercode/cli`**（bin: `tc`） | `tc stock "2418"` のような呼び出し |
| Q2 | **独立 Git リポジトリ** | `gh repo create` で tickercode/cli（or 類似）を作成し、ローカルは `tickercode-cli/` に clone |
| Q3 | **API キー方式 + OAuth の二段構え** | API キー: MCP / アプリ組み込み用 / OAuth: `tc login` 対話用 |
| Q4 | **Node.js 20+ / Bun 両対応** | 開発は Bun、ビルドは tsup で ESM+CJS 出力、CI は node matrix + bun |
| Q5 | **MVP = `tc stock <code>` + `tc financial <code>`** | overview と financial 返却のみ |
| Q6 | **完全独立 + レポート取得コマンドで連携** | analyst が公開したレポートを cli から読む。`tc reports "<code>"`（一覧）/ `tc report "<report_id>" --md`（本文） |
| Q7 | **`tickercode-cli/CLAUDE.md` を新規作成** | CLI 固有の規約（コマンド命名 / 出力モード / semver / publish 手順）を専用化。workspace 直下 CLAUDE.md の重複は避ける |
| Q8 | **GitHub Org `tickercode` を新規作成** | `tickercode/cli` として配置。将来 api / web も同じ org に移す想定 |
| Q9 | **初期 Private → Phase 3 で Public + MIT** | 実装中は非公開、npm publish のタイミングで public 化 |
| Q10 | **ローカルコールバック OAuth（PKCE）** | `tc login` で localhost ランダムポートに一時サーバー起動 → ブラウザで認可 → token 取得。better-auth に CLI 用 OAuth クライアント登録が必要 |
| Q11 | **tickercode-api 側の新規追加は当面なし** | 既存の `/api/full/stock` と `/api/full/financials` のみで MVP を試す。OAuth / reports / api-keys は cli 側で mock または env var フォールバックで先行し、api 追加は後追い |

### 未確定（番号で回答ください）

### Q1. npm パッケージ名 ✅ 決定: `@tickercode/cli`
1. `tickercode` — ブランド一致。short & memorable
2. `@tickercode/cli` — scoped。API や SDK を後で追加しやすい ← **採用**
3. `tc-cli` — 短い。ただしブランド弱い

### Q2. リポジトリ戦略
1. 現ワークスペース内 `tickercode-cli/` のまま（subtree 管理）
2. 独立 Git リポジトリに切り出す（api / web と同様）
3. monorepo 化（pnpm workspaces 等で api/web/cli を統合）

### Q3. 認証方式 ✅ 決定: **API キー + OAuth の二段構え**
1. API キー方式 — `~/.config/tickercode/config.json` or `TICKERCODE_API_KEY`。MCP サーバー・アプリ組み込み用途
2. OAuth（`tc login` 対話フロー）— ブラウザで ticker-code.com の better-auth にリダイレクト → コールバックでトークン取得
3. 両方サポート（採用）：`tc login` で OAuth 優先、`--api-key` or env で API キー上書き可能

### Q4. ランタイム優先度
1. Node.js ≥ 20 互換を最優先（npm 公開前提）
2. Bun 専用（プロジェクト内規約重視、npm 公開は後回し）
3. 両対応（ビルドは tsup、開発は bun でもOK）← 推奨

### Q5. MVP コマンド ✅ 決定: **`tc stock <code>` + `tc financial <code>`**

- `tc stock "2418"` → Overview（銘柄サマリ + 主要指標）を返却
- `tc financial "2418"` → 財務諸表（損益・BS・CF の複数期）を返却
- それ以外（search / screen / mcp 等）は Phase 1 以降に送り

対応 API エンドポイント（暫定）：
- `stock` → `POST /api/full/stock`
- `financial` → `POST /api/full/financials`

### Q6. tickercode-analyst との関係（編集部 / 公開 CLI）
1. 完全に独立した別プロジェクトとして維持。データ取得層の重複は許容
2. analyst のデータ取得部分（fetch-data.ts）のみ cli の API client を使うよう Phase 4 で差し替え（推奨）
3. cli に `tc analyst-*` サブコマンドとして analyst 機能を吸収（ただし analyst は非公開運用のため現実的でない）

### Q7. CLAUDE.md の新設
1. `tickercode-cli/CLAUDE.md` を新規作成（プロジェクト専用ルール）
2. 共通ルールは workspace 直下 CLAUDE.md に集約、cli 専用は最小限
