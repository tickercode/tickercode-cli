#!/usr/bin/env node
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/tsup/assets/cjs_shims.js
var getImportMetaUrl = () => typeof document === "undefined" ? new URL(`file:${__filename}`).href : document.currentScript && document.currentScript.tagName.toUpperCase() === "SCRIPT" ? document.currentScript.src : new URL("main.js", document.baseURI).href;
var importMetaUrl = /* @__PURE__ */ getImportMetaUrl();

// src/cli.ts
var import_citty20 = require("citty");

// package.json
var package_default = {
  name: "@tickercode/cli",
  version: "0.1.2",
  description: "Command-line interface for ticker-code.com \u2014 Japanese stock analysis for humans and agents",
  type: "module",
  bin: {
    tc: "./dist/cli.mjs"
  },
  main: "./dist/cli.cjs",
  module: "./dist/cli.mjs",
  files: [
    "dist",
    ".claude/skills",
    "plugins",
    "README.md",
    "LICENSE"
  ],
  scripts: {
    dev: "bun run src/cli.ts",
    build: "tsup",
    test: "vitest run",
    "test:watch": "vitest",
    "sync:plugins": "node scripts/sync-plugin-skills.mjs",
    "sync:plugin-sandbox": "bun run sync:plugins && node scripts/sync-plugin-sandbox.mjs",
    typecheck: "tsc --noEmit",
    prepublishOnly: "bun run build && bun run typecheck"
  },
  dependencies: {
    "@modelcontextprotocol/sdk": "^1.29.0",
    citty: "^0.1.6",
    "cli-table3": "^0.6.5",
    picocolors: "^1.1.1",
    yaml: "^2.8.3",
    zod: "^4.3.6"
  },
  devDependencies: {
    "@types/node": "^22.10.0",
    tsup: "^8.3.5",
    typescript: "^5.7.0",
    vitest: "^2.1.8"
  },
  engines: {
    node: ">=20"
  },
  publishConfig: {
    access: "public"
  },
  keywords: [
    "tickercode",
    "ticker-code",
    "stock",
    "japan",
    "jpx",
    "cli",
    "claude",
    "mcp",
    "finance"
  ],
  license: "MIT",
  repository: {
    type: "git",
    url: "git+https://github.com/tickercode/tickercode-cli.git"
  },
  bugs: {
    url: "https://github.com/tickercode/tickercode-cli/issues"
  },
  homepage: "https://ticker-code.com"
};

// src/commands/stock.ts
var import_citty = require("citty");

// src/lib/credentials.ts
var import_node_fs = require("fs");
var import_node_os = require("os");
var import_node_path = require("path");
function credentialsDir() {
  return (0, import_node_path.join)((0, import_node_os.homedir)(), ".tickercode");
}
function credentialsPath() {
  return (0, import_node_path.join)(credentialsDir(), "credentials.json");
}
function loadCredentials() {
  const path = credentialsPath();
  if (!(0, import_node_fs.existsSync)(path)) return null;
  try {
    const raw = (0, import_node_fs.readFileSync)(path, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
function saveCredentials(cred) {
  const dir = credentialsDir();
  if (!(0, import_node_fs.existsSync)(dir)) {
    (0, import_node_fs.mkdirSync)(dir, { recursive: true });
  }
  const path = credentialsPath();
  (0, import_node_fs.writeFileSync)(path, JSON.stringify(cred, null, 2), { encoding: "utf8" });
  (0, import_node_fs.chmodSync)(path, 384);
}
function clearCredentials() {
  const path = credentialsPath();
  if ((0, import_node_fs.existsSync)(path)) {
    (0, import_node_fs.rmSync)(path);
  }
}

// src/lib/api-client.ts
var DEFAULT_API_BASE = "https://api.ticker-code.com";
function getApiBase() {
  return process.env.TICKERCODE_API_BASE ?? DEFAULT_API_BASE;
}
function getAuthHeaders() {
  const envKey = process.env.TICKERCODE_API_KEY;
  if (envKey) return { Authorization: `Bearer ${envKey}` };
  const cred = loadCredentials();
  if (cred?.api_key) return { Authorization: `Bearer ${cred.api_key}` };
  return {};
}
async function postJson(path, body) {
  const url = `${getApiBase()}${path}`;
  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders()
      },
      body: JSON.stringify(body)
    });
  } catch (err) {
    throw new Error(`Network error calling ${url}: ${err.message}`);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status} ${res.statusText} \u2014 ${path}
${text.slice(0, 500)}`);
  }
  return await res.json();
}

// src/lib/code.ts
function normalizeCode(input) {
  const trimmed = input.trim();
  if (!/^\d+$/.test(trimmed)) {
    throw new Error(`Invalid ticker code: "${input}" (digits only)`);
  }
  if (trimmed.length === 4) return `${trimmed}0`;
  if (trimmed.length === 5) return trimmed;
  throw new Error(`Invalid ticker code length: "${input}" (expected 4 or 5 digits)`);
}
function displayCode(code5) {
  if (code5.length === 5 && code5.endsWith("0")) return code5.slice(0, 4);
  return code5;
}

// src/lib/format/pretty.ts
var import_cli_table3 = __toESM(require("cli-table3"), 1);
var import_picocolors = __toESM(require("picocolors"), 1);
function toCell(v) {
  if (v === null || v === void 0) return import_picocolors.default.dim("\u2014");
  if (typeof v === "object") {
    const kind = Array.isArray(v) ? `array(${v.length})` : "object";
    return import_picocolors.default.dim(`(${kind})`);
  }
  if (typeof v === "number") return import_picocolors.default.yellow(String(v));
  if (typeof v === "boolean") return import_picocolors.default.magenta(String(v));
  return String(v);
}
function kvTable(payload, title) {
  const table = new import_cli_table3.default({
    head: [import_picocolors.default.cyan("field"), import_picocolors.default.cyan("value")],
    style: { head: [], border: [] }
  });
  for (const [k, v] of Object.entries(payload)) {
    table.push([import_picocolors.default.gray(k), toCell(v)]);
  }
  const heading = title ? `${import_picocolors.default.bold(import_picocolors.default.white(title))}
` : "";
  return heading + table.toString();
}
function formatPrettyStock(data) {
  const payload = unwrap(data);
  if (!payload || typeof payload !== "object") {
    return import_picocolors.default.yellow("No data");
  }
  const obj = payload;
  const code = String(obj.code ?? obj.display_code ?? "");
  const name = String(obj.name ?? obj.company_name ?? "");
  const title = `${import_picocolors.default.bold("Stock")} ${import_picocolors.default.green(code)} ${name ? import_picocolors.default.white(name) : ""}`.trim();
  return kvTable(obj, title);
}
function formatPrettyStockList(items, columns, title) {
  if (items.length === 0) {
    return import_picocolors.default.yellow("No matches.");
  }
  const cols = columns.length > 0 ? columns : ["display_code", "company_name"];
  const table = new import_cli_table3.default({
    head: cols.map((c) => import_picocolors.default.cyan(c)),
    style: { head: [], border: [] }
  });
  for (const item of items) {
    table.push(cols.map((c) => toCell(item[c])));
  }
  const heading = title ? `${import_picocolors.default.bold(import_picocolors.default.white(title))}  ${import_picocolors.default.dim(`(${items.length} rows)`)}
` : `${import_picocolors.default.dim(`(${items.length} rows)`)}
`;
  return heading + table.toString();
}
function formatPrettyFinancial(data) {
  const payload = unwrap(data);
  if (!payload || typeof payload !== "object") {
    return import_picocolors.default.yellow("No data");
  }
  if (Array.isArray(payload)) {
    const sections = [];
    for (const [i, row] of payload.entries()) {
      if (row && typeof row === "object") {
        sections.push(kvTable(row, `[${i}]`));
      }
    }
    return sections.join("\n\n");
  }
  return kvTable(payload, import_picocolors.default.bold("Financial"));
}

// src/lib/format/index.ts
function formatOutput(data, opts) {
  const out = render(data, opts);
  process.stdout.write(`${out}
`);
}
function render(data, opts) {
  if (opts.format === "json") {
    return JSON.stringify(data, null, 2);
  }
  if (opts.format === "md") {
    if (opts.kind === "stock-list" && Array.isArray(data)) {
      return renderStockListMarkdown(
        data,
        opts.columns ?? [],
        opts.title
      );
    }
    return `# ${opts.kind}

\`\`\`json
${JSON.stringify(unwrap(data), null, 2)}
\`\`\``;
  }
  if (opts.kind === "stock-list") {
    return formatPrettyStockList(
      data,
      opts.columns ?? [],
      opts.title
    );
  }
  if (opts.kind === "stock") return formatPrettyStock(data);
  return formatPrettyFinancial(data);
}
function renderStockListMarkdown(items, columns, title) {
  const cols = columns.length > 0 ? columns : ["display_code", "company_name"];
  const header = `| ${cols.join(" | ")} |`;
  const sep = `| ${cols.map(() => "---").join(" | ")} |`;
  const rows = items.map(
    (item) => `| ${cols.map((c) => formatCell(item[c])).join(" | ")} |`
  );
  const heading = title ? `# ${title}

` : "";
  return `${heading}${header}
${sep}
${rows.join("\n")}`;
}
function formatCell(v) {
  if (v === null || v === void 0 || v === "") return "\u2014";
  return String(v);
}
function unwrap(data) {
  if (data && typeof data === "object") {
    const obj = data;
    if ("data" in obj && ("success" in obj || "ok" in obj)) {
      return obj.data;
    }
  }
  return data;
}

// src/commands/stock.ts
var stockCommand = (0, import_citty.defineCommand)({
  meta: {
    name: "stock",
    description: "Fetch stock overview (price + key metrics) for a ticker code"
  },
  args: {
    code: {
      type: "positional",
      description: "4-digit or 5-digit ticker code (e.g. 2418)",
      required: true
    },
    format: {
      type: "string",
      description: "Output format: pretty | json | md",
      default: "pretty",
      alias: "f"
    }
  },
  async run({ args }) {
    const code5 = normalizeCode(String(args.code));
    const data = await postJson("/api/full/stock", { stock_code: code5 });
    formatOutput(data, {
      kind: "stock",
      format: String(args.format)
    });
  }
});

// src/commands/financial.ts
var import_citty2 = require("citty");
var financialCommand = (0, import_citty2.defineCommand)({
  meta: {
    name: "financial",
    description: "Fetch financial statements (PL / BS / CF, multi-period) for a ticker code"
  },
  args: {
    code: {
      type: "positional",
      description: "4-digit or 5-digit ticker code (e.g. 2418)",
      required: true
    },
    format: {
      type: "string",
      description: "Output format: pretty | json | md",
      default: "pretty",
      alias: "f"
    }
  },
  async run({ args }) {
    const code5 = normalizeCode(String(args.code));
    const data = await postJson("/api/full/financials", { stock_code: code5 });
    formatOutput(data, {
      kind: "financial",
      format: String(args.format)
    });
  }
});

// src/commands/mcp.ts
var import_citty3 = require("citty");

// src/mcp/server.ts
var import_mcp = require("@modelcontextprotocol/sdk/server/mcp.js");
var import_stdio = require("@modelcontextprotocol/sdk/server/stdio.js");

// src/mcp/tools/get-stock.ts
var import_zod = require("zod");

// src/memory/fetch.ts
var import_node_fs3 = require("fs");

// src/memory/paths.ts
var import_node_os2 = require("os");
var import_node_path2 = require("path");
var MEMORY_ROOT = process.env.TICKERCODE_MEMORY_DIR ?? (0, import_node_path2.join)((0, import_node_os2.homedir)(), ".tickercode", "memory");
var MINI_JSON_PATH = (0, import_node_path2.join)(MEMORY_ROOT, "mini.json");
var MINI_META_PATH = (0, import_node_path2.join)(MEMORY_ROOT, "mini.meta.json");
var OVERVIEW_INDEX_PATH = (0, import_node_path2.join)(MEMORY_ROOT, "overview.json");
var OVERVIEW_INDEX_META_PATH = (0, import_node_path2.join)(MEMORY_ROOT, "overview.meta.json");
var INDEX_PATH = (0, import_node_path2.join)(MEMORY_ROOT, "index.json");
var CODE_ROOT = (0, import_node_path2.join)(MEMORY_ROOT, "code");
var OVERVIEW_INDEX_TTL_SECONDS = 24 * 3600;
function codeDir(displayCode2) {
  return (0, import_node_path2.join)(CODE_ROOT, displayCode2);
}
function endpointPath(displayCode2, endpoint) {
  return (0, import_node_path2.join)(codeDir(displayCode2), `${endpoint}.json`);
}
function metaPath(displayCode2) {
  return (0, import_node_path2.join)(codeDir(displayCode2), ".meta.json");
}
var ENDPOINTS = {
  overview: "/api/full/stock",
  financial: "/api/full/financials",
  edinet: "/api/edinet/text",
  disclosure: "/api/disclosure/list",
  news: "/api/news/feed"
};
var TTL_BY_ENDPOINT = {
  mini: 4 * 3600,
  overview: 1 * 3600,
  financial: 24 * 3600,
  edinet: 7 * 24 * 3600,
  disclosure: 1 * 3600,
  news: 1 * 3600
};

// src/memory/meta.ts
var import_node_fs2 = require("fs");
var import_node_path3 = require("path");
function ensureDir(path) {
  (0, import_node_fs2.mkdirSync)(path, { recursive: true });
}
function readJson(path) {
  if (!(0, import_node_fs2.existsSync)(path)) return null;
  try {
    return JSON.parse((0, import_node_fs2.readFileSync)(path, "utf8"));
  } catch {
    return null;
  }
}
function writeJson(path, data) {
  ensureDir((0, import_node_path3.dirname)(path));
  (0, import_node_fs2.writeFileSync)(path, JSON.stringify(data, null, 2));
}
function readStockMeta(displayCode2) {
  return readJson(metaPath(displayCode2));
}
function writeStockMeta(meta) {
  writeJson(metaPath(meta.display_code), meta);
}
function readIndex() {
  return readJson(INDEX_PATH) ?? {
    codes: [],
    total: 0,
    last_sync: null,
    mini_json: { last_fetch: null, count: 0 }
  };
}
function writeIndex(index) {
  writeJson(INDEX_PATH, index);
}
function upsertIndexCode(displayCode2) {
  const index = readIndex();
  if (!index.codes.includes(displayCode2)) {
    index.codes.push(displayCode2);
    index.codes.sort();
    index.total = index.codes.length;
  }
  index.last_sync = (/* @__PURE__ */ new Date()).toISOString();
  writeIndex(index);
}
function isFresh(lastFetchIso, ttlSeconds) {
  if (!lastFetchIso) return false;
  const fetchedAt = new Date(lastFetchIso).getTime();
  const age = (Date.now() - fetchedAt) / 1e3;
  return age < ttlSeconds;
}
function endpointIsFresh(displayCode2, endpoint) {
  const meta = readStockMeta(displayCode2);
  const epMeta = meta?.endpoints?.[endpoint];
  return isFresh(epMeta?.last_fetch, TTL_BY_ENDPOINT[endpoint]);
}

// src/memory/fetch.ts
function bodyFor(endpoint, code5) {
  switch (endpoint) {
    case "disclosure":
      return { stock_code: code5, limit: 30 };
    case "news":
      return { stock_code: code5, limit: 20 };
    case "edinet":
      return { stock_code: code5 };
    default:
      return { stock_code: code5 };
  }
}
async function fetchStock(displayCodeOrFull, opts = {}) {
  const code5 = normalizeCode(displayCodeOrFull);
  const displayCode2 = code5.endsWith("0") ? code5.slice(0, 4) : code5;
  const targetEndpoints = opts.endpoints ?? Object.keys(ENDPOINTS);
  (0, import_node_fs3.mkdirSync)(codeDir(displayCode2), { recursive: true });
  const result = {
    code: code5,
    display_code: displayCode2,
    dir: codeDir(displayCode2),
    fetched: [],
    skipped: [],
    failed: []
  };
  const tasks = targetEndpoints.map(async (endpoint) => {
    if (!opts.force && endpointIsFresh(displayCode2, endpoint)) {
      result.skipped.push(endpoint);
      return;
    }
    try {
      const raw = await postJson(ENDPOINTS[endpoint], bodyFor(endpoint, code5));
      const data = unwrap(raw);
      const path = endpointPath(displayCode2, endpoint);
      (0, import_node_fs3.writeFileSync)(path, JSON.stringify(data, null, 2));
      result.fetched.push(endpoint);
    } catch (err) {
      result.failed.push({ endpoint, error: err.message });
    }
  });
  await Promise.all(tasks);
  const existing = readStockMeta(displayCode2);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const overviewData = result.fetched.includes("overview") || existing?.endpoints?.overview ? safeReadJson(endpointPath(displayCode2, "overview")) : null;
  const name = overviewData?.company_name ?? existing?.name;
  const meta = {
    code: code5,
    display_code: displayCode2,
    name,
    endpoints: { ...existing?.endpoints ?? {} },
    updated_at: now
  };
  for (const ep of result.fetched) {
    const bytes = safeSize(endpointPath(displayCode2, ep));
    meta.endpoints[ep] = { last_fetch: now, bytes };
  }
  writeStockMeta(meta);
  upsertIndexCode(displayCode2);
  return result;
}
function safeSize(path) {
  try {
    return (0, import_node_fs3.statSync)(path).size;
  } catch {
    return 0;
  }
}
function safeReadJson(path) {
  try {
    return JSON.parse((0, import_node_fs3.readFileSync)(path, "utf8"));
  } catch {
    return null;
  }
}

// src/memory/summary.ts
var import_node_fs4 = require("fs");
var n = (v) => {
  if (v === null || v === void 0) return null;
  const parsed = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(parsed) ? parsed : null;
};
var pct = (a, b) => a !== null && b !== null && b !== 0 ? +((a - b) / b * 100).toFixed(2) : null;
function readJson2(path) {
  if (!(0, import_node_fs4.existsSync)(path)) return null;
  try {
    return JSON.parse((0, import_node_fs4.readFileSync)(path, "utf8"));
  } catch {
    return null;
  }
}
function readOverview(displayCode2) {
  return readJson2(endpointPath(displayCode2, "overview"));
}
function readFinancial(displayCode2) {
  const data = readJson2(endpointPath(displayCode2, "financial"));
  return Array.isArray(data) ? data : null;
}
var SUMMARY_OVERVIEW_KEYS = [
  "code",
  "company_name",
  "sector17_name",
  "sector33_name",
  "market_name",
  "stock_price",
  "stock_price_date",
  "day_change_percent_stock_price",
  "market_capitalization",
  "i_trailing_per",
  "i_forward_per",
  "i_pbr",
  "i_trailing_roe",
  "i_forward_roe",
  "i_trailing_roa",
  "i_forward_roa",
  "i_trailing_dividend_yield",
  "i_forward_dividend_yield",
  "yoy_forecast_sales",
  "yoy2y_sales",
  "yoy5y_cagr_sales"
];
function stockSummary(displayCode2) {
  const o = readOverview(displayCode2);
  if (!o) return null;
  const out = {};
  for (const k of SUMMARY_OVERVIEW_KEYS) {
    out[k] = o[k] ?? null;
  }
  return out;
}
function financialSummary(displayCode2) {
  const rows = readFinancial(displayCode2);
  if (!rows || rows.length === 0) return null;
  const extract = (r) => {
    const sales = n(r.pl_net_sales);
    const op = n(r.pl_operating_profit_loss);
    const ordinary = n(r.pl_ordinary_profit_loss);
    const net = n(r.pl_net_profit);
    return {
      period: r.g_current_period_end_date ?? null,
      period_type: r.g_type_of_current_period ?? null,
      doc_type: r.g_type_of_document ?? null,
      net_sales: sales,
      operating_profit: op,
      ordinary_profit: ordinary,
      net_income: net,
      operating_margin_pct: sales && op !== null ? +(op / sales * 100).toFixed(2) : null,
      net_margin_pct: sales && net !== null ? +(net / sales * 100).toFixed(2) : null
    };
  };
  const latest = extract(rows[0]);
  const prevYear = rows.find(
    (r, i) => i > 0 && r.g_type_of_current_period === rows[0].g_type_of_current_period
  );
  const yoy = prevYear ? {
    sales_pct: pct(
      extract(rows[0]).net_sales,
      extract(prevYear).net_sales
    ),
    operating_profit_pct: pct(
      extract(rows[0]).operating_profit,
      extract(prevYear).operating_profit
    ),
    net_income_pct: pct(
      extract(rows[0]).net_income,
      extract(prevYear).net_income
    )
  } : null;
  const forecast = (() => {
    const r = rows[0];
    const sales = n(r.pl_forcast_net_sales);
    const op = n(r.pl_forcast_operating_profit_loss);
    if (sales === null && op === null) return null;
    return {
      net_sales: sales,
      operating_profit: op,
      operating_margin_pct: sales && op !== null ? +(op / sales * 100).toFixed(2) : null
    };
  })();
  return {
    code: rows[0].code ?? null,
    period_count: rows.length,
    latest,
    prev_year: prevYear ? extract(prevYear) : null,
    yoy,
    forecast
  };
}
function financialTrend(displayCode2, metric, periods, periodType) {
  const rows = readFinancial(displayCode2);
  if (!rows || rows.length === 0) return null;
  const filtered = periodType ? rows.filter((r) => r.g_type_of_current_period === periodType) : rows;
  const slice = filtered.slice(0, periods);
  const series = slice.map((r) => ({
    period: r.g_current_period_end_date ?? null,
    period_type: r.g_type_of_current_period ?? null,
    value: n(r[metric])
  }));
  const yoy_pct = series.map((s, i) => {
    if (i >= series.length - 1) return null;
    return pct(s.value, series[i + 1]?.value ?? null);
  });
  const firstValid = series.findLast?.((s) => s.value !== null) ?? null;
  const lastValid = series.find((s) => s.value !== null) ?? null;
  const n_periods = series.length;
  const cagr_pct = firstValid && lastValid && firstValid.value && lastValid.value && n_periods > 1 ? +((Math.pow(lastValid.value / firstValid.value, 1 / (n_periods - 1)) - 1) * 100).toFixed(2) : null;
  return {
    code: rows[0].code ?? null,
    metric,
    period_type: periodType ?? "mixed",
    series,
    yoy_pct,
    cagr_pct
  };
}

// src/mcp/tools/get-stock.ts
var getStockTool = {
  name: "get_stock",
  config: {
    title: "Get Stock Overview",
    description: "Fetch overview of a Japanese listed stock by 4-digit or 5-digit ticker code (e.g. '7203' = Toyota). Returns price, PER, PBR, dividend yield, market cap, sector. By default returns a compact summary (~1KB). Pass full=true to return the entire overview. Reads from ~/.tickercode/memory; auto-fetches if missing or stale.",
    inputSchema: {
      code: import_zod.z.string().describe("4-digit or 5-digit ticker code (e.g. '7203' or '72030')"),
      full: import_zod.z.boolean().optional().describe("Return full overview.json instead of compact summary")
    }
  },
  async handler({ code, full }) {
    const code5 = normalizeCode(code);
    const display = displayCode(code5);
    if (!endpointIsFresh(display, "overview")) {
      await fetchStock(code5, { endpoints: ["overview"] });
    }
    const data = full ? readOverview(display) : stockSummary(display);
    if (!data) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ error: `No overview data for ${display}` })
          }
        ],
        isError: true
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
    };
  }
};

// src/mcp/tools/normalize-code.ts
var import_zod2 = require("zod");
var normalizeCodeTool = {
  name: "normalize_code",
  config: {
    title: "Normalize Ticker Code",
    description: "Convert a 4-digit Japanese ticker code (display form) to a 5-digit internal code (API form) and vice versa. 4-digit codes get '0' appended; 5-digit codes ending in '0' get the trailing '0' stripped for display.",
    inputSchema: {
      code: import_zod2.z.string().describe("4-digit or 5-digit ticker code")
    }
  },
  async handler({ code }) {
    const code5 = normalizeCode(code);
    const code4 = displayCode(code5);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ input: code, code5, code4 }, null, 2)
        }
      ]
    };
  }
};

// src/mcp/tools/fetch-stock.ts
var import_zod3 = require("zod");
var ENDPOINT_KEYS = Object.keys(ENDPOINTS);
var fetchStockTool = {
  name: "fetch_stock",
  config: {
    title: "Fetch Stock Data into Memory",
    description: "Download multiple endpoints for a ticker into ~/.tickercode/memory/code/<code>/. Returns a compact summary with file paths instead of raw data, so context is preserved. Use this first, then read specific files via memory_path or get_*_summary tools.",
    inputSchema: {
      code: import_zod3.z.string().describe("4-digit or 5-digit ticker code"),
      endpoints: import_zod3.z.array(import_zod3.z.enum(["overview", "financial", "edinet", "disclosure", "news"])).optional().describe("Subset of endpoints to fetch (default: all)"),
      force: import_zod3.z.boolean().optional().describe("Ignore TTL and re-fetch")
    }
  },
  async handler({
    code,
    endpoints,
    force
  }) {
    const result = await fetchStock(code, { endpoints, force });
    const files = {};
    const allEps = endpoints ?? ENDPOINT_KEYS;
    for (const ep of allEps) {
      files[ep] = endpointPath(result.display_code, ep);
    }
    const payload = {
      code: result.code,
      display_code: result.display_code,
      dir: result.dir,
      fetched: result.fetched,
      skipped: result.skipped,
      failed: result.failed,
      files
    };
    return {
      content: [
        { type: "text", text: JSON.stringify(payload, null, 2) }
      ]
    };
  }
};

// src/mcp/tools/memory-path.ts
var import_zod4 = require("zod");

// src/memory/query.ts
var import_node_fs5 = require("fs");
var import_node_path4 = require("path");
function readEndpointFile(displayCode2, endpoint) {
  const path = endpointPath(displayCode2, endpoint);
  if (!(0, import_node_fs5.existsSync)(path)) return null;
  return (0, import_node_fs5.readFileSync)(path, "utf8");
}
function resolvePath(displayCode2, endpoint) {
  if (displayCode2 === "mini" || endpoint === void 0 && displayCode2 === "mini") {
    return MINI_JSON_PATH;
  }
  if (endpoint === "mini") return MINI_JSON_PATH;
  if (endpoint === void 0) return codeDir(displayCode2);
  return endpointPath(displayCode2, endpoint);
}
function listCodes() {
  return readIndex().codes;
}
function memoryStats() {
  const codes = listCodes();
  let totalBytes = 0;
  let fileCount = 0;
  for (const code of codes) {
    const dir = codeDir(code);
    if (!(0, import_node_fs5.existsSync)(dir)) continue;
    for (const f of (0, import_node_fs5.readdirSync)(dir)) {
      try {
        totalBytes += (0, import_node_fs5.statSync)((0, import_node_path4.join)(dir, f)).size;
        fileCount += 1;
      } catch {
      }
    }
  }
  let miniBytes = 0;
  if ((0, import_node_fs5.existsSync)(MINI_JSON_PATH)) {
    try {
      miniBytes = (0, import_node_fs5.statSync)(MINI_JSON_PATH).size;
    } catch {
    }
  }
  return {
    root: MEMORY_ROOT,
    total_codes: codes.length,
    total_files: fileCount,
    total_bytes: totalBytes,
    mini_json_bytes: miniBytes,
    total_mb: +((totalBytes + miniBytes) / (1024 * 1024)).toFixed(2)
  };
}
function cleanCode(displayCode2) {
  const dir = codeDir(displayCode2);
  if ((0, import_node_fs5.existsSync)(dir)) {
    (0, import_node_fs5.rmSync)(dir, { recursive: true, force: true });
  }
}
function showMeta(displayCode2) {
  return readStockMeta(displayCode2);
}

// src/mcp/tools/memory-path.ts
var ENDPOINT_KEYS2 = Object.keys(ENDPOINTS);
var memoryPathTool = {
  name: "memory_path",
  config: {
    title: "Get Memory File Path",
    description: "Return the absolute path to a cached endpoint file (or stock directory when endpoint is omitted). Use this to feed the path into the Read tool so the agent can inspect raw data without loading it into context via MCP.",
    inputSchema: {
      code: import_zod4.z.string().describe("Ticker code, or 'mini' for mini.json"),
      endpoint: import_zod4.z.enum(["overview", "financial", "edinet", "disclosure", "news", "mini"]).optional().describe(`Endpoint name: ${ENDPOINT_KEYS2.join(", ")} or 'mini'`)
    }
  },
  async handler({ code, endpoint }) {
    const path = resolvePath(code, endpoint);
    return {
      content: [{ type: "text", text: JSON.stringify({ path }) }]
    };
  }
};

// src/mcp/tools/memory-list.ts
var memoryListTool = {
  name: "memory_list",
  config: {
    title: "List Cached Stocks in Memory",
    description: "Return an array of ticker codes currently cached in ~/.tickercode/memory/, with their company name and available endpoints.",
    inputSchema: {}
  },
  async handler() {
    const codes = listCodes();
    const items = codes.map((code) => {
      const meta = showMeta(code);
      return {
        code,
        name: meta?.name ?? null,
        endpoints: Object.keys(meta?.endpoints ?? {}),
        updated_at: meta?.updated_at ?? null
      };
    });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ total: items.length, items }, null, 2)
        }
      ]
    };
  }
};

// src/mcp/tools/get-financial-summary.ts
var import_zod5 = require("zod");
var getFinancialSummaryTool = {
  name: "get_financial_summary",
  config: {
    title: "Financial Summary (Latest + Prev Year + Forecast)",
    description: "Return a compact financial summary (~1KB) for a ticker: latest period PL figures (sales, operating profit, net income), YoY % change vs the same period last year, and the latest forecast. Much smaller than raw financial data. Reads from ~/.tickercode/memory; auto-fetches if missing or stale.",
    inputSchema: {
      code: import_zod5.z.string().describe("4-digit or 5-digit ticker code")
    }
  },
  async handler({ code }) {
    const code5 = normalizeCode(code);
    const display = displayCode(code5);
    if (!endpointIsFresh(display, "financial")) {
      await fetchStock(code5, { endpoints: ["financial"] });
    }
    const summary = financialSummary(display);
    if (!summary) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ error: `No financial data available for ${display}` })
          }
        ],
        isError: true
      };
    }
    return {
      content: [
        { type: "text", text: JSON.stringify(summary, null, 2) }
      ]
    };
  }
};

// src/mcp/tools/get-financial-trend.ts
var import_zod6 = require("zod");
var getFinancialTrendTool = {
  name: "get_financial_trend",
  config: {
    title: "Financial Trend (Time Series of a Metric)",
    description: "Return a time series of a single financial metric (e.g. 'pl_net_sales', 'pl_operating_profit_loss') across recent periods, with YoY % and CAGR. Very compact (~500B). Reads from ~/.tickercode/memory; auto-fetches if missing or stale.",
    inputSchema: {
      code: import_zod6.z.string().describe("4-digit or 5-digit ticker code"),
      metric: import_zod6.z.string().describe(
        "Field name from financial.json, e.g. 'pl_net_sales', 'pl_operating_profit_loss', 'pl_net_income_loss'"
      ),
      periods: import_zod6.z.number().int().min(1).max(20).optional().describe("Number of recent periods (default 5)"),
      period_type: import_zod6.z.enum(["FY", "1Q", "2Q", "3Q", "4Q"]).optional().describe(
        "Filter by period type (FY=annual, 1Q/2Q/3Q/4Q=quarterly). Default: all types mixed."
      )
    }
  },
  async handler({
    code,
    metric,
    periods = 5,
    period_type
  }) {
    const code5 = normalizeCode(code);
    const display = displayCode(code5);
    if (!endpointIsFresh(display, "financial")) {
      await fetchStock(code5, { endpoints: ["financial"] });
    }
    const trend = financialTrend(display, metric, periods, period_type);
    if (!trend) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ error: `No financial data available for ${display}` })
          }
        ],
        isError: true
      };
    }
    return {
      content: [
        { type: "text", text: JSON.stringify(trend, null, 2) }
      ]
    };
  }
};

// src/mcp/tools/find-peers.ts
var import_zod7 = require("zod");

// src/memory/mini.ts
var import_node_fs6 = require("fs");
var import_node_path5 = require("path");
var MINI_CDN_URL = process.env.TICKERCODE_MINI_URL ?? "https://cdn.ticker-code.com/cache/api/full/list/mini.json";
var cachedMini = null;
function readMiniMeta() {
  if (!(0, import_node_fs6.existsSync)(MINI_META_PATH)) return null;
  try {
    return JSON.parse((0, import_node_fs6.readFileSync)(MINI_META_PATH, "utf8"));
  } catch {
    return null;
  }
}
function isMiniFresh() {
  const meta = readMiniMeta();
  return isFresh(meta?.last_fetch, TTL_BY_ENDPOINT.mini);
}
async function syncMini(force = false) {
  if (!force && isMiniFresh()) {
    const meta2 = readMiniMeta();
    if (meta2) return meta2;
  }
  const res = await fetch(MINI_CDN_URL);
  if (!res.ok) throw new Error(`Failed to fetch mini.json: ${res.status} ${res.statusText}`);
  const json = await res.json();
  if (!json.success || !json.data) throw new Error("Invalid mini.json response shape");
  (0, import_node_fs6.mkdirSync)((0, import_node_path5.dirname)(MINI_JSON_PATH), { recursive: true });
  (0, import_node_fs6.writeFileSync)(MINI_JSON_PATH, JSON.stringify(json.data, null, 2));
  const meta = {
    last_fetch: (/* @__PURE__ */ new Date()).toISOString(),
    bytes: (0, import_node_fs6.statSync)(MINI_JSON_PATH).size,
    items_count: json.data.items.length,
    tags_count: json.data.tags.length,
    source: MINI_CDN_URL
  };
  writeJson(MINI_META_PATH, meta);
  cachedMini = json.data;
  return meta;
}
function loadMini() {
  if (cachedMini) return cachedMini;
  if (!(0, import_node_fs6.existsSync)(MINI_JSON_PATH)) {
    throw new Error(
      "mini.json not cached yet. Run `tc memory sync-mini` or call syncMini() first."
    );
  }
  cachedMini = JSON.parse((0, import_node_fs6.readFileSync)(MINI_JSON_PATH, "utf8"));
  return cachedMini;
}
async function ensureMiniLoaded() {
  if (!(0, import_node_fs6.existsSync)(MINI_JSON_PATH) || !isMiniFresh()) {
    await syncMini(false);
  }
  return loadMini();
}
function findByCode(displayCode2) {
  const mini = loadMini();
  return mini.items.find(
    (s) => s.display_code === displayCode2 || s.code === displayCode2
  ) ?? null;
}

// src/analysis/peers.ts
var n2 = (v) => {
  if (v === null || v === void 0) return null;
  const parsed = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(parsed) ? parsed : null;
};
var pick = (s) => ({
  code: s.display_code,
  name: s.company_name,
  sector33: s.sector33_code,
  mcap: s.market_capitalization ?? null,
  trailing_per: n2(s.i_trailing_per ?? null),
  forward_per: n2(s.i_forward_per ?? null),
  pbr: n2(s.i_pbr ?? null),
  trailing_roe: n2(s.i_trailing_roe ?? null),
  forward_roe: n2(s.i_forward_roe ?? null),
  roic: n2(s.i_roic ?? null),
  trailing_dy: n2(s.i_trailing_dividend_yield ?? null),
  forward_dy: n2(s.i_forward_dividend_yield ?? null),
  gross_margin: n2(s.i_gross_margin ?? null),
  trailing_op_margin: n2(s.i_trailing_operating_margin ?? null),
  forward_op_margin: n2(s.i_forward_operating_margin ?? null),
  trailing_net_margin: n2(s.i_trailing_net_margin ?? null),
  forward_net_margin: n2(s.i_forward_net_margin ?? null),
  yoy3y_sales: n2(s.yoy3y_sales ?? null),
  yoy3y_op: n2(s.yoy3y_op_profit ?? null),
  yoy3y_net: n2(s.yoy3y_net_profit ?? null),
  fcf_yield: n2(s.i_fcf_yield ?? null),
  equity_ratio: n2(s.i_equity_ratio ?? null)
});
var median = (arr) => {
  const nums = arr.filter((x) => x !== null).sort((a, b) => a - b);
  if (nums.length === 0) return null;
  const mid = Math.floor(nums.length / 2);
  return nums.length % 2 === 0 ? +((nums[mid - 1] + nums[mid]) / 2).toFixed(2) : +nums[mid].toFixed(2);
};
async function findPeers(codeInput, opts = {}) {
  await ensureMiniLoaded();
  const code5 = normalizeCode(codeInput);
  const display = displayCode(code5);
  const target = findByCode(display) ?? findByCode(code5);
  if (!target) {
    throw new Error(`Stock ${display} not found in mini.json`);
  }
  const { items } = await ensureMiniLoaded();
  const by = opts.by ?? "both";
  const band = opts.mcapBand ?? 0.5;
  const targetMcap = target.market_capitalization ?? 0;
  const candidates = items.filter((s) => {
    if (s.display_code === target.display_code) return false;
    if (by === "sector" || by === "both") {
      if (s.sector33_code !== target.sector33_code) return false;
    }
    if (by === "mcap" || by === "both") {
      if (!targetMcap || !s.market_capitalization) return false;
      const ratio = s.market_capitalization / targetMcap;
      if (ratio < 1 - band || ratio > 1 + band) return false;
    }
    if (by === "growth") {
      const selfGrowth = n2(target.yoy3y_sales ?? null);
      const itGrowth = n2(s.yoy3y_sales ?? null);
      if (selfGrowth === null || itGrowth === null) return false;
      if (Math.abs(itGrowth - selfGrowth) > 15) return false;
    }
    return true;
  });
  const ranked = candidates.sort((a, b) => {
    if (by === "mcap" || by === "both") {
      const da = Math.abs((a.market_capitalization ?? 0) - targetMcap);
      const db = Math.abs((b.market_capitalization ?? 0) - targetMcap);
      return da - db;
    }
    return (b.market_capitalization ?? 0) - (a.market_capitalization ?? 0);
  }).slice(0, opts.limit ?? 5);
  const peers = ranked.map(pick);
  const targetPicked = pick(target);
  const bench = {
    sector33: target.sector33_code,
    peer_count: peers.length,
    median_trailing_per: median(peers.map((p) => p.trailing_per)),
    median_forward_per: median(peers.map((p) => p.forward_per)),
    median_pbr: median(peers.map((p) => p.pbr)),
    median_trailing_roe: median(peers.map((p) => p.trailing_roe)),
    median_forward_roe: median(peers.map((p) => p.forward_roe)),
    median_roic: median(peers.map((p) => p.roic)),
    median_trailing_op_margin: median(peers.map((p) => p.trailing_op_margin)),
    median_forward_op_margin: median(peers.map((p) => p.forward_op_margin)),
    median_yoy3y_sales: median(peers.map((p) => p.yoy3y_sales))
  };
  return { target: targetPicked, peers, bench, by, band };
}

// src/mcp/tools/find-peers.ts
var findPeersTool = {
  name: "find_peers",
  config: {
    title: "Find Peer Stocks",
    description: "Find peer companies similar to a given ticker by sector + market cap band (default \xB150%). Returns the target stock + peers (default 5) + sector median benchmarks (PER / ROE / margin / growth). Requires mini.json cache; auto-syncs if missing.",
    inputSchema: {
      code: import_zod7.z.string().describe("4-digit or 5-digit ticker code"),
      limit: import_zod7.z.number().int().min(1).max(30).optional().describe("Number of peers (default 5)"),
      by: import_zod7.z.enum(["sector", "mcap", "both", "growth"]).optional().describe("Match criteria (default 'both')"),
      mcap_band: import_zod7.z.number().min(0.1).max(10).optional().describe("Market cap band ratio (e.g. 0.5 = \xB150%). Default 0.5")
    }
  },
  async handler({
    code,
    limit,
    by,
    mcap_band
  }) {
    const result = await findPeers(code, { limit, by, mcapBand: mcap_band });
    return {
      content: [
        { type: "text", text: JSON.stringify(result, null, 2) }
      ]
    };
  }
};

// src/mcp/tools/project-pl.ts
var import_zod8 = require("zod");

// src/analysis/project.ts
var toNum = (v) => {
  if (v === null || v === void 0) return null;
  const n3 = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n3) ? n3 : null;
};
var round = (n3, d = 2) => +n3.toFixed(d);
function cagr(first, last, years) {
  if (first <= 0 || last <= 0 || years <= 0) return 0;
  return (Math.pow(last / first, 1 / years) - 1) * 100;
}
function pickFYSeries(rows, field, count) {
  const fy = rows.filter((r) => r.g_type_of_current_period === "FY");
  return fy.slice(0, count).map((r) => toNum(r[field]));
}
async function projectPL(codeInput, opts = {}) {
  const code5 = normalizeCode(codeInput);
  const display = displayCode(code5);
  if (!endpointIsFresh(display, "financial")) {
    await fetchStock(code5, { endpoints: ["financial"] });
  }
  const rows = readFinancial(display);
  if (!rows || rows.length === 0) {
    throw new Error(`No financial data for ${display}`);
  }
  const fyRows = rows.filter((r) => r.g_type_of_current_period === "FY");
  if (fyRows.length === 0) {
    throw new Error(`No annual (FY) data for ${display}`);
  }
  const latest = fyRows[0];
  const latestSales = toNum(latest.pl_net_sales);
  const latestOp = toNum(latest.pl_operating_profit_loss);
  const latestNet = toNum(latest.pl_net_profit);
  await ensureMiniLoaded();
  const miniItem = findByCode(display) ?? findByCode(code5);
  const trailingPer = toNum(miniItem?.i_trailing_per);
  const forwardPer = toNum(miniItem?.i_forward_per);
  const currentPer = opts.perOverride ?? forwardPer ?? trailingPer ?? 15;
  const currentPrice = toNum(miniItem?.stock_price);
  const mcap = miniItem?.market_capitalization ?? null;
  const sharesOutstanding = currentPrice && mcap ? Math.round(mcap / currentPrice) : null;
  const opMargin = opts.opMarginOverride ?? (latestOp && latestSales ? latestOp / latestSales * 100 : 10);
  const netMargin = opts.netMarginOverride ?? (latestNet && latestSales ? latestNet / latestSales * 100 : 7);
  const pattern = opts.pattern ?? "3y-cagr";
  let growth = 0;
  if (pattern === "custom") {
    growth = opts.customGrowth ?? 0;
  } else if (pattern === "forecast-yoy") {
    const forecastSales = toNum(latest.pl_forcast_net_sales);
    if (latestSales && forecastSales) {
      growth = (forecastSales / latestSales - 1) * 100;
    } else {
      growth = toNum(miniItem?.yoy3y_sales) ?? 0;
    }
  } else {
    const spanYears = pattern === "5y-cagr" ? 5 : 3;
    const series = pickFYSeries(rows, "pl_net_sales", spanYears + 1);
    const validFirst = series.findLast?.((x) => x !== null) ?? null;
    const validLast = series.find((x) => x !== null) ?? null;
    if (validFirst && validLast && validFirst > 0) {
      const n3 = series.length - 1;
      growth = cagr(validFirst, validLast, n3);
    } else {
      growth = toNum(miniItem?.yoy3y_sales) ?? 0;
    }
  }
  const years = opts.years ?? 5;
  const projection = [];
  let runningSales = latestSales ?? 0;
  for (let i = 1; i <= years; i++) {
    runningSales = runningSales * (1 + growth / 100);
    const op = runningSales * (opMargin / 100);
    const net = runningSales * (netMargin / 100);
    const eps = sharesOutstanding ? net / sharesOutstanding : 0;
    const price = eps * currentPer;
    projection.push({
      year: i,
      sales: Math.round(runningSales),
      op_profit: Math.round(op),
      net_income: Math.round(net),
      eps: round(eps),
      theoretical_price: round(price, 0)
    });
  }
  const sensitivity = [-5, -2, 0, 2, 5].map((delta) => {
    const adjustedGrowth = growth + delta;
    let s = latestSales ?? 0;
    for (let i = 0; i < years; i++) {
      s = s * (1 + adjustedGrowth / 100);
    }
    const n3 = s * (netMargin / 100);
    const eps = sharesOutstanding ? n3 / sharesOutstanding : 0;
    return {
      growth_delta_pct: delta,
      final_price: round(eps * currentPer, 0)
    };
  });
  return {
    code: code5,
    display_code: display,
    base_period: String(latest.g_current_period_end_date ?? ""),
    latest_sales: latestSales,
    assumptions: {
      growth_pct: round(growth, 2),
      op_margin_pct: round(opMargin, 2),
      net_margin_pct: round(netMargin, 2),
      per: round(currentPer, 2),
      per_kind: opts.perOverride !== void 0 ? "override" : forwardPer !== null && currentPer === forwardPer ? "forward (i_forward_per)" : trailingPer !== null && currentPer === trailingPer ? "trailing (i_trailing_per)" : "fallback (15)",
      trailing_per: trailingPer,
      forward_per: forwardPer,
      shares_outstanding: sharesOutstanding,
      pattern
    },
    projection,
    sensitivity,
    current: {
      stock_price: currentPrice,
      market_cap: mcap
    }
  };
}

// src/mcp/tools/project-pl.ts
var projectPLTool = {
  name: "project_pl",
  config: {
    title: "Project P&L Forward",
    description: "Project sales / operating profit / net income / EPS / theoretical stock price for N future years based on historical growth. Pattern selects the growth source: 3y-cagr (default), 5y-cagr, forecast-yoy (use management forecast implied growth), or custom. Returns per-year projection + sensitivity table (growth \xB15%). PER default is FORWARD PER (i_forward_per), falling back to trailing (i_trailing_per) when forecast is unavailable \u2014 this matches forward-looking EPS projection. assumptions.per_kind shows which was applied; both values are also returned. Auto-fetches financial data + mini.json if missing.",
    inputSchema: {
      code: import_zod8.z.string().describe("4-digit or 5-digit ticker code"),
      years: import_zod8.z.number().int().min(1).max(20).optional().describe("Projection horizon (default 5)"),
      pattern: import_zod8.z.enum(["3y-cagr", "5y-cagr", "forecast-yoy", "custom"]).optional().describe("Growth source (default '3y-cagr')"),
      custom_growth: import_zod8.z.number().optional().describe("Custom growth rate in % (only when pattern='custom')"),
      op_margin_override: import_zod8.z.number().optional(),
      net_margin_override: import_zod8.z.number().optional(),
      per_override: import_zod8.z.number().optional()
    }
  },
  async handler({
    code,
    years,
    pattern,
    custom_growth,
    op_margin_override,
    net_margin_override,
    per_override
  }) {
    const result = await projectPL(code, {
      years,
      pattern,
      customGrowth: custom_growth,
      opMarginOverride: op_margin_override,
      netMarginOverride: net_margin_override,
      perOverride: per_override
    });
    return {
      content: [
        { type: "text", text: JSON.stringify(result, null, 2) }
      ]
    };
  }
};

// src/mcp/tools/calculate-moat.ts
var import_zod9 = require("zod");

// src/analysis/moat.ts
var toNum2 = (v) => {
  if (v === null || v === void 0) return null;
  const n3 = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n3) ? n3 : null;
};
var round2 = (n3, d = 2) => +n3.toFixed(d);
function stats(nums) {
  if (nums.length === 0) return { mean: 0, stdev: 0, median: 0 };
  const mean = nums.reduce((s, v) => s + v, 0) / nums.length;
  const variance = nums.reduce((s, v) => s + (v - mean) ** 2, 0) / nums.length;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median2 = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  return { mean, stdev: Math.sqrt(variance), median: median2 };
}
function rateStability(stdev, thresholds) {
  if (stdev <= thresholds[0]) return 5;
  if (stdev <= thresholds[1]) return 4;
  if (stdev <= thresholds[2]) return 3;
  if (stdev <= thresholds[3]) return 2;
  return 1;
}
function cagr2(series) {
  if (series.length < 2) return 0;
  const first = series[series.length - 1];
  const last = series[0];
  if (first <= 0 || last <= 0) return 0;
  return (Math.pow(last / first, 1 / (series.length - 1)) - 1) * 100;
}
async function calculateMoat(codeInput) {
  const code5 = normalizeCode(codeInput);
  const display = displayCode(code5);
  if (!endpointIsFresh(display, "financial")) {
    await fetchStock(code5, { endpoints: ["financial"] });
  }
  const rows = readFinancial(display);
  if (!rows || rows.length === 0) {
    throw new Error(`No financial data for ${display}`);
  }
  const fyRows = rows.filter((r) => r.g_type_of_current_period === "FY").slice(0, 10);
  const opMargins = fyRows.map((r) => {
    const pre = toNum2(r.pl_i_operating_margin);
    if (pre !== null) return pre;
    const sales = toNum2(r.pl_net_sales);
    const op = toNum2(r.pl_operating_profit_loss);
    return sales && op !== null ? op / sales * 100 : null;
  }).filter((x) => x !== null);
  const grossMargins = fyRows.map((r) => toNum2(r.pl_i_gross_margin)).filter((x) => x !== null);
  const roes = fyRows.map((r) => {
    const net = toNum2(r.pl_net_profit);
    const equity = toNum2(r.bs_shareholders_equity) ?? toNum2(r.bs_equity);
    return net !== null && equity && equity > 0 ? net / equity * 100 : null;
  }).filter((x) => x !== null);
  const opStats = stats(opMargins);
  const gmStats = stats(grossMargins);
  const roeStats = stats(roes);
  const salesSeries = fyRows.map((r) => toNum2(r.pl_net_sales)).filter((x) => x !== null);
  const salesCagr = cagr2(salesSeries);
  await ensureMiniLoaded();
  const miniItem = findByCode(display) ?? findByCode(code5);
  const miniRoe = toNum2(miniItem?.i_trailing_roe);
  const opRating = rateStability(opStats.stdev, [1, 3, 6, 12]);
  const gmRating = rateStability(gmStats.stdev, [1.5, 3, 6, 12]);
  const roeRating = rateStability(roeStats.stdev, [2, 5, 10, 20]);
  const capitalEfficientGrowth = (miniRoe ?? roeStats.mean ?? 0) * (salesCagr / 100);
  let capitalRating = 1;
  if (capitalEfficientGrowth >= 4) capitalRating = 5;
  else if (capitalEfficientGrowth >= 2) capitalRating = 4;
  else if (capitalEfficientGrowth >= 1) capitalRating = 3;
  else if (capitalEfficientGrowth >= 0.3) capitalRating = 2;
  const moatScore = round2(
    (opRating + gmRating + roeRating + capitalRating) / 4,
    1
  );
  let interpretation = "";
  if (moatScore >= 4) interpretation = "\u5F37\u3044\u5800\u306E\u5146\u5019\u3042\u308A \u2014 \u5229\u76CA\u7387\u304C\u9577\u671F\u306B\u308F\u305F\u308A\u5B89\u5B9A\u3057\u3001\u6210\u9577\u3082\u8CC7\u672C\u52B9\u7387\u7684";
  else if (moatScore >= 3) interpretation = "\u4E00\u5B9A\u306E\u5800\u3042\u308A \u2014 \u696D\u754C\u5E73\u5747\u3092\u4E0A\u56DE\u308B\u53CE\u76CA\u6027\u3060\u304C\u3001\u8105\u5A01\u306B\u306F\u8981\u6CE8\u610F";
  else if (moatScore >= 2) interpretation = "\u9650\u5B9A\u7684\u306A\u5800 \u2014 \u5229\u76CA\u7387\u30D6\u30EC or \u6210\u9577\u304C\u8CC7\u672C\u52B9\u7387\u3092\u4F34\u308F\u306A\u3044";
  else interpretation = "\u5800\u306E\u75D5\u8DE1\u306F\u5E0C\u8584 \u2014 \u7AF6\u4E89\u6FC0\u5316\u3067\u53CE\u76CA\u6027\u304C\u4E0D\u5B89\u5B9A";
  return {
    code: code5,
    display_code: display,
    years_analyzed: fyRows.length,
    moat_score: moatScore,
    components: {
      op_margin_stability: {
        values: opMargins.map((v) => round2(v, 2)),
        mean: round2(opStats.mean, 2),
        stdev: round2(opStats.stdev, 2),
        rating: opRating
      },
      gross_margin_stability: {
        values: grossMargins.map((v) => round2(v, 2)),
        mean: round2(gmStats.mean, 2),
        stdev: round2(gmStats.stdev, 2),
        rating: gmRating
      },
      capital_efficient_growth: {
        roe: miniRoe ?? (roeStats.mean ? round2(roeStats.mean, 2) : null),
        sales_cagr: round2(salesCagr, 2),
        rating: capitalRating
      },
      roe_stability: {
        values: roes.map((v) => round2(v, 2)),
        mean: round2(roeStats.mean, 2),
        stdev: round2(roeStats.stdev, 2),
        rating: roeRating
      }
    },
    interpretation
  };
}

// src/mcp/tools/calculate-moat.ts
var calculateMoatTool = {
  name: "calculate_moat",
  config: {
    title: "Calculate Economic Moat Score",
    description: "Quantify economic moat on a 1-5 scale. Components: operating margin stability, gross margin stability, ROE stability (pricing power proxies), and capital-efficient growth (ROE \xD7 sales CAGR). Higher score = longer, more durable competitive advantage. Auto-fetches financial data if missing.",
    inputSchema: {
      code: import_zod9.z.string().describe("4-digit or 5-digit ticker code")
    }
  },
  async handler({ code }) {
    const result = await calculateMoat(code);
    return {
      content: [
        { type: "text", text: JSON.stringify(result, null, 2) }
      ]
    };
  }
};

// src/mcp/tools/screen.ts
var import_zod10 = require("zod");

// src/lib/screen.ts
function toNumber(v) {
  if (v === null || v === void 0 || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    const n3 = Number.parseFloat(v);
    return Number.isFinite(n3) ? n3 : null;
  }
  return null;
}
function compare(op, actual, target) {
  switch (op) {
    case "gt":
      return actual > target;
    case "lt":
      return actual < target;
    case "gte":
      return actual >= target;
    case "lte":
      return actual <= target;
    case "eq":
      return actual === target;
  }
}
function passesNumeric(item, cond, includeNull) {
  const actual = toNumber(item[cond.field]);
  if (actual === null) return includeNull;
  return compare(cond.op, actual, cond.value);
}
function passesExact(item, cond) {
  const raw = item[cond.field];
  if (raw === null || raw === void 0) return false;
  return String(raw) === cond.value;
}
function applyFilters(items, options) {
  const { numeric = [], exact = [], includeNull = false } = options;
  if (numeric.length === 0 && exact.length === 0) return items.slice();
  return items.filter((item) => {
    for (const c of exact) {
      if (!passesExact(item, c)) return false;
    }
    for (const c of numeric) {
      if (!passesNumeric(item, c, includeNull)) return false;
    }
    return true;
  });
}
function sortBy(items, spec) {
  const sign = spec.order === "asc" ? 1 : -1;
  return items.slice().sort((a, b) => {
    const av = toNumber(a[spec.field]);
    const bv = toNumber(b[spec.field]);
    if (av === null && bv === null) return 0;
    if (av === null) return 1;
    if (bv === null) return -1;
    if (av === bv) return 0;
    return av < bv ? -1 * sign : 1 * sign;
  });
}
function screen(items, options) {
  let out = applyFilters(items, options);
  if (options.sort) out = sortBy(out, options.sort);
  if (options.offset) out = out.slice(options.offset);
  if (options.limit && options.limit > 0) out = out.slice(0, options.limit);
  return out;
}
var NUMERIC_FLAG_MAP = {
  "per-lt": { field: "i_forward_per", op: "lt" },
  "per-gt": { field: "i_forward_per", op: "gt" },
  "trailing-per-lt": { field: "i_trailing_per", op: "lt" },
  "trailing-per-gt": { field: "i_trailing_per", op: "gt" },
  "pbr-lt": { field: "i_pbr", op: "lt" },
  "pbr-gt": { field: "i_pbr", op: "gt" },
  "psr-lt": { field: "i_forward_psr", op: "lt" },
  "psr-gt": { field: "i_forward_psr", op: "gt" },
  "roe-gt": { field: "i_forward_roe", op: "gt" },
  "roe-lt": { field: "i_forward_roe", op: "lt" },
  "roa-gt": { field: "i_forward_roa", op: "gt" },
  "roic-gt": { field: "i_roic", op: "gt" },
  "growth3y-gt": { field: "yoy3y_sales", op: "gt" },
  "op-growth3y-gt": { field: "yoy3y_op_profit", op: "gt" },
  "mcap-gt": { field: "market_capitalization", op: "gt" },
  "mcap-lt": { field: "market_capitalization", op: "lt" },
  "dy-gt": { field: "i_forward_dividend_yield", op: "gt" },
  "dy-lt": { field: "i_forward_dividend_yield", op: "lt" }
};
function buildNumericConditions(flags, customMetric) {
  const out = [];
  for (const [flagName, cfg] of Object.entries(NUMERIC_FLAG_MAP)) {
    const v = flags[flagName];
    if (v !== void 0 && Number.isFinite(v)) {
      out.push({ field: cfg.field, op: cfg.op, value: v });
    }
  }
  if (customMetric?.field) {
    if (customMetric.gt !== void 0 && Number.isFinite(customMetric.gt)) {
      out.push({ field: customMetric.field, op: "gt", value: customMetric.gt });
    }
    if (customMetric.lt !== void 0 && Number.isFinite(customMetric.lt)) {
      out.push({ field: customMetric.field, op: "lt", value: customMetric.lt });
    }
  }
  return out;
}
var NUMERIC_FLAG_NAMES = Object.keys(NUMERIC_FLAG_MAP);

// src/mcp/tools/screen.ts
var numericOpSchema = import_zod10.z.enum(["gt", "lt", "gte", "lte", "eq"]);
var numericConditionSchema = import_zod10.z.object({
  field: import_zod10.z.string(),
  op: numericOpSchema,
  value: import_zod10.z.number()
});
var exactConditionSchema = import_zod10.z.object({
  field: import_zod10.z.string(),
  value: import_zod10.z.string()
});
var sortSchema = import_zod10.z.object({
  field: import_zod10.z.string(),
  order: import_zod10.z.enum(["asc", "desc"])
});
var screenTool = {
  name: "screen",
  config: {
    title: "Screen Stocks",
    description: "Filter the full Japanese stock universe (3,750+ listed companies from mini.json) by multiple criteria (AND). Returns matching stocks with their metrics. Use for theme-based candidate extraction. Numeric fields: i_forward_per / i_pbr / i_forward_roe / yoy3y_sales / market_capitalization etc. Null/NaN values are excluded by default. Auto-fetches mini.json if stale.",
    inputSchema: {
      numeric: import_zod10.z.array(numericConditionSchema).optional().describe(
        "Numeric conditions (AND). Example: [{field: 'i_forward_per', op: 'lt', value: 20}]"
      ),
      exact: import_zod10.z.array(exactConditionSchema).optional().describe(
        "Exact-match conditions (AND). Example: [{field: 'sector33_code', value: '5250'}]"
      ),
      sort: sortSchema.optional().describe("Sort spec"),
      limit: import_zod10.z.number().int().positive().optional().describe("Max rows"),
      offset: import_zod10.z.number().int().nonnegative().optional().describe("Skip first N rows"),
      includeNull: import_zod10.z.boolean().optional().describe("Include rows where numeric field is null (default: false)"),
      columns: import_zod10.z.array(import_zod10.z.string()).optional().describe(
        "Columns to return per row (default: all fields). Use to keep the payload small."
      )
    }
  },
  async handler({
    numeric,
    exact,
    sort,
    limit,
    offset,
    includeNull,
    columns
  }) {
    const mini = await ensureMiniLoaded();
    const result = screen(mini.items, {
      numeric,
      exact,
      sort,
      limit,
      offset,
      includeNull
    });
    const payload = columns && columns.length > 0 ? result.map((item) => {
      const picked = {};
      for (const c of columns) picked[c] = item[c];
      return picked;
    }) : result;
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            { count: payload.length, items: payload },
            null,
            2
          )
        }
      ]
    };
  }
};

// src/mcp/tools/rank.ts
var import_zod11 = require("zod");
var rankTool = {
  name: "rank",
  config: {
    title: "Rank Stocks (top-N)",
    description: "Return top-N stocks ranked by a metric. Specialized form of `screen` with sort + limit. Defaults to descending order. Useful for finding 'largest by market cap in sector X' or 'cheapest forward PER in sector Y'.",
    inputSchema: {
      by: import_zod11.z.string().describe(
        "Metric field to rank by (e.g. 'i_forward_per', 'yoy3y_sales', 'market_capitalization')"
      ),
      exact: import_zod11.z.array(
        import_zod11.z.object({
          field: import_zod11.z.string(),
          value: import_zod11.z.string()
        })
      ).optional().describe(
        "Exact-match filters. Example: [{field: 'sector33_code', value: '5250'}]"
      ),
      limit: import_zod11.z.number().int().positive().optional().describe("Top N (default 10)"),
      order: import_zod11.z.enum(["asc", "desc"]).optional().describe("Sort order (default desc)"),
      includeNull: import_zod11.z.boolean().optional().describe("Include null values (default false)"),
      columns: import_zod11.z.array(import_zod11.z.string()).optional().describe("Columns to return (default keeps all)")
    }
  },
  async handler({
    by,
    exact,
    limit,
    order,
    includeNull,
    columns
  }) {
    const mini = await ensureMiniLoaded();
    const result = screen(mini.items, {
      exact,
      sort: { field: by, order: order ?? "desc" },
      limit: limit ?? 10,
      includeNull
    });
    const payload = columns && columns.length > 0 ? result.map((item) => {
      const picked = {};
      for (const c of columns) picked[c] = item[c];
      return picked;
    }) : result.map((item) => ({
      display_code: item.display_code,
      company_name: item.company_name,
      sector33_code: item.sector33_code,
      [by]: item[by],
      market_capitalization: item.market_capitalization
    }));
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            { by, order: order ?? "desc", count: payload.length, items: payload },
            null,
            2
          )
        }
      ]
    };
  }
};

// src/mcp/tools/overview-search.ts
var import_zod12 = require("zod");

// src/memory/overview.ts
var import_node_fs7 = require("fs");
var import_node_path6 = require("path");
var OVERVIEW_CDN_URL = process.env.TICKERCODE_OVERVIEW_URL ?? "https://cdn.ticker-code.com/cache/api/full/list/overview.json";
var cachedOverview = null;
function readOverviewMeta() {
  if (!(0, import_node_fs7.existsSync)(OVERVIEW_INDEX_META_PATH)) return null;
  try {
    return JSON.parse((0, import_node_fs7.readFileSync)(OVERVIEW_INDEX_META_PATH, "utf8"));
  } catch {
    return null;
  }
}
function isOverviewFresh() {
  const meta = readOverviewMeta();
  if (!meta?.last_fetch) return false;
  const age = (Date.now() - new Date(meta.last_fetch).getTime()) / 1e3;
  return age >= 0 && age < OVERVIEW_INDEX_TTL_SECONDS;
}
async function syncOverview(force = false) {
  if (!force && isOverviewFresh()) {
    const meta2 = readOverviewMeta();
    if (meta2) return meta2;
  }
  const res = await fetch(OVERVIEW_CDN_URL);
  if (!res.ok) {
    throw new Error(
      `Failed to fetch overview.json: ${res.status} ${res.statusText}`
    );
  }
  const json = await res.json();
  if (!json.success || !json.data) {
    throw new Error("Invalid overview.json response shape");
  }
  (0, import_node_fs7.mkdirSync)((0, import_node_path6.dirname)(OVERVIEW_INDEX_PATH), { recursive: true });
  (0, import_node_fs7.writeFileSync)(OVERVIEW_INDEX_PATH, JSON.stringify(json.data, null, 2));
  const meta = {
    last_fetch: (/* @__PURE__ */ new Date()).toISOString(),
    bytes: (0, import_node_fs7.statSync)(OVERVIEW_INDEX_PATH).size,
    items_count: json.data.items.length,
    generated_at: json.data.meta?.generated_at ?? null,
    source: OVERVIEW_CDN_URL
  };
  writeJson(OVERVIEW_INDEX_META_PATH, meta);
  cachedOverview = json.data;
  return meta;
}
function loadOverview() {
  if (cachedOverview) return cachedOverview;
  if (!(0, import_node_fs7.existsSync)(OVERVIEW_INDEX_PATH)) {
    throw new Error(
      "overview.json not cached yet. Run `tc overview sync` or call syncOverview() first."
    );
  }
  cachedOverview = JSON.parse(
    (0, import_node_fs7.readFileSync)(OVERVIEW_INDEX_PATH, "utf8")
  );
  return cachedOverview;
}
async function ensureOverviewLoaded() {
  if (!(0, import_node_fs7.existsSync)(OVERVIEW_INDEX_PATH) || !isOverviewFresh()) {
    await syncOverview(false);
  }
  return loadOverview();
}

// src/lib/overview-status.ts
function computeFiscalYearStatus(segment) {
  if (!segment?.fiscal_year) return "missing";
  const fy = new Date(segment.fiscal_year);
  if (Number.isNaN(fy.getTime())) return "missing";
  const ageYears = (Date.now() - fy.getTime()) / (365.25 * 864e5);
  return ageYears > 2 ? "stale_2y+" : "current";
}
function computeSegmentDataStatus(segment) {
  if (!segment || segment.segments.length === 0) return "unavailable";
  const segs = segment.segments;
  const bothNull = segs.filter(
    (s) => s.numbers.latest.revenue == null && s.numbers.latest.operating_income == null
  ).length;
  if (bothNull === segs.length) return "unavailable";
  const anyNull = segs.filter(
    (s) => s.numbers.latest.revenue == null || s.numbers.latest.operating_income == null
  ).length;
  return anyNull === 0 ? "complete" : "partial";
}

// src/lib/overview-search.ts
function collectFields(item, includeIndustry, includeSegmentNames) {
  const out = [];
  if (item.narratives) {
    if (item.narratives.summary) {
      out.push({ field: "summary", text: item.narratives.summary });
    }
    if (includeIndustry && item.narratives.industry) {
      out.push({ field: "industry", text: item.narratives.industry });
    }
    if (item.narratives.strengths && item.narratives.strengths.length > 0) {
      out.push({
        field: "strengths",
        text: item.narratives.strengths.join(" ")
      });
    }
    if (item.narratives.weaknesses && item.narratives.weaknesses.length > 0) {
      out.push({
        field: "weaknesses",
        text: item.narratives.weaknesses.join(" ")
      });
    }
  }
  const segData = item.segment;
  if (segData) {
    if (includeSegmentNames && segData.segments.length > 0) {
      out.push({
        field: "segments",
        text: segData.segments.map((s) => s.name).join(" ")
      });
    }
    if (segData.insights) {
      out.push({ field: "segment_insights", text: segData.insights });
    }
    const perSegAnalysis = segData.segments.map((s) => s.analysis ?? "").filter(Boolean).join(" ");
    if (perSegAnalysis) {
      out.push({ field: "segment_analysis", text: perSegAnalysis });
    }
  }
  return out;
}
function matches(needle, haystack, caseSensitive) {
  if (caseSensitive) return haystack.includes(needle);
  return haystack.toLowerCase().includes(needle.toLowerCase());
}
function searchOverview(items, opts) {
  const {
    keywords,
    matchMode = "any",
    includeIndustry = true,
    includeSegmentNames = true,
    fiscalStatusAllow,
    segmentStatusAllow,
    sectorCodes,
    caseSensitive = false,
    limit,
    requireAiAnalysis,
    minRevenueYoy
  } = opts;
  if (!keywords || keywords.length === 0) return [];
  const normKws = keywords.map((k) => k.trim()).filter(Boolean);
  if (!normKws || normKws.length === 0) return [];
  if (!Array.isArray(items)) {
    throw new Error("searchOverview: items must be an array, got " + typeof items);
  }
  const hits = [];
  for (const item of items) {
    const fyStatus = computeFiscalYearStatus(item.segment);
    const segStatus = computeSegmentDataStatus(item.segment);
    if (fiscalStatusAllow && !fiscalStatusAllow.includes(fyStatus)) {
      continue;
    }
    if (segmentStatusAllow && !segmentStatusAllow.includes(segStatus)) {
      continue;
    }
    if (sectorCodes && !sectorCodes.includes(item.sector33_code)) {
      continue;
    }
    if (requireAiAnalysis) {
      const hasInsights = typeof item.segment?.insights === "string" && item.segment.insights.length > 0;
      const hasPerSegment = (item.segment?.segments ?? []).some(
        (s) => typeof s.analysis === "string" && s.analysis.length > 0
      );
      if (!hasInsights && !hasPerSegment) continue;
    }
    if (minRevenueYoy != null) {
      const segs = item.segment?.segments ?? [];
      let dominant = null;
      let maxShare = -Infinity;
      for (const s of segs) {
        const share = s.numbers.latest.revenue_share;
        if (share != null && share > maxShare) {
          maxShare = share;
          dominant = s;
        }
      }
      const yoy = dominant?.numbers.latest.revenue_yoy;
      if (yoy == null || yoy < minRevenueYoy) continue;
    }
    const sources = collectFields(item, includeIndustry, includeSegmentNames);
    if (sources.length === 0) continue;
    const matchedKeywords = /* @__PURE__ */ new Set();
    const matchedFields = /* @__PURE__ */ new Set();
    for (const kw of normKws) {
      for (const src of sources) {
        if (matches(kw, src.text, caseSensitive)) {
          matchedKeywords.add(kw);
          matchedFields.add(src.field);
        }
      }
    }
    if (matchMode === "all" && matchedKeywords.size !== normKws.length) {
      continue;
    }
    if (matchedKeywords.size === 0) continue;
    hits.push({
      code: item.code,
      display_code: item.display_code,
      company_name: item.company_name,
      sector33_code: item.sector33_code,
      sector33_code_name: item.sector33_code_name,
      market_code_name: item.market_code_name,
      fiscal_year: item.segment?.fiscal_year ?? null,
      fiscal_year_status: fyStatus,
      segment_data_status: segStatus,
      analysis_as_of: item.analysis_as_of,
      matched_keywords: Array.from(matchedKeywords),
      matched_fields: Array.from(matchedFields)
    });
    if (limit && hits.length >= limit) break;
  }
  return hits;
}
function parseKeywordsArg(arg) {
  if (!arg) return [];
  return arg.split(",").map((s) => s.trim()).filter(Boolean);
}

// src/mcp/tools/overview-search.ts
var overviewSearchTool = {
  name: "overview_search",
  config: {
    title: "Search Overview (theme keyword search)",
    description: "Keyword search across all 3,753 Japanese listed companies' narrative fields (company summary / industry analysis / strengths / weaknesses) and segment names. Backbone of the `tc research-idea` theme-discovery workflow (Step 2). Returns hits with matched_keywords + matched_fields. Auto-fetches overview.json if stale.",
    inputSchema: {
      keywords: import_zod12.z.array(import_zod12.z.string()).min(1).describe(
        "Keywords to search for. Example: ['AI', '\u6A5F\u68B0\u5B66\u7FD2', 'LLM']. Each keyword is matched case-insensitively via substring."
      ),
      matchMode: import_zod12.z.enum(["any", "all"]).optional().describe(
        "'any' = OR (default, at least one keyword matches). 'all' = AND (every keyword must match somewhere)."
      ),
      includeIndustry: import_zod12.z.boolean().optional().describe("Search the industry narrative field too (default true)"),
      includeSegmentNames: import_zod12.z.boolean().optional().describe("Search segment names too (default true)"),
      fiscalStatusAllow: import_zod12.z.array(import_zod12.z.enum(["current", "stale_2y+", "missing"])).optional().describe(
        "Allowed fiscal_year_status values. Default: ['current'] (exclude stale_2y+ and missing). Pass the full list to include all."
      ),
      segmentStatusAllow: import_zod12.z.array(import_zod12.z.enum(["complete", "partial", "unavailable"])).optional().describe(
        "Allowed segment_data_status values. Default: undefined = all. Restrict to 'complete' if you need segment numeric data downstream."
      ),
      sectorCodes: import_zod12.z.array(import_zod12.z.string()).optional().describe("sector33_code list to restrict to (e.g. ['5250', '3650'])"),
      requireAiAnalysis: import_zod12.z.boolean().optional().describe(
        "If true, only include stocks with AI-generated segment analysis/insights (non-null insights or at least one segment.analysis). Useful to bias toward richer context."
      ),
      minRevenueYoy: import_zod12.z.number().optional().describe(
        "Filter by dominant segment revenue YoY growth rate (0-1 scale, 0.1 = 10% growth). Null or below threshold are excluded."
      ),
      limit: import_zod12.z.number().int().positive().optional().describe("Max hits to return")
    }
  },
  async handler(input) {
    const overview = await ensureOverviewLoaded();
    const hits = searchOverview(overview.items, {
      keywords: input.keywords,
      matchMode: input.matchMode,
      includeIndustry: input.includeIndustry,
      includeSegmentNames: input.includeSegmentNames,
      fiscalStatusAllow: input.fiscalStatusAllow ?? ["current"],
      segmentStatusAllow: input.segmentStatusAllow,
      sectorCodes: input.sectorCodes,
      requireAiAnalysis: input.requireAiAnalysis,
      minRevenueYoy: input.minRevenueYoy,
      limit: input.limit
    });
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              keywords: input.keywords,
              matchMode: input.matchMode ?? "any",
              count: hits.length,
              items: hits
            },
            null,
            2
          )
        }
      ]
    };
  }
};

// src/mcp/tools/overview-sync.ts
var import_zod13 = require("zod");
var overviewSyncTool = {
  name: "overview_sync",
  config: {
    title: "Sync Overview Bulk Dump",
    description: "Download overview.json (3,753 Japanese listed stocks with narrative + segments) from R2 CDN and cache locally. Call this before keyword search if local cache is missing or stale (>24h). Returns cache metadata.",
    inputSchema: {
      force: import_zod13.z.boolean().optional().describe("Ignore 24h TTL and force re-fetch")
    }
  },
  async handler({ force }) {
    const meta = await syncOverview(Boolean(force));
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(meta, null, 2)
        }
      ]
    };
  }
};
var overviewStatusTool = {
  name: "overview_status",
  config: {
    title: "Overview Cache Status",
    description: "Return metadata about the cached overview.json (last fetch time, item count, generated_at). Null if not cached yet.",
    inputSchema: {}
  },
  async handler() {
    const meta = readOverviewMeta();
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(meta, null, 2)
        }
      ]
    };
  }
};

// src/mcp/tools/research-idea.ts
var import_zod14 = require("zod");
var import_node_fs9 = require("fs");
var import_node_path8 = require("path");

// src/lib/research-idea.ts
var import_node_crypto = require("crypto");
var import_node_path7 = require("path");
var import_node_fs8 = require("fs");
function parseMaybeNumber(v) {
  if (v === null || v === void 0 || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const n3 = Number.parseFloat(String(v));
  return Number.isFinite(n3) ? n3 : null;
}
function joinHitsWithMini(hits, miniByCode) {
  return hits.map((h) => {
    const mini = miniByCode.get(h.display_code) ?? miniByCode.get(h.code);
    return {
      ...h,
      market_capitalization: typeof mini?.market_capitalization === "number" ? mini.market_capitalization : parseMaybeNumber(mini?.market_capitalization),
      i_forward_per: parseMaybeNumber(mini?.i_forward_per),
      i_pbr: parseMaybeNumber(mini?.i_pbr),
      i_forward_roe: parseMaybeNumber(mini?.i_forward_roe),
      yoy3y_sales: parseMaybeNumber(mini?.yoy3y_sales),
      yoy3y_op_profit: parseMaybeNumber(mini?.yoy3y_op_profit),
      stock_price: typeof mini?.stock_price === "string" ? mini.stock_price : null
    };
  });
}
function buildShortlist(input) {
  const { hits, miniByCode, numericConditions, includeNull = false, targetSize } = input;
  const joined = joinHitsWithMini(hits, miniByCode);
  const filtered = applyFilters(
    joined,
    { numeric: numericConditions, includeNull }
  );
  if (targetSize > 0 && filtered.length > targetSize) {
    return filtered.slice(0, targetSize);
  }
  return filtered;
}
var SLUG_SAFE_RE = /[^a-z0-9-]+/g;
var JST_OFFSET_MS = 9 * 60 * 60 * 1e3;
function themeToAsciiSlug(theme) {
  return theme.toLowerCase().replace(SLUG_SAFE_RE, "-").replace(/^-+|-+$/g, "").slice(0, 24);
}
function generateSlug({ theme, date = /* @__PURE__ */ new Date(), override }) {
  if (override && override.trim()) return override.trim();
  const jst = new Date(date.getTime() + JST_OFFSET_MS);
  const y = jst.getUTCFullYear();
  const m = String(jst.getUTCMonth() + 1).padStart(2, "0");
  const d = String(jst.getUTCDate()).padStart(2, "0");
  const hash = (0, import_node_crypto.createHash)("sha1").update(theme).digest("hex").slice(0, 8);
  const asciiPart = themeToAsciiSlug(theme);
  const head = asciiPart.length > 0 ? `${asciiPart}-` : "theme-";
  return `${head}${y}${m}${d}-${hash}`;
}
function sectorBreakdown(items) {
  if (items.length === 0) return [];
  const map = /* @__PURE__ */ new Map();
  for (const s of items) {
    const key = s.sector33_code;
    const cur = map.get(key);
    if (cur) {
      cur.count += 1;
    } else {
      map.set(key, {
        sector_code: key,
        sector_name: s.sector33_code_name,
        count: 1,
        share: 0
      });
    }
  }
  const total = items.length;
  const stats2 = Array.from(map.values()).map((s) => ({
    ...s,
    share: s.count / total
  }));
  stats2.sort((a, b) => b.count - a.count || a.sector_code.localeCompare(b.sector_code));
  return stats2;
}
function fmtKeywordsMd(theme, keywords, matchMode) {
  return [
    `# 01 \xB7 Keywords`,
    "",
    `**Theme**: ${theme}`,
    "",
    `**Match mode**: \`${matchMode}\``,
    "",
    `**Keywords**:`,
    "",
    keywords.map((k) => `- \`${k}\``).join("\n"),
    ""
  ].join("\n");
}
function fmtHitsMd(theme, hits, hitsLimit) {
  const total = hits.length;
  const truncated = hitsLimit && hitsLimit > 0 && total > hitsLimit;
  const shown = truncated ? hits.slice(0, hitsLimit) : hits;
  const header = `| # | code | company | sector | fiscal | seg | matched | fields |`;
  const sep = `|---|------|---------|--------|--------|-----|---------|--------|`;
  const rows = shown.map(
    (h, i) => [
      `| ${i + 1}`,
      `| ${h.display_code}`,
      `| ${h.company_name}`,
      `| ${h.sector33_code_name}`,
      `| ${h.fiscal_year_status}`,
      `| ${h.segment_data_status}`,
      `| ${h.matched_keywords.join("\u3001")}`,
      `| ${h.matched_fields.join(", ")} |`
    ].join(" ")
  );
  const note = truncated ? `_Showing first ${hitsLimit} of ${total} hits. Full list in hits.json._` : "";
  return [
    `# 02 \xB7 Keyword Hits (${total})`,
    "",
    `Theme: ${theme}`,
    "",
    ...note ? [note, ""] : [],
    header,
    sep,
    ...rows,
    ""
  ].join("\n");
}
function fmtNumeric(v, digits = 2) {
  if (v === null || !Number.isFinite(v)) return "\u2014";
  return v.toFixed(digits);
}
function fmtYen(v) {
  if (v === null || !Number.isFinite(v)) return "\u2014";
  if (v >= 1e12) return `${(v / 1e12).toFixed(2)}\u5146`;
  if (v >= 1e8) return `${(v / 1e8).toFixed(1)}\u5104`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}\u767E\u4E07`;
  return String(v);
}
function fmtPct(share) {
  return `${(share * 100).toFixed(1)}%`;
}
function fmtSectorBreakdownMd(stats2) {
  if (stats2.length === 0) return "";
  const head = `| sector | code | count | share |`;
  const sep = `|--------|------|-------|-------|`;
  const rows = stats2.map(
    (s) => `| ${s.sector_name} | ${s.sector_code} | ${s.count} | ${fmtPct(s.share)} |`
  );
  return [
    `## \u30BB\u30AF\u30BF\u30FC\u5206\u5E03 (${stats2.length})`,
    "",
    head,
    sep,
    ...rows,
    ""
  ].join("\n");
}
function fmtShortlistMd(theme, shortlist, screenConditions) {
  const cond = screenConditions.length > 0 ? `Filters: ${screenConditions.map((c) => `\`${c.field} ${c.op} ${c.value}\``).join(" AND ")}` : "Filters: (none)";
  const breakdown = sectorBreakdown(shortlist);
  const header = `| # | code | company | sector | mcap | fwd PER | PBR | fwd ROE | 3y sales | matched |`;
  const sep = `|---|------|---------|--------|------|---------|-----|---------|----------|---------|`;
  const rows = shortlist.map(
    (s, i) => [
      `| ${i + 1}`,
      `| ${s.display_code}`,
      `| ${s.company_name}`,
      `| ${s.sector33_code_name}`,
      `| ${fmtYen(s.market_capitalization)}`,
      `| ${fmtNumeric(s.i_forward_per)}`,
      `| ${fmtNumeric(s.i_pbr)}`,
      `| ${fmtNumeric(s.i_forward_roe)}`,
      `| ${fmtNumeric(s.yoy3y_sales)}`,
      `| ${s.matched_keywords.join("\u3001")} |`
    ].join(" ")
  );
  return [
    `# 03 \xB7 Shortlist (${shortlist.length})`,
    "",
    `Theme: ${theme}`,
    "",
    cond,
    "",
    fmtSectorBreakdownMd(breakdown),
    `## \u9298\u67C4\u4E00\u89A7`,
    "",
    header,
    sep,
    ...rows,
    ""
  ].join("\n");
}
function indexMiniByCode(items) {
  const map = /* @__PURE__ */ new Map();
  for (const s of items) {
    if (s.display_code) map.set(s.display_code, s);
    if (s.code) map.set(s.code, s);
  }
  return map;
}
function writeFileSafe(path, content) {
  (0, import_node_fs8.mkdirSync)((0, import_node_path7.dirname)(path), { recursive: true });
  (0, import_node_fs8.writeFileSync)(path, content);
}
function runOneTheme(options, overview, mini) {
  (0, import_node_fs8.mkdirSync)(options.ideaDir, { recursive: true });
  const hits = searchOverview(overview.items, {
    keywords: options.keywords,
    matchMode: options.matchMode,
    includeIndustry: options.includeIndustry,
    includeSegmentNames: options.includeSegmentNames,
    fiscalStatusAllow: options.fiscalStatusAllow,
    segmentStatusAllow: options.segmentStatusAllow,
    sectorCodes: options.sectorCodes
  });
  const miniByCode = indexMiniByCode(mini.items);
  const shortlist = buildShortlist({
    hits,
    miniByCode,
    numericConditions: options.numericConditions,
    includeNull: options.includeNull,
    targetSize: options.targetSize
  });
  writeFileSafe(
    (0, import_node_path7.join)(options.ideaDir, "01-keywords.md"),
    fmtKeywordsMd(options.theme, options.keywords, options.matchMode)
  );
  writeFileSafe(
    (0, import_node_path7.join)(options.ideaDir, "02-hits.md"),
    fmtHitsMd(options.theme, hits, options.hitsLimit)
  );
  writeFileSafe(
    (0, import_node_path7.join)(options.ideaDir, "hits.json"),
    JSON.stringify({ count: hits.length, items: hits }, null, 2)
  );
  writeFileSafe(
    (0, import_node_path7.join)(options.ideaDir, "03-shortlist.md"),
    fmtShortlistMd(
      options.theme,
      shortlist,
      options.numericConditions.map((c) => ({
        field: c.field,
        op: c.op,
        value: c.value
      }))
    )
  );
  writeFileSafe(
    (0, import_node_path7.join)(options.ideaDir, "shortlist.json"),
    JSON.stringify({ count: shortlist.length, items: shortlist }, null, 2)
  );
  writeFileSafe(
    (0, import_node_path7.join)(options.ideaDir, "final.md"),
    fmtFinalMdSkeleton(
      options.theme,
      options.slug,
      { hits: hits.length, shortlist: shortlist.length },
      shortlist,
      options.topN
    )
  );
  const meta = {
    theme: options.theme,
    slug: options.slug,
    keywords: options.keywords,
    match_mode: options.matchMode,
    include_industry: options.includeIndustry,
    include_segments: options.includeSegmentNames,
    fiscal_status_allow: options.fiscalStatusAllow ?? "all",
    segment_status_allow: options.segmentStatusAllow ?? "all",
    sector_codes: options.sectorCodes ?? null,
    target_size: options.targetSize,
    hits_limit: options.hitsLimit,
    top_n: options.topN,
    screen_conditions: options.numericConditions.map((c) => ({
      field: c.field,
      op: c.op,
      value: c.value
    })),
    out_dir: options.ideaDir,
    generated_at: (/* @__PURE__ */ new Date()).toISOString(),
    counts: { hits: hits.length, shortlist: shortlist.length },
    data_as_of: { overview_generated_at: overview.meta?.generated_at ?? null }
  };
  writeFileSafe((0, import_node_path7.join)(options.ideaDir, "meta.json"), JSON.stringify(meta, null, 2));
  const breakdown = sectorBreakdown(shortlist);
  const top = breakdown[0];
  return {
    theme: options.theme,
    slug: options.slug,
    idea_dir: options.ideaDir,
    counts: { hits: hits.length, shortlist: shortlist.length },
    top_sector: top ? { sector_code: top.sector_code, sector_name: top.sector_name, share: top.share } : null,
    shortlist_codes: shortlist.map((s) => s.display_code),
    overview_generated_at: overview.meta?.generated_at ?? null
  };
}
function fmtFinalMdSkeleton(theme, slug, counts, shortlist, topN = 10) {
  const n3 = Math.max(1, topN);
  const codeList = shortlist.slice(0, n3).map((s) => `- [ ] ${s.display_code} ${s.company_name}`).join("\n");
  return [
    `# ${theme} \u2014 \u5019\u88DC\u5206\u6790\u30EC\u30DD\u30FC\u30C8`,
    "",
    `> Slug: \`${slug}\`  |  Hits: ${counts.hits}  |  Shortlist: ${counts.shortlist}  |  Generated: ${(/* @__PURE__ */ new Date()).toISOString()}`,
    "",
    `## \u30C6\u30FC\u30DE\u306E\u5168\u4F53\u50CF`,
    "",
    `<!-- Agent: \u3053\u306E\u30C6\u30FC\u30DE\u304C\u4ECA\u306A\u305C\u91CD\u8981\u304B\u3001\u80CC\u666F\u3068\u524D\u63D0\u3092 2-3 \u6BB5\u843D\u3067\u66F8\u304F -->`,
    "",
    `## \u9078\u5B9A\u30D5\u30ED\u30FC`,
    "",
    `1. Keyword: 02-hits.md (${counts.hits} \u793E)`,
    `2. Shortlist: 03-shortlist.md (${counts.shortlist} \u793E)`,
    `3. \u6DF1\u5800\u308A\u5019\u88DC (top ${n3}):`,
    "",
    codeList,
    "",
    `## \u6700\u7D42\u5019\u88DC top N`,
    "",
    `<!-- Agent: shortlist \u304B\u3089\u6DF1\u5800\u308A\u3057\u305F\u4E0A\u3067\u3001\u6295\u8CC7\u30C6\u30FC\u30DE\u306B\u7D14\u7C8B\u306B\u5F53\u305F\u308B\u4F01\u696D\u3092\u9078\u51FA\u3057\u30011 \u6BB5\u843D/\u793E \u3067\u66F8\u304F -->`,
    "",
    `## \u30B9\u30B3\u30A2\u8868`,
    "",
    `<!-- Agent: 4 \u8EF8 (\u30C6\u30FC\u30DE\u6574\u5408\u6027 / \u6210\u9577\u6027 / \u30D0\u30EA\u30E5\u30A8\u30FC\u30B7\u30E7\u30F3 / \u53CE\u76CA\u6027) \u3067 5 \u70B9\u6E80\u70B9\u63A1\u70B9 -->`,
    "",
    `## \u52DD\u3061 / \u8CA0\u3051\u30B7\u30CA\u30EA\u30AA`,
    "",
    `<!-- Agent: \u30C6\u30FC\u30DE\u304C\u8FFD\u3044\u98A8/\u9006\u98A8\u306B\u306A\u308B\u30B1\u30FC\u30B9\u5225\u306B\u3001\u5019\u88DC\u7FA4\u306E\u671F\u5F85\u5024\u3092\u63CF\u304F -->`,
    "",
    `## \u30EA\u30B9\u30AF\u8981\u56E0`,
    "",
    `<!-- Agent: \u30BB\u30AF\u30BF\u30FC\u5171\u901A\u306E\u9006\u98A8\u3001\u500B\u5225\u4F01\u696D\u306E\u8106\u5F31\u6027 -->`,
    "",
    `## \u30C7\u30FC\u30BF\u30BD\u30FC\u30B9 / \u57FA\u6E96\u65E5`,
    "",
    `- overview.json: \`cdn.ticker-code.com/cache/api/full/list/overview.json\``,
    `- mini.json: \u76F4\u8FD1\u6307\u6A19 (i_forward_*, yoy3y_*)`,
    `- \u6DF1\u5800\u308A: \`tc memory fetch\` + \`tc stock\` / \`tc financial\``,
    ""
  ].join("\n");
}

// src/mcp/tools/research-idea.ts
function indexMiniByCode2(items) {
  const map = /* @__PURE__ */ new Map();
  for (const s of items) {
    if (s.display_code) map.set(s.display_code, s);
    if (s.code) map.set(s.code, s);
  }
  return map;
}
function writeFile(path, content) {
  (0, import_node_fs9.mkdirSync)((0, import_node_path8.dirname)(path), { recursive: true });
  (0, import_node_fs9.writeFileSync)(path, content);
}
var researchIdeaTool = {
  name: "research_idea",
  config: {
    title: "Research Idea (theme \u2192 candidates)",
    description: "Orchestrate theme-driven candidate discovery. Given a theme + Agent-generated keywords, run keyword search over overview.json, join with mini.json metrics, apply optional screen filters, cap to target_size, and write 01-keywords.md / 02-hits.md / 03-shortlist.md / final.md (skeleton) + hits.json / shortlist.json / meta.json into research/idea/{slug}/. Returns counts + output path.",
    inputSchema: {
      theme: import_zod14.z.string().describe("Free-form investment theme"),
      keywords: import_zod14.z.array(import_zod14.z.string()).min(1).describe("Keywords to search (Agent-generated)"),
      matchMode: import_zod14.z.enum(["any", "all"]).optional(),
      includeIndustry: import_zod14.z.boolean().optional(),
      includeSegmentNames: import_zod14.z.boolean().optional(),
      fiscalStatusAllow: import_zod14.z.array(import_zod14.z.enum(["current", "stale_2y+", "missing"])).optional(),
      segmentStatusAllow: import_zod14.z.array(import_zod14.z.enum(["complete", "partial", "unavailable"])).optional(),
      sectorCodes: import_zod14.z.array(import_zod14.z.string()).optional(),
      targetSize: import_zod14.z.number().int().positive().optional(),
      hitsLimit: import_zod14.z.number().int().positive().optional().describe("Max rows to write in 02-hits.md (default 200). hits.json always has all."),
      topN: import_zod14.z.number().int().positive().optional().describe("Number of deep-dive candidates listed in final.md (default 10)"),
      screenConditions: import_zod14.z.array(
        import_zod14.z.object({
          field: import_zod14.z.string(),
          op: import_zod14.z.enum(["gt", "lt", "gte", "lte", "eq"]),
          value: import_zod14.z.number()
        })
      ).optional().describe(
        "Numeric filter conditions applied after keyword search. Example: [{field:'i_forward_per', op:'lt', value:30}]"
      ),
      includeNull: import_zod14.z.boolean().optional(),
      slug: import_zod14.z.string().optional(),
      out: import_zod14.z.string().optional().describe("Output root directory (default research/idea)"),
      overwrite: import_zod14.z.boolean().optional()
    }
  },
  async handler(input) {
    const matchMode = input.matchMode ?? "any";
    const targetSize = input.targetSize ?? 50;
    const hitsLimit = input.hitsLimit ?? 200;
    const topN = input.topN ?? 10;
    const outRoot = (0, import_node_path8.resolve)(input.out ?? "research/idea");
    const slug = generateSlug({ theme: input.theme, override: input.slug });
    const ideaDir = (0, import_node_path8.join)(outRoot, slug);
    if ((0, import_node_fs9.existsSync)(ideaDir) && !input.overwrite) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                error: `Directory already exists: ${ideaDir}. Pass overwrite=true or a different slug.`
              },
              null,
              2
            )
          }
        ],
        isError: true
      };
    }
    (0, import_node_fs9.mkdirSync)(ideaDir, { recursive: true });
    const [overview, mini] = await Promise.all([
      ensureOverviewLoaded(),
      ensureMiniLoaded()
    ]);
    const hits = searchOverview(overview.items, {
      keywords: input.keywords,
      matchMode,
      includeIndustry: input.includeIndustry,
      includeSegmentNames: input.includeSegmentNames,
      fiscalStatusAllow: input.fiscalStatusAllow ?? ["current"],
      segmentStatusAllow: input.segmentStatusAllow,
      sectorCodes: input.sectorCodes
    });
    const miniByCode = indexMiniByCode2(mini.items);
    const numericConditions = input.screenConditions ?? [];
    const shortlist = buildShortlist({
      hits,
      miniByCode,
      numericConditions,
      includeNull: Boolean(input.includeNull),
      targetSize
    });
    writeFile(
      (0, import_node_path8.join)(ideaDir, "01-keywords.md"),
      fmtKeywordsMd(input.theme, input.keywords, matchMode)
    );
    writeFile(
      (0, import_node_path8.join)(ideaDir, "02-hits.md"),
      fmtHitsMd(input.theme, hits, hitsLimit)
    );
    writeFile(
      (0, import_node_path8.join)(ideaDir, "hits.json"),
      JSON.stringify({ count: hits.length, items: hits }, null, 2)
    );
    writeFile(
      (0, import_node_path8.join)(ideaDir, "03-shortlist.md"),
      fmtShortlistMd(
        input.theme,
        shortlist,
        numericConditions.map((c) => ({ field: c.field, op: c.op, value: c.value }))
      )
    );
    writeFile(
      (0, import_node_path8.join)(ideaDir, "shortlist.json"),
      JSON.stringify({ count: shortlist.length, items: shortlist }, null, 2)
    );
    writeFile(
      (0, import_node_path8.join)(ideaDir, "final.md"),
      fmtFinalMdSkeleton(
        input.theme,
        slug,
        { hits: hits.length, shortlist: shortlist.length },
        shortlist,
        topN
      )
    );
    const manifest = {
      theme: input.theme,
      slug,
      keywords: input.keywords,
      match_mode: matchMode,
      target_size: targetSize,
      hits_limit: hitsLimit,
      top_n: topN,
      include_industry: input.includeIndustry ?? true,
      include_segments: input.includeSegmentNames ?? true,
      fiscal_status_allow: input.fiscalStatusAllow ?? ["current"],
      segment_status_allow: input.segmentStatusAllow ?? "all",
      sector_codes: input.sectorCodes ?? null,
      screen_conditions: numericConditions,
      counts: { hits: hits.length, shortlist: shortlist.length },
      overview_generated_at: overview.meta?.generated_at ?? null,
      out_dir: ideaDir,
      generated_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    writeFile((0, import_node_path8.join)(ideaDir, "meta.json"), JSON.stringify(manifest, null, 2));
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(manifest, null, 2)
        }
      ]
    };
  }
};

// src/mcp/tools/research-batch.ts
var import_zod16 = require("zod");
var import_node_path10 = require("path");

// src/lib/research-batch.ts
var import_node_crypto2 = require("crypto");
var import_node_path9 = require("path");
var import_node_fs10 = require("fs");
var import_zod15 = require("zod");
var screenSchema = import_zod15.z.object({
  per_lt: import_zod15.z.number().optional(),
  per_gt: import_zod15.z.number().optional(),
  pbr_lt: import_zod15.z.number().optional(),
  roe_gt: import_zod15.z.number().optional(),
  roe_lt: import_zod15.z.number().optional(),
  roa_gt: import_zod15.z.number().optional(),
  roic_gt: import_zod15.z.number().optional(),
  growth3y_gt: import_zod15.z.number().optional(),
  op_growth3y_gt: import_zod15.z.number().optional(),
  mcap_gt: import_zod15.z.number().optional(),
  mcap_lt: import_zod15.z.number().optional(),
  dy_gt: import_zod15.z.number().optional(),
  dy_lt: import_zod15.z.number().optional()
}).passthrough().optional();
var fiscalEnum = import_zod15.z.enum(["current", "stale_2y+", "missing"]);
var segEnum = import_zod15.z.enum(["complete", "partial", "unavailable"]);
var commonThemeSchema = import_zod15.z.object({
  match_mode: import_zod15.z.enum(["any", "all"]).optional(),
  target_size: import_zod15.z.number().int().positive().optional(),
  hits_limit: import_zod15.z.number().int().positive().optional(),
  top_n: import_zod15.z.number().int().positive().optional(),
  include_industry: import_zod15.z.boolean().optional(),
  include_segments: import_zod15.z.boolean().optional(),
  include_null: import_zod15.z.boolean().optional(),
  include_stale: import_zod15.z.boolean().optional(),
  fiscal_status: import_zod15.z.union([import_zod15.z.literal("any"), import_zod15.z.array(fiscalEnum), fiscalEnum]).optional(),
  segment_status: import_zod15.z.union([import_zod15.z.literal("any"), import_zod15.z.array(segEnum), segEnum]).optional(),
  sector: import_zod15.z.union([import_zod15.z.array(import_zod15.z.string()), import_zod15.z.string()]).optional().describe("sector33_code or comma list"),
  screen: screenSchema
});
var themeEntrySchema = commonThemeSchema.extend({
  theme: import_zod15.z.string().min(1),
  keywords: import_zod15.z.array(import_zod15.z.string().min(1)).min(1),
  slug: import_zod15.z.string().optional()
});
var batchConfigSchema = import_zod15.z.object({
  defaults: commonThemeSchema.optional(),
  themes: import_zod15.z.array(themeEntrySchema).min(1)
});
function parseBatchConfig(json) {
  return batchConfigSchema.parse(json);
}
function normalizeFiscal(raw, includeStale) {
  if (includeStale) return void 0;
  if (raw === void 0) return ["current"];
  if (raw === "any") return void 0;
  if (typeof raw === "string") return [raw];
  return raw;
}
function normalizeSeg(raw) {
  if (raw === void 0 || raw === "any") return void 0;
  if (typeof raw === "string") return [raw];
  return raw;
}
function normalizeSector(raw) {
  if (raw === void 0) return void 0;
  if (Array.isArray(raw)) return raw;
  return String(raw).split(",").map((s) => s.trim()).filter(Boolean);
}
function buildNumericFromScreen(screen2) {
  if (!screen2) return [];
  const flags = {};
  const mapping = [
    ["per_lt", "per-lt"],
    ["per_gt", "per-gt"],
    ["pbr_lt", "pbr-lt"],
    ["roe_gt", "roe-gt"],
    ["roe_lt", "roe-lt"],
    ["roa_gt", "roa-gt"],
    ["roic_gt", "roic-gt"],
    ["growth3y_gt", "growth3y-gt"],
    ["op_growth3y_gt", "op-growth3y-gt"],
    ["mcap_gt", "mcap-gt"],
    ["mcap_lt", "mcap-lt"],
    ["dy_gt", "dy-gt"],
    ["dy_lt", "dy-lt"]
  ];
  for (const [src, dst] of mapping) {
    const v = screen2[src];
    if (typeof v === "number" && Number.isFinite(v)) flags[dst] = v;
  }
  return buildNumericConditions(flags);
}
function resolveTheme(entry, defaults = {}) {
  const merged = { ...defaults, ...entry };
  const mergedScreen = { ...defaults.screen ?? {}, ...entry.screen ?? {} };
  return {
    theme: entry.theme,
    keywords: entry.keywords,
    matchMode: merged.match_mode ?? "any",
    includeIndustry: merged.include_industry ?? true,
    includeSegmentNames: merged.include_segments ?? true,
    fiscalStatusAllow: normalizeFiscal(merged.fiscal_status, merged.include_stale),
    segmentStatusAllow: normalizeSeg(merged.segment_status),
    sectorCodes: normalizeSector(merged.sector),
    targetSize: merged.target_size ?? 50,
    hitsLimit: merged.hits_limit ?? 200,
    topN: merged.top_n ?? 10,
    numericConditions: buildNumericFromScreen(mergedScreen),
    includeNull: merged.include_null ?? false,
    slugOverride: entry.slug
  };
}
var JST_OFFSET_MS2 = 9 * 60 * 60 * 1e3;
function generateBatchSlug({
  date = /* @__PURE__ */ new Date(),
  hashSeed,
  override
}) {
  if (override && override.trim()) return override.trim();
  const jst = new Date(date.getTime() + JST_OFFSET_MS2);
  const y = jst.getUTCFullYear();
  const m = String(jst.getUTCMonth() + 1).padStart(2, "0");
  const d = String(jst.getUTCDate()).padStart(2, "0");
  const hh = String(jst.getUTCHours()).padStart(2, "0");
  const mm = String(jst.getUTCMinutes()).padStart(2, "0");
  const hash = (0, import_node_crypto2.createHash)("sha1").update(hashSeed).digest("hex").slice(0, 6);
  return `batch-${y}${m}${d}-${hh}${mm}-${hash}`;
}
function findOverlaps(results) {
  const map = /* @__PURE__ */ new Map();
  for (const r of results) {
    for (const code of r.shortlist_codes) {
      if (!map.has(code)) map.set(code, /* @__PURE__ */ new Set());
      map.get(code).add(r.theme);
    }
  }
  const overlaps = [];
  for (const [code, themes] of map) {
    if (themes.size > 1) {
      overlaps.push({ code, themes: Array.from(themes).sort() });
    }
  }
  overlaps.sort((a, b) => b.themes.length - a.themes.length || a.code.localeCompare(b.code));
  return overlaps;
}
function fmtPct2(share) {
  return `${(share * 100).toFixed(1)}%`;
}
function fmtBatchSummaryMd(manifest) {
  const header = `| # | theme | hits | shortlist | top sector | slug |`;
  const sep = `|---|-------|------|-----------|-----------|------|`;
  const rows = manifest.themes.map(
    (t, i) => [
      `| ${i + 1}`,
      `| ${t.theme}`,
      `| ${t.hits}`,
      `| ${t.shortlist}`,
      `| ${t.top_sector ? `${t.top_sector.name} (${fmtPct2(t.top_sector.share)})` : "\u2014"}`,
      `| \`${t.slug}\` |`
    ].join(" ")
  );
  let overlapSection = "## Cross-Theme Overlap\n\n";
  if (manifest.overlaps.length === 0) {
    overlapSection += "No stock appears in more than one shortlist.\n";
  } else {
    overlapSection += `${manifest.overlaps.length} stocks appear in multiple themes.

`;
    overlapSection += `| code | themes |
`;
    overlapSection += `|------|--------|
`;
    for (const o of manifest.overlaps) {
      overlapSection += `| ${o.code} | ${o.themes.join(", ")} |
`;
    }
  }
  const links = manifest.themes.map((t) => `- **${t.theme}** \u2192 \`${t.idea_dir}\``).join("\n");
  return [
    `# Research Batch Summary`,
    "",
    `> Batch: \`${manifest.batch_slug}\` | Themes: ${manifest.total_themes} | Generated: ${manifest.generated_at}`,
    `> Overview data: \`${manifest.overview_generated_at ?? "\u2014"}\``,
    "",
    `## Per-Theme Results`,
    "",
    header,
    sep,
    ...rows,
    "",
    overlapSection,
    "",
    `## Links`,
    "",
    links,
    ""
  ].join("\n");
}
function writeFileSafe2(path, content) {
  (0, import_node_fs10.mkdirSync)((0, import_node_path9.dirname)(path), { recursive: true });
  (0, import_node_fs10.writeFileSync)(path, content);
}
async function runBatch(input, overview, mini) {
  const batchDir = (0, import_node_path9.join)(input.outRoot, "batch", input.batchSlug);
  (0, import_node_fs10.mkdirSync)(batchDir, { recursive: true });
  writeFileSafe2(
    (0, import_node_path9.join)(batchDir, "config.json"),
    JSON.stringify(input.config, null, 2)
  );
  const ideaRoot = (0, import_node_path9.join)(input.outRoot, "idea");
  const defaults = input.config.defaults ?? {};
  const runs = input.config.themes.map((entry) => {
    const resolved = resolveTheme(entry, defaults);
    const slug = generateSlug({
      theme: resolved.theme,
      override: resolved.slugOverride
    });
    const ideaDir = (0, import_node_path9.join)(ideaRoot, slug);
    return { resolved, slug, ideaDir };
  });
  const results = await Promise.all(
    runs.map(
      ({ resolved, slug, ideaDir }) => Promise.resolve(
        runOneTheme(
          {
            theme: resolved.theme,
            keywords: resolved.keywords,
            matchMode: resolved.matchMode,
            includeIndustry: resolved.includeIndustry,
            includeSegmentNames: resolved.includeSegmentNames,
            fiscalStatusAllow: resolved.fiscalStatusAllow,
            segmentStatusAllow: resolved.segmentStatusAllow,
            sectorCodes: resolved.sectorCodes,
            targetSize: resolved.targetSize,
            hitsLimit: resolved.hitsLimit,
            topN: resolved.topN,
            numericConditions: resolved.numericConditions,
            includeNull: resolved.includeNull,
            ideaDir,
            slug
          },
          overview,
          mini
        )
      )
    )
  );
  const overlaps = findOverlaps(results);
  const manifest = {
    batch_slug: input.batchSlug,
    generated_at: (/* @__PURE__ */ new Date()).toISOString(),
    overview_generated_at: overview.meta?.generated_at ?? null,
    total_themes: results.length,
    themes: results.map((r) => ({
      theme: r.theme,
      slug: r.slug,
      idea_dir: r.idea_dir,
      hits: r.counts.hits,
      shortlist: r.counts.shortlist,
      top_sector: r.top_sector ? {
        name: r.top_sector.sector_name,
        code: r.top_sector.sector_code,
        share: r.top_sector.share
      } : null
    })),
    overlaps
  };
  writeFileSafe2((0, import_node_path9.join)(batchDir, "manifest.json"), JSON.stringify(manifest, null, 2));
  writeFileSafe2((0, import_node_path9.join)(batchDir, "summary.md"), fmtBatchSummaryMd(manifest));
  return { manifest, batchDir };
}

// src/mcp/tools/research-batch.ts
var researchBatchTool = {
  name: "research_batch",
  config: {
    title: "Research Batch (multi-theme parallel)",
    description: "Run multiple tc research-idea themes in parallel from a config object. Writes per-theme idea/ dirs + cross-theme batch/<slug>/summary.md. Returns manifest with counts, top sectors, cross-theme overlaps.",
    inputSchema: {
      config: import_zod16.z.record(import_zod16.z.string(), import_zod16.z.unknown()).describe(
        "Batch config object matching BatchConfig schema: { defaults?, themes: [{theme, keywords, ...}] }"
      ),
      out: import_zod16.z.string().optional().describe("Output root directory (default 'research')"),
      batchSlug: import_zod16.z.string().optional(),
      overwrite: import_zod16.z.boolean().optional()
    }
  },
  async handler(input) {
    let config;
    try {
      config = parseBatchConfig(input.config);
    } catch (err) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              { error: `Invalid batch config: ${err.message}` },
              null,
              2
            )
          }
        ],
        isError: true
      };
    }
    const outRoot = (0, import_node_path10.resolve)(input.out ?? "research");
    const batchSlug = generateBatchSlug({
      hashSeed: JSON.stringify(config.themes.map((t) => t.theme)),
      override: input.batchSlug
    });
    const [overview, mini] = await Promise.all([
      ensureOverviewLoaded(),
      ensureMiniLoaded()
    ]);
    const { manifest } = await runBatch(
      {
        config,
        outRoot,
        batchSlug,
        overwrite: Boolean(input.overwrite)
      },
      overview,
      mini
    );
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(manifest, null, 2)
        }
      ]
    };
  }
};

// src/mcp/tools/web-search.ts
var import_zod17 = require("zod");
var webSearchTool = {
  name: "web_search",
  config: {
    title: "Web Search (Brave)",
    description: "Search the web via Brave Search API. Returns a list of URLs + snippets. Useful for finding news, company pages, industry reports. Japanese query OK. Use with `web_fetch` to retrieve article bodies for specific URLs.",
    inputSchema: {
      query: import_zod17.z.string().describe("Search query (Japanese OK), e.g. '\u30CB\u30C7\u30C3\u30AF 2025 \u6C7A\u7B97'"),
      limit: import_zod17.z.number().optional().describe("Max results (default 10, max 20)"),
      freshness: import_zod17.z.enum(["pd", "pw", "pm", "py"]).optional().describe("Filter by recency: pd=24h, pw=7d, pm=30d, py=365d"),
      country: import_zod17.z.enum(["JP", "US", "ALL"]).optional().describe("Country bias (default JP)"),
      site: import_zod17.z.string().optional().describe("Limit results to one domain, e.g. 'ir.nidec.com'"),
      exclude_sites: import_zod17.z.array(import_zod17.z.string()).optional().describe("Exclude these domains, e.g. ['pinterest.com']")
    }
  },
  async handler(input) {
    const res = await postJson(
      "/api/web-search/search",
      input
    );
    if (!res.success || !res.data) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ error: res.error ?? "Search failed" })
          }
        ],
        isError: true
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }]
    };
  }
};
var webFetchTool = {
  name: "web_fetch",
  config: {
    title: "Web Fetch (extract body)",
    description: "Fetch the body text of a URL. Tries static HTTP first, then falls back to CF Browser Rendering if extraction fails. Returns clean markdown (default) or plain text / raw HTML. Use for article content, press releases, IR pages.",
    inputSchema: {
      url: import_zod17.z.string().describe("Full URL to fetch (http/https only)"),
      format: import_zod17.z.enum(["text", "markdown", "html"]).optional().describe("Output format (default 'markdown')"),
      max_length: import_zod17.z.number().optional().describe("Max content length (default 20000, max 50000)"),
      include_links: import_zod17.z.boolean().optional().describe("Include [text](url) markdown links (default false)"),
      force_browser: import_zod17.z.boolean().optional().describe(
        "Skip static fetch and use CF Browser Rendering directly (default false)"
      )
    }
  },
  async handler(input) {
    const res = await postJson(
      "/api/web-search/fetch",
      input
    );
    if (!res.success || !res.data) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ error: res.error ?? "Fetch failed" })
          }
        ],
        isError: true
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }]
    };
  }
};
var webRenderTool = {
  name: "web_render",
  config: {
    title: "Web Render (CF Browser Rendering)",
    description: "Explicitly fetch a URL via CF Browser Rendering, bypassing static fetch. Use when `web_fetch` returned empty/short content (SPA, JS-heavy sites). Slower (~3-5s) but works for sites that need JavaScript execution.",
    inputSchema: {
      url: import_zod17.z.string().describe("Full URL to render"),
      format: import_zod17.z.enum(["text", "markdown", "html"]).optional(),
      max_length: import_zod17.z.number().optional(),
      include_links: import_zod17.z.boolean().optional()
    }
  },
  async handler(input) {
    const res = await postJson(
      "/api/web-search/render",
      input
    );
    if (!res.success || !res.data) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ error: res.error ?? "Render failed" })
          }
        ],
        isError: true
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(res.data, null, 2) }]
    };
  }
};

// src/mcp/tools/save-report.ts
var import_zod18 = require("zod");
var API_PATH_CREATE = "/api/report/create";
function getWebBase() {
  const apiBase = getApiBase();
  if (apiBase.includes("api.ticker-code.com")) return "https://ticker-code.com";
  return apiBase.replace(/^https?:\/\/api\./, "https://");
}
async function postReport(payload) {
  const url = `${getApiBase()}${API_PATH_CREATE}`;
  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders()
      },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    throw new Error(`Network error calling ${url}: ${err.message}`);
  }
  if (res.status === 401) {
    throw new Error(
      "\u8A8D\u8A3C\u30A8\u30E9\u30FC (401): TICKERCODE_API_KEY \u304C\u672A\u8A2D\u5B9A\u307E\u305F\u306F\u7121\u52B9\u3067\u3059\u3002"
    );
  }
  if (res.status === 403) {
    const text = await res.text().catch(() => "");
    let detail = "";
    try {
      const json2 = JSON.parse(text);
      const code = json2?.error?.code ?? json2?.code ?? "";
      if (code === "LOCKED" || text.includes("LOCKED")) {
        detail = "\u30A2\u30AB\u30A6\u30F3\u30C8\u304C\u30ED\u30C3\u30AF\u3055\u308C\u3066\u3044\u307E\u3059 (403 LOCKED)\u3002\u30B5\u30DD\u30FC\u30C8\u306B\u304A\u554F\u3044\u5408\u308F\u305B\u304F\u3060\u3055\u3044\u3002";
      } else if (code === "FORBIDDEN_PRIVATE_PLAN" || text.includes("FORBIDDEN_PRIVATE_PLAN")) {
        detail = "\u3053\u306E\u30D7\u30E9\u30F3\u3067\u306F private \u30EC\u30DD\u30FC\u30C8\u306F\u4F5C\u6210\u3067\u304D\u307E\u305B\u3093 (403 FORBIDDEN_PRIVATE_PLAN)\u3002is_public=true \u306B\u3059\u308B\u304B\u4E0A\u4F4D\u30D7\u30E9\u30F3\u306B\u30A2\u30C3\u30D7\u30B0\u30EC\u30FC\u30C9\u3057\u3066\u304F\u3060\u3055\u3044\u3002";
      } else {
        detail = `\u30A2\u30AF\u30BB\u30B9\u62D2\u5426 (403): ${text.slice(0, 200)}`;
      }
    } catch {
      detail = `\u30A2\u30AF\u30BB\u30B9\u62D2\u5426 (403): ${text.slice(0, 200)}`;
    }
    throw new Error(detail);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status} ${res.statusText} \u2014 ${API_PATH_CREATE}
${text.slice(0, 500)}`);
  }
  const json = await res.json();
  if (!json.success) {
    throw new Error("\u30EC\u30DD\u30FC\u30C8\u4FDD\u5B58\u306B\u5931\u6557\u3057\u307E\u3057\u305F (success=false)");
  }
  return json.data;
}
var saveReportTool = {
  name: "save_report",
  config: {
    title: "Save Report",
    description: "\u5206\u6790\u7D50\u679C\u3092 web \u306E report \u3068\u3057\u3066\u4FDD\u5B58\u3059\u308B\u3002\u30E6\u30FC\u30B6\u30FC\u304C\u660E\u793A\u7684\u306B\u300C\u30EC\u30DD\u30FC\u30C8\u306B\u3057\u3066\u300D\u300C\u4FDD\u5B58\u3057\u3066\u300D\u3068\u4F9D\u983C\u3057\u305F\u6642\u306E\u307F\u4F7F\u7528\u3002\u52DD\u624B\u306B\u547C\u3070\u306A\u3044\u3002\u4FDD\u5B58\u5F8C\u306F id, url, slug \u3092\u8FD4\u3059\u3002",
    inputSchema: {
      title: import_zod18.z.string().max(120).describe("\u30EC\u30DD\u30FC\u30C8\u306E\u30BF\u30A4\u30C8\u30EB\uFF0860 \u6587\u5B57\u4EE5\u5185\u63A8\u5968\uFF09"),
      body_markdown: import_zod18.z.string().describe("\u30EC\u30DD\u30FC\u30C8\u672C\u6587\uFF08\u4F1A\u8A71\u3067\u751F\u6210\u3057\u305F\u5206\u6790 markdown\uFF09"),
      one_liner: import_zod18.z.string().max(120).optional().describe("1\u884C\u30B5\u30DE\u30EA\uFF0880 \u6587\u5B57\u4EE5\u5185\u63A8\u5968\uFF09"),
      summary: import_zod18.z.string().optional().describe("\u77ED\u3044\u6BB5\u843D\u30B5\u30DE\u30EA"),
      stock_code: import_zod18.z.string().optional().describe("\u4E3B\u8981\u9298\u67C4\u30B3\u30FC\u30C9\uFF081 \u9298\u67C4\u306E\u5834\u5408\uFF09"),
      stock_codes: import_zod18.z.array(import_zod18.z.string()).optional().describe("\u8907\u6570\u9298\u67C4\u30B3\u30FC\u30C9\u306E\u30EA\u30B9\u30C8"),
      tags: import_zod18.z.array(import_zod18.z.string()).optional().describe("\u30BF\u30B0\u30EA\u30B9\u30C8"),
      is_public: import_zod18.z.boolean().optional().describe("true = \u516C\u958B\u3002\u30C7\u30D5\u30A9\u30EB\u30C8 false\uFF08private\uFF09\u3002\u30E6\u30FC\u30B6\u30FC\u304C\u660E\u793A\u7684\u306B\u516C\u958B\u3092\u5E0C\u671B\u3057\u305F\u6642\u306E\u307F true \u306B\u3059\u308B")
    }
  },
  async handler({
    title,
    body_markdown,
    one_liner,
    summary,
    stock_code,
    stock_codes,
    tags,
    is_public
  }) {
    const payload = {
      source: "agent_cli",
      title,
      body_markdown,
      is_public: is_public ?? false
    };
    if (one_liner) payload.one_liner = one_liner;
    if (summary) payload.summary = summary;
    if (stock_code) payload.stock_code = stock_code;
    if (stock_codes?.length) payload.stock_codes = stock_codes;
    if (tags?.length) payload.tags = tags;
    try {
      const { id, slug } = await postReport(payload);
      const url = `${getWebBase()}/report/${slug}`;
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ id, slug, url }, null, 2)
          }
        ]
      };
    } catch (err) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ error: err.message })
          }
        ],
        isError: true
      };
    }
  }
};

// src/mcp/tools/issues-list.ts
var import_zod19 = require("zod");
var description = "\u30A4\u30B7\u30E5\u30FC\u4E00\u89A7\u3092\u53D6\u5F97\u3059\u308B\u3002mine=true \u3067\u81EA\u5206\u306E\u30A4\u30B7\u30E5\u30FC\u306E\u307F\u3002status \u3067 open/closed \u7D5E\u308A\u8FBC\u307F\u53EF\u3002";
var inputSchema = {
  type: "object",
  properties: {
    mine: {
      type: "boolean",
      description: "true \u306E\u6642\u3001\u81EA\u5206\u306E\u30A4\u30B7\u30E5\u30FC\u306E\u307F\u8FD4\u3059"
    },
    status: {
      type: "string",
      enum: ["open", "closed"],
      description: "\u30B9\u30C6\u30FC\u30BF\u30B9\u3067\u7D5E\u308A\u8FBC\u307F"
    },
    source: {
      type: "string",
      description: "\u30BD\u30FC\u30B9\u8B58\u5225\u5B50\u3067\u7D5E\u308A\u8FBC\u307F"
    },
    updated_since: {
      type: "number",
      description: "Unix seconds \u4EE5\u964D\u306B\u66F4\u65B0\u3055\u308C\u305F\u30A4\u30B7\u30E5\u30FC\u306E\u307F\u8FD4\u3059"
    }
  },
  additionalProperties: false
};
var issuesListTool = {
  name: "tc_issues_list",
  description,
  inputSchema,
  config: {
    title: "List TickerCode Issues",
    description,
    inputSchema: {
      mine: import_zod19.z.boolean().optional().describe("true \u306E\u6642\u3001\u81EA\u5206\u306E\u30A4\u30B7\u30E5\u30FC\u306E\u307F\u8FD4\u3059"),
      status: import_zod19.z.enum(["open", "closed"]).optional().describe("\u30B9\u30C6\u30FC\u30BF\u30B9\u3067\u7D5E\u308A\u8FBC\u307F"),
      source: import_zod19.z.string().optional().describe("\u30BD\u30FC\u30B9\u8B58\u5225\u5B50\u3067\u7D5E\u308A\u8FBC\u307F"),
      updated_since: import_zod19.z.number().optional().describe("Unix seconds \u4EE5\u964D\u306B\u66F4\u65B0\u3055\u308C\u305F\u30A4\u30B7\u30E5\u30FC\u306E\u307F\u8FD4\u3059")
    }
  },
  async handler(input) {
    const body = {};
    if (input.mine !== void 0) body.mine = input.mine;
    if (input.status !== void 0) body.status = input.status;
    if (input.source !== void 0) body.source = input.source;
    if (input.updated_since !== void 0) body.updated_since = input.updated_since;
    const url = `${getApiBase()}/issues/list`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(body)
      });
      const json = await res.json();
      return {
        content: [{ type: "text", text: JSON.stringify(json.data?.items ?? [], null, 2) }]
      };
    } catch (err) {
      return {
        content: [{ type: "text", text: JSON.stringify({ error: err.message }) }],
        isError: true
      };
    }
  }
};

// src/mcp/tools/issues-create.ts
var import_zod20 = require("zod");

// src/lib/issues-client.ts
function formatTcId(n3) {
  return `TC-${n3}`;
}
function parseTcId(s) {
  const match = /^TC-(\d+)$/.exec(s);
  if (!match) return null;
  const n3 = Number.parseInt(match[1], 10);
  return Number.isNaN(n3) ? null : n3;
}
async function post(path, body) {
  const url = `${getApiBase()}${path}`;
  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders()
      },
      body: JSON.stringify(body)
    });
  } catch (err) {
    throw new Error(`Network error calling ${url}: ${err.message}`);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status} ${res.statusText} \u2014 ${path}
${text.slice(0, 500)}`);
  }
  return await res.json();
}
async function listIssues(opts) {
  const body = {};
  if (opts.mine !== void 0) body.mine = opts.mine;
  if (opts.status !== void 0) body.status = opts.status;
  if (opts.source !== void 0) body.source = opts.source;
  if (opts.updatedSince !== void 0) body.updated_since = opts.updatedSince;
  const res = await post("/issues/list", body);
  return res.data?.items ?? [];
}
async function getIssue(id) {
  const res = await post(
    "/issues/get",
    { id }
  );
  return res.data;
}
async function createIssue(opts) {
  const body = { title: opts.title };
  if (opts.source !== void 0) body.source = opts.source;
  if (opts.body !== void 0) body.body = opts.body;
  if (opts.priority !== void 0) body.priority = opts.priority;
  if (opts.labels !== void 0) body.labels = opts.labels;
  if (opts.actorId !== void 0) body.actor_id = opts.actorId;
  const res = await post("/issues/create", body);
  return formatTcId(res.data.id);
}
async function postMessage(issueId, body, meta) {
  const payload = { issue_id: issueId, body };
  if (meta !== void 0) payload.meta = meta;
  const res = await post("/issues/post-message", payload);
  return res.data.id;
}
async function resolveIssue(id) {
  await post("/issues/resolve", { id });
}

// src/mcp/tools/issues-create.ts
var description2 = "\u65B0\u3057\u3044\u30A4\u30B7\u30E5\u30FC\u3092\u4F5C\u6210\u3059\u308B\u3002title \u306F\u5FC5\u9808\u3002source / body / priority / labels / actor_id \u306F\u30AA\u30D7\u30B7\u30E7\u30F3\u3002\u4F5C\u6210\u5F8C TC-N \u5F62\u5F0F\u306E ID \u3092\u8FD4\u3059\u3002";
var inputSchema2 = {
  type: "object",
  required: ["title"],
  properties: {
    title: {
      type: "string",
      description: "\u30A4\u30B7\u30E5\u30FC\u306E\u30BF\u30A4\u30C8\u30EB\uFF08\u5FC5\u9808\uFF09"
    },
    body: {
      type: "string",
      description: "\u30A4\u30B7\u30E5\u30FC\u306E\u672C\u6587"
    },
    source: {
      type: "string",
      description: "\u30BD\u30FC\u30B9\u8B58\u5225\u5B50 (\u4F8B: agent_cli)"
    },
    priority: {
      type: "string",
      enum: ["low", "medium", "high", "critical"],
      description: "\u512A\u5148\u5EA6"
    },
    labels: {
      type: "array",
      items: { type: "string" },
      description: "\u30E9\u30D9\u30EB\u306E\u30EA\u30B9\u30C8"
    },
    actor_id: {
      type: "string",
      description: "\u4F5C\u6210\u8005\u306E Actor ID"
    }
  },
  additionalProperties: false
};
var issuesCreateTool = {
  name: "tc_issues_create",
  description: description2,
  inputSchema: inputSchema2,
  config: {
    title: "Create TickerCode Issue",
    description: description2,
    inputSchema: {
      title: import_zod20.z.string().describe("\u30A4\u30B7\u30E5\u30FC\u306E\u30BF\u30A4\u30C8\u30EB\uFF08\u5FC5\u9808\uFF09"),
      body: import_zod20.z.string().optional().describe("\u30A4\u30B7\u30E5\u30FC\u306E\u672C\u6587"),
      source: import_zod20.z.string().optional().describe("\u30BD\u30FC\u30B9\u8B58\u5225\u5B50 (\u4F8B: agent_cli)"),
      priority: import_zod20.z.enum(["low", "medium", "high", "critical"]).optional().describe("\u512A\u5148\u5EA6"),
      labels: import_zod20.z.array(import_zod20.z.string()).optional().describe("\u30E9\u30D9\u30EB\u306E\u30EA\u30B9\u30C8"),
      actor_id: import_zod20.z.string().optional().describe("\u4F5C\u6210\u8005\u306E Actor ID")
    }
  },
  async handler(input) {
    const payload = { title: input.title };
    if (input.body !== void 0) payload.body = input.body;
    if (input.source !== void 0) payload.source = input.source;
    if (input.priority !== void 0) payload.priority = input.priority;
    if (input.labels !== void 0) payload.labels = input.labels;
    if (input.actor_id !== void 0) payload.actor_id = input.actor_id;
    const url = `${getApiBase()}/issues/create`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      const tcId = formatTcId(json.data.id);
      return {
        content: [{ type: "text", text: JSON.stringify({ id: tcId }, null, 2) }]
      };
    } catch (err) {
      return {
        content: [{ type: "text", text: JSON.stringify({ error: err.message }) }],
        isError: true
      };
    }
  }
};

// src/mcp/tools/issues-get.ts
var import_zod21 = require("zod");
var description3 = "TC-N \u5F62\u5F0F\u306E ID \u3067\u30A4\u30B7\u30E5\u30FC\u306E\u8A73\u7D30\u3068\u30E1\u30C3\u30BB\u30FC\u30B8\u30B9\u30EC\u30C3\u30C9\u3092\u53D6\u5F97\u3059\u308B\u3002";
var inputSchema3 = {
  type: "object",
  required: ["id"],
  properties: {
    id: {
      type: "number",
      description: "\u30A4\u30B7\u30E5\u30FC\u306E\u6570\u5024 ID\uFF08TC-N \u306E N \u90E8\u5206\uFF09"
    }
  },
  additionalProperties: false
};
var issuesGetTool = {
  name: "tc_issues_get",
  description: description3,
  inputSchema: inputSchema3,
  config: {
    title: "Get TickerCode Issue",
    description: description3,
    inputSchema: {
      id: import_zod21.z.number().describe("\u30A4\u30B7\u30E5\u30FC\u306E\u6570\u5024 ID\uFF08TC-N \u306E N \u90E8\u5206\uFF09")
    }
  },
  async handler(input) {
    const url = `${getApiBase()}/issues/get`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ id: input.id })
      });
      const json = await res.json();
      return {
        content: [{ type: "text", text: JSON.stringify(json.data, null, 2) }]
      };
    } catch (err) {
      return {
        content: [{ type: "text", text: JSON.stringify({ error: err.message }) }],
        isError: true
      };
    }
  }
};

// src/mcp/tools/issues-post-message.ts
var import_zod22 = require("zod");
var description4 = "\u30A4\u30B7\u30E5\u30FC\u306B\u30E1\u30C3\u30BB\u30FC\u30B8\uFF08\u30B3\u30E1\u30F3\u30C8\uFF09\u3092\u6295\u7A3F\u3059\u308B\u3002issue_id \u3068 body \u306F\u5FC5\u9808\u3002meta \u306F\u30AA\u30D7\u30B7\u30E7\u30F3\u306E\u30E1\u30BF\u30C7\u30FC\u30BF\u3002";
var inputSchema4 = {
  type: "object",
  required: ["issue_id", "body"],
  properties: {
    issue_id: {
      type: "number",
      description: "\u30A4\u30B7\u30E5\u30FC\u306E\u6570\u5024 ID"
    },
    body: {
      type: "string",
      description: "\u30E1\u30C3\u30BB\u30FC\u30B8\u672C\u6587"
    },
    meta: {
      type: "object",
      description: "\u30AA\u30D7\u30B7\u30E7\u30F3\u306E\u30E1\u30BF\u30C7\u30FC\u30BF",
      additionalProperties: true
    }
  },
  additionalProperties: false
};
var issuesPostMessageTool = {
  name: "tc_issues_post_message",
  description: description4,
  inputSchema: inputSchema4,
  config: {
    title: "Post TickerCode Issue Message",
    description: description4,
    inputSchema: {
      issue_id: import_zod22.z.number().describe("\u30A4\u30B7\u30E5\u30FC\u306E\u6570\u5024 ID"),
      body: import_zod22.z.string().describe("\u30E1\u30C3\u30BB\u30FC\u30B8\u672C\u6587"),
      meta: import_zod22.z.record(import_zod22.z.string(), import_zod22.z.unknown()).optional().describe("\u30AA\u30D7\u30B7\u30E7\u30F3\u306E\u30E1\u30BF\u30C7\u30FC\u30BF")
    }
  },
  async handler(input) {
    const payload = { issue_id: input.issue_id, body: input.body };
    if (input.meta !== void 0) payload.meta = input.meta;
    const url = `${getApiBase()}/issues/post-message`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      return {
        content: [{ type: "text", text: JSON.stringify({ message_id: json.data.id }, null, 2) }]
      };
    } catch (err) {
      return {
        content: [{ type: "text", text: JSON.stringify({ error: err.message }) }],
        isError: true
      };
    }
  }
};

// src/mcp/tools/issues-update.ts
var import_zod23 = require("zod");
var description5 = "\u30A4\u30B7\u30E5\u30FC\u306E\u30D5\u30A3\u30FC\u30EB\u30C9\u3092\u66F4\u65B0\u3059\u308B\u3002id \u306F\u5FC5\u9808\u3002title / status / priority / labels \u3092\u30D1\u30C3\u30C1\u3067\u5909\u66F4\u3067\u304D\u308B\u3002";
var inputSchema5 = {
  type: "object",
  required: ["id"],
  properties: {
    id: {
      type: "number",
      description: "\u30A4\u30B7\u30E5\u30FC\u306E\u6570\u5024 ID"
    },
    title: {
      type: "string",
      description: "\u65B0\u3057\u3044\u30BF\u30A4\u30C8\u30EB"
    },
    status: {
      type: "string",
      enum: ["open", "closed"],
      description: "\u65B0\u3057\u3044\u30B9\u30C6\u30FC\u30BF\u30B9"
    },
    priority: {
      type: "string",
      enum: ["low", "medium", "high", "critical"],
      description: "\u65B0\u3057\u3044\u512A\u5148\u5EA6"
    },
    labels: {
      type: "array",
      items: { type: "string" },
      description: "\u65B0\u3057\u3044\u30E9\u30D9\u30EB\u30EA\u30B9\u30C8\uFF08\u4E0A\u66F8\u304D\uFF09"
    }
  },
  additionalProperties: false
};
var issuesUpdateTool = {
  name: "tc_issues_update",
  description: description5,
  inputSchema: inputSchema5,
  config: {
    title: "Update TickerCode Issue",
    description: description5,
    inputSchema: {
      id: import_zod23.z.number().describe("\u30A4\u30B7\u30E5\u30FC\u306E\u6570\u5024 ID"),
      title: import_zod23.z.string().optional().describe("\u65B0\u3057\u3044\u30BF\u30A4\u30C8\u30EB"),
      status: import_zod23.z.enum(["open", "closed"]).optional().describe("\u65B0\u3057\u3044\u30B9\u30C6\u30FC\u30BF\u30B9"),
      priority: import_zod23.z.enum(["low", "medium", "high", "critical"]).optional().describe("\u65B0\u3057\u3044\u512A\u5148\u5EA6"),
      labels: import_zod23.z.array(import_zod23.z.string()).optional().describe("\u65B0\u3057\u3044\u30E9\u30D9\u30EB\u30EA\u30B9\u30C8\uFF08\u4E0A\u66F8\u304D\uFF09")
    }
  },
  async handler(input) {
    const { id, ...patch } = input;
    const url = `${getApiBase()}/issues/update`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ id, ...patch })
      });
      const json = await res.json();
      return {
        content: [{ type: "text", text: JSON.stringify({ success: json.success }, null, 2) }]
      };
    } catch (err) {
      return {
        content: [{ type: "text", text: JSON.stringify({ error: err.message }) }],
        isError: true
      };
    }
  }
};

// src/mcp/tools/issues-resolve.ts
var import_zod24 = require("zod");
var description6 = "\u30A4\u30B7\u30E5\u30FC\u3092\u30AF\u30ED\u30FC\u30BA\uFF08resolved\uFF09\u306B\u3059\u308B\u3002id \u3092\u6307\u5B9A\u3059\u308B\u3060\u3051\u3067\u5B8C\u4E86\u3002";
var inputSchema6 = {
  type: "object",
  required: ["id"],
  properties: {
    id: {
      type: "number",
      description: "\u30A4\u30B7\u30E5\u30FC\u306E\u6570\u5024 ID"
    }
  },
  additionalProperties: false
};
var issuesResolveTool = {
  name: "tc_issues_resolve",
  description: description6,
  inputSchema: inputSchema6,
  config: {
    title: "Resolve TickerCode Issue",
    description: description6,
    inputSchema: {
      id: import_zod24.z.number().describe("\u30A4\u30B7\u30E5\u30FC\u306E\u6570\u5024 ID")
    }
  },
  async handler(input) {
    const url = `${getApiBase()}/issues/resolve`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ id: input.id })
      });
      const json = await res.json();
      return {
        content: [{ type: "text", text: JSON.stringify({ success: json.success }, null, 2) }]
      };
    } catch (err) {
      return {
        content: [{ type: "text", text: JSON.stringify({ error: err.message }) }],
        isError: true
      };
    }
  }
};

// src/mcp/tools/index.ts
var tools = [
  getStockTool,
  normalizeCodeTool,
  fetchStockTool,
  memoryPathTool,
  memoryListTool,
  getFinancialSummaryTool,
  getFinancialTrendTool,
  findPeersTool,
  projectPLTool,
  calculateMoatTool,
  screenTool,
  rankTool,
  overviewSyncTool,
  overviewStatusTool,
  overviewSearchTool,
  researchIdeaTool,
  researchBatchTool,
  webSearchTool,
  webFetchTool,
  webRenderTool,
  saveReportTool,
  issuesListTool,
  issuesCreateTool,
  issuesGetTool,
  issuesPostMessageTool,
  issuesUpdateTool,
  issuesResolveTool
];

// src/mcp/server.ts
var SERVER_NAME = "tickercode";
var SERVER_VERSION = "0.0.1";
async function startMcpServer() {
  const server = new import_mcp.McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION
  });
  for (const tool of tools) {
    server.registerTool(tool.name, tool.config, tool.handler);
  }
  const transport = new import_stdio.StdioServerTransport();
  await server.connect(transport);
}

// src/commands/mcp.ts
var mcpCommand = (0, import_citty3.defineCommand)({
  meta: {
    name: "mcp",
    description: "Run the tickercode MCP server over stdio (for Claude Code / Desktop / Cursor)"
  },
  async run() {
    await startMcpServer();
  }
});

// src/commands/memory.ts
var import_citty4 = require("citty");
var import_picocolors2 = __toESM(require("picocolors"), 1);
var ENDPOINT_KEYS3 = Object.keys(ENDPOINTS);
var fetchCmd = (0, import_citty4.defineCommand)({
  meta: { name: "fetch", description: "Download endpoints for one or more codes into ~/.tickercode/memory" },
  args: {
    codes: { type: "positional", description: "Ticker codes (space separated)", required: true },
    only: { type: "string", description: `Comma-separated endpoints (${ENDPOINT_KEYS3.join(",")})` },
    force: { type: "boolean", description: "Ignore TTL and re-fetch" }
  },
  async run({ args, rawArgs }) {
    const codes = (rawArgs ?? []).filter((a) => /^\d{4,5}$/.test(a));
    if (codes.length === 0) codes.push(String(args.codes));
    const endpoints = args.only ? String(args.only).split(",").map((s) => s.trim()) : void 0;
    for (const code of codes) {
      const result = await fetchStock(code, { endpoints, force: Boolean(args.force) });
      const ok = result.fetched.length;
      const sk = result.skipped.length;
      const err = result.failed.length;
      process.stdout.write(
        `${import_picocolors2.default.cyan(result.display_code)}  ${import_picocolors2.default.green(`\u2713 ${ok} fetched`)}  ${import_picocolors2.default.gray(`\u21B7 ${sk} skipped`)}  ${err ? import_picocolors2.default.red(`\u2717 ${err} failed`) : ""}
`
      );
      if (err > 0) {
        for (const f of result.failed) {
          process.stdout.write(`    ${import_picocolors2.default.red("!")} ${f.endpoint}: ${f.error}
`);
        }
      }
      process.stdout.write(`    ${import_picocolors2.default.dim(result.dir)}
`);
    }
  }
});
var listCmd = (0, import_citty4.defineCommand)({
  meta: { name: "list", description: "List cached codes" },
  async run() {
    const codes = listCodes();
    if (codes.length === 0) {
      process.stdout.write(import_picocolors2.default.gray("(no codes cached \u2014 run `tc memory fetch <code>`)\n"));
      return;
    }
    for (const c of codes) {
      const meta = showMeta(c);
      const name = meta?.name ?? "";
      const eps = Object.keys(meta?.endpoints ?? {}).join(",");
      process.stdout.write(`${import_picocolors2.default.cyan(c)}  ${name}  ${import_picocolors2.default.dim(eps)}
`);
    }
  }
});
var statsCmd = (0, import_citty4.defineCommand)({
  meta: { name: "stats", description: "Show memory footprint" },
  async run() {
    const s = memoryStats();
    process.stdout.write(JSON.stringify(s, null, 2) + "\n");
  }
});
var catCmd = (0, import_citty4.defineCommand)({
  meta: { name: "cat", description: "Print endpoint JSON file to stdout" },
  args: {
    code: { type: "positional", required: true },
    endpoint: { type: "positional", required: true, description: `One of: ${ENDPOINT_KEYS3.join(",")}` }
  },
  async run({ args }) {
    const text = readEndpointFile(String(args.code), String(args.endpoint));
    if (!text) {
      process.stderr.write(import_picocolors2.default.red(`Not cached. Run: tc memory fetch ${args.code} --only ${args.endpoint}
`));
      process.exit(1);
    }
    process.stdout.write(text + "\n");
  }
});
var whereCmd = (0, import_citty4.defineCommand)({
  meta: { name: "where", description: "Print absolute path of cached file or directory" },
  args: {
    code: { type: "positional", required: true, description: "Ticker code or 'mini'" },
    endpoint: { type: "positional", required: false, description: "Endpoint name (omit for directory)" }
  },
  async run({ args }) {
    const path = resolvePath(
      String(args.code),
      args.endpoint ? String(args.endpoint) : void 0
    );
    process.stdout.write(path + "\n");
  }
});
var showCmd = (0, import_citty4.defineCommand)({
  meta: { name: "show", description: "Show .meta.json for a code" },
  args: { code: { type: "positional", required: true } },
  async run({ args }) {
    const meta = showMeta(String(args.code));
    if (!meta) {
      process.stderr.write(import_picocolors2.default.red(`Not cached: ${args.code}
`));
      process.exit(1);
    }
    process.stdout.write(JSON.stringify(meta, null, 2) + "\n");
  }
});
var cleanCmd = (0, import_citty4.defineCommand)({
  meta: { name: "clean", description: "Remove cached data for a code" },
  args: { code: { type: "positional", required: true } },
  async run({ args }) {
    cleanCode(String(args.code));
    process.stdout.write(import_picocolors2.default.green(`Removed: ${args.code}
`));
  }
});
var syncMiniCmd = (0, import_citty4.defineCommand)({
  meta: {
    name: "sync-mini",
    description: "Download mini.json (3750 stocks summary) from R2 CDN"
  },
  args: {
    force: { type: "boolean", description: "Ignore TTL and re-fetch" }
  },
  async run({ args }) {
    const meta = await syncMini(Boolean(args.force));
    process.stdout.write(
      `${import_picocolors2.default.green("\u2713")} mini.json  ${import_picocolors2.default.cyan(String(meta.items_count))} items, ${import_picocolors2.default.cyan(String(meta.tags_count))} tags, ${import_picocolors2.default.dim(`${(meta.bytes / 1024 / 1024).toFixed(2)} MB`)}
`
    );
  }
});
var miniStatusCmd = (0, import_citty4.defineCommand)({
  meta: { name: "mini-status", description: "Show mini.json cache status" },
  async run() {
    const meta = readMiniMeta();
    if (!meta) {
      process.stdout.write(import_picocolors2.default.gray("(mini.json not cached \u2014 run `tc memory sync-mini`)\n"));
      return;
    }
    process.stdout.write(JSON.stringify(meta, null, 2) + "\n");
  }
});
var memoryCommand = (0, import_citty4.defineCommand)({
  meta: {
    name: "memory",
    description: "Manage local cache of stock data (~/.tickercode/memory/)"
  },
  subCommands: {
    fetch: fetchCmd,
    list: listCmd,
    stats: statsCmd,
    cat: catCmd,
    where: whereCmd,
    show: showCmd,
    clean: cleanCmd,
    "sync-mini": syncMiniCmd,
    "mini-status": miniStatusCmd
  }
});

// src/commands/screen.ts
var import_citty5 = require("citty");
var import_picocolors3 = __toESM(require("picocolors"), 1);
var DEFAULT_COLUMNS = [
  "display_code",
  "company_name",
  "sector33_code",
  "market_capitalization",
  "i_forward_per",
  "i_pbr",
  "i_forward_roe",
  "yoy3y_sales"
];
function parseNum(v) {
  if (v === void 0 || v === null || v === "") return void 0;
  const n3 = Number.parseFloat(String(v));
  return Number.isFinite(n3) ? n3 : void 0;
}
var screenCommand = (0, import_citty5.defineCommand)({
  meta: {
    name: "screen",
    description: "Filter the full stock universe (mini.json) by multiple criteria. All flags are AND-combined."
  },
  args: {
    sector: { type: "string", description: "sector33_code (e.g. 5250)" },
    "market-code": { type: "string", description: "market_code (e.g. 0111 Prime)" },
    "per-lt": { type: "string", description: "forward PER <" },
    "per-gt": { type: "string", description: "forward PER >" },
    "trailing-per-lt": { type: "string", description: "trailing PER <" },
    "trailing-per-gt": { type: "string", description: "trailing PER >" },
    "pbr-lt": { type: "string", description: "PBR <" },
    "pbr-gt": { type: "string", description: "PBR >" },
    "psr-lt": { type: "string", description: "forward PSR <" },
    "psr-gt": { type: "string", description: "forward PSR >" },
    "roe-gt": { type: "string", description: "forward ROE % >" },
    "roe-lt": { type: "string", description: "forward ROE % <" },
    "roa-gt": { type: "string", description: "forward ROA % >" },
    "roic-gt": { type: "string", description: "ROIC % >" },
    "growth3y-gt": { type: "string", description: "3y sales CAGR % >" },
    "op-growth3y-gt": {
      type: "string",
      description: "3y operating profit CAGR % >"
    },
    "mcap-gt": { type: "string", description: "market cap (yen) >" },
    "mcap-lt": { type: "string", description: "market cap (yen) <" },
    "dy-gt": { type: "string", description: "forward dividend yield % >" },
    "dy-lt": { type: "string", description: "forward dividend yield % <" },
    metric: {
      type: "string",
      description: "Custom field name for --gt / --lt"
    },
    gt: { type: "string", description: "Used with --metric: field > value" },
    lt: { type: "string", description: "Used with --metric: field < value" },
    "include-null": {
      type: "boolean",
      description: "Include rows where numeric field is null (default: exclude)"
    },
    sort: { type: "string", description: "Sort by field name" },
    asc: { type: "boolean", description: "Sort ascending (default: desc)" },
    limit: {
      type: "string",
      description: "Max rows to output (default: no limit)"
    },
    offset: { type: "string", description: "Skip first N rows" },
    columns: {
      type: "string",
      description: "Comma-separated column names (pretty / md only)"
    },
    format: {
      type: "string",
      description: "Output format: pretty | json | md",
      default: "pretty",
      alias: "f"
    }
  },
  async run({ args }) {
    const mini = await ensureMiniLoaded();
    const numericFlags = {
      "per-lt": parseNum(args["per-lt"]),
      "per-gt": parseNum(args["per-gt"]),
      "trailing-per-lt": parseNum(args["trailing-per-lt"]),
      "trailing-per-gt": parseNum(args["trailing-per-gt"]),
      "pbr-lt": parseNum(args["pbr-lt"]),
      "pbr-gt": parseNum(args["pbr-gt"]),
      "psr-lt": parseNum(args["psr-lt"]),
      "psr-gt": parseNum(args["psr-gt"]),
      "roe-gt": parseNum(args["roe-gt"]),
      "roe-lt": parseNum(args["roe-lt"]),
      "roa-gt": parseNum(args["roa-gt"]),
      "roic-gt": parseNum(args["roic-gt"]),
      "growth3y-gt": parseNum(args["growth3y-gt"]),
      "op-growth3y-gt": parseNum(args["op-growth3y-gt"]),
      "mcap-gt": parseNum(args["mcap-gt"]),
      "mcap-lt": parseNum(args["mcap-lt"]),
      "dy-gt": parseNum(args["dy-gt"]),
      "dy-lt": parseNum(args["dy-lt"])
    };
    const customMetric = args.metric ? {
      field: String(args.metric),
      gt: parseNum(args.gt),
      lt: parseNum(args.lt)
    } : void 0;
    const exact = [];
    if (args.sector) {
      exact.push({ field: "sector33_code", value: String(args.sector) });
    }
    if (args["market-code"]) {
      exact.push({ field: "market_code", value: String(args["market-code"]) });
    }
    const numeric = buildNumericConditions(numericFlags, customMetric);
    const sort = args.sort ? { field: String(args.sort), order: args.asc ? "asc" : "desc" } : void 0;
    const result = screen(mini.items, {
      exact,
      numeric,
      sort,
      limit: parseNum(args.limit),
      offset: parseNum(args.offset),
      includeNull: Boolean(args["include-null"])
    });
    const format = String(args.format);
    const columns = args.columns ? String(args.columns).split(",").map((s) => s.trim()).filter(Boolean) : defaultColumns(sort);
    if (result.length === 0 && format === "pretty") {
      process.stdout.write(import_picocolors3.default.yellow("No matches.\n"));
      return;
    }
    formatOutput(result, {
      kind: "stock-list",
      format,
      columns,
      title: "tc screen"
    });
  }
});
function defaultColumns(sort) {
  if (sort && !DEFAULT_COLUMNS.includes(sort.field)) {
    return [...DEFAULT_COLUMNS, sort.field];
  }
  return DEFAULT_COLUMNS;
}

// src/commands/rank.ts
var import_citty6 = require("citty");
var import_picocolors4 = __toESM(require("picocolors"), 1);
function parseNum2(v) {
  if (v === void 0 || v === null || v === "") return void 0;
  const n3 = Number.parseFloat(String(v));
  return Number.isFinite(n3) ? n3 : void 0;
}
function dedupe(arr) {
  return Array.from(new Set(arr));
}
var rankCommand = (0, import_citty6.defineCommand)({
  meta: {
    name: "rank",
    description: "Rank stocks by a metric (top-N). Uses mini.json. By default descending; use --asc for ascending."
  },
  args: {
    by: {
      type: "string",
      description: "Metric field to rank by (e.g. i_forward_per, yoy3y_sales)",
      required: true
    },
    sector: { type: "string", description: "sector33_code filter" },
    "market-code": { type: "string", description: "market_code filter" },
    limit: {
      type: "string",
      description: "Top N rows (default: 10)",
      default: "10"
    },
    asc: {
      type: "boolean",
      description: "Ascending order (default: descending)"
    },
    "include-null": {
      type: "boolean",
      description: "Include null values (default: exclude)"
    },
    columns: {
      type: "string",
      description: "Comma-separated column names (pretty / md only)"
    },
    format: {
      type: "string",
      description: "Output format: pretty | json | md",
      default: "pretty",
      alias: "f"
    }
  },
  async run({ args }) {
    const mini = await ensureMiniLoaded();
    const field = String(args.by);
    const exact = [];
    if (args.sector) {
      exact.push({ field: "sector33_code", value: String(args.sector) });
    }
    if (args["market-code"]) {
      exact.push({ field: "market_code", value: String(args["market-code"]) });
    }
    const limit = parseNum2(args.limit) ?? 10;
    const result = screen(mini.items, {
      exact,
      sort: { field, order: args.asc ? "asc" : "desc" },
      limit,
      includeNull: Boolean(args["include-null"])
    });
    const format = String(args.format);
    const columns = args.columns ? String(args.columns).split(",").map((s) => s.trim()).filter(Boolean) : dedupe([
      "display_code",
      "company_name",
      "sector33_code",
      field,
      "market_capitalization"
    ]);
    if (result.length === 0 && format === "pretty") {
      process.stdout.write(import_picocolors4.default.yellow("No matches.\n"));
      return;
    }
    formatOutput(result, {
      kind: "stock-list",
      format,
      columns,
      title: `tc rank --by ${field}${args.asc ? " (asc)" : ""}`
    });
  }
});

// src/commands/disclosures.ts
var import_citty7 = require("citty");
var import_picocolors5 = __toESM(require("picocolors"), 1);
var VALID_DOC_TYPES = [
  "earnings",
  "forecast",
  "dividend",
  "buyback",
  "presentation",
  "plan",
  "tdnet_other"
];
function parseIntOr(v, fallback) {
  const n3 = Number.parseInt(String(v ?? ""), 10);
  return Number.isFinite(n3) ? n3 : fallback;
}
var disclosuresCommand = (0, import_citty7.defineCommand)({
  meta: {
    name: "disclosures",
    description: "Fetch market-wide TDnet disclosures (Phase 1: --days / --limit / --doc-type / --format json)."
  },
  args: {
    days: {
      type: "string",
      description: "Days to look back (default: 7, max: 90)",
      default: "7"
    },
    limit: {
      type: "string",
      description: "Max records (default: 100, 0 = no limit / up to 500)",
      default: "100"
    },
    "doc-type": {
      type: "string",
      description: `Filter by canonical doc type (${VALID_DOC_TYPES.join(" | ")})`
    },
    code: {
      type: "string",
      description: "Filter by ticker code (4 or 5 digits, e.g. 7203 or 72030)"
    },
    format: {
      type: "string",
      description: "Output format (Phase 1: json only)",
      default: "json",
      alias: "f"
    }
  },
  async run({ args }) {
    const days = Math.max(1, Math.min(parseIntOr(args.days, 7), 90));
    const rawLimit = parseIntOr(args.limit, 100);
    const limit = rawLimit === 0 ? 500 : Math.max(1, Math.min(rawLimit, 500));
    const docType = args["doc-type"] ? String(args["doc-type"]) : void 0;
    const code = args.code ? String(args.code).trim() : void 0;
    const format = String(args.format);
    if (code && !/^\d{4,5}$/.test(code)) {
      process.stderr.write(import_picocolors5.default.red(`Invalid --code: ${code} (expected 4 or 5 digits)
`));
      process.exit(1);
    }
    if (docType && !VALID_DOC_TYPES.includes(docType)) {
      process.stderr.write(import_picocolors5.default.red(`Invalid --doc-type: ${docType}
`));
      process.stderr.write(import_picocolors5.default.dim(`Valid: ${VALID_DOC_TYPES.join(", ")}
`));
      process.exit(1);
    }
    if (format !== "json") {
      process.stderr.write(
        import_picocolors5.default.yellow(
          `Phase 1 \u3067\u306F --format json \u306E\u307F\u5BFE\u5FDC\u3057\u3066\u3044\u307E\u3059 (--format=${format} \u306F Phase 2 \u4E88\u5B9A)
`
        )
      );
      process.exit(1);
    }
    const body = { days, limit };
    if (docType) body.doc_types = [docType];
    if (code) body.code = code;
    const res = await postJson("/api/disclosure/search", body);
    const data = unwrap(res);
    const items = data?.items ?? [];
    process.stdout.write(`${JSON.stringify(items, null, 2)}
`);
  }
});

// src/commands/overview.ts
var import_citty8 = require("citty");
var import_picocolors6 = __toESM(require("picocolors"), 1);
var DEFAULT_COLUMNS2 = [
  "display_code",
  "company_name",
  "sector33_code_name",
  "fiscal_year_status",
  "segment_data_status",
  "matched_keywords",
  "matched_fields"
];
function parseStatusList(raw, allValue, allowed) {
  if (!raw) return void 0;
  if (raw === allValue) return void 0;
  const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
  for (const p of parts) {
    if (!allowed.includes(p)) {
      throw new Error(`Invalid status value: ${p}. Allowed: ${allowed.join(", ")}, ${allValue}`);
    }
  }
  return parts;
}
function normalizeHitsForOutput(hits) {
  return hits.map((h) => ({
    ...h,
    matched_keywords: h.matched_keywords.join("|"),
    matched_fields: h.matched_fields.join("|")
  }));
}
var syncCmd = (0, import_citty8.defineCommand)({
  meta: {
    name: "sync",
    description: "Download overview.json (3,753 stocks narrative+segment) from R2 CDN"
  },
  args: {
    force: { type: "boolean", description: "Ignore TTL and re-fetch" }
  },
  async run({ args }) {
    const meta = await syncOverview(Boolean(args.force));
    process.stdout.write(
      `${import_picocolors6.default.green("\u2713")} overview.json  ${import_picocolors6.default.cyan(String(meta.items_count))} items, ${import_picocolors6.default.dim(
        `${(meta.bytes / 1024 / 1024).toFixed(2)} MB`
      )}  ${import_picocolors6.default.dim(`generated_at=${meta.generated_at ?? "\u2014"}`)}
`
    );
  }
});
var statusCmd = (0, import_citty8.defineCommand)({
  meta: { name: "status", description: "Show overview.json cache status" },
  async run() {
    const meta = readOverviewMeta();
    if (!meta) {
      process.stdout.write(
        import_picocolors6.default.gray("(overview.json not cached \u2014 run `tc overview sync`)\n")
      );
      return;
    }
    process.stdout.write(JSON.stringify(meta, null, 2) + "\n");
  }
});
var FISCAL_STATUSES = ["current", "stale_2y+", "missing"];
var SEG_STATUSES = ["complete", "partial", "unavailable"];
var searchCmd = (0, import_citty8.defineCommand)({
  meta: {
    name: "search",
    description: "Search overview.json narratives + segments by keywords. AND/OR, status filters, sector filter."
  },
  args: {
    keywords: {
      type: "string",
      description: "Comma-separated keywords (e.g. 'AI,\u6A5F\u68B0\u5B66\u7FD2,LLM')",
      required: true
    },
    match: {
      type: "string",
      description: "Match mode: any (OR) | all (AND). Default: any",
      default: "any"
    },
    "no-industry": {
      type: "boolean",
      description: "Exclude industry field from search (default: include)"
    },
    "no-segments": {
      type: "boolean",
      description: "Exclude segment names from search (default: include)"
    },
    "fiscal-status": {
      type: "string",
      description: "Allowed fiscal_year_status (comma list): current,stale_2y+,missing OR 'any'. Default: current",
      default: "current"
    },
    "segment-status": {
      type: "string",
      description: "Allowed segment_data_status (comma list): complete,partial,unavailable OR 'any'. Default: any",
      default: "any"
    },
    sector: { type: "string", description: "sector33_code filter (comma list OK)" },
    "require-ai-analysis": {
      type: "boolean",
      description: "Only include stocks with AI-generated segment analysis/insights"
    },
    "min-revenue-yoy": {
      type: "string",
      description: "Filter by dominant segment revenue_yoy (0-1 scale, e.g. '0.1' = 10% growth)"
    },
    limit: { type: "string", description: "Max hits (default no limit)" },
    columns: {
      type: "string",
      description: "Comma-separated column names (pretty / md only)"
    },
    format: {
      type: "string",
      description: "Output format: pretty | json | md",
      default: "pretty",
      alias: "f"
    }
  },
  async run({ args }) {
    const overview = await ensureOverviewLoaded();
    const keywords = parseKeywordsArg(String(args.keywords));
    if (keywords.length === 0) {
      process.stderr.write(import_picocolors6.default.red("--keywords is required (comma-separated)\n"));
      process.exit(1);
    }
    const matchMode = String(args.match);
    if (matchMode !== "any" && matchMode !== "all") {
      process.stderr.write(import_picocolors6.default.red("--match must be 'any' or 'all'\n"));
      process.exit(1);
    }
    const fiscalStatusAllow = parseStatusList(
      String(args["fiscal-status"]),
      "any",
      FISCAL_STATUSES
    );
    const segmentStatusAllow = parseStatusList(
      String(args["segment-status"]),
      "any",
      SEG_STATUSES
    );
    const sectorCodes = args.sector ? String(args.sector).split(",").map((s) => s.trim()).filter(Boolean) : void 0;
    const limit = args.limit ? Number.parseInt(String(args.limit), 10) : void 0;
    const requireAiAnalysis = Boolean(args["require-ai-analysis"]);
    const minRevenueYoy = args["min-revenue-yoy"] ? Number.parseFloat(String(args["min-revenue-yoy"])) : void 0;
    const hits = searchOverview(overview.items, {
      keywords,
      matchMode,
      includeIndustry: !args["no-industry"],
      includeSegmentNames: !args["no-segments"],
      fiscalStatusAllow,
      segmentStatusAllow,
      sectorCodes,
      limit,
      requireAiAnalysis,
      minRevenueYoy
    });
    const format = String(args.format);
    if (format === "json") {
      process.stdout.write(
        JSON.stringify({ count: hits.length, items: hits }, null, 2) + "\n"
      );
      return;
    }
    if (hits.length === 0) {
      process.stdout.write(import_picocolors6.default.yellow("No matches.\n"));
      return;
    }
    const columns = args.columns ? String(args.columns).split(",").map((s) => s.trim()).filter(Boolean) : DEFAULT_COLUMNS2;
    formatOutput(normalizeHitsForOutput(hits), {
      kind: "stock-list",
      format,
      columns,
      title: `tc overview search "${keywords.join(" " + matchMode.toUpperCase() + " ")}"`
    });
  }
});
var overviewCommand = (0, import_citty8.defineCommand)({
  meta: {
    name: "overview",
    description: "Cross-stock overview bulk dump: sync R2 CDN + keyword search over narratives/segments"
  },
  subCommands: {
    sync: syncCmd,
    status: statusCmd,
    search: searchCmd
  }
});

// src/commands/research-idea.ts
var import_citty9 = require("citty");
var import_picocolors7 = __toESM(require("picocolors"), 1);
var import_node_fs11 = require("fs");
var import_node_path11 = require("path");
function parseNum3(v) {
  if (v === void 0 || v === null || v === "") return void 0;
  const n3 = Number.parseFloat(String(v));
  return Number.isFinite(n3) ? n3 : void 0;
}
function parseCommaList(v) {
  if (v === void 0 || v === null) return void 0;
  const s = String(v).trim();
  if (!s) return void 0;
  return s.split(",").map((x) => x.trim()).filter(Boolean);
}
function parseFiscalStatus(raw, includeStale) {
  if (includeStale) return { allow: void 0, display: "all" };
  const parts = parseCommaList(raw);
  if (!parts || parts.includes("any")) return { allow: void 0, display: "all" };
  return {
    allow: parts,
    display: parts
  };
}
function parseSegmentStatus(raw) {
  const parts = parseCommaList(raw);
  if (!parts || parts.includes("any")) return { allow: void 0, display: "all" };
  return {
    allow: parts,
    display: parts
  };
}
function indexMiniByCode3(items) {
  const map = /* @__PURE__ */ new Map();
  for (const s of items) {
    if (s.display_code) map.set(s.display_code, s);
    if (s.code) map.set(s.code, s);
  }
  return map;
}
function writeFile2(path, content) {
  (0, import_node_fs11.mkdirSync)((0, import_node_path11.dirname)(path), { recursive: true });
  (0, import_node_fs11.writeFileSync)(path, content);
}
var researchIdeaCommand = (0, import_citty9.defineCommand)({
  meta: {
    name: "research-idea",
    description: "Theme-driven candidate discovery: keyword search \u2192 shortlist \u2192 report skeleton. CLI orchestrator (Agent provides keywords)."
  },
  args: {
    theme: {
      type: "positional",
      description: "Free-form investment theme (e.g. 'AI \u6642\u4EE3\u306E\u53D7\u76CA\u8005')",
      required: true
    },
    keywords: {
      type: "string",
      description: "Comma-separated keywords (e.g. 'AI,\u6A5F\u68B0\u5B66\u7FD2,LLM')",
      required: true
    },
    match: { type: "string", description: "any | all (default any)", default: "any" },
    "no-industry": {
      type: "boolean",
      description: "Exclude industry field from search"
    },
    "no-segments": {
      type: "boolean",
      description: "Exclude segment names from search"
    },
    "fiscal-status": {
      type: "string",
      description: "Allowed fiscal_year_status comma list or 'any'. Default: current",
      default: "current"
    },
    "include-stale": {
      type: "boolean",
      description: "Shortcut to include stale_2y+ fiscal years (overrides --fiscal-status)"
    },
    "segment-status": {
      type: "string",
      description: "Allowed segment_data_status comma list or 'any'. Default: any",
      default: "any"
    },
    sector: { type: "string", description: "sector33_code filter (comma list)" },
    "target-size": {
      type: "string",
      description: "Max shortlist size (default 50)",
      default: "50"
    },
    "hits-limit": {
      type: "string",
      description: "Max rows to write in 02-hits.md (default 200). hits.json always has all.",
      default: "200"
    },
    "top-n": {
      type: "string",
      description: "Number of deep-dive candidates listed in final.md (default 10)",
      default: "10"
    },
    "screen-per-lt": { type: "string" },
    "screen-per-gt": { type: "string" },
    "screen-pbr-lt": { type: "string" },
    "screen-roe-gt": { type: "string" },
    "screen-roe-lt": { type: "string" },
    "screen-growth3y-gt": { type: "string" },
    "screen-op-growth3y-gt": { type: "string" },
    "screen-mcap-gt": { type: "string" },
    "screen-mcap-lt": { type: "string" },
    "screen-dy-gt": { type: "string" },
    "include-null": {
      type: "boolean",
      description: "Include null values in screen filters"
    },
    slug: { type: "string", description: "Override auto-generated slug" },
    out: {
      type: "string",
      description: "Output root (default: research/idea)",
      default: "research/idea"
    },
    overwrite: {
      type: "boolean",
      description: "Allow overwriting an existing slug directory"
    }
  },
  async run({ args }) {
    const theme = String(args.theme).trim();
    if (!theme) {
      process.stderr.write(import_picocolors7.default.red("<theme> is required\n"));
      process.exit(1);
    }
    const keywords = parseKeywordsArg(String(args.keywords));
    if (keywords.length === 0) {
      process.stderr.write(import_picocolors7.default.red("--keywords is required\n"));
      process.exit(1);
    }
    const matchMode = String(args.match);
    if (matchMode !== "any" && matchMode !== "all") {
      process.stderr.write(import_picocolors7.default.red("--match must be 'any' or 'all'\n"));
      process.exit(1);
    }
    const slug = generateSlug({ theme, override: args.slug ? String(args.slug) : void 0 });
    const outRoot = (0, import_node_path11.resolve)(String(args.out));
    const ideaDir = (0, import_node_path11.join)(outRoot, slug);
    if ((0, import_node_fs11.existsSync)(ideaDir) && !args.overwrite) {
      process.stderr.write(
        import_picocolors7.default.red(
          `Directory already exists: ${ideaDir}
Use --overwrite to replace, or --slug <new-name> to make a fresh one.
`
        )
      );
      process.exit(1);
    }
    (0, import_node_fs11.mkdirSync)(ideaDir, { recursive: true });
    const { allow: fiscalAllow, display: fiscalDisplay } = parseFiscalStatus(
      args["fiscal-status"],
      Boolean(args["include-stale"])
    );
    const { allow: segmentAllow, display: segmentDisplay } = parseSegmentStatus(
      args["segment-status"]
    );
    const sectorCodes = parseCommaList(args.sector);
    process.stdout.write(
      `${import_picocolors7.default.dim("[1/5] Loading overview.json + mini.json\u2026")}
`
    );
    const [overview, mini] = await Promise.all([
      ensureOverviewLoaded(),
      ensureMiniLoaded()
    ]);
    process.stdout.write(`${import_picocolors7.default.dim("[2/5] Keyword search\u2026")}
`);
    const hits = searchOverview(overview.items, {
      keywords,
      matchMode,
      includeIndustry: !args["no-industry"],
      includeSegmentNames: !args["no-segments"],
      fiscalStatusAllow: fiscalAllow,
      segmentStatusAllow: segmentAllow,
      sectorCodes: sectorCodes ?? void 0
    });
    process.stdout.write(`${import_picocolors7.default.dim("[3/5] Shortlist + screen filters\u2026")}
`);
    const miniByCode = indexMiniByCode3(mini.items);
    const numericFlags = {
      "per-lt": parseNum3(args["screen-per-lt"]),
      "per-gt": parseNum3(args["screen-per-gt"]),
      "pbr-lt": parseNum3(args["screen-pbr-lt"]),
      "roe-gt": parseNum3(args["screen-roe-gt"]),
      "roe-lt": parseNum3(args["screen-roe-lt"]),
      "growth3y-gt": parseNum3(args["screen-growth3y-gt"]),
      "op-growth3y-gt": parseNum3(args["screen-op-growth3y-gt"]),
      "mcap-gt": parseNum3(args["screen-mcap-gt"]),
      "mcap-lt": parseNum3(args["screen-mcap-lt"]),
      "dy-gt": parseNum3(args["screen-dy-gt"])
    };
    const numericConditions = buildNumericConditions(numericFlags);
    const targetSize = Number.parseInt(String(args["target-size"]), 10) || 50;
    const hitsLimit = Number.parseInt(String(args["hits-limit"]), 10) || 200;
    const topN = Number.parseInt(String(args["top-n"]), 10) || 10;
    const shortlist = buildShortlist({
      hits,
      miniByCode,
      numericConditions,
      includeNull: Boolean(args["include-null"]),
      targetSize
    });
    process.stdout.write(`${import_picocolors7.default.dim("[4/5] Writing artifacts\u2026")}
`);
    writeFile2(
      (0, import_node_path11.join)(ideaDir, "01-keywords.md"),
      fmtKeywordsMd(theme, keywords, matchMode)
    );
    writeFile2((0, import_node_path11.join)(ideaDir, "02-hits.md"), fmtHitsMd(theme, hits, hitsLimit));
    writeFile2(
      (0, import_node_path11.join)(ideaDir, "hits.json"),
      JSON.stringify({ count: hits.length, items: hits }, null, 2)
    );
    writeFile2(
      (0, import_node_path11.join)(ideaDir, "03-shortlist.md"),
      fmtShortlistMd(
        theme,
        shortlist,
        numericConditions.map((c) => ({ field: c.field, op: c.op, value: c.value }))
      )
    );
    writeFile2(
      (0, import_node_path11.join)(ideaDir, "shortlist.json"),
      JSON.stringify({ count: shortlist.length, items: shortlist }, null, 2)
    );
    writeFile2(
      (0, import_node_path11.join)(ideaDir, "final.md"),
      fmtFinalMdSkeleton(
        theme,
        slug,
        { hits: hits.length, shortlist: shortlist.length },
        shortlist,
        topN
      )
    );
    const meta = {
      theme,
      slug,
      keywords,
      match_mode: matchMode,
      include_industry: !args["no-industry"],
      include_segments: !args["no-segments"],
      fiscal_status_allow: fiscalDisplay,
      segment_status_allow: segmentDisplay,
      sector_codes: sectorCodes ?? null,
      target_size: targetSize,
      hits_limit: hitsLimit,
      top_n: topN,
      screen_conditions: numericConditions.map((c) => ({
        field: c.field,
        op: c.op,
        value: c.value
      })),
      out_dir: ideaDir,
      generated_at: (/* @__PURE__ */ new Date()).toISOString(),
      counts: { hits: hits.length, shortlist: shortlist.length },
      data_as_of: { overview_generated_at: overview.meta?.generated_at ?? null }
    };
    writeFile2((0, import_node_path11.join)(ideaDir, "meta.json"), JSON.stringify(meta, null, 2));
    process.stdout.write(`${import_picocolors7.default.dim("[5/5] Done.")}

`);
    process.stdout.write(
      `${import_picocolors7.default.green("\u2713")} research-idea  ${import_picocolors7.default.cyan(slug)}
  theme:     ${theme}
  keywords:  ${keywords.join(", ")} (${matchMode})
  hits:      ${import_picocolors7.default.cyan(String(hits.length))}${hits.length > hitsLimit ? import_picocolors7.default.dim(` (02-hits.md shows first ${hitsLimit})`) : ""}
  shortlist: ${import_picocolors7.default.cyan(String(shortlist.length))}
  top-n:     ${import_picocolors7.default.cyan(String(topN))}
  output:    ${import_picocolors7.default.dim(ideaDir)}
`
    );
  }
});

// src/commands/research-batch.ts
var import_citty10 = require("citty");
var import_picocolors8 = __toESM(require("picocolors"), 1);
var import_node_fs12 = require("fs");
var import_node_path12 = require("path");
var researchBatchCommand = (0, import_citty10.defineCommand)({
  meta: {
    name: "research-batch",
    description: "Run multiple tc research-idea themes in parallel from a JSON config. Generates per-theme idea/ dirs + cross-theme summary.md."
  },
  args: {
    config: {
      type: "positional",
      description: "Path to batch config JSON",
      required: true
    },
    out: {
      type: "string",
      description: "Output root (default: research)",
      default: "research"
    },
    "batch-slug": {
      type: "string",
      description: "Override auto-generated batch slug"
    },
    overwrite: {
      type: "boolean",
      description: "Allow overwriting existing idea slugs"
    }
  },
  async run({ args }) {
    const configPath = (0, import_node_path12.resolve)(String(args.config));
    if (!(0, import_node_fs12.existsSync)(configPath)) {
      process.stderr.write(import_picocolors8.default.red(`Config not found: ${configPath}
`));
      process.exit(1);
    }
    let configJson;
    try {
      configJson = JSON.parse((0, import_node_fs12.readFileSync)(configPath, "utf8"));
    } catch (err) {
      process.stderr.write(
        import_picocolors8.default.red(`Failed to parse JSON: ${err.message}
`)
      );
      process.exit(1);
    }
    let config;
    try {
      config = parseBatchConfig(configJson);
    } catch (err) {
      process.stderr.write(
        import_picocolors8.default.red(`Config schema invalid:
${err.message}
`)
      );
      process.exit(1);
    }
    const outRoot = (0, import_node_path12.resolve)(String(args.out));
    const batchSlug = generateBatchSlug({
      hashSeed: JSON.stringify(config.themes.map((t) => t.theme)),
      override: args["batch-slug"] ? String(args["batch-slug"]) : void 0
    });
    process.stdout.write(
      `${import_picocolors8.default.dim(`[1/3] Loading overview.json + mini.json\u2026`)}
`
    );
    const [overview, mini] = await Promise.all([
      ensureOverviewLoaded(),
      ensureMiniLoaded()
    ]);
    process.stdout.write(
      `${import_picocolors8.default.dim(`[2/3] Running ${config.themes.length} themes in parallel\u2026`)}
`
    );
    const { manifest, batchDir } = await runBatch(
      {
        config,
        outRoot,
        batchSlug,
        overwrite: Boolean(args.overwrite)
      },
      overview,
      mini
    );
    process.stdout.write(`${import_picocolors8.default.dim(`[3/3] Done.`)}

`);
    process.stdout.write(
      `${import_picocolors8.default.green("\u2713")} research-batch  ${import_picocolors8.default.cyan(batchSlug)}
`
    );
    for (const t of manifest.themes) {
      process.stdout.write(
        `  ${import_picocolors8.default.cyan(t.theme)}  hits=${t.hits}  shortlist=${t.shortlist}  ${import_picocolors8.default.dim(`\u2192 ${t.idea_dir}`)}
`
      );
    }
    if (manifest.overlaps.length > 0) {
      process.stdout.write(
        `  ${import_picocolors8.default.yellow(`overlaps`)}: ${manifest.overlaps.length} stocks in multiple shortlists
`
      );
    }
    process.stdout.write(
      `  ${import_picocolors8.default.dim(`summary: ${batchDir}/summary.md`)}
`
    );
  }
});

// src/commands/report.ts
var import_citty11 = require("citty");
var import_picocolors9 = __toESM(require("picocolors"), 1);
var import_node_fs13 = require("fs");
var import_promises = require("fs/promises");
var import_yaml = require("yaml");
var API_PATH_CREATE2 = "/api/report/create";
var API_PATH_LIST = "/api/report/list";
var API_PATH_SHOW = "/api/report/show";
var API_PATH_UPDATE = "/api/report/update";
var API_PATH_DELETE = "/api/report/delete";
function getWebBase2() {
  const apiBase = getApiBase();
  if (apiBase.includes("api.ticker-code.com")) return "https://ticker-code.com";
  return apiBase.replace(/^https?:\/\/api\./, "https://");
}
async function apiPost(path, body) {
  const url = `${getApiBase()}${path}`;
  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders()
      },
      body: JSON.stringify(body)
    });
  } catch (err) {
    throw new Error(`Network error calling ${url}: ${err.message}`);
  }
  if (res.status === 401) {
    process.stderr.write(
      import_picocolors9.default.red(
        "\u8A8D\u8A3C\u30A8\u30E9\u30FC (401): \u8A8D\u8A3C\u60C5\u5831\u304C\u672A\u8A2D\u5B9A\u307E\u305F\u306F\u7121\u52B9\u3067\u3059\u3002\n  tc auth login \u3067\u8A8D\u8A3C\u3057\u3066\u304F\u3060\u3055\u3044\u3002\n"
      )
    );
    process.exit(1);
  }
  if (res.status === 403) {
    const text = await res.text().catch(() => "");
    let detail = "";
    try {
      const json2 = JSON.parse(text);
      const code = json2?.error?.code ?? json2?.code ?? "";
      if (code === "LOCKED" || text.includes("LOCKED")) {
        detail = "\u30A2\u30AB\u30A6\u30F3\u30C8\u304C\u30ED\u30C3\u30AF\u3055\u308C\u3066\u3044\u307E\u3059 (403 LOCKED)\u3002\u30B5\u30DD\u30FC\u30C8\u306B\u304A\u554F\u3044\u5408\u308F\u305B\u304F\u3060\u3055\u3044\u3002";
      } else if (code === "FORBIDDEN_PRIVATE_PLAN" || text.includes("FORBIDDEN_PRIVATE_PLAN")) {
        detail = "\u3053\u306E\u30D7\u30E9\u30F3\u3067\u306F private \u30EC\u30DD\u30FC\u30C8\u306F\u4F5C\u6210\u3067\u304D\u307E\u305B\u3093 (403 FORBIDDEN_PRIVATE_PLAN)\u3002\n  \u4E0A\u4F4D\u30D7\u30E9\u30F3\u306B\u30A2\u30C3\u30D7\u30B0\u30EC\u30FC\u30C9\u3059\u308B\u304B --public \u3092\u4ED8\u3051\u3066\u516C\u958B\u30EC\u30DD\u30FC\u30C8\u3068\u3057\u3066\u4FDD\u5B58\u3057\u3066\u304F\u3060\u3055\u3044\u3002";
      } else if (code === "FORBIDDEN_OFFICIAL_ROLE" || text.includes("FORBIDDEN_OFFICIAL_ROLE")) {
        detail = "\u3053\u306E API Key \u306B\u306F report:official scope \u304C\u3042\u308A\u307E\u305B\u3093 (403 FORBIDDEN_OFFICIAL_ROLE)\u3002\n  Web \u306E\u8A2D\u5B9A\u753B\u9762\u3067 scope \u3092\u4ED8\u4E0E\u3059\u308B\u304B\u3001ADMIN \u30ED\u30FC\u30EB\u3067\u518D\u767A\u884C\u3057\u3066\u304F\u3060\u3055\u3044\u3002";
      } else {
        detail = `\u30A2\u30AF\u30BB\u30B9\u62D2\u5426 (403): ${text.slice(0, 200)}`;
      }
    } catch {
      detail = `\u30A2\u30AF\u30BB\u30B9\u62D2\u5426 (403): ${text.slice(0, 200)}`;
    }
    process.stderr.write(import_picocolors9.default.red(`${detail}
`));
    process.exit(1);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status} ${res.statusText} \u2014 ${path}
${text.slice(0, 500)}`);
  }
  const json = await res.json();
  if (json && json.success === false) {
    const status = json.status ?? "?";
    const message = json.message ?? "API returned success=false";
    const errStr = typeof json.error === "string" ? json.error : json.error ? JSON.stringify(json.error).slice(0, 400) : "";
    process.stderr.write(
      import_picocolors9.default.red(`API \u30A8\u30E9\u30FC (${status} ${message}) \u2014 ${path}
`) + (errStr ? import_picocolors9.default.dim(`  ${errStr}
`) : "")
    );
    process.exit(1);
  }
  return json;
}
var saveCommand = (0, import_citty11.defineCommand)({
  meta: {
    name: "save",
    description: "Save a report from stdin or a markdown file"
  },
  args: {
    title: {
      type: "string",
      description: "Report title (required if not in frontmatter)",
      alias: "t"
    },
    body: {
      type: "string",
      description: "Path to markdown file. Reads stdin if omitted.",
      alias: "b"
    },
    "one-liner": {
      type: "string",
      description: "One-line summary (\u226480 chars)"
    },
    summary: {
      type: "string",
      description: "Short paragraph summary"
    },
    "stock-code": {
      type: "string",
      description: "Primary stock code (4 or 5 digits)"
    },
    "stock-codes": {
      type: "string",
      description: "Comma-separated stock codes for multi-stock reports"
    },
    tags: {
      type: "string",
      description: "Comma-separated tags"
    },
    public: {
      type: "boolean",
      description: "Publish as public report (default: private)",
      default: false
    },
    official: {
      type: "boolean",
      description: "Mark as official report (requires ADMIN role or report:official scope)",
      default: false
    },
    verdict: {
      type: "string",
      description: "Verdict text or enum code (e.g. 'strong_buy' / '\u614E\u91CD\u80AF\u5B9A')"
    },
    "verdict-code": {
      type: "string",
      description: "Explicit verdict enum code: strong_buy|buy|hold|lukewarm|mixed|sell|strong_sell"
    },
    panel: {
      type: "string",
      description: "Panel type (e.g. moat-deepdive / value-debate / jp-classic)"
    },
    turns: {
      type: "string",
      description: "Number of discussion turns"
    },
    panelists: {
      type: "string",
      description: "Comma-separated panelist names (e.g. BuffettBot,FisherBot,KiyoharaBot)"
    }
  },
  async run({ args }) {
    let bodyMarkdown;
    if (args.body) {
      try {
        bodyMarkdown = (0, import_node_fs13.readFileSync)(String(args.body), "utf8");
      } catch (err) {
        process.stderr.write(
          import_picocolors9.default.red(`File read error: ${err.message}
`)
        );
        process.exit(1);
      }
    } else {
      const chunks = [];
      for await (const chunk of process.stdin) {
        chunks.push(chunk);
      }
      bodyMarkdown = Buffer.concat(chunks).toString("utf8");
    }
    bodyMarkdown = bodyMarkdown.trim();
    if (!bodyMarkdown) {
      process.stderr.write(import_picocolors9.default.red("\u672C\u6587\u304C\u7A7A\u3067\u3059\u3002--body <file> \u304B stdin \u3067 markdown \u3092\u6E21\u3057\u3066\u304F\u3060\u3055\u3044\u3002\n"));
      process.exit(1);
    }
    const title = args.title ? String(args.title) : "";
    if (!title) {
      process.stderr.write(import_picocolors9.default.red("--title \u306F\u5FC5\u9808\u3067\u3059\u3002\n"));
      process.exit(1);
    }
    const stockCodes = args["stock-codes"] ? String(args["stock-codes"]).split(",").map((s) => s.trim()).filter(Boolean) : void 0;
    const tags = args.tags ? String(args.tags).split(",").map((s) => s.trim()).filter(Boolean) : void 0;
    const VERDICT_ENUMS = ["strong_buy", "buy", "hold", "lukewarm", "mixed", "sell", "strong_sell"];
    let verdictCode;
    let verdictLabel;
    if (args["verdict-code"]) {
      verdictCode = String(args["verdict-code"]);
    } else if (args.verdict) {
      const v = String(args.verdict);
      if (VERDICT_ENUMS.includes(v)) {
        verdictCode = v;
        verdictLabel = v;
      } else {
        verdictLabel = v;
      }
    }
    const metadata = {};
    if (args.panel) metadata.panel = String(args.panel);
    if (args.turns) metadata.turns = Number(args.turns);
    if (args.panelists) {
      metadata.panelists = String(args.panelists).split(",").map((s) => s.trim()).filter(Boolean);
    }
    const isOfficial = Boolean(args.official);
    const payload = {
      source: "agent_cli",
      title,
      body_markdown: bodyMarkdown,
      is_public: isOfficial ? true : Boolean(args.public)
    };
    if (isOfficial) payload.is_official = true;
    if (verdictCode !== void 0) payload.verdict_code = verdictCode;
    if (verdictLabel !== void 0) payload.verdict_label = verdictLabel;
    if (args["one-liner"]) payload.one_liner = String(args["one-liner"]);
    if (args.summary) payload.summary = String(args.summary);
    if (args["stock-code"]) payload.stock_code = String(args["stock-code"]);
    if (stockCodes) payload.stock_codes = stockCodes;
    if (tags) payload.tags = tags;
    if (Object.keys(metadata).length > 0) payload.metadata = metadata;
    process.stdout.write(import_picocolors9.default.dim("Saving report\u2026\n"));
    const res = await apiPost(
      API_PATH_CREATE2,
      payload
    );
    if (!res.success) {
      process.stderr.write(import_picocolors9.default.red("\u4FDD\u5B58\u306B\u5931\u6557\u3057\u307E\u3057\u305F\u3002\n"));
      process.exit(1);
    }
    const { id, short_id: shortId, slug } = res.data;
    const url = `${getWebBase2()}/report/${shortId}/${slug}`;
    const effectivePublic = isOfficial ? true : Boolean(args.public);
    process.stdout.write(
      `${import_picocolors9.default.green("\u2713")} \u30EC\u30DD\u30FC\u30C8\u4FDD\u5B58\u5B8C\u4E86
  id:   ${import_picocolors9.default.cyan(id)}
  slug: ${import_picocolors9.default.cyan(slug)}
  url:  ${import_picocolors9.default.cyan(url)}
  \u516C\u958B: ${effectivePublic ? import_picocolors9.default.green("public") : import_picocolors9.default.dim("private")}
` + (isOfficial ? `  \u516C\u5F0F: ${import_picocolors9.default.yellow("official")}
` : "") + (verdictCode ? `  verdict_code: ${import_picocolors9.default.cyan(verdictCode)}
` : "") + (verdictLabel ? `  verdict_label: ${import_picocolors9.default.cyan(verdictLabel)}
` : "")
    );
  }
});
var listCommand = (0, import_citty11.defineCommand)({
  meta: {
    name: "list",
    description: "List saved reports"
  },
  args: {
    limit: {
      type: "string",
      description: "Max number of reports to show (default: 20)",
      default: "20"
    },
    "mine-only": {
      type: "boolean",
      description: "Only show your own reports (default: true)",
      default: true
    }
  },
  async run({ args }) {
    const limit = Number.parseInt(String(args.limit), 10) || 20;
    const mineOnly = Boolean(args["mine-only"]);
    const res = await apiPost(API_PATH_LIST, { limit, mode: mineOnly ? "mine" : "both" });
    if (!res.success || !res.data) {
      process.stderr.write(import_picocolors9.default.red("\u53D6\u5F97\u306B\u5931\u6557\u3057\u307E\u3057\u305F\u3002\n"));
      process.exit(1);
    }
    const reports = res.data.items ?? [];
    if (reports.length === 0) {
      process.stdout.write(import_picocolors9.default.dim("\u30EC\u30DD\u30FC\u30C8\u304C\u3042\u308A\u307E\u305B\u3093\u3002\n"));
      return;
    }
    const webBase = getWebBase2();
    process.stdout.write(`${import_picocolors9.default.bold("Reports")} (${reports.length})

`);
    for (const r of reports) {
      const vis = r.is_public ? import_picocolors9.default.green("public ") : import_picocolors9.default.dim("private");
      const date = r.created_at ? r.created_at.slice(0, 10) : "      ";
      process.stdout.write(
        `  ${import_picocolors9.default.cyan(r.id.slice(0, 8))}  ${vis}  ${date}  ${r.title}
           ${import_picocolors9.default.dim(`${webBase}/report/${r.short_id}/${r.slug}`)}
`
      );
    }
  }
});
var showCommand = (0, import_citty11.defineCommand)({
  meta: {
    name: "show",
    description: "Show a report by ID"
  },
  args: {
    id: {
      type: "positional",
      description: "Report ID",
      required: true
    }
  },
  async run({ args }) {
    const res = await apiPost(API_PATH_SHOW, { id: String(args.id) });
    if (!res.success || !res.data) {
      process.stderr.write(import_picocolors9.default.red("\u53D6\u5F97\u306B\u5931\u6557\u3057\u307E\u3057\u305F\u3002\n"));
      process.exit(1);
    }
    const r = res.data;
    const webBase = getWebBase2();
    process.stdout.write(
      `${import_picocolors9.default.bold(r.title)}
id:      ${r.id}
slug:    ${r.slug}
\u516C\u958B:    ${r.is_public ? import_picocolors9.default.green("public") : import_picocolors9.default.dim("private")}
\u4F5C\u6210\u65E5:  ${r.created_at?.slice(0, 10) ?? "\u2014"}
url:     ${import_picocolors9.default.cyan(`${webBase}/report/${r.short_id}/${r.slug}`)}

${import_picocolors9.default.dim("\u2500".repeat(60))}

${r.body_markdown}
`
    );
  }
});
var publishCommand = (0, import_citty11.defineCommand)({
  meta: {
    name: "publish",
    description: "Set a report to public (is_public=true)"
  },
  args: {
    id: {
      type: "positional",
      description: "Report ID",
      required: true
    }
  },
  async run({ args }) {
    const res = await apiPost(
      API_PATH_UPDATE,
      { id: String(args.id), is_public: true }
    );
    if (!res.success) {
      process.stderr.write(import_picocolors9.default.red("\u66F4\u65B0\u306B\u5931\u6557\u3057\u307E\u3057\u305F\u3002\n"));
      process.exit(1);
    }
    const { id, short_id: shortId, slug } = res.data;
    const url = `${getWebBase2()}/report/${shortId}/${slug}`;
    process.stdout.write(
      `${import_picocolors9.default.green("\u2713")} \u30EC\u30DD\u30FC\u30C8\u3092\u516C\u958B\u3057\u307E\u3057\u305F
  id:  ${import_picocolors9.default.cyan(id)}
  url: ${import_picocolors9.default.cyan(url)}
`
    );
  }
});
var deleteCommand = (0, import_citty11.defineCommand)({
  meta: {
    name: "delete",
    description: "Delete a report by ID"
  },
  args: {
    id: {
      type: "positional",
      description: "Report ID",
      required: true
    }
  },
  async run({ args }) {
    const res = await apiPost(API_PATH_DELETE, {
      id: String(args.id)
    });
    if (!res.success) {
      process.stderr.write(import_picocolors9.default.red("\u524A\u9664\u306B\u5931\u6557\u3057\u307E\u3057\u305F\u3002\n"));
      process.exit(1);
    }
    process.stdout.write(`${import_picocolors9.default.green("\u2713")} \u30EC\u30DD\u30FC\u30C8\u3092\u524A\u9664\u3057\u307E\u3057\u305F (id: ${import_picocolors9.default.cyan(String(args.id))})
`);
  }
});
var VERDICT_ENUMS_SET = /* @__PURE__ */ new Set(["strong_buy", "buy", "hold", "lukewarm", "mixed", "sell", "strong_sell"]);
async function buildBatchPayload(entry, baseDir) {
  let bodyMarkdown;
  if (entry.body_file) {
    const resolved = entry.body_file.startsWith("/") ? entry.body_file : `${baseDir}/${entry.body_file}`;
    bodyMarkdown = await (0, import_promises.readFile)(resolved, "utf8");
  } else if (entry.body_markdown) {
    bodyMarkdown = entry.body_markdown;
  } else {
    throw new Error(`entry "${entry.title}": body_markdown \u307E\u305F\u306F body_file \u304C\u5FC5\u8981\u3067\u3059`);
  }
  let verdictCode;
  let verdictLabel;
  if (entry.verdict_code) {
    verdictCode = entry.verdict_code;
  } else if (entry.verdict) {
    if (VERDICT_ENUMS_SET.has(entry.verdict)) {
      verdictCode = entry.verdict;
      verdictLabel = entry.verdict;
    } else {
      verdictLabel = entry.verdict;
    }
  }
  if (entry.verdict_label) verdictLabel = entry.verdict_label;
  const isOfficial = Boolean(entry.is_official);
  const payload = {
    source: "agent_cli",
    title: entry.title,
    body_markdown: bodyMarkdown.trim(),
    is_public: isOfficial ? true : Boolean(entry.is_public)
  };
  if (isOfficial) payload.is_official = true;
  if (verdictCode !== void 0) payload.verdict_code = verdictCode;
  if (verdictLabel !== void 0) payload.verdict_label = verdictLabel;
  if (entry.one_liner) payload.one_liner = entry.one_liner;
  if (entry.summary) payload.summary = entry.summary;
  if (entry.stock_code) payload.stock_code = entry.stock_code;
  if (entry.stock_codes) payload.stock_codes = entry.stock_codes;
  if (entry.tags) payload.tags = entry.tags;
  if (entry.metadata && Object.keys(entry.metadata).length > 0) payload.metadata = entry.metadata;
  return payload;
}
var batchSaveCommand = (0, import_citty11.defineCommand)({
  meta: {
    name: "batch-save",
    description: "Bulk-save reports from a YAML or JSON file"
  },
  args: {
    file: {
      type: "string",
      description: "Path to YAML or JSON file containing an array of report entries",
      alias: "f",
      required: true
    }
  },
  async run({ args }) {
    const filePath = String(args.file);
    let fileContent;
    try {
      fileContent = (0, import_node_fs13.readFileSync)(filePath, "utf8");
    } catch (err) {
      process.stderr.write(import_picocolors9.default.red(`File read error: ${err.message}
`));
      process.exit(1);
    }
    let entries;
    try {
      const parsed = filePath.endsWith(".json") ? JSON.parse(fileContent) : (0, import_yaml.parse)(fileContent);
      if (!Array.isArray(parsed)) {
        process.stderr.write(import_picocolors9.default.red("\u30D5\u30A1\u30A4\u30EB\u306E\u30EB\u30FC\u30C8\u306F\u914D\u5217\u3067\u3042\u308B\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059\u3002\n"));
        process.exit(1);
      }
      entries = parsed;
    } catch (err) {
      process.stderr.write(import_picocolors9.default.red(`Parse error: ${err.message}
`));
      process.exit(1);
    }
    if (entries.length === 0) {
      process.stdout.write(import_picocolors9.default.dim("\u30A8\u30F3\u30C8\u30EA\u304C\u3042\u308A\u307E\u305B\u3093\u3002\n"));
      return;
    }
    const baseDir = filePath.includes("/") ? filePath.replace(/\/[^/]+$/, "") : ".";
    process.stdout.write(import_picocolors9.default.dim(`Batch saving ${entries.length} report(s)\u2026
`));
    let succeeded = 0;
    const failures = [];
    for (const entry of entries) {
      const label = entry.title ?? "(no title)";
      try {
        const payload = await buildBatchPayload(entry, baseDir);
        const res = await apiPost(
          API_PATH_CREATE2,
          payload
        );
        if (!res.success) throw new Error("API returned success=false");
        succeeded++;
        process.stdout.write(`  ${import_picocolors9.default.green("\u2713")} ${label}
`);
      } catch (err) {
        const reason = err.message;
        failures.push({ title: label, reason });
        process.stdout.write(`  ${import_picocolors9.default.red("\u2717")} ${label}: ${import_picocolors9.default.dim(reason)}
`);
      }
    }
    process.stdout.write(`
${import_picocolors9.default.bold("Batch save results:")}
`);
    process.stdout.write(`  ${import_picocolors9.default.green("\u2713")} ${succeeded} succeeded
`);
    if (failures.length > 0) {
      process.stdout.write(`  ${import_picocolors9.default.red("\u2717")} ${failures.length} failed
`);
      for (const f of failures) {
        process.stdout.write(`     - ${f.title}: ${import_picocolors9.default.dim(f.reason)}
`);
      }
    }
  }
});
var reportCommand = (0, import_citty11.defineCommand)({
  meta: {
    name: "report",
    description: "Manage analysis reports (save / list / show / publish / delete / batch-save)"
  },
  subCommands: {
    save: saveCommand,
    list: listCommand,
    show: showCommand,
    publish: publishCommand,
    delete: deleteCommand,
    "batch-save": batchSaveCommand
  }
});

// src/commands/auth.ts
var import_citty12 = require("citty");
var import_picocolors10 = __toESM(require("picocolors"), 1);
var import_node_readline = require("readline");
var API_KEY_PATTERN = /^ak_(cli|mcp|web)_[a-f0-9]{32}$/;
async function promptApiKey() {
  if (!process.stdin.isTTY) {
    process.stderr.write(import_picocolors10.default.red("\u975E\u5BFE\u8A71\u74B0\u5883\u3067\u306F tc auth login \u306F\u4F7F\u7528\u3067\u304D\u307E\u305B\u3093\u3002TICKERCODE_API_KEY \u74B0\u5883\u5909\u6570\u3092\u8A2D\u5B9A\u3057\u3066\u304F\u3060\u3055\u3044\u3002\n"));
    process.exit(1);
  }
  const rl = (0, import_node_readline.createInterface)({ input: process.stdin, output: process.stderr });
  return new Promise((resolve5) => {
    rl.question("API Key (ak_cli_...): ", (answer) => {
      rl.close();
      resolve5(answer.trim());
    });
  });
}
async function fetchMe(apiKey) {
  const url = `${getApiBase()}/api/user/me`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({})
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.success || !json.data) return null;
    return json.data;
  } catch {
    return null;
  }
}
var loginCommand = (0, import_citty12.defineCommand)({
  meta: {
    name: "login",
    description: "Authenticate with a Tickercode API key"
  },
  async run() {
    const apiKey = await promptApiKey();
    if (!API_KEY_PATTERN.test(apiKey)) {
      process.stderr.write(
        import_picocolors10.default.red("\u7121\u52B9\u306A API Key \u5F62\u5F0F\u3067\u3059\u3002ak_cli_<32\u684116\u9032\u6570> \u306E\u5F62\u5F0F\u3067\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002\n")
      );
      process.exit(1);
    }
    process.stderr.write(import_picocolors10.default.dim("\u8A8D\u8A3C\u78BA\u8A8D\u4E2D\u2026\n"));
    const user = await fetchMe(apiKey);
    if (!user) {
      process.stderr.write(
        import_picocolors10.default.red("\u8A8D\u8A3C\u306B\u5931\u6557\u3057\u307E\u3057\u305F\u3002API Key \u304C\u7121\u52B9\u304B\u3001\u30B5\u30FC\u30D0\u30FC\u306B\u63A5\u7D9A\u3067\u304D\u307E\u305B\u3093\u3002\n")
      );
      process.exit(1);
    }
    saveCredentials({
      api_key: apiKey,
      created_at: (/* @__PURE__ */ new Date()).toISOString(),
      user
    });
    process.stdout.write(
      `${import_picocolors10.default.green("\u2713")} \u30ED\u30B0\u30A4\u30F3\u5B8C\u4E86: ${import_picocolors10.default.cyan(user.email)} (${user.role})
`
    );
  }
});
var whoamiCommand = (0, import_citty12.defineCommand)({
  meta: {
    name: "whoami",
    description: "Show currently authenticated user"
  },
  async run() {
    const cred = loadCredentials();
    if (!cred?.api_key) {
      process.stdout.write(import_picocolors10.default.dim("not logged in\n"));
      process.stdout.write(import_picocolors10.default.dim("  tc auth login \u3067\u8A8D\u8A3C\u3057\u3066\u304F\u3060\u3055\u3044\u3002\n"));
      return;
    }
    const user = await fetchMe(cred.api_key);
    if (!user) {
      process.stdout.write(import_picocolors10.default.yellow("API Key \u306F\u4FDD\u5B58\u3055\u308C\u3066\u3044\u307E\u3059\u304C\u3001\u8A8D\u8A3C\u78BA\u8A8D\u306B\u5931\u6557\u3057\u307E\u3057\u305F\u3002\n"));
      process.stdout.write(import_picocolors10.default.dim("  tc auth login \u3067\u518D\u8A8D\u8A3C\u3057\u3066\u304F\u3060\u3055\u3044\u3002\n"));
      return;
    }
    process.stdout.write(
      `${import_picocolors10.default.green("\u2713")} Logged in as ${import_picocolors10.default.cyan(user.email)} (${user.role})
`
    );
  }
});
var logoutCommand = (0, import_citty12.defineCommand)({
  meta: {
    name: "logout",
    description: "Remove stored credentials"
  },
  async run() {
    clearCredentials();
    process.stdout.write(`${import_picocolors10.default.green("\u2713")} \u30ED\u30B0\u30A2\u30A6\u30C8\u3057\u307E\u3057\u305F\u3002
`);
  }
});
var authCommand = (0, import_citty12.defineCommand)({
  meta: {
    name: "auth",
    description: "Manage authentication (login / whoami / logout)"
  },
  subCommands: {
    login: loginCommand,
    whoami: whoamiCommand,
    logout: logoutCommand
  }
});

// src/commands/issues/index.ts
var import_citty18 = require("citty");

// src/commands/issues/list.ts
var import_citty13 = require("citty");
var import_picocolors11 = __toESM(require("picocolors"), 1);
var listIssuesCommand = (0, import_citty13.defineCommand)({
  meta: {
    name: "list",
    description: "List issues"
  },
  args: {
    mine: {
      type: "boolean",
      description: "Show only my issues",
      default: false
    },
    status: {
      type: "string",
      description: "Filter by status (open / closed)"
    },
    "updated-since": {
      type: "string",
      description: "Filter issues updated since timestamp (unix seconds) or 'auto'"
    },
    json: {
      type: "boolean",
      description: "Output as JSON",
      default: false
    }
  },
  async run({ args }) {
    const items = await listIssues({
      mine: args.mine || void 0,
      status: args.status ? String(args.status) : void 0
    });
    if (args.json) {
      process.stdout.write(JSON.stringify(items, null, 2));
      return;
    }
    if (items.length === 0) {
      process.stdout.write(import_picocolors11.default.dim("\u30A4\u30B7\u30E5\u30FC\u304C\u3042\u308A\u307E\u305B\u3093\u3002\n"));
      return;
    }
    process.stdout.write(`${import_picocolors11.default.bold("Issues")} (${items.length})

`);
    for (const item of items) {
      const status = item.status === "open" ? import_picocolors11.default.green(item.status) : import_picocolors11.default.dim(item.status);
      process.stdout.write(`  TC-${item.id}  ${status}  ${item.title}
`);
    }
  }
});

// src/commands/issues/view.ts
var import_citty14 = require("citty");
var import_picocolors12 = __toESM(require("picocolors"), 1);
var viewIssueCommand = (0, import_citty14.defineCommand)({
  meta: {
    name: "view",
    description: "View an issue by TC-N ID"
  },
  args: {
    id: {
      type: "positional",
      description: "Issue ID (e.g. TC-42)",
      required: true
    }
  },
  async run({ args }) {
    const n3 = parseTcId(String(args.id));
    if (n3 === null) {
      process.stderr.write(import_picocolors12.default.red(`Invalid issue ID: ${args.id}
`));
      process.exit(1);
    }
    const { issue, messages } = await getIssue(n3);
    process.stdout.write(
      `${import_picocolors12.default.bold(issue.title)}
ID:      TC-${issue.id}
Status:  ${issue.status}
` + (issue.priority ? `Priority: ${issue.priority}
` : "") + (issue.source ? `Source:  ${issue.source}
` : "") + `
`
    );
    if (messages.length > 0) {
      process.stdout.write(`${import_picocolors12.default.bold("Messages")} (${messages.length})
`);
      for (const msg of messages) {
        process.stdout.write(`${import_picocolors12.default.dim("\u2500".repeat(40))}
${msg.body}
`);
      }
    }
  }
});

// src/commands/issues/create.ts
var import_citty15 = require("citty");
var import_picocolors13 = __toESM(require("picocolors"), 1);
var import_node_fs14 = require("fs");
var createIssueCommand = (0, import_citty15.defineCommand)({
  meta: {
    name: "create",
    description: "Create a new issue"
  },
  args: {
    title: {
      type: "string",
      description: "Issue title (required)",
      alias: "t",
      required: true
    },
    body: {
      type: "string",
      description: "Issue body or @file path",
      alias: "b"
    },
    priority: {
      type: "string",
      description: "Priority: low / medium / high / critical"
    },
    source: {
      type: "string",
      description: "Source identifier"
    },
    labels: {
      type: "string",
      description: "Comma-separated labels"
    }
  },
  async run({ args }) {
    const title = String(args.title);
    let body;
    if (args.body) {
      const raw = String(args.body);
      if (raw.startsWith("@")) {
        try {
          body = (0, import_node_fs14.readFileSync)(raw.slice(1), "utf8");
        } catch (err) {
          process.stderr.write(import_picocolors13.default.red(`File read error: ${err.message}
`));
          process.exit(1);
        }
      } else {
        body = raw;
      }
    }
    const labels = args.labels ? String(args.labels).split(",").map((s) => s.trim()).filter(Boolean) : void 0;
    const tcId = await createIssue({
      title,
      body,
      priority: args.priority ? String(args.priority) : void 0,
      source: args.source ? String(args.source) : void 0,
      labels
    });
    process.stdout.write(`${import_picocolors13.default.green("\u2713")} Created ${import_picocolors13.default.cyan(tcId)}
`);
  }
});

// src/commands/issues/comment.ts
var import_citty16 = require("citty");
var import_picocolors14 = __toESM(require("picocolors"), 1);
var import_node_fs15 = require("fs");
var commentIssueCommand = (0, import_citty16.defineCommand)({
  meta: {
    name: "comment",
    description: "Post a comment on an issue"
  },
  args: {
    id: {
      type: "positional",
      description: "Issue ID (e.g. TC-42)",
      required: true
    },
    body: {
      type: "string",
      description: "Comment body or @file path",
      alias: "b"
    }
  },
  async run({ args }) {
    const n3 = parseTcId(String(args.id));
    if (n3 === null) {
      process.stderr.write(import_picocolors14.default.red(`Invalid issue ID: ${args.id}
`));
      process.exit(1);
    }
    let body;
    if (args.body) {
      const raw = String(args.body);
      if (raw.startsWith("@")) {
        try {
          body = (0, import_node_fs15.readFileSync)(raw.slice(1), "utf8");
        } catch (err) {
          process.stderr.write(import_picocolors14.default.red(`File read error: ${err.message}
`));
          process.exit(1);
        }
      } else {
        body = raw;
      }
    } else {
      process.stderr.write(import_picocolors14.default.red("--body \u306F\u5FC5\u9808\u3067\u3059\u3002\n"));
      process.exit(1);
    }
    const msgId = await postMessage(n3, body);
    process.stdout.write(`${import_picocolors14.default.green("\u2713")} Comment posted (id: ${import_picocolors14.default.cyan(String(msgId))})
`);
  }
});

// src/commands/issues/resolve.ts
var import_citty17 = require("citty");
var import_picocolors15 = __toESM(require("picocolors"), 1);
var resolveIssueCommand = (0, import_citty17.defineCommand)({
  meta: {
    name: "resolve",
    description: "Resolve an issue"
  },
  args: {
    id: {
      type: "positional",
      description: "Issue ID (e.g. TC-42)",
      required: true
    }
  },
  async run({ args }) {
    const n3 = parseTcId(String(args.id));
    if (n3 === null) {
      process.stderr.write(import_picocolors15.default.red(`Invalid issue ID: ${args.id}
`));
      process.exit(1);
    }
    await resolveIssue(n3);
    process.stdout.write(`${import_picocolors15.default.green("\u2713")} Resolved TC-${n3}
`);
  }
});

// src/commands/issues/index.ts
var issuesCommand = (0, import_citty18.defineCommand)({
  meta: {
    name: "issues",
    description: "Manage issues (list / view / create / comment / resolve)"
  },
  subCommands: {
    list: listIssuesCommand,
    view: viewIssueCommand,
    create: createIssueCommand,
    comment: commentIssueCommand,
    resolve: resolveIssueCommand
  }
});

// src/commands/setup.ts
var import_citty19 = require("citty");
var import_picocolors16 = __toESM(require("picocolors"), 1);
var import_node_fs16 = require("fs");
var import_node_path13 = require("path");
var import_node_os3 = require("os");
var import_node_url = require("url");
var import_node_child_process = require("child_process");
var SKILL_NAMES = ["tc-discuss", "tc-research", "tc-research-idea"];
var TOML_SECTION = `
[mcp_servers.tickercode]
command = "tc"
args = ["mcp"]
env = { TICKERCODE_API_KEY = "$TICKERCODE_API_KEY" }
`.trim();
function upsertTomlSection(toml, sectionName, sectionBody) {
  const escaped = sectionName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`\\n?\\[${escaped}\\][\\s\\S]*?(?=\\n\\[|\\s*$)`);
  const section = `[${sectionName}]
${sectionBody.trim()}
`;
  if (re.test(toml)) {
    return toml.replace(re, `
${section}`);
  }
  const sep = toml && !toml.endsWith("\n\n") ? toml.endsWith("\n") ? "\n" : "\n\n" : "";
  return toml + sep + section;
}
function getSkillSourceRoot() {
  const here = (0, import_node_path13.dirname)((0, import_node_url.fileURLToPath)(importMetaUrl));
  for (const candidate of [
    (0, import_node_path13.join)(here, "..", "..", ".claude", "skills"),
    (0, import_node_path13.join)(here, "..", ".claude", "skills"),
    (0, import_node_path13.join)(here, "..", "..", "..", ".claude", "skills")
  ]) {
    if ((0, import_node_fs16.existsSync)(candidate)) return candidate;
  }
  throw new Error(
    `skill source not found near ${here}. Expected .claude/skills/ adjacent to the CLI package.`
  );
}
function getPluginMarketplaceRoot(kind) {
  const here = (0, import_node_path13.dirname)((0, import_node_url.fileURLToPath)(importMetaUrl));
  for (const candidate of [
    (0, import_node_path13.join)(here, "..", "..", "plugins", kind),
    (0, import_node_path13.join)(here, "..", "plugins", kind),
    (0, import_node_path13.join)(here, "..", "..", "..", "plugins", kind)
  ]) {
    if ((0, import_node_fs16.existsSync)(candidate)) return candidate;
  }
  throw new Error(
    `plugin marketplace root not found near ${here}. Expected plugins/${kind}/ adjacent to the CLI package.`
  );
}
function getSandboxMarketplaceRoot(name) {
  const here = (0, import_node_path13.dirname)((0, import_node_url.fileURLToPath)(importMetaUrl));
  for (const candidate of [
    (0, import_node_path13.join)(here, "..", "..", "..", "sandbox", name),
    (0, import_node_path13.join)(here, "..", "..", "sandbox", name),
    (0, import_node_path13.join)(here, "..", "sandbox", name)
  ]) {
    if ((0, import_node_fs16.existsSync)(candidate)) return candidate;
  }
  return void 0;
}
function copyDirRecursive(src, dst) {
  let count = 0;
  if (!(0, import_node_fs16.existsSync)(dst)) (0, import_node_fs16.mkdirSync)(dst, { recursive: true });
  for (const entry of (0, import_node_fs16.readdirSync)(src)) {
    const s = (0, import_node_path13.join)(src, entry);
    const d = (0, import_node_path13.join)(dst, entry);
    if ((0, import_node_fs16.statSync)(s).isDirectory()) {
      count += copyDirRecursive(s, d);
    } else {
      (0, import_node_fs16.copyFileSync)(s, d);
      count++;
    }
  }
  return count;
}
function stripFrontmatter(md) {
  if (!md.startsWith("---\n")) return md;
  const end = md.indexOf("\n---\n", 4);
  if (end === -1) return md;
  return md.slice(end + 5).trimStart();
}
function buildGeminiMd(skillSrcRoot) {
  const TICKERCODE_BLOCK_START = "<!-- tickercode-skills-start -->";
  const TICKERCODE_BLOCK_END = "<!-- tickercode-skills-end -->";
  const intro = `${TICKERCODE_BLOCK_START}

# Tickercode Skills (auto-generated by \`tc setup gemini\`)

ticker-code.com \u306E MCP server (\`mcp__tickercode__*\`) \u3068\u7D44\u307F\u5408\u308F\u305B\u3066\u4F7F\u3046\u6307\u5357\u66F8\u7FA4\u3002
\u30E6\u30FC\u30B6\u30FC\u304C\u65E5\u672C\u682A\u306E\u9298\u67C4\u3084\u30C6\u30FC\u30DE\u306B\u3064\u3044\u3066\u5C0B\u306D\u305F\u6642\u3001\u4EE5\u4E0B\u306E\u65B9\u91DD\u3067\u5BFE\u5FDC\u3057\u3066\u304F\u3060\u3055\u3044\u3002

`;
  const sections = [intro];
  for (const name of SKILL_NAMES) {
    const path = (0, import_node_path13.join)(skillSrcRoot, name, "SKILL.md");
    if (!(0, import_node_fs16.existsSync)(path)) continue;
    const body = stripFrontmatter((0, import_node_fs16.readFileSync)(path, "utf8"));
    sections.push(`
---

## Skill: ${name}

${body.trim()}
`);
  }
  sections.push(`
${TICKERCODE_BLOCK_END}
`);
  return sections.join("");
}
function upsertGeminiMd(geminiMdPath, generated) {
  const TICKERCODE_BLOCK_START = "<!-- tickercode-skills-start -->";
  const TICKERCODE_BLOCK_END = "<!-- tickercode-skills-end -->";
  const dir = (0, import_node_path13.dirname)(geminiMdPath);
  if (!(0, import_node_fs16.existsSync)(dir)) (0, import_node_fs16.mkdirSync)(dir, { recursive: true });
  if (!(0, import_node_fs16.existsSync)(geminiMdPath)) {
    (0, import_node_fs16.writeFileSync)(geminiMdPath, generated, "utf8");
    return "created";
  }
  const existing = (0, import_node_fs16.readFileSync)(geminiMdPath, "utf8");
  if (existing.includes(TICKERCODE_BLOCK_START) && existing.includes(TICKERCODE_BLOCK_END)) {
    const before = existing.slice(0, existing.indexOf(TICKERCODE_BLOCK_START));
    const after = existing.slice(
      existing.indexOf(TICKERCODE_BLOCK_END) + TICKERCODE_BLOCK_END.length
    );
    (0, import_node_fs16.writeFileSync)(geminiMdPath, before + generated + after, "utf8");
    return "updated";
  }
  const sep = existing && !existing.endsWith("\n\n") ? existing.endsWith("\n") ? "\n" : "\n\n" : "";
  (0, import_node_fs16.writeFileSync)(geminiMdPath, existing + sep + generated, "utf8");
  return "appended";
}
function upsertJsonMcpServer(settingsPath, serverName, serverConfig, force) {
  const dir = (0, import_node_path13.dirname)(settingsPath);
  if (!(0, import_node_fs16.existsSync)(dir)) (0, import_node_fs16.mkdirSync)(dir, { recursive: true });
  let parsed = {};
  if ((0, import_node_fs16.existsSync)(settingsPath)) {
    try {
      const raw = (0, import_node_fs16.readFileSync)(settingsPath, "utf8").trim();
      parsed = raw ? JSON.parse(raw) : {};
    } catch (err) {
      throw new Error(
        `${settingsPath} \u306E\u30D1\u30FC\u30B9\u306B\u5931\u6557\u3057\u307E\u3057\u305F: ${err.message}`
      );
    }
  }
  const mcpServers = parsed.mcpServers ?? {};
  const existed = serverName in mcpServers;
  if (existed && !force) return "skipped";
  mcpServers[serverName] = serverConfig;
  parsed.mcpServers = mcpServers;
  (0, import_node_fs16.writeFileSync)(settingsPath, JSON.stringify(parsed, null, 2) + "\n", "utf8");
  if (!(0, import_node_fs16.existsSync)(settingsPath)) return "created";
  return existed ? "updated" : "added";
}
function upsertCodexPluginConfig(configPath, marketplacePath, force) {
  const configDir = (0, import_node_path13.dirname)(configPath);
  if (!(0, import_node_fs16.existsSync)(configDir)) (0, import_node_fs16.mkdirSync)(configDir, { recursive: true });
  const existingToml = (0, import_node_fs16.existsSync)(configPath) ? (0, import_node_fs16.readFileSync)(configPath, "utf8") : "";
  const hasMarketplace = existingToml.includes("[marketplaces.tickercode]");
  const hasPlugin = existingToml.includes('[plugins."tickercode@tickercode"]');
  if (hasMarketplace && hasPlugin && !force) return "skipped";
  let nextToml = upsertTomlSection(
    existingToml,
    "marketplaces.tickercode",
    `source_type = "local"
source = ${JSON.stringify(marketplacePath)}`
  );
  nextToml = upsertTomlSection(
    nextToml,
    'plugins."tickercode@tickercode"',
    "enabled = true"
  );
  (0, import_node_fs16.writeFileSync)(configPath, nextToml, "utf8");
  return hasMarketplace || hasPlugin ? "updated" : "added";
}
function runLoggedCommand(command, args) {
  process.stdout.write(import_picocolors16.default.dim(`  $ ${command} ${args.join(" ")}
`));
  const result = (0, import_node_child_process.spawnSync)(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with exit code ${result.status}`);
  }
}
var codexCommand = (0, import_citty19.defineCommand)({
  meta: {
    name: "codex",
    description: "Setup tickercode skills + MCP server for Codex CLI"
  },
  args: {
    "skills-dir": {
      type: "string",
      description: "Where to copy skill bundles (default: ~/.agents/skills)"
    },
    "config-path": {
      type: "string",
      description: "Codex config TOML path (default: ~/.codex/config.toml)"
    },
    plugin: {
      type: "boolean",
      description: "Register the local Codex plugin marketplace and enable tickercode@tickercode",
      default: false
    },
    "marketplace-path": {
      type: "string",
      description: "Codex plugin marketplace root (default: packaged plugins/codex)"
    },
    force: {
      type: "boolean",
      description: "Overwrite existing [mcp_servers.tickercode] section",
      default: false
    }
  },
  async run({ args }) {
    const skillsDir = args["skills-dir"] ? String(args["skills-dir"]) : (0, import_node_path13.join)((0, import_node_os3.homedir)(), ".agents", "skills");
    const configPath = args["config-path"] ? String(args["config-path"]) : (0, import_node_path13.join)((0, import_node_os3.homedir)(), ".codex", "config.toml");
    const marketplacePath = args["marketplace-path"] ? String(args["marketplace-path"]) : getSandboxMarketplaceRoot("tc-codex-plugin") ?? getPluginMarketplaceRoot("codex");
    process.stdout.write(import_picocolors16.default.bold("Setting up tickercode for Codex CLI\u2026\n"));
    if (args.plugin) {
      const action = upsertCodexPluginConfig(
        configPath,
        marketplacePath,
        Boolean(args.force)
      );
      if (action === "skipped") {
        process.stdout.write(
          import_picocolors16.default.dim(`  - ${configPath} \u306B plugin marketplace \u65E2\u5B58\u3001skip\uFF08--force \u3067\u4E0A\u66F8\u304D\uFF09
`)
        );
      } else {
        const verb = action === "updated" ? "\u306E plugin marketplace \u3092\u66F4\u65B0" : "\u306B plugin marketplace \u3092\u8FFD\u8A18";
        process.stdout.write(`  ${import_picocolors16.default.green("\u2713")} ${configPath} ${verb}
`);
      }
    }
    const configDir = (0, import_node_path13.dirname)(configPath);
    if (!(0, import_node_fs16.existsSync)(configDir)) (0, import_node_fs16.mkdirSync)(configDir, { recursive: true });
    const existingToml = (0, import_node_fs16.existsSync)(configPath) ? (0, import_node_fs16.readFileSync)(configPath, "utf8") : "";
    const hasSection = existingToml.includes("[mcp_servers.tickercode]");
    if (hasSection && !args.force) {
      process.stdout.write(
        import_picocolors16.default.dim(`  - ${configPath} \u306B\u65E2\u5B58\u3001skip\uFF08--force \u3067\u4E0A\u66F8\u304D\uFF09
`)
      );
    } else if (hasSection && args.force) {
      const replaced = existingToml.replace(
        /\[mcp_servers\.tickercode\][\s\S]*?(?=\n\[|$)/,
        `${TOML_SECTION}
`
      );
      (0, import_node_fs16.writeFileSync)(configPath, replaced, "utf8");
      process.stdout.write(`  ${import_picocolors16.default.green("\u2713")} ${configPath} \u306E\u65E2\u5B58\u30BB\u30AF\u30B7\u30E7\u30F3\u3092\u66F4\u65B0
`);
    } else {
      const sep = existingToml && !existingToml.endsWith("\n\n") ? existingToml.endsWith("\n") ? "\n" : "\n\n" : "";
      const newToml = existingToml + sep + TOML_SECTION + "\n";
      (0, import_node_fs16.writeFileSync)(configPath, newToml, "utf8");
      process.stdout.write(
        `  ${import_picocolors16.default.green("\u2713")} ${configPath} \u306B MCP server \u8A2D\u5B9A\u3092\u8FFD\u8A18
`
      );
    }
    const skillSrcRoot = getSkillSourceRoot();
    let totalCopied = 0;
    for (const name of SKILL_NAMES) {
      const src = (0, import_node_path13.join)(skillSrcRoot, name);
      const dst = (0, import_node_path13.join)(skillsDir, name);
      if (!(0, import_node_fs16.existsSync)(src)) {
        process.stdout.write(import_picocolors16.default.dim(`  - ${name}: source not found, skip
`));
        continue;
      }
      const n3 = copyDirRecursive(src, dst);
      totalCopied += n3;
      process.stdout.write(
        `  ${import_picocolors16.default.green("\u2713")} ${name} \u2192 ${dst} (${n3} files)
`
      );
    }
    process.stdout.write(`
${import_picocolors16.default.bold("\u5B8C\u4E86")}: ${totalCopied} files copied
`);
    process.stdout.write(
      import_picocolors16.default.dim(`  - tc auth login\uFF08\u672A\u5B9F\u884C\u306A\u3089\uFF09\u3067 API key \u3092\u8A2D\u5B9A
`)
    );
    process.stdout.write(
      import_picocolors16.default.dim(`  - codex \u3092\u8D77\u52D5\u3057\u300C6594 \u306E\u30C7\u30A3\u30B9\u30AB\u30C3\u30B7\u30E7\u30F3\u300D\u3068\u6253\u3063\u3066\u307F\u308B
`)
    );
  }
});
var geminiCommand = (0, import_citty19.defineCommand)({
  meta: {
    name: "gemini",
    description: "Setup tickercode MCP + GEMINI.md for Gemini CLI"
  },
  args: {
    "settings-path": {
      type: "string",
      description: "Gemini settings.json path (default: ~/.gemini/settings.json)"
    },
    "gemini-md-path": {
      type: "string",
      description: "GEMINI.md path (default: ~/.gemini/GEMINI.md)"
    },
    force: {
      type: "boolean",
      description: "Overwrite existing tickercode entry / GEMINI.md block",
      default: false
    }
  },
  async run({ args }) {
    const settingsPath = args["settings-path"] ? String(args["settings-path"]) : (0, import_node_path13.join)((0, import_node_os3.homedir)(), ".gemini", "settings.json");
    const geminiMdPath = args["gemini-md-path"] ? String(args["gemini-md-path"]) : (0, import_node_path13.join)((0, import_node_os3.homedir)(), ".gemini", "GEMINI.md");
    process.stdout.write(import_picocolors16.default.bold("Setting up tickercode for Gemini CLI\u2026\n"));
    const action = upsertJsonMcpServer(
      settingsPath,
      "tickercode",
      {
        command: "tc",
        args: ["mcp"],
        env: { TICKERCODE_API_KEY: "$TICKERCODE_API_KEY" }
      },
      Boolean(args.force)
    );
    if (action === "skipped") {
      process.stdout.write(
        import_picocolors16.default.dim(`  - ${settingsPath} \u306B\u65E2\u5B58\u3001skip\uFF08--force \u3067\u4E0A\u66F8\u304D\uFF09
`)
      );
    } else {
      const verb = action === "updated" ? "\u306E\u65E2\u5B58\u30A8\u30F3\u30C8\u30EA\u3092\u66F4\u65B0" : "\u306B MCP server \u8A2D\u5B9A\u3092\u8FFD\u8A18";
      process.stdout.write(`  ${import_picocolors16.default.green("\u2713")} ${settingsPath} ${verb}
`);
    }
    const skillSrcRoot = getSkillSourceRoot();
    const generated = buildGeminiMd(skillSrcRoot);
    const mdAction = upsertGeminiMd(geminiMdPath, generated);
    const mdVerb = mdAction === "created" ? "\u3092\u65B0\u898F\u4F5C\u6210" : mdAction === "updated" ? "\u306E tickercode \u30D6\u30ED\u30C3\u30AF\u3092\u66F4\u65B0" : "\u306B tickercode \u30D6\u30ED\u30C3\u30AF\u3092\u8FFD\u8A18";
    process.stdout.write(`  ${import_picocolors16.default.green("\u2713")} ${geminiMdPath} ${mdVerb}
`);
    process.stdout.write(`
${import_picocolors16.default.bold("\u5B8C\u4E86")}
`);
    process.stdout.write(
      import_picocolors16.default.dim(`  - tc auth login\uFF08\u672A\u5B9F\u884C\u306A\u3089\uFF09\u3067 API key \u3092\u8A2D\u5B9A
`)
    );
    process.stdout.write(
      import_picocolors16.default.dim(`  - gemini \u3092\u8D77\u52D5\u3057\u300C6594 \u306E\u30C7\u30A3\u30B9\u30AB\u30C3\u30B7\u30E7\u30F3\u300D\u3068\u6253\u3063\u3066\u307F\u308B
`)
    );
  }
});
var claudeCommand = (0, import_citty19.defineCommand)({
  meta: {
    name: "claude",
    description: "Setup tickercode plugin for Claude Code"
  },
  args: {
    "marketplace-path": {
      type: "string",
      description: "Claude Code marketplace root (default: packaged plugins/claude-code)"
    },
    install: {
      type: "boolean",
      description: "Run Claude Code plugin marketplace add + plugin install",
      default: false
    },
    scope: {
      type: "string",
      description: "Claude Code plugin install scope: user, project, or local (default: user)",
      default: "user"
    }
  },
  async run({ args }) {
    const marketplacePath = args["marketplace-path"] ? String(args["marketplace-path"]) : getSandboxMarketplaceRoot("tc-claude-plugin") ?? getPluginMarketplaceRoot("claude-code");
    const scope = String(args.scope ?? "user");
    process.stdout.write(import_picocolors16.default.bold("Setting up tickercode for Claude Code\u2026\n"));
    if (args.install) {
      process.stdout.write(import_picocolors16.default.dim("Installing via Claude Code plugin CLI.\n\n"));
      runLoggedCommand("claude", ["plugin", "validate", marketplacePath]);
      runLoggedCommand("claude", [
        "plugin",
        "marketplace",
        "add",
        "--scope",
        scope,
        marketplacePath
      ]);
      runLoggedCommand("claude", [
        "plugin",
        "install",
        "--scope",
        scope,
        "tickercode@tickercode"
      ]);
      process.stdout.write(`
${import_picocolors16.default.bold("\u5B8C\u4E86")}: tickercode@tickercode installed (${scope})
`);
      process.stdout.write(import_picocolors16.default.dim("  - Claude Code \u3092\u518D\u8D77\u52D5\u3001\u307E\u305F\u306F /reload-plugins \u3092\u5B9F\u884C\n"));
      process.stdout.write(import_picocolors16.default.dim("  - /mcp \u3067 plugin:tickercode:tickercode \u304C Connected \u304B\u78BA\u8A8D\n"));
      return;
    }
    process.stdout.write(
      import_picocolors16.default.dim("Claude Code plugins are installed from inside Claude Code.\n\n")
    );
    process.stdout.write("Run this command from a shell:\n\n");
    process.stdout.write(`${import_picocolors16.default.cyan(`tc setup claude --install --marketplace-path ${marketplacePath}`)}

`);
    process.stdout.write("Or run these commands in Claude Code:\n\n");
    process.stdout.write(`${import_picocolors16.default.cyan(`/plugin marketplace add ${marketplacePath}`)}
`);
    process.stdout.write(`${import_picocolors16.default.cyan(`/plugin install tickercode@tickercode`)}
`);
    process.stdout.write(`${import_picocolors16.default.cyan("/reload-plugins")}

`);
    process.stdout.write(import_picocolors16.default.bold("After install:\n"));
    process.stdout.write(import_picocolors16.default.dim("  - tc auth login\uFF08\u672A\u5B9F\u884C\u306A\u3089\uFF09\u3067 API key \u3092\u8A2D\u5B9A\n"));
    process.stdout.write(import_picocolors16.default.dim("  - /mcp \u3067 tickercode \u304C listed \u3055\u308C\u308B\u304B\u78BA\u8A8D\n"));
    process.stdout.write(
      import_picocolors16.default.dim("  - \u300C6594 \u306E\u6295\u8CC7\u89B3\u70B9\u3092\u5206\u6790\u3057\u3066\u300D\u3068\u6253\u3063\u3066\u52D5\u4F5C\u78BA\u8A8D\n")
    );
  }
});
var setupCommand = (0, import_citty19.defineCommand)({
  meta: {
    name: "setup",
    description: "Setup tickercode for various CLI clients (claude / codex / gemini)"
  },
  subCommands: {
    claude: claudeCommand,
    codex: codexCommand,
    gemini: geminiCommand
  }
});

// src/cli.ts
var VERSION = package_default.version;
var main = (0, import_citty20.defineCommand)({
  meta: {
    name: "tc",
    version: VERSION,
    description: "@tickercode/cli \u2014 Japanese stock analysis from the command line"
  },
  subCommands: {
    stock: stockCommand,
    financial: financialCommand,
    screen: screenCommand,
    rank: rankCommand,
    disclosures: disclosuresCommand,
    overview: overviewCommand,
    "research-idea": researchIdeaCommand,
    "research-batch": researchBatchCommand,
    mcp: mcpCommand,
    memory: memoryCommand,
    report: reportCommand,
    auth: authCommand,
    issues: issuesCommand,
    setup: setupCommand
  }
});
(0, import_citty20.runMain)(main);
//# sourceMappingURL=cli.cjs.map