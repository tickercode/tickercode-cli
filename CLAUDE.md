# @tickercode/cli — プロジェクトルール

`@tickercode/cli` は公開 npm CLI。ticker-code.com のデータを人間と Agent（Claude / MCP）から同じ形で叩けるようにする。

## Agent 向け: 銘柄分析のための道具立て

**ユーザーから銘柄（コード）についての自由な質問が来たら、以下の MCP tools を組み合わせて応える。** 固定 workflow はない。`.claude/skills/tc-research/SKILL.md` に質問パターン別の組み立て例あり（参照推奨）。

### MCP tools（namespace: `mcp__tickercode__*`）

| tool | 用途 |
|------|------|
| `fetch_stock(code, endpoints?)` | データ取得 → `~/.tickercode/memory/code/{code}/` に保存 |
| `get_stock(code)` | 銘柄 overview サマリ（~1KB） |
| `get_financial_summary(code)` | 最新期 + 前年 + YoY + forecast（~1KB） |
| `get_financial_trend(code, metric, periods)` | 時系列 + CAGR（~500B） |
| `project_pl(code, years, pattern)` | N 年 PL 予測 + 理論株価 + 感度 |
| `calculate_moat(code)` | 堀 1〜5 段階 + 4 要素スコア |
| `find_peers(code, limit?, by?)` | 同セクター peer + 中央値ベンチ |
| `memory_path(code, endpoint?)` | ファイル絶対パス → Read ツールで raw を読む |
| `memory_list()` | キャッシュ済み銘柄一覧 |
| `normalize_code(code)` | 4↔5 桁変換 |

### 生データを読みたい時
raw の edinet / news / financial が必要なら `memory_path(code, "edinet")` で path を取得し **Read ツール**で読む（context に流さない）。`cat | jq` で特定フィールドを抽出してもよい。

### ⚠️ スキーマ命名規約 (重要: 構造的 2 択認識)

API の ratio フィールドは `i_trailing_*` (実績) / `i_forward_*` (予想) の完全対称命名。

- **Rule 1**: `i_trailing_*` を見たら必ず `i_forward_*` が対で存在する (peg 除く)。逆も同様。
- **Rule 2**: `i_forward_roe` / `i_forward_roa` は hybrid (forecast 純利益 ÷ trailing 自己資本/総資産)。分母が trailing であることを分析に明記する。
- **Rule 3**: `i_*` (prefix なし) は forward 版が存在しない: `i_pbr` / `i_gross_margin` / `i_roic` / `i_ev_ebitda` / `i_equity_ratio` / `i_ocf_yield` / `i_fcf_yield` / `i_ebitda` / `i_bps` / `i_kiyohara_net_cash_ratio`。ユーザーが「予想 PBR は？」と聞いても「データなし」と返答する (推定計算しない)。

tool 既定値:
- `project_pl` の PER → `i_forward_per` (将来 EPS に掛けるので forward が整合)
- `get_stock` → trailing/forward 両方返却、Agent が文脈で判断
- `get_financial_summary` → forecast セクションで forward

### 破壊的変更

- **2026-04-22 スキーマ rename** (`i_*` / `i_forecast_*` → `i_trailing_*` / `i_forward_*`): 既存 cache は自動破棄不要 (次回 fetch で上書き)。明示的に `tc memory clean --all` でクリーンしてもよい。

### 基本フロー
1. `fetch_stock(code)` で必ず一度 memory に保存（TTL 内なら skip される）
2. 質問内容に応じて summary / trend / project / moat / peers を並列で呼ぶ
3. 定性が必要なら edinet / news を Read
4. 出力は `research/code/{4桁}/{date}-{topic}.md` にファイル保存 + 会話にサマリ

詳細は `.claude/skills/tc-research/SKILL.md` 参照。

## 基本方針

- 日本語で回答
- 計画 → 許可 → 実行 → 報告 の手順
- class 禁止、関数ベース
- TypeScript strict
- `AskUserQuestion` ツールは使用禁止（番号選択形式で代替）

## 改善点・他プロジェクト依頼の扱い（重要）

dogfood や実装中に BE / FE / CLI 側の改善点が見つかった時は、以下のルールで扱う:

### 1. 改善点は `.tickercode/issues/{slug}/issue.md` に記載

- 本リポジトリ（tickercode-cli）内の **`.tickercode/issues/{slug}/issue.md`** に集約
- ワークスペース側の `tickercode/docs/issues/` には書かない（CLI の文脈で発生した改善点は CLI 内で管理）
- フォーマット: `# Issue: <title>`、作成日 / 優先度 / 背景 / スコープ / Agent Team アサイン / 影響 / 完了条件 / 関連（既存 `docs/issues/` のフォーマットを踏襲）

### 2. BE / FE / CLI への指示文章はチャットに書く

- 他プロジェクト（BE=tickercode-api、FE=tickercode-web）や CLI 自身への指示・依頼・確認事項は、Agent は**チャットに明示的に書く**
- ユーザー（daikissdd）が確認 → 必要に応じて Slack / Issue / PR にコピペする二段構え
- Agent が勝手に Slack 投稿・外部通知を行うことは**禁止**

### 3. Slack への自動投稿は禁止

- `bun run send:dev-tc` 等の Slack 送信コマンドは Agent が自主的に実行しない
- ユーザーから明示的な指示があった場合のみ実行
- Slack 投稿草稿も、チャットに提示 → ユーザーが送信する運用

この 3 ルールにより:
- 改善点は**痕跡として CLI リポ内に残る**（後で誰でも確認可能）
- 他プロジェクトへの波及はユーザーが意識的にゲートキーピング
- Agent の暴走（勝手な社外通知等）を防ぐ

## コマンド命名規約

```
tc <noun> <code> [--format <pretty|json|md>]
```

- `<noun>` は **単数形**（`stock` / `financial` / `report`、複数形は `reports` のみ一覧系）
- `<code>` は 4 桁 or 5 桁の銘柄コード。クォート推奨（`"2418"`）
- 4 桁入力は内部で 5 桁に正規化（末尾 "0"）
- 出力モードは `--format` (`-f`)：`pretty`（既定）/ `json` / `md`

## 出力設計

- `pretty` — 人間向け table + 色（cli-table3 + picocolors）
- `json` — Agent / パイプ向け raw JSON（`process.stdout.write(JSON.stringify(data, null, 2))`）
- `md` — レポート貼付用 Markdown

**API レスポンスの ApiResponse<T> ラッパー（`{ success, data }`）は `unwrap()` で data 部を抽出**してから整形する。

## ディレクトリ構成

```
src/
├── cli.ts               # citty エントリ
├── commands/            # サブコマンド 1 ファイル 1 コマンド
├── lib/
│   ├── api-client.ts    # fetch ラッパー
│   ├── code.ts          # 4→5 桁正規化
│   └── format/          # pretty / json / md
└── mcp/                 # Phase 2: MCP サーバー
tests/                   # vitest
docs/                    # 設計ドキュメント
dist/                    # tsup ビルド成果物（.gitignore）
```

## API 呼び出し規約

- 原則 **POST** メソッド（ticker-code-api の規約）
- ベース URL は `TICKERCODE_API_BASE` 環境変数で上書き可
- 認証: `TICKERCODE_API_KEY` があれば `Authorization: Bearer` を付与

## 銘柄コードの扱い（重要）

- 入力: 4 桁 or 5 桁文字列（`"2418"` / `"24180"`）
- API 呼び出し: **必ず 5 桁に正規化**（`normalizeCode()` 経由）
- 表示: ユーザーに見せるときは 4 桁（`displayCode()`）

## テスト

- **vitest**（bun test ではなく）— ESM / tsup との相性
- ユニットテストは `tests/` 配下
- API を叩くテストは `tests/integration/` に隔離（CI では skip 可）

## Git / Repo

- GitHub Org: `tickercode`
- Repo 名: `tickercode/cli`
- 初期は **Private**、npm publish のタイミングで Public + MIT
- 独立 Git リポジトリ（api / web と同様）

## 依存パッケージ（最小）

- `citty` — CLI parser（サブコマンド + 型補完）
- `cli-table3` — pretty table
- `picocolors` — 軽量色付け（chalk より軽い）

**追加依存を入れる前に必要性を精査する。** lodash や moment は禁止。

## Bun / Node 両対応

- 開発: `bun run dev <command>` で src を直接実行
- ビルド: `tsup` で ESM + CJS を dist に出力
- 配布: Node.js ≥ 20 互換（npm install で動く）
- CI: Node 20/22 matrix + Bun

## 進捗・Phase 管理

詳細は `docs/plan.md` 参照。MVP は **`tc stock` + `tc financial` の 2 コマンド**。Phase 1 以降で `search` / `screen` / `reports` / `mcp` を追加。

## してはいけないこと

- ❌ `class` を使う
- ❌ `lodash` / `moment` / `axios` を足す（fetch / pico で足りる）
- ❌ tickercode-analyst のレポート生成ロジックを cli に持ち込む（analyst は別プロジェクト）
- ❌ 売買・注文執行関連のコマンド（CLI は読み取り専用）
- ❌ API キー / token を stdout に出す（ログにも残さない）
