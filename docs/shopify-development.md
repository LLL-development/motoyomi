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
# 初回は下記の公式runner取得・照合・配置を先に実行
npm run test:all
```

`docs/evidence`は検証実行時の出力先として作ります。公開archiveへ過去の生ログ・DB・認証・依存は含めません。tests/fixtures/island.jsonは合成の試験データで、runtime試験が400/401範囲などを生成します。実際の離島表や顧客データとして使わないでください。HTTP試験の秘密値は実行時に生成します。

test:allはSQLite setup/migrations、production build、Node単体/HTTP/DB結合、Rust単体、実Wasm/公式runtime、上限benchmark、型検査です。SDK0.8.1/WASI JSON ABI、CLI5.0.0付属runner9.2.2を使用。400非隣接範囲・規則1000 bytes・配送名100字・10方法×異住所3グループは1,587,624命令、Wasmは256,589 bytesでした。このローカル測定はShopify上での配備・本番動作の証拠ではありません。

ローカル編集UIは[同梱README](../shopify/README.md)のloopback専用demoで確認できます。Shopifyへの反映は無効です。通常の/appはShopify認証が必要です。

## 初回検証に必要な公式Function runner

クリーンな`npm ci`だけではテストが参照するrunnerバイナリは未取得です。以下の手順を**プロジェクトのルートで、npm ciの後、test:allの前**に実行してください。macOS/Linux、curl・gzip・Python3が必要です。実証環境はmacOS arm64です。他のOS/archは下記の公式assetを指定していますが、この公開工程では実行していません。WindowsではNode/Rustも含めWSL2 Linux環境で使用してください。

| OS / architecture | 公式v9.2.2 asset |
|---|---|
| macOS arm64 | function-runner-arm-macos-v9.2.2.gz |
| macOS x86_64 | function-runner-x86_64-macos-v9.2.2.gz |
| Linux arm64/aarch64 | function-runner-arm-linux-v9.2.2.gz |
| Linux x86_64 | function-runner-x86_64-linux-v9.2.2.gz |

[Shopify公式Function runner v9.2.2](https://github.com/Shopify/function-runner/releases/tag/v9.2.2)の圧縮assetと同名.sha256を取得・照合し、同梱試験が参照するCLIのbinへ配置します。アカウント/秘密情報/元の開発環境は不要です。npm ciを再実行した場合はこの配置も再実行してください。runnerバイナリや検証ログはソース配布へ含めません。

```sh
set -eu
case "$(uname -s)/$(uname -m)" in
  Darwin/arm64) motoyomi_runner_asset=function-runner-arm-macos-v9.2.2.gz ;;
  Darwin/x86_64) motoyomi_runner_asset=function-runner-x86_64-macos-v9.2.2.gz ;;
  Linux/aarch64|Linux/arm64) motoyomi_runner_asset=function-runner-arm-linux-v9.2.2.gz ;;
  Linux/x86_64) motoyomi_runner_asset=function-runner-x86_64-linux-v9.2.2.gz ;;
  *) echo 'Use a supported macOS/Linux environment (Windows: WSL2).' >&2; exit 1 ;;
esac
mkdir -p .runtime-cache node_modules/@shopify/cli/bin docs/evidence
curl --fail --location --silent --show-error "https://github.com/Shopify/function-runner/releases/download/v9.2.2/$motoyomi_runner_asset" --output ".runtime-cache/$motoyomi_runner_asset"
curl --fail --location --silent --show-error "https://github.com/Shopify/function-runner/releases/download/v9.2.2/$motoyomi_runner_asset.sha256" --output ".runtime-cache/$motoyomi_runner_asset.sha256"
python3 -c 'import hashlib,pathlib,sys; p=pathlib.Path(sys.argv[1]); expected=pathlib.Path(sys.argv[1]+".sha256").read_text().split()[0]; assert hashlib.sha256(p.read_bytes()).hexdigest()==expected, "Runner checksum mismatch"; print("Official runner SHA256: OK")' ".runtime-cache/$motoyomi_runner_asset"
gzip -dc ".runtime-cache/$motoyomi_runner_asset" > node_modules/@shopify/cli/bin/function-runner-9.2.2
chmod +x node_modules/@shopify/cli/bin/function-runner-9.2.2
```

その後`npm run test:all`を実行します。公式CLIの`npm exec shopify app function run -- --path extensions/delivery --input ../../tests/fixtures/island.json --export _start --json --no-input`も必要時に同じrunnerを取得しますが、上記のstandalone手順はapp認証を必要としません。

## 接続前に残ること

Partnerアプリ/client_id、開発ストア、公開URL/TLS、実認可、Function/metafield配備、Admin API受理、住所データアクセス承認または対象外の根拠、Basic以上の実checkout（複数配送グループ・Apple Pay/Google Pay）、外部webhook配信、永続DB/秘密情報の運用、掲載審査が残っています。空client_idとexample.invalidは接続待ちの設定です。公開ソースへ実資格情報を記載しないでください。

必要な変数名はSHOPIFY_API_KEY、SHOPIFY_API_SECRET、SHOPIFY_APP_URL、SCOPES、DATABASE_URLです。値を配布物へ含めません。自動で店舗接続・有料登録・デプロイは行いません。

## 開発Wasm・同一性

`motoyomi-delivery-0.1.0-beta.1-development.wasm`はローカル検証用です。単独で利用可能なShopify Appではありません。SHA256は`0378679a02e217b9dedb6c8c880545237f435d74e94645aa94cb0bc2d4a6b28d`。同じReleaseのSHA256SUMSでダウンロードを照合できます。

ソースはMIT。元のShopify著作権表示とLLL Inc.の表示を保持しています。問い合わせはcontact@lx3.cafeへ、実資格情報や顧客データを送らず再現手順をお知らせください。
