# Motoyomi 配送ルール — 無料ベータ 0.1.0-beta.1

LLL Inc. のShopifyアプリです。無料の1ルールで、指定した郵便番号の地域内では通常用の配送方法を、地域外では離島用の配送方法を隠します。配送料金はShopifyの配送設定で別々に作成してください。料金自体は変更しません。

**現在の到達点:** ローカルの編集・SQLite保存・再起動後の読出し、認証後のShopify反映コード、実Wasm実行、HTTP webhook署名・DB削除の結合試験まで検証しています。Partnerアプリ/client_idと開発ストアが未接続のため、Shopifyでの認可・API反映・実チェックアウト・住所データアクセスの承認・掲載審査は未検証です。公開・ストア提出はしていません。

## 機能と制限

- 配送方法名は完全一致で判定します。通常用/離島用それぞれ100文字まで。
- 郵便番号の範囲は手入力で1〜400行。7桁、または開始7桁-終了7桁で入力します。ハイフンは番号の整形ではなく範囲の区切りです。
- 買い物客の郵便番号は全角数字やハイフン・空白を正規化して判定します。住所不明、日本国外、設定破損、参照zoneの欠損/空/不正、制限超過では操作しません。
- グループごとに判定し、全配送方法が隠れる場合はそのグループを変更しません。
- 保存はローカルDBへの保存です。別の「Shopifyに反映する」で初めてチェックアウトに適用します。無効化も保存→反映で行います。
- 有料機能・課金・支払い方法の変更・配送不可のチェックアウト検証・期間指定は含みません。
- 内蔵の離島表は未同梱です。運送会社と確認した表を使ってください。試験用郵便番号を離島の実データとして提供しません。

400範囲/規則1000 bytesの上限は、UI・コンパイラ・Rust Functionが同じ`config/free-limits.json`を参照します。設定/範囲は1回だけparseし、範囲を結合して二分探索します。参照中のzoneが欠損した場合は、地域外として扱わず何も隠しません。

## 開発と検証

Node.js 22.12以上、Rust 1.94で確認しました。データベースはSQLiteです。

```sh
npm ci
rustup target add wasm32-wasip1
npm run test:all
```

`test:all`はDBの作成とmigration、production build、Nodeの単体/SQLite再起動/HTTP結合試験、Rust単体、Wasmビルド/公式runtime試験、上限benchmark、型検査を実行します。試験は一時DBを使い、HTTP試験の秘密値は実行時に生成します。実店舗の資格情報は使用しません。

Function: `target/wasm32-wasip1/release/motoyomi-delivery.wasm`。SDK 0.8.1/WASI JSON ABI、公式CLI 5.0.0内蔵のfunction-runner 9.2.2に固定しています。API target/queryは2026-10です。SDK 2.3.0/1.xはこの公式runtimeとABIが合わなかったため採用していません。Binaryenで最適化し256 KiBを超えるとビルドを失敗させます。

公式runtimeで、400の非隣接・シャッフル範囲、規則1000 bytes、配送方法名100字、10方法×異住所3グループを実測しています。`scripts/benchmark-limit.mjs`で再現でき、基準は2,750,000命令です。単にruntimeの`success:true`だけで命令予算合格と扱いません。2,500範囲や未実装の`zip_pref`を含む元の全仕様を達成したとは報告しません。

## UIのローカルデモ

通常の`/app`はShopifyの認証を必須にしています。アカウントなしで共通の編集UIだけを確認する場合は、別のループバック専用テストハーネスを使えます。

```sh
DATABASE_URL=file:/tmp/motoyomi-shipping-demo.sqlite node scripts/setup-database.mjs
node --import tsx tests/demo-server.ts
```

表示された`http://127.0.0.1:<port>/demo`を開いてください。「ローカルデモ」と常時表示し、保存はテスト用SQLiteに行います。Shopifyへの反映ボタンは無効です。本番アプリの認証を迂回するルートは追加していません。このデモで実ストア接続を検証したとは扱いません。

## Shopifyへの接続

Partnerアプリと開発ストアを用意し、`shopify app config link`で紐付けます。`shopify.app.toml`の空のclient_idと`example.invalid`のURLは意図的な接続待ちの値です。実際のapp URL/認可戻り先を設定して、Shopify CLIで開発します。

必要な環境変数名:

- `SHOPIFY_API_KEY`、`SHOPIFY_API_SECRET`、`SHOPIFY_APP_URL`
- `SCOPES=write_delivery_customizations`
- `DATABASE_URL=file:dev.sqlite`（既定。運用では永続ボリューム上のSQLiteファイルを指定）

`npm run setup`で新規ファイルを0600で作り、Prisma migrationを実行します。schema-engineが存在しないSQLiteファイルで汎用エラーを返したため、空のSQLiteファイルを先に作る手順を入れています。秘密値を保存するDBは永続ディスクのアクセス権と暗号化を運用環境で管理してください。

`npm run dev`はShopify CLIを起動します。実ストアで認可した後、通常用/離島用の配送料金をShopify側で用意し、アプリに同じ名前と範囲を入力して保存→反映します。反映コードは現在のアプリのFunction handle/appKeyを照合して既存設定を列挙し、既存があれば更新します。新規作成は無効状態で行い、metafieldsSetで設定を書いた後に有効化します。失敗は日本語で表示し、保存済み入力と未反映状態を保持します。反映操作はDB leaseと期限つきAPI要求で重複を抑えます。

外部環境で残る確認: 最小権限/期限つきオフライン認証、Functionとmetafield定義の配備、Shopify APIの実受理、Basic以上での実チェックアウト（複数配送グループ・Apple Pay/Google Payを含む）、住所データアクセスの承認または対象外の書面、公開ドメイン/TLSと必須webhookの外部配信、掲載審査。パートナー/ストアへのログインや有料登録は自動で行いません。

## プライバシーと削除

買い物客の住所・氏名・注文を取得するAdmin API権限は要求しません。住所はShopify Function内だけで処理し、アプリへ送信・保存しません。DBに保存するのは運営者の配送設定と認証セッションです。

必須compliance webhookは元の本文のHMAC SHA256を検証し、不正なら401です。customers/data_request、customers/redactは顧客データ保存対象なしとして200。shop/redactでは対象店の配送設定と認証をトランザクションで削除します。顧客topicの本文をshop/redactとして再送しても削除しません。app/uninstalledは認証を削除し、再インストール用の店舗設定はshop/redactまで保持します。

## 一次資料

- https://shopify.dev/docs/api/functions/2026-10/delivery-customization
- https://shopify.dev/docs/api/admin-graphql/2026-10/mutations/deliveryCustomizationCreate
- https://shopify.dev/docs/api/admin-graphql/2026-10/mutations/deliveryCustomizationUpdate
- https://shopify.dev/docs/apps/build/webhooks/verify-deliveries
- https://shopify.dev/docs/apps/build/compliance/privacy-law-compliance
- https://github.com/Shopify/shopify-app-template-react-router
- https://github.com/Shopify/function-examples
