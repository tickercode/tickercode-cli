# @tickercode/cli

日本株分析 CLI。ticker-code.com のデータを人間と Agent（Claude / MCP）から同じ形で引ける。

```bash
npm i -g @tickercode/cli
tc stock "2418"
tc financial "2418"
```

## 概要

`@tickercode/cli` は ticker-code.com の API ラッパー。ターミナル・スクリプト・Agent（MCP）のいずれからも、銘柄サマリや財務諸表を同じ形で取得できる。

## コマンド（Phase 0 MVP）

| コマンド | 説明 |
|---------|------|
| `tc stock <code>` | 銘柄の overview（価格 + 主要指標） |
| `tc financial <code>` | 財務諸表（PL / BS / CF、複数期） |

### コード形式

- 4 桁入力（例: `"2418"`）は自動で 5 桁（`"24180"`）に変換して API を叩く
- 5 桁入力はそのまま通す

### 出力フォーマット

```bash
tc stock "2418"              # pretty（既定）
tc stock "2418" -f json      # Agent / パイプ向け raw JSON
tc stock "2418" -f md        # Markdown（レポート貼付用）
```

## 開発

```bash
bun install
bun run dev stock 2418        # ソース直接実行
bun run build                 # dist/cli.mjs, dist/cli.cjs を生成
bun run test                  # vitest
```

### 環境変数

| 変数 | 用途 |
|------|------|
| `TICKERCODE_API_BASE` | API ベース URL の上書き（既定: `https://api.ticker-code.com`） |
| `TICKERCODE_API_KEY` | Bearer トークン（現状 API は認証不要だが将来用） |

## 位置付け

- **tickercode-api** — バックエンド。本 CLI が叩く先
- **tickercode-web** — Next.js Web フロント
- **tickercode-analyst** — ticker-code.com の編集部用（社内、非公開）
- **@tickercode/cli** — 公開 CLI（本リポジトリ）

## ライセンス

MIT（Phase 3 で公開時）
