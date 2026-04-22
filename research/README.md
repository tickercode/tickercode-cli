# research/ — 投資調査ワークスペース

`@tickercode/cli` + MCP + Skills を使って生成/蓄積する調査メモの置き場。**個別ファイルは `.gitignore` でコミット対象外**、ディレクトリ構造（`.gitkeep`）と この README のみ Git 管理する。

## ディレクトリ構成

```
research/
├── code/        # 個別銘柄レポート
│   └── {4桁コード}/
│       ├── YYYY-MM-DD-research.md   # /tc-research 出力
│       ├── notes.md                  # 自分のメモ
│       └── ...
│
├── idea/        # 投資アイデア、業界分析、テーマ、マクロ観察
│   ├── semiconductor-cycle-2026.md
│   ├── yen-weak-beneficiaries.md
│   └── ...
│
├── system/      # 投資哲学、ルール、教訓、フレームワーク
│   ├── buffett-principles.md
│   ├── position-sizing.md
│   ├── lessons-learned.md
│   └── ...
│
└── archive/     # 使わなくなった書類、没アイデア、過去の失敗
    └── ...
```

## 運用ルール

### code/{コード}/

- ディレクトリ名は **4 桁コード**（例: `2418`, `7203`）
- `/tc-research 2418` 実行時は `research/code/2418/YYYY-MM-DD-research.md` に保存
- 個人メモ・決算ヒアリング・IR 問い合わせ結果もここに追加可

### idea/

- 銘柄を跨ぐアイデア全般（業界、テーマ、マクロ、スクリーニング条件など）
- ファイル名は `kebab-case.md`

### system/

- 投資哲学・ルール・教訓・チェックリスト
- 継続的に読み返すもの

### archive/

- 使わなくなった書類なんでも
- 削除する前に一旦ここへ

## なぜ .gitignore か

- 投資判断の生データは **個人の知的財産**、公開しない
- ただしディレクトリ構造は共有したいので `.gitkeep` + README はコミット
- Git リポを **ストレージ** ではなく **インデックス** として使う思想
