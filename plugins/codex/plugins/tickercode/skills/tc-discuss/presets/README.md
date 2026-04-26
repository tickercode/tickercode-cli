# tc-discuss — プリセット（team 構成）追加ガイド

`tc-discuss` Mode 3 で使う 4 名パネル構成の preset。1 preset 1 ファイル（`{id}.md`）。

## 現在のプリセット

| id | 構成 | 向くテーマ |
|---|---|---|
| `value-debate` | バフェット + グレアム + 反対派 + 司会 | バリュー / 安全余裕 / バリュートラップ |
| `jp-classic` | 片山晃 + cis + フィッシャー + 司会 | 日本株 / 中小型 / テクニカル vs ファンダ |
| `moat-deepdive` | バフェット + マンガー + 賛成派 + 司会 | 堀の耐久性 / 競争優位 |

## プリセット追加の手順

### 1. frontmatter

```markdown
---
id: <unique-id-kebab-case>
name: <English / human-friendly name>
members: [<model_id_1>, <model_id_2>, <role_id_3>, <role_id_4>]
topic_type: [<tag1>, <tag2>, ...]
---
```

**members**: 4 名（3 名でも可、ただし議論が薄くなる）。モデル id + 特殊 id の混合 OK。
- モデル id: `buffett`, `munger`, `fisher`, `graham`, `katayama-akira`, `cis`, ...
- 特殊 id: `moderator`（司会）, `bull`（賛成派）, `bear`（反対派）, `skeptic`（中立批判者）

**topic_type**: tag 配列、このプリセットが向くテーマの種類。

### 2. 本文セクション

1. **メンバー表** (役割 / id / スタンス)
2. **向くテーマ例** (5-7 個の質問例)
3. **議論構造** (Phase 1-5 の進行イメージ)
4. **想定の名論点** (参加者間で衝突する論点 5 つ程度)
5. **よく登場するデータ** (どの MCP tool が呼ばれるか)

## 良い preset の特徴

- **対立軸が明確**: 賛成 vs 反対だけでなく、方法論の違いで意見が割れる
- **参加者の組合せが化学反応を起こす**: 師弟（buffett + graham）、同世代（katayama + cis）等
- **想定テーマが 5 つ以上**: 単発のテーマ用ではなく、応用範囲が広い
- **MCP 連携が想定済み**: どのデータ呼出が自然に入るか明示

## プリセット間の棲み分け

| preset | 時間軸 | 市場 | 論点の核 |
|---|---|---|---|
| value-debate | 長期 | US + 普遍 | 価格 vs 価値 |
| jp-classic | 短期〜長期 | 日本 | 日本株特有の個人 vs 機関 |
| moat-deepdive | 超長期 (10-20 年) | US + 普遍 | 競争優位の耐久性 |

## 追加候補（未実装）

- **growth-vs-value**: フィッシャー + グレアム + bull + moderator（成長論 vs バリュー論、古典派対決）
- **contrarian**: グレアム + bear + cis + moderator（逆張り論争）
- **tech-disruption**: マンガー + フィッシャー + bull + moderator（テクノロジー変化下の投資）
- **macro**: Soros + Druckenmiller + bear + moderator（マクロ投資、国境跨ぎ）※ Soros モデル未実装
- **jp-deep-value**: katayama-akira + graham + bear + moderator（日本 PBR 1 割れ銘柄）

## カスタム構成との使い分け

- **preset**: 繰返し使うパターン、議論の型が固まっている
- **`--team <csv>`**: 特定テーマ限定の即席構成、1 回限りの会話

ユーザーが複数回同じ構成を使うようになったら preset 化を提案する。

## メンバー構成のベストプラクティス

### 4 名で組む理由

- **2 名**: 単なる対話、議論にならない
- **3 名**: 三つ巴、司会不在だと収拾しにくい
- **4 名**: 司会 + 3 視点が理想（賛成 / 反対 / 投資家 or 司会 + 2 投資家 + 反対派）
- **5 名以上**: 各人の発言機会が減り、100 発言では深まらない

### 投資家 2 名を入れる場合

- **対立軸を確保**: buffett + cis（長期 vs 短期）、graham + fisher（割安 vs 成長）
- **同調でぼやけない**: buffett + munger は同調が多いが、munger が invert で緊張を作れるので成立
