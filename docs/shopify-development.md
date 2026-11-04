# Shopify developer preview — 0.1.0-beta.1

**Shopify開発者向けソース・ローカル検証済みです。実Shopify認可・API受理・checkout・PData・公開ホスト・ストア掲載は未検証です。利用できるストア配布アプリの提供ではありません。**

LLL Inc. が開発中の配送ルールです。無料の1ルール、郵便番号1〜400範囲、配送方法の非表示のみを対象とします。料金変更・課金・有料機能・内蔵の離島実表は含みません。運送会社と確認した範囲を入力する設計です。

[ソースを読む](../shopify/) / [Developer Previewダウンロード](https://github.com/LLL-development/motoyomi/releases/tag/shopify-dev-2026-11-04)。WordPress/EmDashのベータとは別の開発成果物です。

## ローカル検証

Node.js 22.12以上、Rust（検証1.94）、wasm32-wasip1 targetが必要です。Releaseの明示的な`motoyomi-shopify-0.1.0-beta.1-source.tar.gz`を展開するか、Codeのshopify/へ移動してください。

```sh
npm ci
rustup target add wasm32-wasip1
mkdir -p docs/evidence
npm run test:all
```

`docs/evidence`は検証実行時の出力先として作ります。公開archiveへ過去の生ログ・DB・認証・依存は含めません。tests/fixtures/island.jsonは合成の試験データで、runtime試験が400/401範囲などを生成します。実際の離島表や顧客データとして使わないでください。HTTP試験の秘密値は実行時に生成します。

test:allはSQLite setup/migrations、production build、Node単体/HTTP/DB結合、Rust単体、実Wasm/公式runtime、上限benchmark、型検査です。SDK0.8.1/WASI JSON ABI、CLI5.0.0付属runner9.2.2を使用。400非隣接範囲・規則1000 bytes・配送名100字・10方法×異住所3グループは1,587,624命令、Wasmは256,589 bytesでした。このローカル測定はShopify上での配備・本番動作の証拠ではありません。

ローカル編集UIは[同梱README](../shopify/README.md)のloopback専用demoで確認できます。Shopifyへの反映は無効です。通常の/appはShopify認証が必要です。

## 接続前に残ること

Partnerアプリ/client_id、開発ストア、公開URL/TLS、実認可、Function/metafield配備、Admin API受理、住所データアクセス承認または対象外の根拠、Basic以上の実checkout（複数配送グループ・Apple Pay/Google Pay）、外部webhook配信、永続DB/秘密情報の運用、掲載審査が残っています。空client_idとexample.invalidは接続待ちの設定です。公開ソースへ実資格情報を記載しないでください。

必要な変数名はSHOPIFY_API_KEY、SHOPIFY_API_SECRET、SHOPIFY_APP_URL、SCOPES、DATABASE_URLです。値を配布物へ含めません。自動で店舗接続・有料登録・デプロイは行いません。

## 開発Wasm・同一性

`motoyomi-delivery-0.1.0-beta.1-development.wasm`はローカル検証用です。単独で利用可能なShopify Appではありません。SHA256は`0378679a02e217b9dedb6c8c880545237f435d74e94645aa94cb0bc2d4a6b28d`。同じReleaseのSHA256SUMSでダウンロードを照合できます。

ソースはMIT。元のShopify著作権表示とLLL Inc.の表示を保持しています。問い合わせはcontact@lx3.cafeへ、実資格情報や顧客データを送らず再現手順をお知らせください。
