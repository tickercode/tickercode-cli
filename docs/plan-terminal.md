# tc terminal — ローカル高速スクリーニング CLI 計画

作成: 2026-04-21

## 1. 目的

ticker-code.com の Web 版 Terminal（多機能スクリーナー UI）を **CLI で完全再現** する。

**肝**: R2 CDN の `mini.json`（6.5MB, 3750 銘柄 × 55 フィールド）をローカルにダウンロードして **in-memory でミリ秒スクリーニング**。API 叩きっぱなしより速く、オフラインでも動く。

### 位置付け

| 既存 | 役割 |
|------|------|
| `tc stock <code>` | 単銘柄 API 呼び出し（1銘柄深堀り） |
| `tc financial <code>` | 単銘柄財務 |
| `tc mcp` | MCP 経由で Claude から tool 呼び出し |
| **新: `tc sync` / `tc screen` / `tc top` 等** | **3750 銘柄一括処理、ローカル高速** |

---

## 2. データフロー

```
BE: jpx_full_ratio → cache-r2-mini → R2 CDN (mini.json 6.5MB, 3750銘柄×55フィールド)
    └─ daily-calculate-ratio 完了後に refreshCdnMini() で自動更新（10分おき）

CLI: R2 CDN mini.json
      ↓ tc sync（TTL 4h）
     ~/.tickercode/cache/mini.json
      ↓ load (in-memory)
     Stock[] （3750 件）
      ↓ filter / sort / compare / stats
     stdout (table / json / csv) | ~/.tickercode/watchlist.json | MCP tool
```

### キャッシュ仕様

- **保存先**: `~/.tickercode/cache/mini.json`
- **TTL**: 4 時間（Web 側 IndexedDB と同値）
- **force 更新**: `tc sync --force`
- **更新チェック**: コマンド実行時に TTL を確認、切れていれば自動で再取得 + 警告表示（ユーザー明示 sync を推奨）

---

## 3. コマンド設計（Stage 1 — 非対話）

```bash
# 同期
tc sync                                       # mini.json をダウンロード（TTL 判定）
tc sync --force                               # 強制更新
tc sync --show                                # キャッシュ状態表示（last_fetch, TTL 残り）

# 一覧・検索
tc list                                       # 全銘柄（ページング、既定 20件）
tc list --sector "半導体" --market "プライム"
tc list --limit 100
tc find "トヨタ"                              # 名前/英名/コードで検索

# スクリーニング
tc screen --per "<15" --dy ">3" --pbr "<1.5"  # フラグ形式
tc screen --query "per<15 AND dy>3"           # DSL（Claude に優しい）
tc screen --sector "半導体" --per "<20"        # 複合

# ランキング
tc top per --limit 20                         # 低 PER top20
tc top dy --desc --limit 20                   # 高配当 top20
tc top yoy2y_sales --limit 20                 # 売上成長 top20
tc top roe --limit 20                         # 高 ROE top20

# 比較
tc compare 7203 6758 9984                     # 横並びテーブル
tc compare 7203 6758 9984 -f md               # Markdown 出力

# 集計
tc sector                                     # セクター別件数 + 平均 PER/PBR/DY
tc sector 半導体                              # 半導体の銘柄一覧 + 統計
tc stats                                      # 全体統計（PER 分布、平均、中央値）

# Watchlist
tc watch add 7203 6758 9984                   # 追加
tc watch add 7203 --note "長期保有検討"
tc watch remove 7203
tc watch list                                 # 表示
tc watch screen --per "<15"                   # watchlist 内でフィルタ
```

### 出力フォーマット（既存と整合）

- `--format pretty` / `-f p`（既定）— cli-table3 + picocolors
- `--format json` / `-f j` — Agent / パイプ向け
- `--format csv` / `-f c` — Excel / Google Sheets 貼付
- `--format md` / `-f md` — レポート貼付

---

## 4. Stage 2 — 対話 TUI `tc terminal`（将来）

**Ink**（React for CLI）ベースの Bloomberg Terminal 風多ペイン UI。

```
┌─ Watchlist ─────┬─ Stock List (3750) ──────────────────────────────┐
│ 7203 トヨタ     │ code  name         price    per    dy     yoy%   │
│ 6758 ソニー     │ 7203  トヨタ       3280    9.14   2.84  -3.24   │
│ 9984 SB-G       │ 6758  ソニー       3346   17.75   0.66   ...    │
│                 │ ...                                               │
├─ Filters ───────┼─ Detail ──────────────────────────────────────────┤
│ PER < 15        │ トヨタ自動車 (7203)                               │
│ DY > 3%         │ セクター: 自動車・輸送機                          │
│ Sector: 半導体  │ PER: 9.14  PBR: 1.12  ROE: 12.3%                 │
└─────────────────┴───────────────────────────────────────────────────┘
 / 検索   f フィルタ   s ソート   w watch   Enter 詳細   q 終了
```

Stage 1 のデータ層 / query 層を **完全再利用**（UI だけ追加）。

---

## 5. MCP 拡張（Phase 3D）

同じデータ層を MCP tool として公開：

| tool | 用途 |
|------|------|
| `query_stocks({ filter, sort, limit })` | DSL フィルタ |
| `top_stocks({ metric, asc, limit })` | ランキング |
| `compare_stocks({ codes })` | 横並び比較 |
| `sector_breakdown()` | セクター統計 |
| `search_stocks({ query })` | 名前検索 |

Claude が自然言語で：
> 「低 PER 高配当で半導体セクターの銘柄を 10 件」
> → `query_stocks({ filter: "sector33='半導体' AND per<15 AND dy>3", limit: 10 })`

**tc-research 実機検証で判明した問題の解決にもなる**: `get_financial` が巨大すぎて context を圧迫していた → `query_stocks` は 3750 銘柄のサマリだけ返すので context 軽い。

---

## 6. ディレクトリ設計

```
src/
├── data/
│   ├── mini-json.ts          # CDN URL + fetch + 型
│   ├── stock-schema.ts       # Stock 型（55 フィールド）
│   ├── cache.ts              # ~/.tickercode/cache の TTL 管理
│   ├── store.ts              # load() → Stock[] （memoize）
│   └── index.ts
├── query/
│   ├── filter.ts             # predicate evaluator
│   ├── sort.ts               # comparator factory
│   ├── dsl.ts                # "per<15 AND dy>3" parser
│   ├── stats.ts              # 平均・中央値・分位
│   └── index.ts
├── storage/
│   ├── watchlist.ts          # ~/.tickercode/watchlist.json or ./.tc/watchlist.json
│   └── config.ts             # ~/.tickercode/config.json
├── commands/
│   ├── sync.ts               # tc sync
│   ├── list.ts               # tc list
│   ├── find.ts               # tc find
│   ├── screen.ts             # tc screen
│   ├── top.ts                # tc top
│   ├── compare.ts            # tc compare
│   ├── sector.ts             # tc sector
│   ├── stats.ts              # tc stats
│   └── watch.ts              # tc watch add|remove|list|screen
└── mcp/tools/
    ├── query-stocks.ts       # 既存 3 tool に追加
    ├── top-stocks.ts
    ├── compare-stocks.ts
    ├── sector-breakdown.ts
    └── search-stocks.ts
```

---

## 7. 型定義の方針

### Stock 型（55 フィールド）

`tickercode-web/src/types/stock.ts`（または `transformApiDataToStock` の戻り値型）を **CLI 側に複製**する。

将来的に：
- `@tickercode/types` として npm に切り出し → DRY 化
- 今は **複製して独立性を優先**（monorepo 化しない方針と整合）

### mini.json スキーマの確定

- tickercode-web が実際に読んでいる形を基準とする
- `tickercode-web/src/lib/stock-service.ts` 系の transform ロジックを参照
- スキーマがズレたら CLI 側で即検知できる型ガード（zod）を入れる

---

## 8. フィルタ DSL 設計（Phase 3C）

### 記法

```
per<15 AND dy>3
per<15 OR pbr<1
sector='半導体' AND per<20
NOT sector='金融'
(per<15 AND dy>3) OR (roe>15 AND pbr<2)
```

### 実装

- **parser**: 簡易 recursive descent（`chevrotain` や `peggy` は不要、100行以内）
- **evaluator**: AST を Stock[] 上で eval
- **エラー**: 「`per` というフィールドはありません。候補: i_per, i_forecast_per」などフィールド名補完
- **エイリアス**: `per` → `i_per`, `dy` → `i_dividend_yield` 等

---

## 9. ロードマップ

### ✅ Phase 0 — 土台（完了）
### ✅ Phase 2A — MCP stdio（完了）
### ✅ Phase 2B — tc-research skill（完了、実機検証済み）

### 🔜 Phase 3A — ローカルデータ層（1 日）
- [ ] `src/data/mini-json.ts` — R2 CDN URL 特定 + fetch
- [ ] `src/data/stock-schema.ts` — Stock 型を web から複製
- [ ] `src/data/cache.ts` — ~/.tickercode/cache の TTL 管理
- [ ] `src/data/store.ts` — load() で Stock[] 返却
- [ ] `src/commands/sync.ts` — `tc sync` / `tc sync --force` / `tc sync --show`
- [ ] テスト: 空キャッシュから sync → load → 3750 件取れること

### Phase 3B — 非対話コマンド MVP（1〜2 日）
- [ ] `tc list` — 一覧 + フィルタ（--sector, --market, --limit）
- [ ] `tc find` — 名前/コード検索
- [ ] `tc screen` — フラグ形式フィルタ（--per, --dy, --pbr, --roe, --sector）
- [ ] `tc top <metric>` — ランキング
- [ ] `tc compare <codes...>` — 横並び
- [ ] pretty / json / csv / md の 4 出力モード

### Phase 3C — DSL + watchlist + stats（1〜2 日）
- [ ] DSL parser (`src/query/dsl.ts`)
- [ ] `tc screen --query "per<15 AND dy>3"` 対応
- [ ] `tc watch add/remove/list/screen`
- [ ] `tc sector` / `tc stats`

### Phase 3D — MCP 拡張（半日）
- [ ] `query_stocks` / `top_stocks` / `compare_stocks` / `sector_breakdown` / `search_stocks` を MCP tool 化
- [ ] 実機検証: Claude から `query_stocks` で絞り込み

### Phase 3E — 対話 TUI（将来、3〜5 日）
Stage 1 が安定してから。Ink で `tc terminal`。

---

## 10. 未確定事項

### Q-1. Stage 1 の範囲
1. **7 コマンド一気に**（list / find / screen / top / compare / sector / stats / watch）
2. **sync + list + screen** で動作確認してから追加 ← 推奨
3. **sync + screen のみ**（最小）

### Q-2. Stock 型の置き場所
1. **`src/data/stock-schema.ts` に複製** ← 推奨（最速）
2. 将来 `@tickercode/types` を npm 化前提で隔離
3. tickercode-web から symlink（publish 時は実体化）

### Q-3. Watchlist の保存場所
1. **`~/.tickercode/watchlist.json`（グローバル）** ← 推奨
2. `./.tc/watchlist.json`（プロジェクト単位）
3. 両対応（`--global` フラグ）

### Q-4. mini.json の CDN URL 特定方法
1. `tickercode-web/src/lib/` から grep で URL を抜く ← 推奨
2. tickercode-api の `cache-r2-mini` タスクから URL 構造を逆算
3. 環境変数 `TICKERCODE_MINI_URL` で上書き可能にして、既定は最速解へ

### Q-5. DSL の実装タイミング
1. Phase 3B でフラグ形式だけ → Phase 3C で DSL 追加 ← 推奨
2. Phase 3B から DSL も同時に
3. DSL 不要、フラグ形式のみ

### Q-6. TUI の扱い
1. Phase 3E として将来 ← 推奨
2. Stage 1 動作確認後、すぐ着手
3. TUI は作らない（非対話のみ）

---

## 11. dogfood で見えた既存課題との接続

2026-04-21 実機検証で判明した問題への対策：

| 既存問題 | Terminal CLI で解決される？ |
|---------|-------------------------|
| `get_financial` レスポンスが 346K chars / 9172 行で context 圧迫 | 🟡 一部解決 — `tc screen` や `query_stocks` は mini.json ベースで軽量。ただし深掘りの `get_financial` は別途 `period_limit` 等が必要 |
| API レスポンスの型混在（string/number） | 🟢 Stage 1 で `parseFloat` を集約、DSL 内で自動処理 |
| 事業内容が取れない | ❌ mini.json には無い。別途 API 追加が必要（`business_description`） |
| 銘柄横断の一貫性破れ | 🟢 3750 件を一括 in-memory で扱うため、型ガード（zod）で検知可能 |

---

## 12. 成功の定義

Stage 1（非対話）完了時点で：

- [ ] `tc sync` で 3750 銘柄が ~/.tickercode/cache/mini.json に降りる
- [ ] `tc screen --per "<15" --dy ">3"` が 100ms 以内に返る
- [ ] `tc top per --limit 20` が 50ms 以内
- [ ] `tc compare 7203 6758 9984` が即答
- [ ] MCP 経由で `query_stocks({ filter: "per<15 AND dy>3" })` が動く
- [ ] テスト 20 件以上（filter / sort / compare / stats）すべて PASS
- [ ] dogfooding-log.md に「PER/PBR 偏差」「セクター異常値」等の発見が 3 件以上記録

---

## 13. 参考

- Web 側実装: `tickercode-web/src/components/terminal/`
- mini.json 生成: `tickercode-api/src/modules/ratio/cache-r2-mini.ts`（推定）
- IndexedDB 層: CLAUDE.md の「mini.json キャッシュ戦略」セクション
- dexter の filter UX: https://github.com/virattt/dexter
