# tickercode-cli — テーマ横断スクリーニング機能 設計メモ

最終更新: 2026-04-23
ステータス: 提案（未着手）

## 背景

既存 10 ツールは全て **単一コード深堀り型**（`get_stock` / `project_pl` / `calculate_moat` / `find_peers` …）。

テーマ（例: 「AI 時代の受益者」「脱炭素」「インバウンド」）起点で **複数銘柄を横断抽出** するユースケースに道具が足りず、`mini.json` を Bash + jq で直叩きせざるを得ない。Agent からも人間からも使いにくい。

## 提案コマンド（7 本）

| コマンド | 役割 | データソース | 優先度 |
|---|---|---|---|
| `tc screen` | 複数条件で mini.json を絞る（例: `--sector 5250 --per-lt 20 --roe-gt 15 --growth3y-gt 10`） | mini.json | ★★★ |
| `tc rank` | セクター or 全体でメトリクス top N（例: `--by i_forward_per --sector 3650 --limit 10 --asc`） | mini.json | ★★★ |
| `tc compare` | 複数コードを横並び比較表（例: `tc compare 8035 6920 6857 --metrics per,roe,moat`） | get_stock 並列 | ★★ |
| `tc search` | company_name / short_name のキーワード検索（「AI」「半導体」等） | mini.json | ★★ |
| `tc theme` | 事前キュレート済テーマ → 銘柄リスト（例: `tc theme ai-infra`） | `themes/*.yaml` | ★ |
| `tc fetch-batch` | 複数コード並列 fetch（既存 fetch_stock を並列化） | API | ★ |
| `tc grep` | キャッシュ済 edinet 本文を横断キーワード検索 | `~/.tickercode/memory/code/*/edinet.json` | ★ |

## 設計指針

### ローカル評価優先
- `screen` / `rank` / `search` は **mini.json（8.4MB / 3,751 銘柄）をローカル評価**し API を叩かない
- 即応答（<100ms 目標）
- フィールド一覧は mini.json 実体から自動生成（型不一致に注意: PER は string 型が多い）

### テーマレジストリ
- `themes/ai-infra.yaml` のような **キュレートファイル** を repo 同梱
- Agent が拡張提案できる差分 PR 運用
- スキーマ例:
  ```yaml
  id: ai-infra
  label: AI インフラ / 半導体装置
  rationale: AI 需要で装置・素材が売れる
  codes: [8035, 6920, 6857, 4063, 3436]
  tags: [semiconductor, equipment]
  ```

### 出力
- 既存 `--format pretty|json|md` を踏襲
- `screen`/`rank` の json 出力は Agent がそのままパイプで次ツールに食わせられるよう `{ results: [{code, ...}] }` 形式

## API / MCP 両対応

各コマンドは MCP tool としても同時公開する（既存 10 ツールと同様）。命名は `mcp__tickercode__screen` / `rank` / `compare` / `search` / `theme` / `fetch_batch` / `grep`。

## 着手順（案）

1. **Phase A**: `screen` + `rank`（今回の AI 調査で最低限必要）
2. **Phase B**: `compare` + `search`（調査の定番）
3. **Phase C**: `theme` + `fetch-batch` + `grep`（拡張）

## 未決事項

- `screen` のフィルタ DSL: `--per-lt 20` のような複数フラグ vs `--filter "per<20 AND roe>15"` のような式
- `rank` で複数メトリクスの合成スコアをサポートするか
- `themes/` を repo に置くか `~/.tickercode/themes/` に置くか（ユーザ追加 vs 公式キュレート）
- `grep` の対象を edinet に限定するか news / disclosure も含めるか

## 関連

- 今回の AI 時代受益銘柄調査（2026-04-23）でニーズが顕在化
- 後続の `tc-research-idea` ワークフロー（別途設計中）の下敷きになる
