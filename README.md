# Motoyomi / モトヨミ

日本語の記事を書く画面で、過去の記事への内部リンク候補を探す無料プラグインです。題名・見出し・本文中の語句を使い、全角/半角や型番の表記ゆれにも対応します。候補取得では本文を変更せず、外部へ記事を送信しません。

**2026-11-04 初期ベータ**。候補の採否は編集者が確認してください。AIによる意味検索・回答生成・有料版は未実装です。

| 製品 | ダウンロード | 導入と制限 |
|---|---|---|
| WordPress 0.1.0 | [インストール用ZIP](https://github.com/LLL-development/motoyomi/releases/download/beta-2026-11-04/motoyomi-0.1.0.zip) | [WordPressガイド](docs/wordpress.md) |
| EmDash 1.0.0 | [npm形式tarball](https://github.com/LLL-development/motoyomi/releases/download/beta-2026-11-04/motoyomi-emdash-1.0.0.tgz) | [EmDashガイド](docs/emdash.md) |

[リリース・ソース・SHA256チェックサム](https://github.com/LLL-development/motoyomi/releases/tag/beta-2026-11-04)。WordPress.org、npm registry、EmDash registryには未掲載です。Shopify版はこの配布に含みません。

## どんな記事に使えますか

日本語記事や製品型番を含む記事が対象です。公開済み記事を索引にし、非公開記事・既存リンク・自分自身を候補から除きます。AIによる意味理解は行わないため、似た語句が別の意味で使われる記事では確認が必要です。

## よくある質問

**アカウントやAPIキーは必要ですか？** 不要です。無料ベータはローカル処理で、外部サービスへ本文を送りません。

**自動で本文を書き換えますか？** 候補取得で書き換えません。WordPressの「選んだ関連記事を末尾に追加」だけは明示操作で編集内容へ追加します。EmDashは手動リンクです。

**検索順位や候補精度は保証されますか？** 保証しません。機械fixtureでの動作確認は行いましたが、人が正解を付けた独立の候補精度・無関係率評価と、実利用による成果測定は未実施です。

**大規模サイトで使えますか？** まず小さい対象範囲でお試しください。特にEmDashは500件超の範囲を絞ってください。Cloudflare実機CPU制限の検証は未実施です。

## 画面

公開用サンプル環境の画像です。

![WordPress設定](https://github.com/LLL-development/motoyomi/releases/download/beta-2026-11-04/wordpress-settings.png)
![EmDash編集パネル](https://github.com/LLL-development/motoyomi/releases/download/beta-2026-11-04/emdash-editor-panel.png)

WordPress版はGPL-2.0-or-later、EmDash版はMIT。配布ソースに各ライセンスを含みます。
問い合わせ: contact@lx3.cafe。パスワードや非公開記事を送らず、環境と再現手順をお知らせください。
