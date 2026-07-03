# N.A.Type

薙刀式配列・Arensito配列のためのタイピング練習Webアプリ。

[Karabiner-Elements](https://karabiner-elements.pqrs.org/) 等で配列環境を構築済みのユーザーが対象です。アプリ内で配列変換は行わず、**OS側で変換された結果を受け取って**練習します。アカウント登録・サーバー保存はなく、記録はすべてブラウザの localStorage に保存されます。

## 主な機能

- **薙刀式レッスン**（1〜8 / 公式マニュアルv16ベース。全レッスンの照合は継続中）
- **薙刀式 単語ドリル**モード
- **Arensito フリータイピング**（英語テキスト）
- **SVGキーボードビジュアライザー**（QWERTY/かな表示切替・次に押すキーをリアルタイムハイライト）
- **入力方式セットアップ**（Karabiner / リマップ / 物理キー位置練習）
- **統計**（WPM＝かな/分、正確率、ミス数）とレッスン進捗の永続化

## 技術スタック

| 項目 | 技術 |
|------|------|
| フレームワーク | Next.js 16 (App Router) / `output: "export"` 静的エクスポート |
| 言語 | TypeScript 5 (strict) |
| UI | shadcn/ui + Tailwind CSS 4（ダークテーマ固定） |
| データ保存 | localStorage のみ（バックエンドなし） |
| デプロイ | Cloudflare Pages（静的ホスティング） |

## セットアップ

前提: **Node.js 22**（`.node-version` で固定）、パッケージ管理は **npm のみ**（yarn/pnpm は使わない）。

```bash
npm ci          # 依存インストール（package-lock.json に厳密一致）
npm run dev     # 開発サーバー（http://localhost:3000, 0.0.0.0 で LAN 公開）
```

実機（iPad等）から LAN 経由で接続する場合、開発マシンの IP を `next.config.ts` の `allowedDevOrigins` に追加してください。

## npm スクリプト

| コマンド | 説明 |
|----------|------|
| `npm run dev` | 開発サーバー（`--hostname 0.0.0.0`、Turbopack） |
| `npm run build` | 本番ビルド（**webpack 固定** / 静的エクスポート → `out/`） |
| `npm run lint` | ESLint |

> **ビルドは必ず webpack** で行います（`--webpack`）。Turbopack の本番ビルドは React #185 の無限ループを踏むため、webpack に切り替えています。コミット前に `npm run build` が通ることを常に確認してください。

## ドキュメント

| ドキュメント | 内容 |
|--------------|------|
| [CLAUDE.md](CLAUDE.md) | 開発ガイド（アーキテクチャ・重要ファイル・薙刀式入力タイプ等） |
| [CONTRIBUTING.md](CONTRIBUTING.md) | コントリビューション手順・コミット規約 |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | デプロイ・運用手順（Cloudflare Pages） |
| [docs/DATA_MODEL.md](docs/DATA_MODEL.md) | localStorage のデータ構造 |
| [AGENTS.md](AGENTS.md) | AIエージェント向けの注意（Next.js 16 の破壊的変更） |

## ライセンス

現時点で未定（`private` プロジェクト）。
