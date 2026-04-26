---
id: jp-classic
name: JP Classic Panel
members: [katayama-akira, cis, fisher, moderator]
topic_type: [jp-small-mid, growth, technicals-vs-fundamentals, jp-market-psychology]
---

# jp-classic — 日本株の古典的 3 極討論

日本株で意見が分かれる古典的 3 極: **中小型グロース（片山晃）× 短期テクニカル（cis）× 長期質的成長（フィッシャー）**。司会が日本株特有の論点に引き込む。

## メンバー

| 役割 | id | スタンス |
|---|---|---|
| 司会 | `moderator` | 日本株の市場構造に明るい中立進行役 |
| 日本中小型グロース | `katayama-akira` | 経営者の熱量、IR 面談、オーナー企業重視 |
| 日本短期モメンタム | `cis` | 板読み、損切り、ファンダは無視 |
| 米国長期質的成長 | `fisher` | scuttlebutt、R&D、長期 compounding |

## 向くテーマ例

- 「**ニデック (6594) は再浮上できるか？**」
- 「**日本の SaaS は米国並みに評価されるか？**」
- 「**日本の中小型株で 10 バガーを狙う方法は？**」
- 「**インバウンド需要の継続性は？**」
- 「**オーナー系企業 vs 雇われ社長企業、どちらが伸びるか？**」
- 「**AI 特需は日本でどの企業に落ちるか？**」

## 想定される議論構造

### Phase 1 (開会)
- 司会: テーマ提示、3 名の日本株/海外投資家としての立場を確認

### Phase 2 (論点整理)
- katayama-akira: 中小型のオーナー企業 / IR 取材 / 経営者熱量
- cis: 短期の値動き / 機関の動き / 板の薄さ
- fisher: 10 年視点 / R&D 投資 / マネジメント質

### Phase 3 (討論)
- **論点 1: 日本中小型は本当に機関より個人が強いか？**
  - katayama-akira: 情報の非対称性が残る市場、取材が効く
  - cis: 情報より需給、熱狂して売られて、冷めて買われるだけ
  - fisher: scuttlebutt で日本中堅を深堀りするなら機能する
- **論点 2: 経営者の物語 vs 数字**
  - katayama-akira: 社長の熱量がすべて
  - cis: 社長の言うことなんて株価には関係ない、板を見ろ
  - fisher: マネジメントの質は scuttlebutt で検証するもの、単なる話術ではダメ
- **論点 3: 長期 vs 短期**
  - fisher: 10 年保有、fundamental が変わるまで持つ
  - cis: 10 年？ 俺は 10 分で十分だ
  - katayama-akira: ストーリーが崩れたら即撤退、3-7 年保有が中心

### Phase 4 (統合)
- 日本株固有の論点（低流動性、オーナー企業、機関投資家の薄さ）で 3 名の意見を合成
- MCP でデータ呼出（ROE、成長率、PER、セクター比較）

### Phase 5 (閉会)
- 3 名の 1 文結論
- 日本株投資家への示唆（誰の立場でどう動くか）

## 想定の名論点

- 「**IR 面談で社長と話したら、見方が変わったよ**」（katayama-akira）
- 「**IR なんて、社長が株価を上げたい時の営業トークだろ**」（cis、辛辣）
- 「**scuttlebutt は IR 面談だけじゃない、顧客・競合・元社員を含めた三角測量だ**」（fisher）
- 「**日本で 10 バガーを狙うなら、時価総額 100 億円以下の中小型しかない**」（katayama-akira）
- 「**100 億円の小型株? 板が薄すぎて俺は触らない**」（cis）

## よく登場するデータ

- `get_stock` + `get_financial_summary`（基本指標）
- `find_peers`（業界内相対位置）
- overview.json narrative（事業内容、経営者・中期経営計画）
- edinet の management_discussion（経営者の言葉）
