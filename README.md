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

## レポートコマンド

```bash
# 単体保存（基本）
tc report save --title "ニデック 6594 分析" --body ./reports/6594.md --public

# 公式レポートとして保存（ADMIN ロールまたは report:official scope が必要）
tc report save --title "公式レポート" --body ./6594.md --official

# verdict（投資判断）付きで保存
tc report save --title "分析" --body ./body.md --verdict lukewarm
tc report save --title "分析" --body ./body.md --verdict "慎重肯定"        # フリーテキスト
tc report save --title "分析" --body ./body.md --verdict-code strong_buy    # enum 直接指定

# パネル情報付きで保存
tc report save --title "Moat Deepdive" --body ./body.md \
  --official --verdict lukewarm \
  --panel moat-deepdive --turns 100 --panelists "BuffettBot,FisherBot,KiyoharaBot"
```

### `tc report batch-save` — 一括登録

YAML または JSON ファイルから複数のレポートをまとめて登録します。

```bash
tc report batch-save --file ./reports/batch.yaml
```

YAML ファイル例（`batch.yaml`）:

```yaml
- title: ニデック 6594 moat 分析
  body_file: ./reports/6594.md      # ファイルパス指定（相対 or 絶対）
  stock_code: "6594"
  is_official: true
  verdict: lukewarm                  # enum に一致 → verdict_code + verdict_label
  metadata:
    panel: moat-deepdive
    turns: 100
    panelists: [BuffettBot, FisherBot, KiyoharaBot]
- title: ツカダGHD 2418 value 議論
  body_markdown: "# 分析\n本文をインラインで書く場合"
  stock_code: "2418"
  is_official: true
  verdict: "強い買い推奨"            # enum 不一致 → verdict_label のみ
```

出力例:

```
Batch save results:
  ✓ 7 succeeded
  ✗ 1 failed
     - 山岡家 3399: 403 FORBIDDEN_OFFICIAL_ROLE
```

### verdict enum 一覧

| code | 意味 |
|------|------|
| `strong_buy` | 強い買い |
| `buy` | 買い |
| `hold` | 保持 |
| `lukewarm` | 慎重肯定 |
| `mixed` | 混在 |
| `sell` | 売り |
| `strong_sell` | 強い売り |

## CLI クライアント連携 (`tc setup`)

Claude Code 以外（Codex CLI、Gemini CLI）でも skill + MCP server を使えます。

```bash
tc setup codex     # ~/.codex/config.toml + ~/.agents/skills/ に配置
tc setup gemini    # ~/.gemini/settings.json + ~/.gemini/GEMINI.md に配置
```

- 既存設定を保持して **idempotent** に上書き判定（再実行で skip、`--force` で更新）
- `~/.tickercode/credentials.json`（`tc auth login` で生成）が認証ソース
- 配置先カスタマイズ: `--config-path` / `--settings-path` / `--gemini-md-path` / `--skills-dir`

### 各 CLI の動作差分

| 機能 | Claude Code | Codex CLI | Gemini CLI |
|---|---|---|---|
| MCP server | ネイティブ | ネイティブ | ネイティブ |
| Skill 仕様 | `SKILL.md`（既存）| `SKILL.md`（同形式） | `GEMINI.md` にフラット統合 |
| `/tc-discuss` slash command | ✅ | △（自然言語誘導） | ❌（自然言語誘導） |
| 自動配置 | （未実装、Phase 4 予定）| `tc setup codex` | `tc setup gemini` |

### Codex 動作確認例

```bash
codex mcp list
# Name        Command  Args  Env                       Cwd  Status   Auth
# tickercode  tc       mcp   TICKERCODE_API_KEY=*****  -    enabled  Unsupported

codex exec "tickercode の get_stock ツールで 6594 (ニデック) の overview を取得"
# → ニデック（6594）: 株価 2,465 円、PER 15.82 倍、ROE 9.57%、時価総額 2.94 兆円
```

## 認証

`tc report save` など認証が必要なコマンドは、事前に `tc auth login` で API Key を設定してください。

```bash
tc auth login      # API Key を対話入力して ~/.tickercode/credentials.json に保存
tc auth whoami     # 現在のログインユーザーを表示
tc auth logout     # 認証情報を削除
```

API Key は [ticker-code.com](https://ticker-code.com) のアカウント設定ページで発行できます。  
CI 環境など非対話環境では `TICKERCODE_API_KEY` 環境変数で上書き可能です（env var が優先されます）。

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
| `TICKERCODE_API_KEY` | Bearer トークン（CI 用。`tc auth login` の credentials より優先） |

## 位置付け

- **tickercode-api** — バックエンド。本 CLI が叩く先
- **tickercode-web** — Next.js Web フロント
- **tickercode-analyst** — ticker-code.com の編集部用（社内、非公開）
- **@tickercode/cli** — 公開 CLI（本リポジトリ）

## ライセンス

MIT（Phase 3 で公開時）
