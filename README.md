# pomo

自分用の macOS ポモドーロアプリです。仕様は [docs/spec.md](docs/spec.md) にあります。

## 開発の準備

コミット前に gitleaks で秘密情報を検査します。clone したら一度だけ次を実行してください。

```sh
lefthook install
```

`gitleaks` と `lefthook` が PATH に必要です。
