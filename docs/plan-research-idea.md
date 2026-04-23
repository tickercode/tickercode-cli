# tickercode-cli — `tc research-idea` ワークフロー 仕様書

最終更新: 2026-04-23（BE 実装完了を反映）
ステータス: BE 実装完了 / CLI 側未着手（Phase 1 着手可）
関連: `docs/plan-screening.md`（前段のスクリーニング機能）、`.claude/shared/api-contract.md` L218（BE 仕様書）

## 1. 目的

ユーザー（人間 or Agent）が **自由文のテーマ** を渡すだけで、

```
「AI 時代に恩恵を受ける銘柄」
「インバウンド再加速の勝ち組」
「脱炭素で割を食う重厚長大」
```

といった投資テーマに対して、**3,751 社の母集団から候補企業を系統的に抽出し、深堀り調査して最終レポートを生成する** CLI / MCP コマンド。

### 3 つの設計原則

1. **Agent ファースト**: Claude / MCP から呼ばれる前提で、各ステップの中間成果物をファイル化する
2. **再開可能**: 途中で落ちても、keyword / hits / shortlist を再利用して続きから走れる
3. **データは BE に寄せる**: narrative テキストの横断検索は overview.json（BE dump）に依存。CLI は検索ロジックと統合のみ担当

## 2. ユーザーインターフェース

### CLI

```bash
tc research-idea "AI 時代の受益者"

tc research-idea "AI 時代の受益者" \
  --target-size 50 \        # shortlist 上限（既定 50）
  --deep-dive-size 10 \     # 深堀り対象数（既定 10）
  --keywords-preview \      # keyword 生成後に停止して確認
  --resume <idea-slug>      # 途中再開
```

### MCP tool

```
mcp__tickercode__research_idea(
  theme: string,
  target_size?: number,
  deep_dive_size?: number,
  resume_from?: string
) → { idea_slug, report_path }
```

## 3. ワークフロー（7 ステップ）

```
Step 1  Agent が自由文 → keywords 生成 (3〜20 個)
Step 2  overview.json でキーワード検索 → hits (数百社)
Step 3  mini.json の指標で絞り込み → shortlist (最大 target_size 件)
Step 4  shortlist 全件を軽量調査 (get_stock + get_financial_summary)
Step 5  スコアリング → top deep_dive_size 件を選出
Step 6  top 社のみ深堀り (calculate_moat + edinet Read + project_pl)
Step 7  最終レポート合成
```

### Step 1: キーワード生成

- Agent が theme を解釈し、**3〜20 個の検索キーワード**を生成
- 同義語・上位概念・下位概念・英日併記を考慮（例: "AI" → ["AI", "人工知能", "機械学習", "LLM", "大規模言語モデル"]）
- `--keywords-preview` フラグ時はここで停止、ユーザーが編集可能
- 成果物: `research/idea/{slug}/01-keywords.md`

### Step 2: キーワード検索（overview.json 依存）

- BE が提供する `overview.json`（全 3,751 社の narrative + segment）を DL（キャッシュ済なら再利用）
- **narrative 検索対象**: `summary` / `industry` / `strengths` / `weaknesses` / `opportunities` / `threats`
- **segment 検索対象**: `segments[].name`
- マッチ条件: キーワード OR 検索（既定）/ AND 検索（`--match-all`）
- ヒット数が目標レンジ（30〜200）を外れたら **Agent が keyword を自己調整**（reflection ループ、最大 3 回）
- 成果物: `research/idea/{slug}/02-hits.md`（全ヒット社名 + マッチキーワード）

### Step 3: 指標絞り込み（mini.json 依存）

- hits をさらに mini.json の定量指標で絞り込み、`target_size` 件（既定 50）以下に
- 絞り込み基準（theme に応じて Agent が選択）:
  - 成長: `yoy3y_sales > 5` など
  - 収益性: `i_forward_roe > 10`
  - バリュエーション: `i_forward_per < 30`
  - 規模: `market_capitalization > 50000000000`
- ただし **絞り込みで zero 件になったら緩和**（target_size の 1.5 倍まで許容）
- 成果物: `research/idea/{slug}/03-shortlist.md`

### Step 4: 軽量調査（shortlist 全件）

- `target_size` 社を並列バッチ（5〜10 社単位）で `fetch_stock` + `get_financial_summary`
- API rate limit 対応: バッチ間に sleep（100ms）
- 成果物: `research/idea/{slug}/candidates/{code}.md`（1 社 1 ファイル、軽量版）
- 各ファイルには:
  - 基本情報（時価総額 / PER / ROE / 成長率）
  - 直近決算サマリ
  - Step 2 でマッチしたキーワードと該当 narrative 抜粋
  - セグメント構成（該当事業の比率を強調）

### Step 5: スコアリング

- 4 軸で 5 点満点採点（Agent が theme と narrative 抜粋から判定）:
  - **テーマ整合性**: このテーマにどれだけ純粋に当たるか
  - **成長性**: 過去実績 + forecast
  - **バリュエーション**: 同セクター中央値比
  - **収益性**: ROE / 営業利益率 の絶対値と対 peer
- 合計スコア top `deep_dive_size` 件を選出
- 成果物: `research/idea/{slug}/04-ranking.md`（全 shortlist 社のスコア表）

### Step 6: 深堀り

- top `deep_dive_size` 件のみ：
  - `calculate_moat`
  - `memory_path(code, "edinet")` → Read で事業等のリスク / 競争環境を抽出
  - `project_pl`（3y-cagr pattern）
- 成果物: `research/idea/{slug}/candidates/{code}.md` に追記（深堀りセクション）

### Step 7: 最終レポート

- 深堀り結果を統合した投資テーマレポート
- 構成:
  1. テーマの全体像（なぜ今このテーマか）
  2. 選定フロー（3,751 社 → N hits → shortlist → top N）
  3. 最終候補 top N の一覧表 + 各社 1 段落サマリ
  4. 4 軸スコア表
  5. 勝ち/負けシナリオ
  6. リスク要因
  7. データソース / 基準日
- 成果物: `research/idea/{slug}/final.md`

## 4. 出力ディレクトリ構造

```
research/idea/{slug}/
├── meta.json              # 実行パラメータ、各ステップのハッシュ、タイムスタンプ
├── 01-keywords.md
├── 02-hits.md
├── 03-shortlist.md
├── 04-ranking.md
├── final.md
└── candidates/
    ├── 8035.md
    ├── 6920.md
    └── ...
```

`slug` は theme から自動生成（例: `ai-era-beneficiary-2026-04-23`）。

## 5. データ要件（BE 実装済み ✅）

### 5.1 `overview.json`（配信中 / 2026-04-23 deploy 完了）

**ステータス**: BE 実装完了・稼働中（2026-04-23 疎通確認済）

- **URL**: `https://cdn.ticker-code.com/cache/api/full/list/overview.json`
- **R2 Key**: `cache/api/full/list/overview.json`（mini.json と同ディレクトリ）
- **更新頻度**: 日次 04:00（`daily-generate-analysis.ts` 末尾で `refreshCdnOverview()` 実行）
- **配信形式**: gzip（CDN 層で自動、`content-encoding: gzip`）
- **認証**: 不要
- **Cache-Control**: `public, max-age=3600`
- **ETag / Last-Modified**: 配信あり（差分取得可能）

**実測サイズ（2026-04-23）**:

| 項目 | 値 |
|---|---|
| raw | 9.3MB |
| gzip 転送 | **~2MB** |
| 総銘柄数 | **3,753 社** |

当初予測（gzip 5〜7MB）より小さい。narrative のみの dump で済んだため。

### 5.1.1 レスポンススキーマ（確定版）

**最上位は ApiResponse<T> ラッパー**（BE 共通規約）:

```typescript
type ApiResponse = {
  success: boolean;          // true
  status: number | null;
  error: any;
  message: string;
  data: {
    meta: {
      total: number;           // 3753
      generated_at: string;    // ISO8601
    };
    items: OverviewItem[];
  };
};
```

**OverviewItem**:

```typescript
type OverviewItem = {
  code: string;                // 5 桁 "72030"
  display_code: string;        // 4 桁 "7203"
  company_name: string;        // "トヨタ自動車"
  short_name: string | null;
  sector33_code: string;       // "3700"
  sector33_code_name: string;  // "輸送用機器"
  market_code_name: string;    // "プライム"

  narratives: {
    summary: string;           // 企業概要（~150字）
    industry: string;          // 業界分析（~150字）
    strengths: string[];       // 3〜5 項目 / 各 1〜2 文
    weaknesses: string[];      // 3〜5 項目 / 各 1〜2 文
  } | null;                    // ← 全体 null あり（2 件 / 3753、新規上場等）

  segments: Array<{
    name: string;
    revenue: number | null;         // 円
    revenue_share: number | null;   // 0-1 スケール
    op_profit: number | null;
    op_margin: number | null;       // 0-1 スケール
  }>;                           // ← [] あり（251 件 / 3753）
                                //    要素内フィールド単位で null もあり（例: トヨタは op_profit のみ）
  segment_count: number;
  total_sales: number | null;
  fiscal_year: string | null;       // "2025-03-31"

  // 2026-04-23 追加（BE P0 triage commit 7f6e58e）
  fiscal_year_status: "current" | "stale_2y+" | "missing";
  segment_data_status: "complete" | "partial" | "unavailable";

  analysis_as_of: string | null;    // narrative 生成時刻 "2026-02-25 01:28:39"
};
```

### 5.1.2 データ品質ステータス（BE P0 triage 後の実測、2026-04-23 13:26 UTC）

BE チームが `fiscal_year_status` / `segment_data_status` を追加済（commit 7f6e58e）。CLI 側は **status フラグで確実に分岐**できる。

#### fiscal_year_status

| 値 | 件数 | 割合 | 意味 |
|---|---|---|---|
| `current` | 2,981 | 79.4% | 直近 2 年以内の決算期 |
| `stale_2y+` | 521 | 13.9% | 2 年以上古い（EDINET 欠損が根本原因、次スプリントで backfill 予定） |
| `missing` | 251 | 6.7% | 決算期そのものが取れていない |

#### segment_data_status

| 値 | 件数 | 割合 | 意味 |
|---|---|---|---|
| `complete` | 2,975 | 79.3% | 全要素の revenue / op_profit 等が埋まっている |
| `partial` | 480 | 12.8% | name はあるが一部数値 null（トヨタ型） |
| `unavailable` | 298 | 7.9% | name もない / segments: [] |

#### 生データの稀少 edge case

- `narratives === null`: 2 件（556A, 558A = 新規上場直後）
- `narratives` は埋まっているが全文 generic 調: 次スプリント（P1 対応）で改善予定

### 5.1.3 CLI 側 UX 判断（status フラグ活用で確定）

| # | 論点 | 確定方針 |
|---|---|---|
| 1 | `narratives === null` 銘柄 (2 件) | Step 2 で company_name のみヒット対象、narrative スコアは 0（新規上場として扱う） |
| 2 | `fiscal_year_status === "stale_2y+"` 銘柄 (521 件) | Step 3 の定量フィルタから **除外推奨** だが、ユーザー指示で `--include-stale` フラグで含められる |
| 3 | `segment_data_status !== "complete"` 銘柄 (778 件) | セグメント寄与度フィルタ（「セグメントの X% 以上が Y 事業」等）は complete のみを対象。narrative 検索は全量対象 |
| 4 | industry フィールドも keyword 対象に含める | ✅ 含める（業界分析文に「AI」「半導体」等が入るケース多数、BE 推奨） |

#### 既定の「研究対象集合」の定義

```typescript
// デフォルトのフィルタ（tc research-idea の Step 4 shortlist 対象）
const safeSet = items.filter(i =>
  i.narratives != null                       // narrative 必須
  && i.fiscal_year_status === "current"       // 直近決算
  && i.segment_data_status === "complete"     // セグメント数値完備
);
// → 2,508 銘柄（66.8%）が安心して使える研究対象

// narrative のみ活用の緩い集合（keyword 検索の Step 2）
const usableForKeywordSearch = items.filter(i =>
  i.narratives != null
  && i.fiscal_year_status !== "stale_2y+"    // 2 年超古いものだけ除外
);
// → 3,230 銘柄（86.1%）
```

Step 2 (keyword 検索) は緩い集合 3,230 件を対象、Step 3 (絞り込み) で safeSet 2,508 件に寄せるのが基本戦略。

### 5.1.4 ストレージ戦略（D1 不採用の理由）

**R2 単体で構成する。D1 / Durable Objects は採用しない。**

- CLI / Agent 側の主要ワークロードは **全量 bulk scan + ローカル keyword AND 検索**。1 回 DL → オフライン評価が最速・最安
- 1 銘柄単位の surgical query は `tc fetch_stock` + memory キャッシュで既にカバー済み
- narrative は日次更新で強整合性も不要
- 運用複雑度を最小化（静的ファイル 1 本）
- Web 側で interactive 検索が必要になったら、別途 Phase 2+ で D1 / 検索 API を検討

### 5.1.5 サイズ超過時の分割戦略（Phase 2 以降）

MVP は単一ファイルで開始。実測 gzip 2MB なので当面余裕あり。将来 gzip 5MB 超過時の選択肢:

| 手段 | 効果 |
|---|---|
| セクター分割（33 ファイル） | 平均 300〜600KB / ファイル |
| narrative / segment 分離 | segment 先出し、narrative lazy DL |
| 差分 dump（`overview-delta-{date}.json`） | 日次更新を軽量化 |
| gzip → brotli 切替 | さらに 30% 削減 |

### 5.1.6 キャッシュ戦略（CLI 側実装）

- 初回 DL: `~/.tickercode/cache/overview.json` に保存
- TTL: 24h（BE 更新は日次 04:00）
- 差分取得: `If-None-Match` (ETag) / `If-Modified-Since` で 304 判定
- 強制再取得: `--refresh` フラグ

#### スキーマ

```typescript
type OverviewIndex = {
  generated_at: string;  // ISO8601
  count: number;
  items: Array<{
    code: string;             // 5 桁
    company_name: string;
    sector33_code: string;
    narratives: {
      summary: string;        // 企業概要
      industry: string;       // 業界
      strengths: string[];
      weaknesses: string[];
      opportunities: string[];
      threats: string[];
    };
    segments: Array<{
      name: string;
      revenue: number;          // 円
      revenue_share: number;    // 0-1
      op_profit: number;
      op_margin: number;        // 0-1
    }>;
    mid_term_plan?: string;   // 中期経営計画名（任意）
    data_as_of: string;       // narrative 生成時点 or 直近決算日
  }>;
};
```

#### 確認事項（BE / 龍五郎 + 白川）

- [ ] narrative は既存でどこに存在するか（AI 生成済？ DB 保存？ 再生成必要？）
- [ ] 強み・弱み以外の「機会・脅威」が取得可能か
- [ ] セグメントデータの取得元（XBRL? 自社 DB?）
- [ ] dump 生成 cron を mini.json 更新 pipeline に組み込み可能か

### 5.2 `mini.json`（既存、変更なし）

- 現状で十分（i_forward_* / i_trailing_* / yoy3y_* / sector33_code）

## 6. 内部実装ポイント

### 6.1 キャッシュ戦略

- `~/.tickercode/memory/overview.json` に TTL 24h でキャッシュ
- 各 step の中間成果物をハッシュ化して `meta.json` に記録
- 同一パラメータの再実行時は前回結果を再利用、差分のみ再計算

### 6.2 Agent との役割分担

| 処理 | 担当 | 理由 |
|---|---|---|
| keyword 生成 | Agent (LLM) | 自然言語理解が必要 |
| keyword マッチ | CLI (deterministic) | 再現性・速度 |
| 指標絞り込み基準の選択 | Agent | theme ごとに最適解が違う |
| 指標絞り込み実行 | CLI | 確定的 |
| 4 軸スコアリング | Agent | 定性評価が混ざる |
| 合計スコア計算 | CLI | 確定的 |
| レポート執筆 | Agent | 文章表現 |

### 6.3 エラー / 例外

- hits 0 件 → keyword を Agent が緩める（reflection 1 回）
- API rate limit → backoff リトライ（3 回）
- 深堀り中に 1 社失敗 → スキップして続行、final.md に記載

## 7. 実装フェーズ

### Phase 0: 下準備
- [ ] BE に `overview.json` 生成 + R2 配信を依頼（`.claude/shared/api-contract.md` 更新）
- [ ] 本ドキュメントを BE レビュー → 合意

### Phase 1: 前提機能
- [ ] `plan-screening.md` の `tc screen` / `tc rank` / `tc search` を先行実装
- [ ] これらは `research-idea` の Step 2 / Step 3 で内部利用

### Phase 2: `research-idea` MVP
- [ ] Step 1〜5 までを実装（深堀りなし、軽量版レポート）
- [ ] `target_size=30` で動作確認

### Phase 3: 深堀り + 最終レポート
- [ ] Step 6〜7 を追加
- [ ] `project_pl` と moat 統合

### Phase 4: MCP 化 + 再開機能
- [ ] MCP tool として公開
- [ ] `--resume` / 差分再実行

## 8. 非ゴール（v1）

- ❌ セマンティック検索（embedding ベース）— キーワードマッチのみ
- ❌ 投資助言（「買うべき」断言）— 情報提供に徹する
- ❌ 価格アラート / 発注連携 — 読み取り専用
- ❌ 自動 keyword 拡張の上限なしループ — 最大 3 回で打ち切り

## 9. 未決事項

1. **`overview.json` の narrative 品質** — 既存が AI 生成ならハルシネーション混入リスク。出典タグ or 信頼度スコアが欲しい
2. **スコアリングの重み付け** — 4 軸を均等 vs theme ごとに変動
3. **slug の命名規則** — 日本語 theme をどう ASCII slug 化するか（例: `ai-era` / `ai-時代受益-2026-04-23`）
4. **複数 theme の並列実行** — 1 ユーザーが `ai-infra` と `robotics` を同時に走らせるか
5. **コスト管理** — 1 回の実行で API 呼び出しが最大 `target_size * 5` endpoint。50 社なら 250 呼び出し。BE 側 rate limit 要確認

## 10. 成功基準

- 「AI 時代の受益者」テーマで実行 → 10 社の深堀りレポートが 30 分以内に生成される
- Agent（Claude）から MCP 経由で呼ばれた時、中間成果物の path が返り、追加調査が容易
- 同じテーマを 1 週間後に再実行した時、差分（新規上場 / 新規決算）が反映される
