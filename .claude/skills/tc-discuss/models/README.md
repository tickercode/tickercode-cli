# tc-discuss — モデル（投資家キャラクター）追加ガイド

`tc-discuss` の Mode 2 / Mode 3 で使う投資家モデルを定義するディレクトリ。1 人 1 ファイル（`{id}.md`）。

## 現在のモデル

| id | 投資家 | スタイル |
|---|---|---|
| `buffett` | ウォーレン・バフェット | Long-term Value / Moat |
| `munger` | チャーリー・マンガー | Multi-disciplinary / Invert |
| `fisher` | フィリップ・フィッシャー | Growth / Scuttlebutt |
| `graham` | ベンジャミン・グレアム | Deep Value / Margin of Safety |
| `katayama-akira` | 片山晃（五月） | JP Mid/Small-cap Growth |
| `cis` | cis | JP Short-term / Momentum |

## モデル追加の手順

### 1. frontmatter

```markdown
---
id: <unique-id-kebab-case>
full_name: <実名> (<日本語表記>)
style: <1 行スタイル、例: Value / Long-term>
era: <活動年代、例: 1930->
nationality: <US / JP / UK / etc>
---
```

### 2. 本文セクション（目安 200-400 行）

以下の 7 セクションを埋めると、Agent が「その人」として一貫した会話ができる:

1. **投資哲学**: 3-7 個の核となる信条（bullet）
2. **投資手法**: 具体的な判断プロセス
3. **語彙・口癖**: 原文引用（英→日）、特徴的な表現
4. **好む / 避ける銘柄類型**: ポジ例・ネガ例
5. **リスクへの視点**: 何をリスクと捉えるか
6. **会話スタイル**: 話し方、テンション、比喩の癖
7. **会話での想定発言パターン**: 10 個程度の**「この人ならこう言う」**例

### 3. 注意書き

- **実在発言の引用は著作・インタビューの範囲内**
- **架空の断定発言を捏造しない**（「こう言いそうだ」は OK、「こう言った」は NG）
- **投資助言の禁止**（「買うべき」断言禁止、「こう見るだろう」までに留める）

## 良いモデルファイルの特徴

- **口癖が具体的**: 「Invert, always invert」のような、その人固有のフレーズ
- **対立軸が明確**: 他のモデルと**議論で衝突する論点**が設計されている
- **時代背景が明確**: 1930 年代の大恐慌体験、2000 年代の IT バブル等、行動の文脈
- **日本株への視点**: 書けるなら書く（バフェットの商社投資、フィッシャーの日本製造業評価 等）

## モデル間の化学反応（team mode で活きる）

| 組合せ | 期待される化学反応 |
|---|---|
| buffett + graham | 師弟、質重視 vs 安全余裕の古典論争 |
| buffett + cis | 長期 vs 短期、理念 vs 実需給 |
| fisher + graham | グロース vs ディープバリュー |
| katayama-akira + cis | 日本個人投資家の 2 極（集中ファンダ vs 板読み） |
| munger + fisher | 学際的思考 vs スカトルバット |
| buffett + katayama-akira | 米国大型 vs 日本中小型 の経営者観 |

## モデル追加時のチェックリスト

- [ ] frontmatter 5 項目すべて埋めた
- [ ] 本文 7 セクションをカバー
- [ ] 口癖 / 名言を 5 つ以上記載
- [ ] 想定発言パターンを 5 つ以上記載
- [ ] 実在発言は出典（著作名 + 年）付き
- [ ] 他モデルとの対立軸が明確
- [ ] テスト: `/tc-discuss "テーマ" --as {id}` で数ターン自然に会話できる

## 追加候補（未実装）

- **Peter Lynch**: GARP (Growth at Reasonable Price), 著書『One Up on Wall Street』
- **George Soros**: Reflexivity, Macro, 中央銀行破り
- **John Templeton**: International / Contrarian / Deep value
- **Howard Marks**: Memo で有名、cycles / risk awareness
- **竹田和平**: 日本の個人大株主、長期配当重視
- **藤野英人**: レオス・キャピタルワークス、日本個別株
- **Bill Ackman**: Activist / Concentrated / Special situations

ユーザーが要望すれば追加可。
