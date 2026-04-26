---
id: value-debate
name: Value Debate
members: [buffett, graham, bear, moderator]
topic_type: [value, deep-value, margin-of-safety, turnaround, fallen-angel]
---

# value-debate — バリュー投資の古典論争

師弟（グレアム → バフェット）が、**数量的安全余裕 vs 質的 moat** でぶつかる構図に、反対派（bear）が「でも市場はそれを無視するぞ」と突っ込み、司会が整理する 4 名パネル。

## メンバー

| 役割 | id | スタンス |
|---|---|---|
| 司会 | `moderator` | 論点整理、参加者への質問振り |
| 古典バリュー | `graham` | 純資産割れ / PER 15 以下 / 安全余裕 |
| 質のバリュー | `buffett` | 質の高いビジネス、moat、long-term |
| 反対派 | `bear` | バリュートラップ / 構造劣化 / 成長性欠如 |

## 向くテーマ例

- 「**シャープ (6753) は割安か、バリュートラップか？**」
- 「**東京ガスの PBR 0.8 は投資機会か？**」
- 「**日本の PBR 1 倍割れ銘柄を買うべきか？**」
- 「**銀行株の配当利回り 4% は甘い罠か？**」
- 「**割安小型株の net-net 戦略は 2026 年の日本で機能するか？**」

## 想定される議論構造

### Phase 1 (開会, 5-10 発言)
- 司会: テーマ提示、3 名の立場を確認

### Phase 2 (論点整理, 10-20 発言)
- graham: 数値面の割安度を提示（PER, PBR, 配当, 純資産 vs 時価）
- buffett: 事業の質（moat, ROE, capital allocation）を提示
- bear: 割安の理由 = 市場の合理的な評価、価値の毀損、構造問題を列挙

### Phase 3 (討論, 40-60 発言)
- **論点 1: margin of safety は十分か？**
  - graham: 数値から判断、十分と主張
  - bear: 隠れ負債 / 将来の不確実性で不十分
- **論点 2: moat はあるか？**
  - buffett: 長期優位性を評価
  - bear: moat が毀損 / 既に消えた可能性
- **論点 3: 経営陣は信頼できるか？**
  - buffett: 資本配分の履歴を見る
  - graham: 数字で経営の誠実性を見る
  - bear: 経営陣のインセンティブ構造を指摘

### Phase 4 (統合, 10-20 発言)
- 3 名が互いの論点に反駁、MCP で定量データ（get_stock / calculate_moat）を引用

### Phase 5 (閉会, 5-10 発言)
- 各人の 1 文結論
- 司会が「合意点」「非合意点」「読者への示唆」を整理

## 想定の名論点

- 「**PBR 0.8 は割安なのか、それとも市場が正しく評価した劣化なのか？**」（graham vs bear）
- 「**質のビジネスに PER 15 を払うのはグレアム的には speculation だ**」（graham vs buffett、師弟論争）
- 「**moat が 10 年持つと言うなら、ROE の継続性を見せろ**」（bear vs buffett）
- 「**経営者の capital allocation が悪ければ、いくら割安でも buy にならない**」（buffett）

## よく登場するデータ

- PER / PBR / 配当利回り / ROE （`get_stock`）
- 過去 10 年の業績トレンド（`get_financial_trend`）
- 同業比較（`find_peers`）
- 3-5 年の理論株価投影（`project_pl`）
