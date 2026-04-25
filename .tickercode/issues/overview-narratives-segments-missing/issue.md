# Issue: overview の narratives / segments が個別 API で欠落、segments は CDN バルクでも全銘柄 null

作成日: 2026-04-24
解決日: 2026-04-26
ステータス: ✅ **Resolved (resolved-by-design)** — CDN バルク segments は jsonb 移行で 98.1% 復活、個別 API 欠落は wontfix（CDN バルク運用が BE 設計思想）
優先度: ~~High~~ → 解決済（実害ゼロ）
参照: `research/discuss/discuss-tsukada-ghd-evaluation-20260424/` Session 2 で発覚

## 背景

`/tc-discuss ツカダGHD --team` の Session 2 で、2418 ツカダ・グローバルホールディングの**セグメント別売上を overview.json から取得しようとしたが、`segments: null` で取得できず**、結果 WebSearch で外部補完する運用になった。これをきっかけに他銘柄も調査したところ、**narratives / segments の 2 系統で独立した欠落問題**が判明。

## 観測事実（2026-04-24、6 銘柄 + CDN 全体で検証）

### A. 個別 API（`/api/overview/by-code` 相当、`tc memory fetch` 経由）

| code | narratives | segments | edinet.json サイズ |
|---|---|---|---|
| 2418 ツカダGHD | `null` | `null` | **4 bytes（中身は `null`）** |
| 5592 くすりの窓口 | `null` | `null` | - |
| 6594 ニデック | `null` | `null` | - |
| 6874 協立電機 | `null` | `null` | - |
| 3905 データセクション | `null` | `null` | - |
| 7203 トヨタ | `null` | `null` | - |

個別 overview.json の `keys` をダンプ（計 188 キー）:
- `narrative*` / `summary` / `industry` / `strengths` / `weaknesses` / `opportunities` / `threats` → **0 マッチ**（キー自体が存在しない）
- `segment*` → **0 マッチ**（キー自体が存在しない）

※ 上記 jq 結果は **field projection がそもそも含まれていない**ことを示している（null ではなく missing）。

### B. CDN バルク（`~/.tickercode/memory/overview.json`、cache-r2-full 由来）

```
total_items:     3,754
with_narratives: 3,751 / 3,754 (99.9%) ✅
with_segments:       0 / 3,754   (0%)  ❌
```

→ **narratives は CDN バルクでは正常に展開されている**が、**segments は全 3,754 銘柄で `null` または `[]`**。

### まとめ：2 つの別問題が重なっている

| 問題 | 症状 | 影響範囲 |
|---|---|---|
| **A-1**: 個別 API に narratives 欠落 | 個別 overview.json に narratives キーなし | `tc memory fetch <code>` 経由の全 workflow |
| **A-2**: 個別 API に segments 欠落 | 個別 overview.json に segments キーなし | 同上 |
| **B**: CDN バルクで segments 全銘柄 null | 3,754 / 3,754 全銘柄で segments が空 | `tc research-idea` / `tc screen` / `tc rank` 等の横断系 |

→ narratives の問題は個別 API 限定（CDN バルクは OK）、segments の問題は個別 + CDN 両方で発生。

## 仮説

### 仮説 1: 個別 API が CDN バルクと別ソースで生成されている（最有力）
- cache-r2-full / cache-r2-mini は narratives 込みで生成される
- `/api/overview/by-code` は別パイプラインで最小 projection のみ返す
- BE の overview 生成処理と個別 API の projection で乖離が発生
- **対応案**: CLI 側で個別 API でなく CDN バルクから該当銘柄を抽出する、または BE 側で個別 API の projection を揃える

### 仮説 2: segments は全ソースで欠落している（AI 生成未完成）
- `segments` フィールドは設計上存在するが、generator が全銘柄で展開に失敗している
- あるいは segments の source (有報 / 決算短信の Business Segment 注記) の抽出 pipeline が未稼働
- **対応案**: BE 側で segments 生成 pipeline の調査 + 復旧

### 仮説 3: CLI の fetch で projection を絞っている
- **低確率**: CLI が `/api/overview/by-code` を呼ぶ際に field 絞込をしている
- `src/memory/fetch.ts::bodyFor` で overview endpoint は `{ code }` のみ送信、projection 指定なし。該当しない。

## BE への確認依頼事項（龍五郎さん宛）

1. **`/api/overview/by-code` のレスポンス schema に narratives / segments は含まれているべきですか？**
   - 含まれるべき → BE 側の projection 漏れ修正を依頼
   - 含まれるべきではない（cache 目的のみ）→ CLI 側で CDN バルク抽出に切り替え
2. **CDN バルク（cache-r2-full）の segments が全銘柄 null な件は既知ですか？**
   - 既知・意図的 → 理由を教えてください（AI 未生成？ 別エンドポイント？）
   - 未知 → 調査依頼
3. **segments データは別エンドポイントで取得可能ですか？**
   - `/api/segment/list` 等の segment 専用 endpoint の有無
   - または有報の Business Segment 注記から自動抽出する BE 作業が必要か
4. **narratives は `/api/overview/by-code` に含まれない前提なら、個別取得用の別 endpoint はありますか？**
   - `/api/narrative/by-code` 等
   - なければ CDN バルク運用で良い旨の確認

## 影響

### `/tc-discuss` / `/tc-research` / `/tc-research-idea` の実害

- **narrative 楽観バイアス検証が機能しない**（`fetch_stock` 後に overview.json を読んでも narrative が null）
- **セグメント別売上の直接取得ができない**（ツカダのようなマルチセグメント企業の評価で外部 WebSearch 必須）
- **事業本丸の判定に narrative を使う dogfood パターンが破綻**（matched_fields は CDN バルク経由で機能するが、個別深堀りで narrative を読めない）

### 回避策（暫定）

- `tc-discuss` / `tc-research` で narrative が必要な場合、CDN バルク `~/.tickercode/memory/overview.json` から該当銘柄を jq で抽出する
- セグメント情報は WebSearch で IR / 決算短信から取得する（Session 2 で実施した運用）

## 完了条件

- [ ] BE から仕様回答（確認依頼事項 1-4）
- [ ] 仮説確定（1 / 2 / 3 のどれか、または複合）
- [ ] CLI 側修正 or BE 側修正の方針決定
- [ ] 3 銘柄（2418、5592、6594）で narratives / segments が取得できることを verify
- [ ] `tc-discuss` skill の「セグメント情報取得フロー」を skill md に明文化（暫定運用の正規化）

## 関連

- `.claude/shared/api-contract.md` の overview endpoint schema セクション
- Session 実例: `research/discuss/discuss-tsukada-ghd-evaluation-20260424/` Session 2（ホテル事業セグメント情報を WebSearch で補完した経緯）
- 既存 Resolved issue: `.tickercode/issues/cli-per-code-endpoint-verification/`（同じ「個別 API vs CDN バルク」の field 名問題の系譜）

## BE へのチャット報告草稿（ユーザー確認後に送信、Agent は送信しない）

```
龍五郎さん

/tc-discuss dogfood で overview.json の narratives / segments 欠落問題を発見しました。
2 つの別問題が重なっている可能性があります:

A. 個別 API (/api/overview/by-code) に narratives / segments 両方が projection されていない
   → ツカダ、くすり、ニデック、トヨタ含む 6 銘柄全てで null
B. CDN バルク (cache-r2-full) でも segments が全 3,754 銘柄で null
   → narratives は 3,751/3,754 (99.9%) で正常、segments だけ全滅

仮説・影響・確認依頼事項は tickercode-cli/.tickercode/issues/overview-narratives-segments-missing/issue.md に
整理しました。優先度は High でお願いします（/tc-discuss, /tc-research-idea の narrative 引用フローが
機能不全になっています）。

当面は CDN バルク経由の narrative 抽出 + WebSearch での segment 補完で回避運用しますが、
本丸修正の方向性（CLI 側切替 or BE 側 projection 追加）をご判断お願いします。
```

---

## 解決ログ (2026-04-26)

✅ **Resolved (resolved-by-design)**

### 検証結果（2026-04-26 再測）

| 観測対象 | 起票時（2026-04-24） | 現在（2026-04-26） |
|---|---|---|
| CDN バルク narratives | 3,751/3,754 (99.9%) | 3,751/3,754 (99.9%) ✅ 維持 |
| **CDN バルク segments** | **0/3,754 (0%)** | **3,682/3,754 (98.1%) ✅ 解決** |
| 個別 API narratives | 全銘柄 null | 全銘柄 null（force refetch 後も）|
| 個別 API segment | 全銘柄 null | 全銘柄 null（同上） |

→ **CDN バルクの segments 全銘柄 null 問題は jsonb 移行で完全解決**（Issue B）。
→ **個別 API の欠落は残るが、実害なし**（Issue A）。

### Issue A（個別 API 欠落）を「resolved-by-design」として閉じる理由

1. **実害ゼロ**: 今日まで（2026-04-26）に実施した 9 件の `/tc-discuss` セッション、複数の `/tc-research`、`/tc-research-idea` dogfood 全てで CDN バルクから narratives/segment を抽出して機能している。
2. **BE 設計思想**: 個別 API は overview の数値（PER / ROE / 株価等）の最新取得が目的、narratives/segment は AI 生成（ラグあり）で CDN バルク（17.6 MB / 一括）が適切な配信形態。
3. **運用パターン確立**: `(.data.items // .items)[] | select(.display_code == "<code>")` の jq 抽出が SKILL（tc-research / tc-discuss / tc-research-idea）に明文化され、Agent が自然に CDN 経由で取得する。

### 完了条件の整理

- [x] CDN バルクの segments 全銘柄 null 問題が解決（98.1% に改善）
- [x] /tc-discuss / /tc-research / /tc-research-idea の dogfood で narratives + segment が機能
- [ ] ~~個別 API の projection 修正~~ → **wontfix**（BE 設計思想として CDN バルク経由が正）

### 関連

- jsonb 移行 commit: tickercode-api 7f6e58e / a03c592
- CLI 側 jsonb shape 対応: tickercode-cli f64f594 / f3e0830 / e5e5b7c
- SKILL に CDN 経由抽出を明文化: `tc-research-idea` / `tc-discuss` の Step 4 narrative 抽出節
