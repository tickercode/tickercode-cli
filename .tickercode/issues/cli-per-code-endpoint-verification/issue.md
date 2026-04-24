# Issue: `tc memory fetch` の disclosure / news / edinet が銘柄別フィルタされていない

作成日: 2026-04-24
解決日: 2026-04-24（同日中クローズ）
ステータス: ✅ **Resolved**（仮説 A 確定、CLI 側修正で解決）
優先度: Medium（`tc research-idea` のブロッカーではないが、narrative 楽観バイアス検証の精度低下）
参照: `@tickercode/cli` research/samples/electric-undervalued-ai/final.md / `.claude/shared/api-contract.md` 末尾の確認依頼セクション

## 解決サマリ

BE 側の仕様確認の結果、**仮説 A 確定**（CLI 側の endpoint 選択 + field 名の誤り）。BE 側の修正は不要、CLI 側のみ修正で即解決。

### CLI 側修正内容

| ファイル | 変更 |
|---|---|
| `src/memory/paths.ts` | `disclosure: "/api/disclosure/recent"` → `/api/disclosure/list` |
| `src/memory/fetch.ts::bodyFor` | disclosure / news / edinet の field 名を `code` → `stock_code` に統一、edinet case を追加 |

### 検証結果（2026-04-24、6594 ニデック / 6874 協立電機）

| endpoint | 修正前 | 修正後 |
|---|---|---|
| `/api/disclosure/list` | 市場全体の最新 20 件 | ✅ **銘柄別**（6594: 機構改革、6874: 第68期半期報告書 等） |
| `/api/news/feed` | 他銘柄ニュース混入 | ✅ **銘柄別**（両銘柄とも total=0、ニュース未登録） |
| `/api/edinet/text` | null (4 バイト) | ✅ **本文取得**（6594: **10.9MB** に拡大、sections + stock_code フィールド確認） |

### BE 側の補足情報（龍五郎回答より）

- `/api/disclosure/recent` は存在するが **市場全体の最新 disclosures 用**（銘柄フィルタ不可、`code` 引数は無視される）
- `/api/news/feed` の field 名は `stock_code`（`code` ではない）。未指定時は全銘柄最新返却 → 今回の無関係ニュース混入の原因
- `/api/edinet/text` の body は `{ doc_id }` または `{ stock_code, section_type? }`。`code` は受け付けない
- BE 側の命名揺れ（`code` / `stock_code` / `ticker_code`）問題: 次回 API 統合で `stock_code` 統一を `.claude/shared/api-contract.md` にルール化する方向で BE 提案

### 完了条件チェック

- [x] BE が endpoint 現仕様を明示（仮説 A 確定）
- [x] CLI 側 `paths.ts` / `fetch.ts` 修正
- [x] `tc memory fetch 6594` / `6874` で全 5 endpoint が銘柄別データを返すことを確認
- [x] 93/93 tests GREEN 維持、typecheck clean
- [ ] api-contract.md の該当セクション更新（BE 側タスク、「【CLI → BE 確認依頼】」セクションを Resolved 化）
- [ ] テーマ調査 3 本で深堀り検証精度向上の regression 確認（次回 dogfood で実測）

### 今後の予防策

- [x] **CLI 側 `bodyFor` に既存フィールド名テストを追加**（endpoint 毎に正しい body schema を送っているか regression で捕捉）— `tests/fetch-body.test.ts` で 15 tests 追加済
- [ ] 新しい endpoint 追加時は **api-contract.md の body schema を参照必須**のレビュー基準にする（PR レビュー時の慣習化）
- [ ] `stock_code` / `code` 混在は BE 側で段階的に統一（workspace 側の別 issue で追跡）

---

## 元の調査内容（歴史保全のため残す）

## 背景

`tc-research-idea` ワークフローの top 5 深堀り検証（`tc memory fetch <code>`）で、5 endpoint のうち 3 つが期待通りに銘柄別フィルタされていない挙動を観測。

### 観測事実（2026-04-24、ニデック 6594 / 協立電機 6874 で検証）

| endpoint | CLI が送る body | 観測された挙動 |
|---|---|---|
| `POST /api/disclosure/recent` | `{ code: "65940", limit: 20 }` | **市場全体の最新 20 件**が返る（2 銘柄で同一内容） |
| `POST /api/news/feed` | `{ code: "65940", limit: 20 }` | 他銘柄のニュース混入（ニデック取得でサンエーのニュース） |
| `POST /api/edinet/text` | `{ code: "65940" }` | **レスポンス null（4 バイト）** |

これにより、top 5 銘柄の narrative 楽観バイアスを **edinet 事業リスク / 直近開示** で目視検証する手段が機能していない。現状は `financial.json` + `overview.json`（銘柄別で正常）の 1 軸に依存。

## 2 つの仮説

### 仮説 A: CLI が正しい endpoint を叩いていない（CLI 側バグ）

`.claude/shared/api-contract.md` と CLI 実装の対比:

| 項目 | CLI 実装 | api-contract 記載 |
|---|---|---|
| disclosure | `POST /api/disclosure/recent` + `{ code, limit }` | `POST /api/disclosure/list` + `{ stock_code, limit?, offset?, doc_types? }` |
| news | `POST /api/news/feed` + `{ code, limit }` | （記載なし、銘柄別ニュース取得の endpoint 不明） |
| edinet | `POST /api/edinet/text` + `{ code }` | `POST /api/edinet/text` + `{ doc_id }`（doc_id 必須、`/api/edinet/list` で先に doc_id 取得が正規フロー） |

→ CLI が wrong endpoint + wrong field name で叩いている可能性高。

### 仮説 B: BE 側の `/recent` / `/feed` が code filter を効かせていない

`/api/disclosure/recent` / `/api/news/feed` が CLI 開発当初は銘柄別だったが、後の仕様変更で市場全体になった、または `code` 引数が silently ignored されている。

## スコープ

### BE（龍五郎）
1. `/api/disclosure/recent` / `/api/news/feed` endpoint の現仕様確認
   - 存在する？ 銘柄別フィルタ機能あり？ `code` vs `stock_code` のフィールド名？
2. 銘柄別の「直近開示」「直近ニュース」「EDINET 本文」取得の正しい endpoint + body schema を明示
3. api-contract.md の該当セクションを更新

### CLI（@tickercode/cli）
仮説 A 確定時:
- `src/memory/paths.ts` ENDPOINTS を正しい endpoint に書き換え
- `src/memory/fetch.ts::bodyFor` で `stock_code` 等の正しいフィールド名を送る
- edinet は 2 段構え（`/api/edinet/list` → `doc_id` → `/api/edinet/text`）に修正
- テスト追加（mock で spec 一致を確認）

仮説 B 確定時:
- BE 側修正完了待ち → 仕様通りに動くか smoke test

### FE（かおり）
本件は Web 側への影響なし（tab API 経由で銘柄別データ取得は正常と想定）。ただし同 endpoint を Web でも使っているか確認。

## Agent Team アサイン

### PM: 白川
- 仮説 A/B の切り分けを BE 側でまず実施
- CLI 側修正タスクを 15 分以内の quick fix として扱う

### BE: 龍五郎（主担当、確認のみ）
- endpoint 現仕様の確認 + api-contract.md 更新
- 想定工数: 15-30 分

### CLI: Claude Agent（実装担当）
- BE 回答後の修正対応
- 想定工数: 30-60 分

### QA: 財前
- 仕様確定後、`tc memory fetch 6594` で 5 endpoint 全てが銘柄別データを返すか確認
- regression としてテーマ調査 3 本で深堀り検証精度が向上するか確認

## 影響

本件未解決の間:
- `tc research-idea` の深堀り検証は `financial.json` + `overview.json` のみで回す
- 調査品質は担保されるが、narrative 楽観バイアスの検証が**実績財務 1 軸に限定**
- edinet 本文からの事業リスク・セグメント業績目視は機能せず

## 完了条件

- [ ] BE が endpoint 現仕様を明示（2 仮説のどちらか確定）
- [ ] api-contract.md の該当セクション更新
- [ ] CLI 側（該当時）の `paths.ts` / `fetch.ts` 修正 + テスト追加
- [ ] `tc memory fetch 6594` で 5 endpoint 全てが銘柄別データを返すことを QA 確認

## 関連

- `@tickercode/cli`:
  - `src/memory/paths.ts` ENDPOINTS
  - `src/memory/fetch.ts::bodyFor`
  - `research/samples/electric-undervalued-ai/final.md` 末尾の財務検証ログ
- `tickercode/.claude/shared/api-contract.md` 末尾の「【CLI → BE 確認依頼】」セクション
