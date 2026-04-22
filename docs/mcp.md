# tickercode MCP サーバー

`@tickercode/cli` に同梱された MCP（Model Context Protocol）サーバー。Claude Code / Claude Desktop / Cursor などの MCP クライアントから、日本株データを tool として直接呼び出せる。

## クイックスタート

### 1. インストール

```bash
# グローバル推奨（起動が速い）
npm i -g @tickercode/cli

# または npx で都度ダウンロード
# npx -y @tickercode/cli mcp
```

### 2. `.mcp.json` に登録

#### Claude Code（プロジェクト単位）
プロジェクトルートの `.mcp.json`：

```json
{
  "mcpServers": {
    "tickercode": {
      "command": "tc",
      "args": ["mcp"]
    }
  }
}
```

#### Claude Desktop
`~/Library/Application Support/Claude/claude_desktop_config.json`（macOS）:

```json
{
  "mcpServers": {
    "tickercode": {
      "command": "tc",
      "args": ["mcp"]
    }
  }
}
```

#### `npx` 経由（install 不要）

```json
{
  "mcpServers": {
    "tickercode": {
      "command": "npx",
      "args": ["-y", "@tickercode/cli", "mcp"]
    }
  }
}
```

### 3. 再起動して使う

Claude Code / Desktop を再起動すると、tickercode ツールが利用可能になる。Claude に自然言語で問いかけるだけ：

- 「7203 の PER を教えて」
- 「トヨタと日立の時価総額を比較して」
- 「ソニーの直近の財務諸表を要約して」

## 提供する tools（v0.0.1）

| tool | 用途 | 引数 |
|------|------|------|
| `get_stock` | 銘柄オーバービュー（価格・主要指標） | `code: string`（4 or 5 桁） |
| `get_financial` | 財務諸表（PL/BS/CF 複数期） | `code: string` |
| `normalize_code` | 4↔5 桁コード変換ヘルパー | `code: string` |

## 動作確認

手動で JSON-RPC を流して疎通確認：

```bash
(echo '{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"0.0.1"}},"id":1}'
 echo '{"jsonrpc":"2.0","method":"notifications/initialized"}'
 echo '{"jsonrpc":"2.0","method":"tools/list","id":2}'
 sleep 0.3) | tc mcp
```

期待出力：`tools/list` の response に get_stock / get_financial / normalize_code が並ぶ。

実ツール呼び出し：

```bash
(echo '{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"0.0.1"}},"id":1}'
 echo '{"jsonrpc":"2.0","method":"notifications/initialized"}'
 echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"get_stock","arguments":{"code":"7203"}},"id":3}'
 sleep 1) | tc mcp
```

## アーキテクチャ

- **stdio トランスポート** — ネットワークポート不使用、親子プロセスの pipe
- **ライフサイクル** — MCP クライアントが spawn → session 終了で kill
- **状態** — 各ツール呼び出しは独立（scratchpad 的な状態は保持しない）
- **認証** — 現在は認証不要エンドポイントのみ。`TICKERCODE_API_KEY` を env で渡せば `Authorization: Bearer` ヘッダを付与

## 環境変数

| 変数 | 用途 |
|------|------|
| `TICKERCODE_API_BASE` | API ベース URL 上書き（既定: `https://api.ticker-code.com`） |
| `TICKERCODE_API_KEY` | Bearer token（現時点ではオプショナル） |

`.mcp.json` に env を渡すことも可能：

```json
{
  "mcpServers": {
    "tickercode": {
      "command": "tc",
      "args": ["mcp"],
      "env": {
        "TICKERCODE_API_BASE": "http://localhost:3100"
      }
    }
  }
}
```

## トラブルシュート

### Claude Code が tool を認識しない
1. Claude Code で `/mcp` を実行 → `tickercode` が listed されているか確認
2. status が `failed` の場合、`tc mcp` がパス上にあるか（`which tc`）
3. `npm i -g @tickercode/cli` を再実行

### Tool call がタイムアウトする
1. API に到達できるか確認: `curl -X POST https://api.ticker-code.com/api/full/stock -d '{"code":"72030"}' -H 'Content-Type: application/json'`
2. `TICKERCODE_API_BASE` が正しいか

### 開発中に自前ビルドを使いたい
`.mcp.json` の command を絶対パスに：

```json
{
  "mcpServers": {
    "tickercode-dev": {
      "command": "node",
      "args": ["/absolute/path/to/tickercode-cli/dist/cli.mjs", "mcp"]
    }
  }
}
```
