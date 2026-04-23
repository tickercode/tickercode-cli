# research/samples — tc research-idea の実行例

`tc research-idea` / `tc research-batch` の成果物サンプル集。
新機能を追加した時の回帰確認、外部ドキュメント、Agent の学習例として使う。

## 構造

```
samples/
├── README.md              ← 本ファイル
└── ai-era/                ← AI 時代の受益者テーマ (2026-04-24)
    ├── 01-keywords.md
    ├── 02-hits.md         ← hits-limit 50 で切り詰め済（full は hits.json に）
    ├── 03-shortlist.md
    ├── final.md           ← Agent が深堀り + narrative 記入済
    ├── meta.json
    └── shortlist.json
```

注: `hits.json`（290KB）はサンプルには含まない。再現したい場合は下記コマンドを実行。

## 再現

```bash
tc overview sync --force
tc research-idea "AI 時代の受益者" \
  --keywords "AI,機械学習,LLM,人工知能" \
  --match any \
  --fiscal-status current \
  --screen-roe-gt 10 \
  --screen-mcap-gt 10000000000 \
  --target-size 20 \
  --hits-limit 50 \
  --top-n 5 \
  --out research/idea
```

生成された成果物で final.md の narrative 部分を Agent が埋めると、`samples/ai-era/final.md` と同等のレポートになる。

## サンプル追加のガイドライン

- **理由のある追加**: 新機能の回帰テスト用、または異なるテーマタイプ（定量重視 / 定性重視 / 大量 hits / 少量 hits 等）のショーケース
- **final.md は手書き編集 OK**: Agent が narrative を埋める前提のサンプルなので、skeleton のままではなく完成版を置く
- **hits.json は省略**: 290KB 以上になるため、再現手順だけ README に残す
- **新旧スキーマの混在に注意**: BE の overview.json 仕様が変わった時、古い sample の meta.json は旧スキーマを保持する。README にデータスキーマ基準日を明記する
