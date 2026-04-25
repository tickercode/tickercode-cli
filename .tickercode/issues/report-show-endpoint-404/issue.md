# Issue: `/api/report/show` が 404、FE 個別レポートページが全件 404 表示

作成日: 2026-04-25
ステータス: 🔴 **Open**（**BE 確認依頼中** — endpoint 不在 or path 移動）
優先度: **High**（公式レポート 8 件を作成成功したが、ユーザーは FE 個別ページを開くと 404 ページに到達。実質的に閲覧不可）
参照: 8 件公式レポート公開フロー（`published.yaml` 経由 batch-save 後）、`src/commands/report.ts:73` `apiPost`

## 概要

2026-04-25、`tc report batch-save` で 8 件の公式レポートを作成成功。`/api/report/list` でも全件確認可能。しかし **FE 個別ページ `https://ticker-code.com/report/{slug}` が全 8 件で 404**。
原因は **BE の `/api/report/show` endpoint が 404 を返す**（SSR で show endpoint を呼んで死亡 → FE が 404 ページ表示）。

## 観測事実（2026-04-25）

### 検証マトリクス

| 経路 | 結果 |
|---|---|
| `/api/report/list` (`is_official:true` filter) | ✅ 8 件 success |
| `tc report show <id>` | ❌ `API 404 Not Found — /api/report/show` |
| curl `POST /api/report/show -d '{"id":"<uuid>"}'` | ❌ HTTP body: `404 Not Found` |
| curl `POST /api/report/show -d '{"slug":"<slug>"}'` | ❌ 同上 |
| FE `/report` (一覧) | ✅ HTTP 200 |
| FE `/report/{slug}` | ❌ HTTP 404、ユーザーには 404 ページ表示 |

### 該当する 8 レポート（DB 上は作成成功）

```
id=bdd4ca6f-485d-4a75-9148-ffca9c522bac slug=ニデック-6594-moat-deepdive-慎重肯定-20260425
id=c007a203-dacd-48cd-9b16-97e8f9147273 slug=ツカダグローバルホールディング-2418-value-debate-2-強気度上昇-20260425
id=70add78c-a6a0-46ab-99aa-d2172df0f283 slug=パーク24-4666-moat-deepdive-lukewarm-3-極-20260425
id=87c38df8-4f26-4a10-9ab1-655d8bb2d1bf slug=山岡家-3399-moat-deepdive-hate-vs-love-20260425
id=e61e8941-cb57-4abe-82d7-73f6ee39b20b slug=トリドリ-9337-jp-classic-value-debate-panel-次第で逆転-20260425
id=c183db37-cf5b-47b9-a4b4-460331f4fe1b slug=カナデビア-7004-moat-deepdive-binary-outcome-20260425
id=fa4374d7-a486-4a94-8cbe-ee83896bf73d slug=木村化工機-6378-jp-classic-3-者一致-buy-20260425
id=dfde99da-74f4-44f8-87f5-fc28e90b023e slug=jvcケンウッド-6632-moat-deepdive-3-者一致-strong-buy-20260425
```

## 仮説

### 仮説 1: `/api/report/show` endpoint 自体が prod に未デプロイ
- 先の `c0a60ffd` の authGuard 修正で create/update/toggle/delete は authed 配下に移動したが、show が漏れた
- show が public route のままで auth ミドルウェアを通らず NotFound を返している（path matcher 不整合）

### 仮説 2: show が別 path（例: `/api/report/get-by-slug`、`/api/report/get`）に移動
- FE 側 SSR は古い `/api/report/show` を呼び続けている
- BE 側で path を変えたが api-contract.md / FE が追従していない

### 仮説 3: show 実装はあるが認証必須で SSR の non-authed リクエストで 404 を返す
- 公開レポートでも auth が必須になっている（is_public:true でも認証必要）
- FE SSR には Bearer がない → 認証失敗 → 404 にマップ

## BE への確認依頼事項（龍五郎さん宛）

1. **`/api/report/show` endpoint の有無**を確認
2. ある場合、**spec（id / slug / 認証要否 / リクエスト method）**を明示
3. **FE が呼んでいる endpoint と一致しているか**確認（FE かおりさんと連携）
4. **dev-browser --headless で FE 個別ページのレンダリング検証**を依頼（PR レビュー時の慣習化推奨）

## 影響範囲

- 8 件公式レポートが全て**閲覧不可**（一覧には出るがクリックすると 404）
- 公開した URL を SNS / Slack で共有しても「ページが見つかりません」
- ユーザー体験として最悪（公式タグが付くのに見れない）

## 完了条件

- [ ] BE から show endpoint の状態（実装済み / 別 path / 認証要否）回答
- [ ] FE 個別ページで全 8 件が正常表示（HTTP 200、本文 + メタ表示）
- [ ] CLI `tc report show <id>` が成功
- [ ] api-contract.md に show endpoint spec を追記

## 関連

- `report-create-500-db-insert-failure/`（解決済、BE authGuard + stock_code 正規化修正）
- `report-slug-ascii-only/`（slug を英数字統一する仕様変更要望、別 issue）
- `cli-apipost-surface-body-error/`（CLI 側の 404 ハンドリング、apiPost で詳細表示）

---

## 解決ログ (2026-04-25)

✅ **Resolved**

### 修正内容
- BE: `/api/report/show` を `detailReportEndpoint` の alias として route 登録 (CLI 互換)
- FE: URL 構造 `/report/{short_id}/{slug}` で 200 OK 確認

### 検証
```
curl -X POST https://api.ticker-code.com/api/report/show -d '{"id":"bdd4ca6f"}'
→ 200 OK + 該当レポート JSON

curl https://ticker-code.com/report/bdd4ca6f/6594-nidec-moat-deepdive-20260425
→ 200 OK
```

### 関連 commits
- tickercode-api: `cd3a884` (alias 追加)
- tickercode-api: `d795a118` (short_id 経由参照)
