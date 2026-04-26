# Issue: tc disclosures コマンド実装 (Phase 1)

- 作成日: 2026-04-26
- 優先度: high
- ステータス: 実装中 (Phase 1)

## 背景

tickercode-analyst (編集部 workspace) の topic-finder agent で、適時開示起点の記事ネタ探索を 7 つの探索ルートのうち最優先ルートとして採用した。
現状 `tc disclosures` が未実装のため、analyst 側のスクリプト `scripts/topics-disclosures.mjs` が「未実装検知 → 手動 fallback ガイド出力」で止まっており、Playwright で TDnet / EDINET を毎回スクレイプする運用になっていた。

これを CLI 側で正式実装し、analyst の `bun run topics:disclosures` が fallback ではなく正常パスに入るようにする。

## スコープ (Phase 1)

CLI:

```
tc disclosures --days 7 --limit 100 --format json
tc disclosures --days 10 --doc-type forecast --format json
```

サポートフラグ:

| フラグ | 型 | デフォルト | Phase 1 |
| --- | --- | --- | --- |
| `--days` | int | 7 (max 90) | ✅ |
| `--limit` | int | 100 (0 = 上限まで, max 500) | ✅ |
| `--doc-type` | string | (未指定 = 全種別) | ✅ |
| `--format` | string | json | json のみ |
| `--code` | string | - | Phase 2 |
| `--sort` / `--asc` | - | disclosed_at desc | Phase 2 |
| `--format pretty` / `md` | - | - | Phase 2 |

doc_type は canonical 7 種別:
`earnings | forecast | dividend | buyback | presentation | plan | tdnet_other`

出力スキーマ (json 1 要素):

```json
{
  "code": "7203",
  "company_name": "トヨタ自動車",
  "disclosed_at": "2026-04-25T15:00:00+09:00",
  "doc_type": "forecast",
  "title": "2026年3月期 通期業績予想の修正に関するお知らせ",
  "url": "https://www.release.tdnet.info/inbs/...",
  "pdf_url": "https://www.release.tdnet.info/inbs/....pdf",
  "summary": null,
  "source": "tdnet"
}
```

Phase 1 のデータソースは TDNet のみ (EDINET / JPX 決算短信は Phase 2 以降)。

## 実装内容

### BE 側 (tickercode-api)

- `src/modules/disclosure/repository/disclosure-repository.ts`
  - `CANONICAL_DOC_TYPES` (canonical 7 種別)
  - `normalizeCanonicalDocType(raw)` ヘルパー (classifyTdnetDocType の出力を canonical に正規化)
  - `searchDisclosures({ days, docTypes, limit, offset })` 新設
- `src/api/controllers/disclosure.ts`
  - `search(context)` 新設
- `src/api/routes/index.ts`
  - `POST /api/disclosure/search` ルート追加
- 既存 `/disclosure/list` `/disclosure/recent` `/disclosure/detail` は非破壊

### CLI 側 (tickercode-cli)

- `src/commands/disclosures.ts` 新設
  - `VALID_DOC_TYPES` (BE の CANONICAL_DOC_TYPES と同期)
  - citty defineCommand で `--days / --limit / --doc-type / --format` を受ける
  - `postJson("/api/disclosure/search", body)` で取得 → `unwrap` → items を JSON 出力
- `src/cli.ts` に `disclosures` を登録

### テスト

- `tickercode-cli/tests/disclosures.test.ts` — VALID_DOC_TYPES の lock テスト
- `tickercode-api/tests/unit/disclosure-canonical-doc-type.test.ts` — normalizeCanonicalDocType の正規化テスト

## 受け入れ基準

1. `tc disclosures --days 10 --format json` で `[]` または出力スキーマの配列が返る
2. `--doc-type forecast` で業績予想修正系のみが返る
3. `--format md` / `--format pretty` は Phase 2 警告で exit 1 (Phase 1 では未対応)
4. analyst 側の `bun run topics:disclosures` が fallback ではなく正常パスに入り、`newsroom/ideas/_raw/disclosures-YYYY-MM-DD.json` を保存する
5. `tc disclosures --help` の表示が既存サブコマンド (screen / rank) と同じスタイル
6. CLI / BE のテストが PASS

## Phase 2 (今回スコープ外)

- `--code` 個別銘柄絞り込み
- `--sort` / `--asc`
- `--format pretty` / `md`
- EDINET / JPX 決算短信のソース統合
- `summary` フィールドへの LLM 要約 (将来の枠)

## 関連

- 依頼元: ユーザー (daikissdd) → CLI Team 2026-04-26
- analyst 側エンドポイント:
  - `tickercode-analyst/scripts/topics-disclosures.mjs` (fallback 検知ロジック既存)
  - `tickercode-analyst/.claude/agents/topic-finder.md`
  - `tickercode-analyst/docs/topic-finder-playbook.md`
- 既存 BE 開示 API: `/disclosure/list` `/disclosure/recent` `/disclosure/detail`
