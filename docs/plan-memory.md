# .tickercode/memory — 統一ダウンロード領域計画

作成: 2026-04-21
契機: `get_financial` 346K 問題 → 生データは **ファイルに落とし、Agent は Read + jq で拾う** のが本質解

## 核心アイデア

**「ダウンロードはファイルに、MCP は必要最小限の返答 or ファイルパス、Agent は Read + jq で切り出す」**

これが成立すると：
- ✅ MCP の context オーバー問題は **完全消滅**
- ✅ オフラインで何度でも分析可能
- ✅ jq / awk / grep という Unix の巨人軍団が使える
- ✅ Agent も人間も **同じファイル**を見る（二重のデータパスがない）
- ✅ tickercode-analyst の `database/{code}_{name}/json/` 設計と整合（内部ツール再利用時も自然）

---

## 1. ディレクトリ構造

```
~/.tickercode/memory/                       ← グローバル（全プロジェクト共通）
├── mini.json                               3750 銘柄サマリ（R2 CDN）
├── mini.meta.json                          { last_fetch, ttl, count }
├── code/
│   ├── 2418/
│   │   ├── overview.json                   POST /api/full/stock
│   │   ├── financial.json                  POST /api/full/financials
│   │   ├── edinet.json                     POST /api/edinet/text
│   │   ├── disclosure.json                 POST /api/disclosure/recent
│   │   ├── news.json                       POST /api/news/feed
│   │   ├── segments.json                   POST /api/segment/summary
│   │   ├── technical.json                  POST /api/technical/indicators
│   │   ├── splits.json                     POST /api/full/splits
│   │   └── .meta.json                      { endpoint: { last_fetch, hash } }
│   ├── 7203/
│   ├── 6758/
│   └── ...
├── index.json                              { codes: [...], total, last_sync }
└── config.json                             { api_base, ttl_by_endpoint, ... }
```

**グローバル配置の理由**:
- Claude Code を別プロジェクトで開いても同じキャッシュを使える
- 容量は 1 銘柄 ~200KB × 100 銘柄で 20MB 程度（無視できる）
- `~/.tickercode/` は CLAUDE.md 等の他の個人設定領域と整合

**プロジェクト配置との併用**:
- `./.tickercode/watchlist.json` のような **プロジェクトローカル**の設定は残す
- `./tickercode-cli/.tickercode/` は dev 時のみ、publish 後のユーザーは `~/.tickercode/` 単独

---

## 2. メタデータ設計

### `~/.tickercode/memory/code/2418/.meta.json`
```json
{
  "code": "24180",
  "display_code": "2418",
  "name": "ツカダ・グローバルホールディング",
  "endpoints": {
    "overview":    { "last_fetch": "2026-04-21T12:03:00Z", "bytes": 4512 },
    "financial":   { "last_fetch": "2026-04-21T12:03:00Z", "bytes": 346000 },
    "edinet":      { "last_fetch": "2026-04-21T12:03:00Z", "bytes": 89000 },
    "disclosure":  { "last_fetch": "2026-04-21T12:03:00Z", "bytes": 12000 }
  },
  "updated_at": "2026-04-21T12:03:00Z"
}
```

### `~/.tickercode/memory/index.json`
```json
{
  "codes": ["2418", "7203", "6758", "9984", "7974"],
  "total": 5,
  "last_sync": "2026-04-21T12:03:00Z",
  "mini_json": { "last_fetch": "2026-04-21T11:00:00Z", "count": 3750 }
}
```

### TTL（エンドポイント別）
```ts
const DEFAULT_TTL: Record<string, number> = {
  mini:        4 * 3600,      // 4h（mini.json）
  overview:    1 * 3600,      // 1h（株価含むため短め）
  financial:   24 * 3600,     // 24h（四半期開示）
  segments:    24 * 3600,
  technical:   1 * 3600,      // 1h（テクニカル指標）
  edinet:      7 * 24 * 3600, // 7d（有報はほぼ更新なし）
  disclosure:  1 * 3600,      // 1h（適時開示）
  news:        1 * 3600,      // 1h
  splits:      30 * 24 * 3600,// 30d（分割はレア）
}
```

---

## 3. コマンド設計

### Sync 系
```bash
# 全体同期（mini.json のみ）
tc memory sync                                 # mini.json を更新
tc memory sync --force

# 銘柄単位
tc memory fetch 2418                           # 全 endpoint を 1 銘柄ダウンロード
tc memory fetch 2418 --only overview,financial # 指定 endpoint のみ
tc memory fetch 2418 --force                   # TTL 無視

# 複数銘柄
tc memory fetch 7203 6758 9984 7974            # 4 銘柄を並列取得

# watchlist 全員同期
tc memory sync-watchlist                       # watchlist.json 全銘柄を fetch

# 予約同期（cron 向け）
tc memory cron                                 # 期限切れだけ更新
```

### Query 系（ファイルから読むだけ、ネット不要）
```bash
# 生データ出力（= cat だが meta 付き）
tc memory cat 2418 overview                    # overview.json を標準出力
tc memory cat 2418 financial | jq '.[0]'       # 最新期だけ

# パス取得（Agent が Read ツールで直接読む用）
tc memory where 2418                           # /Users/.../2418/
tc memory where 2418 overview                  # /Users/.../2418/overview.json
tc memory where mini                           # /Users/.../mini.json

# 状態確認
tc memory list                                 # キャッシュ済み銘柄一覧
tc memory list --sector 半導体                 # セクターで絞り込み
tc memory stats                                # 容量 / 銘柄数 / 鮮度
tc memory stale                                # TTL 切れの一覧

# クリーンアップ
tc memory clean --older-than 30d               # 古い銘柄を削除
tc memory clean --code 2418                    # 特定銘柄削除
tc memory clean --all --yes                    # 全削除（確認必須）
```

### Info 系
```bash
tc memory show 2418                            # meta.json を整形表示
tc memory diff 2418 financial                  # 前回取得 vs 今回の差分
tc memory history 2418                         # fetch 履歴
```

---

## 4. MCP tool 設計（context 軽量化）

### 原則
- 生データは **返さない**（ファイルにある）
- 返すのは: **サマリ** / **パス** / **計算結果**

### Tool 一覧

| tool | 返すもの | context コスト |
|------|--------|--------------|
| `fetch_stock(code, endpoints?)` | 取得結果サマリ + 保存パス | ~300 chars |
| `memory_path(code, type)` | ファイルの絶対パス | ~100 chars |
| `memory_where(code)` | 銘柄ディレクトリ | ~100 chars |
| `memory_list()` | キャッシュ済み銘柄コード配列 | ~1K chars |
| `memory_stats()` | 全体統計 | ~300 chars |
| `get_stock_summary(code)` | overview.json から 15 項目だけ抽出 | ~1K chars |
| `get_financial_summary(code)` | 最新期 + 1 年前のキー指標 | ~1K chars |
| `get_financial_trend(code, metric, periods)` | 時系列データ | ~500 chars |

### Agent の使い方パターン

**パターン A: Agent が直接ファイルを読む（推奨）**
```
Agent: fetch_stock("2418")
  → { path: "/Users/.../2418/", files: ["overview.json", "financial.json"], ... }
Agent: Read("/Users/.../2418/financial.json")
  → 346K chars だが Agent は Read ツールで file view するため context には直接 dump されない
Agent: Bash("cat /Users/.../2418/financial.json | jq '.[0].pl_net_sales'")
  → 1 行だけ context に入る
```

**パターン B: Agent が summary tool を呼ぶ**
```
Agent: get_financial_summary("2418")
  → { period: "2025-12", sales: 77797M, operating_profit: 10095M, ... } ~15 項目
```

どちらも **context に 346K 流れない**。

---

## 5. Skill 側の再設計

`.claude/skills/tc-research/SKILL.md` を **「ファイル読み前提」** に更新：

```markdown
## Step 1. データ取得

fetch_stock(code) で全 endpoint を ~/.tickercode/memory/code/{code}/ に保存する。
fetch_stock は返答が軽い（ファイルパスと件数のみ）ので context を食わない。

## Step 2. 必要な部分だけ読む

- 企業概要 → overview.json の company_name, sector, market_cap, employees
- 株価・指標 → overview.json の stock_price, i_per, i_pbr, i_dividend_yield
- 収益性 → get_financial_summary(code) の margin 系
- 成長性 → get_financial_trend(code, 'pl_net_sales', 5)
- 財務健全性 → get_financial_summary(code) の自己資本比率・流動比率
- 事業内容 → edinet.json を Read して「事業概要」セクションを抽出

## Step 3. レポート生成

取得したサマリ + トレンドから 7 セクション構成でレポート作成。
```

---

## 6. tickercode-analyst との関係

analyst は社内編集部ツール（本プロジェクト外）。ただし **データ取得構造は同一思想**:

| 項目 | tickercode-analyst | @tickercode/cli (本計画) |
|------|-------------------|-------------------------|
| 構造 | `database/{code}_{name}/json/*.json` | `~/.tickercode/memory/code/{code}/*.json` |
| 命名 | overview は `stock.json` など | overview / financial / edinet で統一 |
| 更新 | 手動 `bun run fetch <code>` | `tc memory fetch <code>` |
| 用途 | 編集部レポート作成 | 公開 CLI + Agent |

将来、analyst が `@tickercode/cli` の memory 層を共用できるよう、`--memory-dir` フラグで場所を上書きできるようにする。

---

## 7. 3 つの計画の統合

今までの 3 つの計画を **memory 領域** で統一する：

```
        ┌──── plan.md（Phase 0: 基盤）
        ├──── plan.md（Phase 2A/B: MCP + Skill）
        └──── plan-terminal.md（Phase 3: mini.json スクリーニング）
              plan-financial-analysis.md（Phase 4: 財務分析）
                      ↓ 統合
        plan-memory.md（本計画）
          │
          ├── Layer 1: Raw Cache → ~/.tickercode/memory/
          ├── Layer 2: Query     → tc memory cat / where / list
          ├── Layer 3: Screen    → mini.json ベースの tc screen / top / compare
          └── Layer 4: Analyze   → financial ベースの tc trend / analyze
```

**本計画が採用されると、前 2 計画はこの下に位置付けられる**:
- `plan-terminal.md` の mini.json 取得 → `tc memory sync`
- `plan-financial-analysis.md` のキャッシュ → `~/.tickercode/memory/code/{code}/financial.json`

---

## 8. 実装ロードマップ

### Phase 3A — Memory 基盤（1 日）
- [ ] `src/memory/paths.ts` — ディレクトリ配置 + 既定値
- [ ] `src/memory/meta.ts` — `.meta.json` / `index.json` 読み書き
- [ ] `src/memory/fetch.ts` — endpoint 配列を fetch → 保存
- [ ] `src/memory/query.ts` — `cat` / `where` / `list` / `stats`
- [ ] `src/commands/memory.ts` — サブコマンド群
- [ ] TTL ロジック + `--force` 対応
- [ ] テスト: fetch → ファイル存在 → meta 更新 → stats 表示

### Phase 3B — MCP 拡張（半日）
- [ ] `fetch_stock(code, endpoints?)` tool
- [ ] `memory_path(code, type)` tool
- [ ] `memory_list()` tool
- [ ] `get_stock_summary(code)` tool（overview から 15 項目）
- [ ] `get_financial_summary(code)` tool（最新 + 1 年前）
- [ ] `get_financial_trend(code, metric, periods)` tool

### Phase 3C — Skill 更新（半日）
- [ ] `.claude/skills/tc-research/SKILL.md` を memory 版に書き換え
- [ ] 実機検証: 2418 で再実行、context 消費が劇的に下がるか測定

### Phase 3D — mini.json 統合（1 日）
- [ ] `tc memory sync` = mini.json 取得
- [ ] 既存の `plan-terminal.md` の `tc list / screen / top / compare` を memory/mini.json 読みに統一
- [ ] MCP tool `query_stocks` も memory 版に

### Phase 3E — 財務分析統合（2 日）
- [ ] `tc financial --field / --compute` を memory/code/{code}/financial.json 読みに
- [ ] `tc trend / diff / analyze` を実装
- [ ] `plan-financial-analysis.md` のテンプレート群を memory 経由で

---

## 9. 未確定事項

### Q-1. memory のルートディレクトリ
1. **`~/.tickercode/memory/`（グローバル）** ← 推奨
2. `./.tickercode/memory/`（プロジェクトローカル）
3. 両対応（`--memory-dir` フラグで上書き、既定はグローバル）← 最柔軟

### Q-2. endpoint セット（Phase 3A の初版）
1. **overview + financial のみ**（最小検証）
2. overview + financial + edinet + disclosure + news（tc-research が使う 5 本）← 推奨
3. 全 8 endpoint（splits / segments / technical 含む）

### Q-3. mini.json の置き場所
1. **`~/.tickercode/memory/mini.json`（他と統合）** ← 推奨
2. `~/.tickercode/cache/mini.json`（別ディレクトリ）
3. `./.tickercode/mini.json`

### Q-4. `tc memory fetch` は全 endpoint 並列？ 逐次？
1. **並列**（高速、API に同時 8 本のリクエスト） ← 推奨
2. 逐次（API 負荷低減）
3. `--concurrency N` で制御可能に

### Q-5. Skill 側の変更タイミング
1. **Phase 3B の MCP 拡張完了後、即 Skill を書き換え** ← 推奨
2. Phase 3A 完了後、fetch_stock を使うだけの薄い Skill に即更新
3. Phase 3 全完了後に一括更新

### Q-6. 既存 `get_financial` MCP tool の扱い
1. **`get_financial_raw` に rename + deprecated 警告**（後方互換）
2. **既存を削除、`fetch_stock` + `get_financial_summary` に置き換え** ← 推奨
3. 新 tool 群だけ追加、既存はそのまま残す

---

## 10. 成功の定義

Phase 3A + 3B + 3C 完了時点で：

- [ ] `tc memory fetch 2418` で 5 ファイルが `~/.tickercode/memory/code/2418/` に降りる
- [ ] `cat ~/.tickercode/memory/code/2418/financial.json | jq '.[0].pl_net_sales'` が 1 行で答える
- [ ] Claude Code で `/tc-research 2418` を実行し、**context 消費が 346K → 5K 以下に劇的減少**
- [ ] `tc memory stats` がキャッシュ全体の統計を出す
- [ ] `tc memory where 2418` で `/Users/.../2418/` を返す（Agent が Read ツールで使える）
- [ ] MCP tool `get_financial_summary` が 1K chars 以内の JSON を返す
- [ ] dogfood-log の 🔥 重大問題が解消済みに

---

## 11. なぜこの設計が強いか

| 観点 | メリット |
|------|---------|
| context 圧迫 | 生データを context に流さない。Agent は Read + jq で切り出す |
| オフライン | 一度 fetch すれば API 不要 |
| Unix 哲学 | jq / awk / grep / sort / uniq がそのまま使える |
| 人間と Agent が同じものを見る | `.tickercode/memory/` は両者の共通基盤 |
| analyst と整合 | 構造が同じなので将来統合しやすい |
| 世代管理 | ファイル mtime で鮮度が見える、diff で前回比較可能 |
| 拡張性 | 新 endpoint は 1 ファイル追加するだけ |

---

## 12. 破壊的変更に注意

既存 `tc financial` / MCP `get_financial` は **完全に置き換わる** 想定。

- `tc financial 7203` → 直接 API ではなく、memory を見る → 無ければ fetch する、という動きに変更
- MCP `get_financial` tool → 廃止 or rename
- `plan-terminal.md` / `plan-financial-analysis.md` は **本計画に吸収**され、個別実装はされない

この整理でよければ、不要な 2 plan は「廃止済み」マークを付ける。
