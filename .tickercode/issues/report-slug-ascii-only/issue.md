# Issue: report の slug を常に英数字（ASCII + ハイフン）に統一

作成日: 2026-04-25
ステータス: 🔴 **Open**（**仕様変更要望** — BE / FE / CLI 全層に影響）
優先度: **Medium**（ユーザー体験 + URL 共有性 + SEO の観点で重要、ただし機能ブロッカーではない）
参照: 8 件公式レポート batch-save 後の slug（全て日本語混在）

## 背景

2026-04-25 batch-save で作成された 8 件の公式レポートの slug が**日本語を含む**:

```
ニデック-6594-moat-deepdive-慎重肯定-20260425
ツカダグローバルホールディング-2418-value-debate-2-強気度上昇-20260425
パーク24-4666-moat-deepdive-lukewarm-3-極-20260425
山岡家-3399-moat-deepdive-hate-vs-love-20260425
トリドリ-9337-jp-classic-value-debate-panel-次第で逆転-20260425
カナデビア-7004-moat-deepdive-binary-outcome-20260425
木村化工機-6378-jp-classic-3-者一致-buy-20260425
jvcケンウッド-6632-moat-deepdive-3-者一致-strong-buy-20260425
```

URL 化すると `%E3%82%AB...` のように URL エンコードされて長く、SNS / Slack / Email で共有時に**意味不明な文字列**に見える。SEO / シェア性 / ログ可読性で問題。

## 要望仕様

slug は **常に英数字 + ハイフン**で生成する。フォーマット例:

```
{stock_code}-{company_ascii}-{report_type}-{date}
```

### 8 件の理想 slug 例

| 銘柄 | 現在の slug | 理想 slug |
|---|---|---|
| 6594 ニデック | `ニデック-6594-moat-deepdive-慎重肯定-20260425` | **`6594-nidec-moat-deepdive-20260425`** |
| 2418 ツカダGHD | `ツカダグローバルホールディング-2418-value-debate-2-強気度上昇-20260425` | **`2418-tsukada-ghd-value-debate-20260425`** |
| 4666 パーク24 | `パーク24-4666-moat-deepdive-lukewarm-3-極-20260425` | **`4666-park24-moat-deepdive-20260425`** |
| 3399 山岡家 | `山岡家-3399-moat-deepdive-hate-vs-love-20260425` | **`3399-yamaokaya-moat-deepdive-20260425`** |
| 9337 トリドリ | `トリドリ-9337-jp-classic-value-debate-panel-次第で逆転-20260425` | **`9337-toridori-jp-classic-20260425`** |
| 7004 カナデビア | `カナデビア-7004-moat-deepdive-binary-outcome-20260425` | **`7004-kanadevia-moat-deepdive-20260425`** |
| 6378 木村化工機 | `木村化工機-6378-jp-classic-3-者一致-buy-20260425` | **`6378-kimura-kakouki-jp-classic-20260425`** |
| 6632 JVCケンウッド | `jvcケンウッド-6632-moat-deepdive-3-者一致-strong-buy-20260425` | **`6632-jvc-kenwood-moat-deepdive-20260425`** |

### 規則

- **`stock_code` を先頭**（4 桁数字、検索性 + ソート性）
- **company name を ASCII slug 化**（romaji or 英語社名）。日本語は事前マッピング表 or `kuromoji` 系の transliteration
- **report_type（panel / verdict）も英数字** に変換
- **date YYYYMMDD** を末尾
- 区切りは **ハイフン `-`**、長さ最大 80 文字程度
- **重複時は末尾に連番**（`-2`, `-3` ...）

## 実装方針案

### 案 A: BE 側で slug 生成（推奨）
- API 側でリクエスト payload に `slug` が来ても無視 or バリデーション
- BE が `stock_code + company_name + panel_type + date` から ASCII slug を自動生成
- 日本語 → ASCII の transliteration map を BE が持つ（メンテナンス性◎）

### 案 B: CLI 側で生成
- CLI が `published.yaml` から `slug` フィールドを読み、なければ自動生成
- BE は CLI が送る slug をそのまま使用
- → 別ツール / 直接 API 利用時に slug が不整合になりやすい

### 案 C: 両方（CLI が default 生成 + BE がバリデーション）
- CLI が ASCII slug を自動生成（クライアント側で予測可能）
- BE は `^[a-z0-9-]+$` で正規表現バリデーション、違反は 400
- 既存日本語 slug は migration で全件変換

→ **案 C が long-term の堅牢性◎**

## 既存 8 レポートの扱い

仕様変更後、既存 slug は:
1. **migration で全件 ASCII に変換**（推奨）
2. **古い slug → 新 slug の redirect**（後方互換性）
3. または既存は放置、新規のみ ASCII

## BE への確認依頼事項

1. slug 生成ロジックを **BE 側で行う方針**で OK か（案 A or C）
2. transliteration map / library の選択（手書き or `kuromoji.js` or 単語辞書）
3. 既存 8 レポートの slug 変換 migration の実施可否
4. slug の正規表現バリデーション ルール合意（`^[a-z0-9-]{1,80}$`）

## CLI 側の連携作業

- BE 仕様確定後、`buildBatchPayload` の処理を調整
- `published.yaml` の `metadata.slug_hint` を渡せるようにする（読みやすい候補）
- tests 追加: ASCII 違反 payload で 400 を確認

## 完了条件

- [ ] BE / FE / CLI で slug 仕様（ASCII only）合意
- [ ] BE 側 slug 自動生成 / バリデーション実装
- [ ] 既存 8 レポートの slug を ASCII に migration（or redirect）
- [ ] CLI `report batch-save` で ASCII slug が確実に生成される
- [ ] `published.yaml` に `slug_override` フィールド追加（高度な利用時）
- [ ] api-contract.md に slug 仕様を追記

## 関連

- `report-show-endpoint-404/`（show endpoint 不在問題、解決後 slug 移行とセット可能）
- `report-create-500-db-insert-failure/`（解決済、stock_code 正規化と同じく文字列正規化系の改善）

---

## 解決ログ (2026-04-25)

✅ **Resolved**

### Phase 1: ASCII 化 (commit cd3a884)
- generateSlug を ASCII-only (`[a-z0-9-]`) に変更
- 既存 8 件を REGEXP_REPLACE で migrate

### Phase 2: 社名 ASCII 組み込み (commit + migration)
- `asciifyCompanyName()` 追加
  - `'NIDEC CORPORATION'` → `'nidec'`
  - `'TSUKADA GLOBAL HOLDINGS Inc.'` → `'tsukada-global'`
  - 一般 suffix (Corp/Inc/Ltd/Holdings 等) を除外、先頭 2 単語まで
- `generateSlug` に `companyAscii` 引数追加 — 形式: `{4digit}-{company}-{title}-{YYYYMMDD}`
- create endpoint で `jpx_stock.company_name_english` を lookup
- 既存 8 件を SQL UPDATE で migrate

### 移行後 slug
```
6594 nidec        → 6594-nidec-moat-deepdive-20260425
2418 tsukada     → 2418-tsukada-global-value-debate-2-20260425
4666 park24      → 4666-park24-moat-deepdive-lukewarm-3-20260425
3399 maruchiyo   → 3399-maruchiyo-yamaokaya-moat-deepdive-hate-vs-love-20260425
9337 toridori    → 9337-toridori-jp-classic-value-debate-panel-20260425
7004 kanadevia   → 7004-kanadevia-moat-deepdive-binary-outcome-20260425
6378 kimura      → 6378-kimura-chemical-jp-classic-3-buy-20260425
6632 jvckenwood  → 6632-jvckenwood-moat-deepdive-3-strong-buy-20260425
```

Tests: 15 pass
