# pomo

自分用の macOS ポモドーロアプリです。仕様は [docs/spec.md](docs/spec.md) にあります。

## インストール

1. [Releases](https://github.com/alesion30/pomo/releases) から最新の dmg をダウンロードします。
2. dmg を開き、`pomo.app` を `/Applications` にドラッグします。
3. 初回だけ Gatekeeper の制限を解除します（ad-hoc 署名のため）。ターミナルで実行してください。

   ```sh
   xattr -cr /Applications/pomo.app
   ```

4. 起動すると、メニューバーに `pomo` が表示されます。

- 起動時と 6 時間おきに更新を確認します。新しい版があると、ポップオーバーに「更新あり」が出ます。押せるのは待機中だけで、押すと新しい版で起動し直します。
- リリース版は起動するたびに、ログイン時の自動起動を LaunchAgent（`~/Library/LaunchAgents/pomo.plist`）で登録します。
- 状態とセッションログは `~/.local/share/pomo/` に保存されます。セッションログは `sessions.jsonl` です。

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
