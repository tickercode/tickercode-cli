# Issue: `tc memory fetch` の disclosure / news / edinet が銘柄別フィルタされていない

作成日: 2026-04-24
優先度: Medium（`tc research-idea` のブロッカーではないが、narrative 楽観バイアス検証の精度低下）
参照: `@tickercode/cli` research/samples/electric-undervalued-ai/final.md / `.claude/shared/api-contract.md` 末尾の確認依頼セクション

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
