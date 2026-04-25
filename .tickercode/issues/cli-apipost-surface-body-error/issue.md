# Issue: `apiPost` が HTTP 200 + body.success=false の詳細エラーを握りつぶす

作成日: 2026-04-25
ステータス: 🔍 **Open**（CLI 側単独修正で解決可能）
優先度: **Medium**（診断効率の問題。BE バグ調査の際に詳細が見えずデバッグ時間が倍増）
参照: `src/commands/report.ts:21-80`（`apiPost` 実装）

## 背景

2026-04-25、`tc report batch-save --file published.yaml` で 8 件公式レポート投稿を試みたところ、全エントリが **`API returned success=false`** の曖昧なメッセージで失敗。エラー内容が不明で原因特定できず、curl で直接 API を叩いて初めて以下が判明:

- HTTP status は **200**
- レスポンス body: `{"success":false, "data":null, "error":"authentication required", "message":"UNAUTHORIZED", "status":401}`

CLI の `apiPost` は **HTTP 200 を正常パス**として処理し、**body.success=false / body.status:401 / body.message:"UNAUTHORIZED" を握りつぶしている**。ユーザーは curl 手動実行 + source 読解が必要で、診断時間が 10-20 分余計にかかった。

## 観測事実（2026-04-25）

### 実行コマンド
```
bun run dev report batch-save --file /tmp/published-test-nidec.yaml
```

### CLI 表示
```
Batch saving 1 report(s)…
  ✗ ニデック (6594) moat-deepdive — 慎重肯定: API returned success=false

Batch save results:
  ✓ 0 succeeded
  ✗ 1 failed
     - ニデック (6594) moat-deepdive — 慎重肯定: API returned success=false
```

### curl 直叩きで判明した実レスポンス
```json
{
  "success": false,
  "data": null,
  "error": "authentication required",
  "message": "UNAUTHORIZED",
  "status": 401
}
```

## 根本原因

`src/commands/report.ts:21` の `apiPost` が:

1. HTTP res.status を **401 / 403 のみ**明示処理し、200 は「正常応答」として `await res.json()` を呼んで返す
2. 呼び出し側（`batchSaveCommand` など）が `if (!res.success) throw new Error("API returned success=false")` としか書いていない
3. **body に含まれる error / message / status フィールドを全く抽出していない**

ApiResponse の仕様（プロジェクト全体）は `{ success, data, error, message, status }` で統一されているはず（`CLAUDE.md` 「API レスポンスは `ApiResponse<T>` ラッパーで統一」）。これに沿って body のエラー情報を抽出すべき。

## 修正案

### 1. `apiPost` 内で body.success=false の時の情報抽出を共通化

```typescript
async function apiPost<T = unknown>(path: string, body: unknown): Promise<T> {
  // ... 既存の fetch + HTTP エラー処理 ...

  const json = (await res.json()) as T & {
    success?: boolean
    error?: string
    message?: string
    status?: number
  }

  // HTTP 200 でも body.success === false なら、body の詳細をエラーに乗せる
  if (json && json.success === false) {
    const parts = [
      json.status ? `[${json.status}]` : "",
      json.message ?? "",
      json.error ?? "",
    ].filter(Boolean)
    throw new Error(`API error: ${parts.join(" ") || "success=false (no detail)"}`)
  }

  return json
}
```

### 2. 呼び出し側の `throw new Error("API returned success=false")` を削除

現在 `batchSaveCommand` で `if (!res.success) throw new Error("API returned success=false")` と二重にチェックしているが、上記 `apiPost` で throw すれば不要。各呼び出し側の冗長な success チェックを撤去。

### 3. 401（body 側）の特別処理

body.status === 401 の場合は、HTTP 401 と同様に `tc auth login` 案内メッセージを stderr に出すのが親切:

```typescript
if (json.success === false && json.status === 401) {
  process.stderr.write(
    pc.red(
      "認証エラー (body 401): 認証情報が無効、または当該 endpoint で権限不足です。\n" +
        "  tc auth whoami でログイン状態を確認、必要なら tc auth login で再認証してください。\n",
    ),
  )
  process.exit(1)
}
```

### 4. テストケース追加

`tests/api-client.test.ts`（存在しないなら新規）に:
- HTTP 200 + body.success=false でエラー throw されること
- body.status / body.message / body.error が error message に含まれること
- body.status === 401 で exit(1) + 案内メッセージ

## 影響範囲

`apiPost` を使う全コマンド（`src/commands/report.ts` の 7 箇所 + 将来の API コマンド）:
- `report save`
- `report list`
- `report show`
- `report update`
- `report delete`
- `report publish`
- `report batch-save`

現状これら全てで BE 側 body-level エラーが握りつぶされているため、**Medium 優先度で一括修正の価値**あり。

## 検証手順

修正後、以下のコマンドで詳細エラーが出ることを確認:

```bash
bun run dev report batch-save --file /tmp/published-test-nidec.yaml
# 期待: "API error: [401] UNAUTHORIZED authentication required"

bun run dev report save --title "test" --body /tmp/x.md --stock-code "6594" --verdict-code lukewarm
# 期待: 同上
```

BE 側の `/api/report/create` 401 問題（別 issue、BE 側で調査中）が解決すれば成功パスも確認可能。

## 完了条件

- [ ] `apiPost` 内で body.success === false の時に body の error / message / status を error message に含める
- [ ] body.status === 401 の時は `tc auth` 案内 + exit(1)
- [ ] 各コマンド呼び出し側の冗長な `throw new Error("API returned success=false")` を削除
- [ ] tests/ で HTTP 200 + body.success=false のケースを regression で捕捉
- [ ] 動作確認（BE 側 401 修正後に真の成功パス / エラー両方を確認）

## 関連

- BE 側調査中の `/api/report/create` 401 問題（未起票、BE 龍五郎さんに確認中）
- `src/lib/api-client.ts` の `postJson`（別名、report.ts の `apiPost` とほぼ同等の実装）も同じ問題を抱えるため、共通化 + 同時修正検討
- `CLAUDE.md` 「API レスポンスは `ApiResponse<T>` ラッパーで統一」の規約整備
