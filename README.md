# pomo

自分用の macOS ポモドーロアプリです。仕様は [docs/spec.md](docs/spec.md) にあります。

## 開発の準備

`gitleaks` を PATH に置いてから、依存を入れます。`pnpm install` の `prepare` で lefthook の pre-commit フックが入り、コミット前に gitleaks が秘密情報を検査します。

```sh
pnpm install
pnpm tauri dev
```

## 動作確認

デバッグ版をビルドしてから、E2E テストを動かします。

```sh
pnpm tauri build --debug --no-bundle
pnpm e2e
```

デバッグ版だけが `<データディレクトリ>/debug.sock` に制御ソケットを開きます。`scripts/pomoctl tray-click`、`scripts/pomoctl title`、`scripts/pomoctl key-window` で、トレイのクリック、メニューバーの文字列、キーウィンドウを扱えます。macOS のソケットのパスは 104 バイトまでなので、`XDG_DATA_HOME` には短いパスを使ってください。

`swift scripts/onscreen.swift pomo` は、画面に出ている pomo のウィンドウを JSON で出します。
