# TickerCode for Claude Code

Japanese stock research skills and MCP tools for Claude Code.

## Requirements

Install the CLI and authenticate when you need account-scoped actions:

```bash
npm i -g @tickercode/cli
tc auth login
```

## Local Development

From Claude Code, add the marketplace root that contains this plugin:

```text
/plugin marketplace add /path/to/tc-claude-plugin
/plugin install tickercode@tickercode
```

Restart or reload plugins after updating the marketplace cache.
