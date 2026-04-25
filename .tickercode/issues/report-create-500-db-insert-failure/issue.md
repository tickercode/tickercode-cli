# Issue: `/api/report/create` が 500 INTERNAL_SERVER_ERROR、DB insert 失敗 + エラー truncate

作成日: 2026-04-25
解決日: 2026-04-25（同日中クローズ）
ステータス: ✅ **Resolved**（BE 側 2 段階修正で解決）
優先度: High（公式レポート 8 件の一括投稿が全件ブロックしていた）
参照: 木村化工機〜JVC ケンウッドの公式レポート投稿フロー、`src/commands/report.ts:481` `batchSaveCommand`

## 解決サマリ（2026-04-25）

BE 側で 2 段階の修正が入って解決:

1. **authGuard 修正（Version c0a60ffd）**: `/api/report/create|update|toggle|delete` が public route に登録されており authGuard を通らず Bearer トークンが解析されていなかった問題を、authed 配下に移動して修正
2. **stock_code 正規化追加（後続デプロイ）**: 4 桁入力 `"6594"` を 5 桁 `"65940"` に DB 側で正規化、insert 時の制約違反を解消

→ **8/8 件の公式レポートが正常に作成完了**:
- 6594 ニデック / 2418 ツカダGHD / 4666 パーク24 / 3399 山岡家 / 9337 トリドリ / 7004 カナデビア / 6378 木村化工機 / 6632 JVCケンウッド

検証済み（curl + CLI batch-save 両方）。

## 概要

2026-04-25、`tc report batch-save --file published.yaml` でディスカッション 8 件を公式レポート投稿しようとしたところ、**全 create リクエストが 500 エラー** で失敗。CLI 修正ではなく **BE の `/api/report/create` が DB insert 時にクラッシュ**している。かつ **PostgreSQL の具体的な失敗理由が error response で truncate** されており、デバッグ困難。

## 状況経過（2026-04-25）

1. 初回試行: `401 UNAUTHORIZED` "authentication required"
2. BE 側修正後（時間帯: 2026-04-25 00:XX 頃）: **500 INTERNAL_SERVER_ERROR** に変化
3. 現在: 最小 payload でも同じ 500

→ 認証バグは修正済みだが、**新たに DB insert 層のバグが露出**。

## 観測事実

### 試行 1: CLI 経由（batch-save、ニデック 6594 単体）

```bash
bun run dev report batch-save --file /tmp/published-test-nidec.yaml
# 出力:
#   ✗ ニデック (6594) moat-deepdive — 慎重肯定: API returned success=false
#   Batch save results: ✓ 0 succeeded / ✗ 1 failed
```

（CLI 側の error handling が body の詳細を握り潰す問題は別 issue: `cli-apipost-surface-body-error`）

### 試行 2: curl 直叩き（同じ payload）

```bash
TOKEN=$(jq -r '.api_key' ~/.tickercode/credentials.json)
curl -sS -X POST "https://api.ticker-code.com/api/report/create" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"source":"agent_cli","title":"probe min","body_markdown":"short body","is_public":false,"is_official":false,"stock_code":"6594","verdict_code":"lukewarm","verdict_label":"test","metadata":{}}'
```

**レスポンス**:

```json
{
  "success": false,
  "data": null,
  "error": "Failed query: insert into \"report\" (\"id\", \"user_id\", \"source\", \"source_ref_id\", \"stock_code\", \"stock_codes\", \"slug\", \"title\", \"one_liner\", \"summary\", \"body_markdown\", \"tags\", \"eyecatch_url\", \"ogp_image_url\", \"is_public\", \"locked\", \"published_at\", \"is_official\", \"verdict_code\", \"verdict_label\", \"model\", \"token_in\", \"token_out\", \"cost_usd\", \"metadata\", \"created_at\", \"updated_at\") values (default, $1, $2, ...) ...（中略、SQL パラメータ値の echo が続く）... ,true,lukewarm,慎重肯定,,0,0,0,",
  "message": "INTERNAL_SERVER_ERROR",
  "status": 500
}
```

### 認証は通っている証拠

- `tc auth whoami` → ✓ Logged in as **admin@ticker-code.com (SUPER_ADMIN)**
- `POST /api/report/list` → **`success:true, items:[]`**（他 endpoint は正常）
- `POST /api/report/create` のみ 500

## 症状

1. **最小 payload（`{ source, title, body_markdown, is_public:false, is_official:false, stock_code, verdict_code, verdict_label, metadata:{} }`）でも 500**
2. **フル payload（body_file 込み、metadata 付き）でも同じ 500**
3. **PostgreSQL error が echo 途中で truncate** されており、NOT NULL 違反 / 型不整合 / CHECK 制約違反 等、**具体的な原因が client に届かない**

## 仮説

### 仮説 1: `report` テーブルの必須カラムに default 未設定（最有力）
- `id` は `default`（PostgreSQL の `DEFAULT` キーワード）で自動生成を期待
- `user_id` 等が NOT NULL なのに API 側が supply していない可能性
- あるいは `slug` の一意制約違反（同一 user × 同一 title の既存 report がある等）

### 仮説 2: Schema migration 未反映
- 新しいカラム（例: `eyecatch_url`, `ogp_image_url`, `token_in`, `token_out`, `cost_usd`, `model`）が最近追加され、本番 DB にマイグレーションが適用されていない
- または逆に、API 側が古いカラム名を参照している

### 仮説 3: metadata JSONB のシリアライズ問題
- `metadata: {}` を `'{}'::jsonb` として insert しようとして失敗
- `metadata: null` や省略で通るか要確認

### 仮説 4: CHECK 制約 / enum 違反
- `verdict_code` enum に `lukewarm` が未登録
- `source` enum に `agent_cli` が未登録
- 他の列で domain 制約違反

## BE への確認依頼事項（龍五郎さん宛）

1. **本番環境で `/api/report/create` の POST を手動実行したエラーログ（PostgreSQL 側の完全な reason）を確認してほしい**
2. **BE 側のエラーハンドリング改善**:
   - PostgreSQL error を truncate せず `error: <reason>` として client に返す
   - or client 向けには safe message（「database error」等）を返しつつ、BE ログには完全な reason を残す
3. **`verdict_code` / `source` enum 一覧の提示**（`lukewarm` / `agent_cli` が有効か確認）
4. **`report` テーブルの NOT NULL カラムと default 値の一覧**（`user_id`, `slug`, `source_ref_id` 等）
5. **直近のマイグレーション履歴**（`eyecatch_url`, `token_in` 等の新規カラム追加があれば）

## 影響範囲

- **`tc report save`**（単体作成）→ 全失敗
- **`tc report batch-save`**（一括作成）→ 全失敗
- 関連: `tc report update`（列が共通なら同じ問題の可能性）
- 今日の /tc-discuss 8 session の公式公開が完全にブロック
- `research/samples/` への永続化 + BE 公開ワークフロー全体が停止

## 回避策（暫定）

1. `published.yaml` を repo に commit のみ（BE 修正後に `batch-save` 実行）
2. BE 側の手動 SQL で 1 件 insert テスト → カラム判定
3. CLI 側の `apiPost` で body error を詳細表示する修正（別 issue `cli-apipost-surface-body-error`）を先行実装 → BE 修正後のデバッグを早める

## 完了条件

- [ ] BE から PostgreSQL の完全な失敗理由を受領
- [ ] 仮説 1-4 のいずれが確定、修正方針の合意
- [ ] BE 側修正 + `/api/report/create` で 200 成功確認（curl + CLI 両方）
- [ ] 8 件の公式レポート投稿成功
- [ ] `.claude/shared/api-contract.md` に `/api/report/create` のリクエスト / レスポンス仕様を明記

## 関連

- `.tickercode/issues/cli-apipost-surface-body-error/`（CLI 側の error 詳細表示改善、同時に着手可）
- 今日の 8 session の保存ファイル（すべて `research/discuss/discuss-*-20260424/summary.md`）
- `published.yaml`（BE 修正後の再実行用、commit 済）

---

## 解決ログ (2026-04-25)

✅ **Resolved**

### 原因 1: authGuard の漏れ
`/api/report/create|update|toggle-visibility|delete` が public route 配下に登録され
authGuard を通らず Bearer token が解析されない → 401 / 認証なしで以降の処理に進んでいた。

### 原因 2: stock_code FK 違反
`jpx_stock.code` は 5桁保存だが YAML batch-save の `stock_code: "6594"` (4桁)
そのまま insert → FK 制約違反 → 500 INTERNAL_SERVER_ERROR (DB error が body.error に
truncate されて返却されていた)

### 修正
- routes/index.ts: mutating endpoints を authed 配下に移動
- report-api.ts: normalizeStockCode() で 4桁 → 5桁正規化

batch-save 8/8 succeeded を確認。
commits: tickercode-api `c0a60ffd`, `6dff949e`
