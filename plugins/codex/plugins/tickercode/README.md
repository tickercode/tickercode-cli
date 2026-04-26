# TickerCode for Codex

Japanese stock research skills and MCP tools for Codex.

## Requirements

Install the CLI and authenticate when you need account-scoped actions:

```bash
npm i -g @tickercode/cli
tc auth login
```

## Local Development

Use this marketplace root when testing the Codex plugin locally:

```text
/path/to/tc-codex-plugin
```

The marketplace file is at `.agents/plugins/marketplace.json`, and the plugin source path resolves to `./plugins/tickercode`.
