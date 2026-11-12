# pomo implementation plan

自分用の macOS ポモドーロアプリ pomo を、`docs/spec.md` のとおりに 5 本の PR で作ります。
対象の利用者は作者 1 人で、タイマー、メニューバー表示、前面に出るウィンドウ、メモ、JSONL ログを毎日使います。
このプログラムが守る規則は 2 つです。時刻の基準は Rust 側に置きます。状態遷移は TypeScript の純粋な reducer に集めます。
PR は pomo-1、pomo-2、pomo-3、pomo-4、pomo-5 の順に積み、各 PR は 1 つ前の PR の上に作ります。

## How to read this

One box is one unit of work. Every box names the evidence that checks it. A nested box is a sub-step of the box above it. Check a box only when its evidence exists, a file, a log line, a screenshot, a test run, or a SHA. The body is a how-to. The appendices explain and record.

The program runs `skills/poteto-mode/playbooks/autopilot-stack.md` under the installed plugin. 実行役はマージしません。すべての PR は検証済みの状態で止め、作者が下から順にマージします。

Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

## Program checklist

### Arm the program

- [ ] State the protocol and this plan to the operator, then stop. Start execution only on the operator's explicit go.
- [ ] 実装担当の権限を作者に決めてもらう。設定上の実装担当と swarm workers は codex:gpt-6-luna だが、Codex の子は `~/.cargo` と pnpm のキャッシュに書けず、試作が止まった（Appendix A の A0）。`delegate_task` は親セッションの runtime mode（今は `auto`）より上を指定できないので、Codex に書かせるには作者が T3 のセッションを full-access で始め直す必要がある。それとも実装と検証の担当を Claude に替えるかを、作者の言葉で記録する。
- [ ] 試作の P3（再署名後に通知の許可が残るか）の結果を作者から受け取り、Appendix A の A3 に記録する。pomo-5 の署名方式はこの結果で決まる。
- [ ] 作者に、T3 を動かすアプリへ画面収録の権限を与えてもらう。`screencapture` が使えないと、メニューバーとレビュー用の動画を撮れない（Appendix A の A4）。
- [ ] 通知を確かめるレーン用に、バンドル ID `dev.alesion30.pomo.dev` のデバッグ版を `~/Applications/pomo-dev.app` に置き、作者に一度だけ通知を許可してもらう。A3 のとおり、`.app` として登録された場所からでないと正しいバンドル ID で通知されない。
- [ ] pomo-5 の検証で公開リリースを作る前に、作者の許可を取る。`releases/latest` はプレリリースを返さないので、検証には `v0.0.1` と `v0.0.2` の通常リリースを使い、検証の後に消す。
- [ ] pomo-1 の CI が初めて動いた後、`ci.yml` のジョブ名を main のルールセットの必須チェックに足す。それまでは gitleaks だけがマージを止める。
- [ ] Read these from the installed plugin at program start. Re-read them at every tick.
  - [ ] `skills/poteto-mode/playbooks/autopilot-stack.md`
  - [ ] `skills/poteto-mode/playbooks/autopilot-full.md`
  - [ ] `skills/swarm/SKILL.md`
  - [ ] `skills/poteto-mode/playbooks/opening-a-pr.md`
  - [ ] `skills/poteto-mode/playbooks/shipping.md`
  - [ ] `skills/poteto-mode/playbooks/babysit.md`
  - [ ] `skills/architect/SKILL.md`
  - [ ] `skills/show-me-your-work/SKILL.md`
  - [ ] `skills/principle-model-the-domain/SKILL.md`
  - [ ] `skills/principle-prove-it-works/SKILL.md`
- [ ] On the operator's go, arm the hourly audit tick as a real cadence with the tick prompt below. Never leave the cadence to memory.
- [ ] Use this tick prompt, verbatim. "Re-read the execution playbook from the installed plugin. Audit the operation against it and fix drift in this tick. Probe every active lane and judge progress by side effects only. Stand down a lane only on affirmative failure evidence, and dispatch its replacement in the same tick. Then post a short status message to the operator in chat only when the audit found a tracked change that no earlier status message reported, such as a PR opened, a code-ready head, a round launched or closed, a verdict, a merge, a stuck agent and the action taken, a blocker added or cleared, or a decision only the operator can make. Name every such change and nothing else. Do not repeat a table, the merged list, or an unchanged blocker. If the audit found none, end the turn with no reply text. Either way, log this tick's row in your decision trail. The row names the items reported, or none."
- [ ] On the operator's hold or stand-down, send every owner a zero-writes order at once.

### Spawn owners

- [ ] Spawn one owner per PR with the full lifecycle the execution playbook names. 担当は `feature, refactoring` の役割で、T3 の `delegate_task` に `isolation: "worktree"` を付けて起動する。各 owner は `git fetch origin main` の後に作業ブランチを切り、PR には `--assignee @me` を付ける。
- [ ] Follow this dependency graph. Start dependent work only after its parent merges, or rebase its branch onto the parent's exact tip when the execution playbook stacks. A same-repository child PR targets its parent branch. A fork child PR targets trunk while retaining local parent ancestry. Freeze the bottom-to-top order because fork PR bases do not encode it.
  - [ ] pomo-1 is first. It branches from `main`.
  - [ ] pomo-2 after pomo-1.
  - [ ] pomo-3 after pomo-2.
  - [ ] pomo-4 after pomo-3.
  - [ ] pomo-5 after pomo-4.
- [ ] Hold the file boundaries. pomo-1 は足場と CI だけを触る。pomo-2 は `src/domain/`、`src-tauri/src/schedule.rs`、`src-tauri/src/store.rs` と待機画面を持つ。pomo-3 は `src-tauri/src/panel.rs`、`src-tauri/src/notify.rs`、`src/front/` を持つ。pomo-4 は `src/popover/` を持つ。pomo-5 は `.github/workflows/release.yml`、更新と自動起動の配線、README を持つ。
- [ ] Hold the review gate. pomo-2, pomo-3, pomo-4, and pomo-5 change an interaction. They wait for the operator's review in chat with screenshots and a video before merge.

### PR mechanics, for every PR

- [ ] Resolve the forge once. Default to `gh`; if `command -v origin` succeeds and Origin can resolve the repository, use `origin pr` for every PR operation. Record any fallback to `gh`. Record the intended PR base repository as canonical `<base-repo>` and validate it through the active forge. Do not infer it from the checkout's default remote. Capture it as a shell variable and pass `--repo "$base_repo"` to every `gh pr` command. Resolve and validate `<head-url>` through Shipping step 1 and capture it as `head_url` for the live-lane fetch. When the head repository is a fork, validate its identity and record its owner and repository name as `<fork-owner>` and `<head-name>`. Never require `gt`.
- [ ] Open the PR before self-proof and follow the readiness rule in `skills/poteto-mode/playbooks/opening-a-pr.md`. Open it ready by default. When repository instructions require a draft until named evidence exists, keep it draft until that evidence is recorded. Use `origin pr create --status open --base "$base_branch"` or `gh pr create --base "$base_branch" --repo "$base_repo"` for a ready same-repository PR. A same-repository stack child targets its parent branch. Every fork PR targets trunk. With GitHub, capture the approved PR title and body as `<title>` and `<body>`, then create it with `gh api --method POST "repos/$base_repo/pulls" -f "title=$title" -f "body=$body" -f "head=$fork_owner:$branch" -f "head_repo=$head_name" -f "base=$trunk" --jq .html_url`; add `-F draft=true` when repository instructions require a draft. Otherwise use the resolved Origin command. Stacked fork branches retain local parent ancestry.
- [ ] Run the repo's lint and typecheck once before the PR-facing push. Push with hooks on. コマンドは `pnpm lint`、`pnpm typecheck`、`pnpm test`、`cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings` で、pomo-1 が定義する。
- [ ] Run `/deslop` before each commit and `/no-comments` before review.
- [ ] Triage every Bugbot and security-reviewer comment per `skills/poteto-mode/references/bugbot-triage.md` under the installed plugin.
- [ ] Rebase each independent PR and stack root onto current trunk before the code-ready report and babysit. Rebase each unmerged stack child onto its parent's exact tip. Keep that merge base in fix rounds. Rebase again only at merge prep, on a `git merge-tree` conflict with trunk, on a CI failure that comes from a change on trunk, or when a known concurrent change to the same files lands. After its parent merges, use Shipping's explicit old-base-to-trunk rebase before the child's merge-ready report.

### Verdict and merge, for every PR

- [ ] A full swarm runs once, at the code-ready head. Another full swarm runs only for new behavior, a redesign, or a large new diff. A rebase, a merge-conflict resolution, or a minor fix gets a single verifier at the new head, and a wording-only change gets none. Run each full swarm per `skills/swarm/SKILL.md`. One gates lane. The ten live lanes from the PR's **Verify, live** block. The perf lane from its **Verify, perf** block. Two or more audit lanes, each with its own focus, that read the diff and the receipts and distrust the PR body. The root audits the receipts in the merge-ready report before the verdict.
- [ ] Judge every finding by the execution playbook's blocking rule. The verdict is clean when none blocks. A failure on trunk behavior in a lane marked `Regression lane against trunk.` is recorded against trunk and does not block the PR. A new head gets a fresh verdict, except for results that stay valid under the patch ID rule in `skills/poteto-mode/playbooks/shipping.md`.
- [ ] 実行役はマージしない。各 PR は、clean な verdict の SHA、patch base、patch ID を記録した検証済みの状態で止める。作者が pomo-1 から順にマージする。親がマージされて patch ID が変わった子は、新しい verdict を取ってから作者に渡す。

### Boot recipe, for every live lane

Each live lane is one `swarm workers` lane at the PR head, resolved through provider dispatch, in its own worktree or output directory, with its own receipt. Drive the surface only through the driver skill this plan names.

- [ ] `git fetch -- "$head_url" "refs/heads/$head_branch" && git checkout --detach "$head_sha"` in the lane's worktree.
- [ ] ビルドは head の SHA ごとに 1 回だけ行う。最初のレーンが `pnpm install --frozen-lockfile` と `pnpm tauri build --debug --no-bundle` を実行し、成果物を `<scratch path>/build-<sha>/` に置く。他のレーンはそれを使う。GUI を使うレーンは同時に 1 本だけ動かす。`mkdir /tmp/pomo-gui.lock` が成功するまで待ち、終わったら消す。
- [ ] 起動時に `XDG_DATA_HOME=<lane dir>/data` と `POMO_TIME_SCALE=60` を渡す。集中 25 分は 25 秒、休憩 5 分は 5 秒、長い休憩 20 分は 20 秒になる。本物の `~/.local/share/pomo/` には触れない。
- [ ] 入力は 2 つの経路からだけ入れる。表示中の WebView には `pnpm e2e` の WebdriverIO（`@wdio/tauri-service` の embedded ドライバ）から入れる。トレイのクリックなど WebView を通らない操作は、デバッグビルドだけにある制御ソケットを `scripts/pomoctl` で叩く。隠した WebView は約 4.5 秒で止まるので（A2）、隠れている間の観測は WebView を通さない。読むだけの診断は 4 つ。`<lane dir>/data/pomo/sessions.jsonl` と `state.json` の中身、`scripts/pomoctl title` が Rust から返すメニューバー文字列、`scripts/pomoctl key-window` が返すキーウィンドウ、`swift scripts/onscreen.swift pomo` が返す画面上のウィンドウ一覧。
- [ ] 通知を確かめるレーンだけは、`pnpm tauri build --debug --bundles app` で作った `pomo-dev.app` を `~/Applications/` に置き換えて起動する。
- [ ] Save every screenshot to `<scratch path>/swarm-<pr-id>/worker-<n>/<slug>.png` and return the paths with the receipt path. スクリーンショットは `browser.saveScreenshot` で WebView から撮る。画面収録の権限は要らない。

## Scaffold the Tauri app and CI (pomo-1)

**Depends on.** None.

**Files.**

- [ ] Create `package.json`、`pnpm-lock.yaml`、`tsconfig.json`、`vite.config.ts`、`biome.json`、`index.html`、`src/main.tsx`、`src/App.tsx`。
- [ ] Create `src-tauri/Cargo.toml`、`src-tauri/tauri.conf.json`、`src-tauri/src/main.rs`、`src-tauri/src/lib.rs`、`src-tauri/src/paths.rs`、`src-tauri/capabilities/default.json`、`src-tauri/icons/`。
- [ ] Create `e2e/wdio.conf.ts`、`e2e/smoke.e2e.ts`、`scripts/onscreen.swift`、`scripts/pomoctl`、`src-tauri/src/debug.rs`。
- [ ] Create `.github/workflows/ci.yml`。
- [ ] Edit `lefthook.yml`、`README.md`。

**Build.**

- [ ] 最初の単位として、`@wdio/tauri-service` の embedded ドライバでデバッグ版に接続し、WebView のスクリーンショットを 1 枚撮れることを確かめる。試作では動かしていない（A4）。接続できなければ、制御ソケットに `eval` を足して WebView の操作を Rust の `webview.eval` で行い、スクリーンショットは `screencapture` で撮る方式に替え、boot recipe を書き換える。
- [ ] Tauri 2.12 系、React、Vite、TypeScript、pnpm の最小アプリを作る。バンドル ID は `dev.alesion30.pomo`、`bundle.macOS.signingIdentity` は `"-"`。
- [ ] `lib.rs` の setup で `ActivationPolicy::Accessory` にし、Dock に出さない。トレイに `pomo` と表示し、クリックでポップオーバー用ウィンドウ `popover` をトレイの下に出し入れする。
- [ ] `paths.rs` に `data_dir()` を置く。`XDG_DATA_HOME` があれば `$XDG_DATA_HOME/pomo`、なければ `~/.local/share/pomo` を返す。
- [ ] `tauri-plugin-wdio-webdriver` をデバッグビルドだけで有効にする。リリースビルドに WebDriver の口を残さない。
- [ ] `debug.rs` に、デバッグビルドだけの制御ソケット `<data dir>/debug.sock` を置く。`tray-click`、`title`、`key-window` を受け付け、Rust の状態から直接答える。`scripts/pomoctl` は `nc -U` でこれを叩く薄いスクリプトにする。
- [ ] `scripts/onscreen.swift` は `CGWindowListCopyWindowInfo(.optionOnScreenOnly)` で、指定した owner のウィンドウの layer と bounds を JSON で出す。
- [ ] `ci.yml` を `macos-latest` で動かし、`pnpm lint`、`pnpm typecheck`、`pnpm test`、`cargo clippy -- -D warnings`、`cargo test` を通す。既存の `gitleaks` ワークフローはそのまま残す。
- [ ] `lefthook.yml` の pre-commit に gitleaks を残したまま、lefthook を devDependency に入れ、`pnpm install` で hook が入るようにする。

**You see.**

- [ ] デバッグ版を起動すると Dock にアイコンが出ず、メニューバーに `pomo` が出る。クリックするとトレイの下に「待機中」と書かれたポップオーバーが開く。

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] `src-tauri/src/paths.rs` のテストで、`XDG_DATA_HOME` がある場合とない場合の `data_dir()` を確かめる。Run `cargo test --manifest-path src-tauri/Cargo.toml paths`.
- [ ] CI の 3 ジョブ（gitleaks、lint と型、Rust）が PR の head で緑になる。Run `gh pr checks --repo alesion30/pomo`.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on the configured `swarm workers` role at the PR head, per the boot recipe.

- [ ] Lane 1. Regression lane against trunk. trunk にはアプリがないことを記録し、head でデバッグ版を起動して `smoke.e2e.ts` を走らせる。Save `pomo-1-boot.png`. Pass when WebView のスクリーンショットに「待機中」が写り、`scripts/pomoctl title` が `pomo` を返す。
- [ ] Lane 2. 起動後に `lsappinfo info -only ApplicationType pomo` を実行する。Save `pomo-1-accessory.png`. Pass when 出力が `UIElement` 相当で、Dock にアプリが出ていない。
- [ ] Lane 3. `scripts/pomoctl tray-click` でポップオーバーを開閉する。Save `pomo-1-popover-toggle.png`. Pass when `onscreen.swift` の出力で `popover` が開いた時だけ載り、閉じた後は消える。
- [ ] Lane 4. `XDG_DATA_HOME` を空のディレクトリにして起動する。Save `pomo-1-xdg.png`. Pass when `<lane dir>/data/pomo/` が作られ、`~/.local/share/pomo/` の更新時刻が変わらない。
- [ ] Lane 5. `pnpm tauri build --bundles app` のリリース版を起動し、WebDriver で接続を試みる。Save `pomo-1-release-no-webdriver.png`. Pass when WebDriver の接続が拒否される。
- [ ] Lane 6. リリース版の `codesign -dv --verbose=4` を読む。Save `pomo-1-codesign.png`. Pass when `Signature=adhoc` と `Identifier=dev.alesion30.pomo` が出る。
- [ ] Lane 7. 秘密情報に見えるダミー文字列をステージしてコミットを試みる。Save `pomo-1-gitleaks-hook.png`. Pass when lefthook の gitleaks がコミットを止め、`git log` が進まない。
- [ ] Lane 8. 新しい clone で `pnpm install` だけを実行する。Save `pomo-1-hook-install.png`. Pass when `.git/hooks/pre-commit` が lefthook のものになっている。
- [ ] Lane 9. アプリを 2 つ同時に起動する。Save `pomo-1-double-launch.png`. Pass when トレイが 2 つに増えない。単一起動の仕組みで 2 つ目が終了する。
- [ ] Lane 10. アプリを `kill -TERM` で止めてから再起動する。Save `pomo-1-restart.png`. Pass when 再起動後もトレイとポップオーバーが Lane 1 と同じに動く。

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. 待機中のアプリ全体（本体と WebContent プロセス）の CPU 使用率の 60 秒平均と、RSS の合計。trunk にはアプリがないので、追加したアプリそのものの絶対値で測る。
- [ ] Probe. リリース版を起動して 30 秒待ち、`top -l 61 -s 1 -stats pid,cpu,mem` で pomo 関連のプロセスを 60 秒記録する。head で 3 回測る。
- [ ] Baseline. Record the trunk value first. trunk にはアプリがないので値なしと記録し、head の 3 回の中央値を以後の PR の基準にする。
- [ ] Rule. CPU の 60 秒平均が 1% を超えるか、RSS の合計が 200 MB を超えたら失敗。

**Review gate.** None. pomo-1 is not review-gated.

**Merge.**

- [ ] Root's clean verdict at the exact head SHA.
- [ ] Bugbot triage done.
- [ ] After the verdict, an owner merge uses Shipping step 4 to move the PR from its recorded patch base onto current trunk. An appended stack child keeps its recorded parent tip until that parent lands. Record the current landing SHA. Preserve the verdict only when the patch ID stays unchanged.
- [ ] 実行役はマージしない。作者が下から順に squash でマージする。子 PR は同じリポジトリの親ブランチを base にする。

## Build the timer core, schedule, and log (pomo-2)

**Depends on.** pomo-1.

**Files.**

- [ ] Create `src/domain/timer.ts`、`src/domain/timer.test.ts`、`src/domain/record.ts`、`src/domain/record.test.ts`、`src/domain/constants.ts`。
- [ ] Create `src-tauri/src/schedule.rs`、`src-tauri/src/store.rs`。
- [ ] Edit `src-tauri/src/lib.rs`、`src/App.tsx`、`docs/spec.md`。
- [ ] Create `e2e/timer.e2e.ts`。

**Build.**

- [ ] `timer.ts` に状態を判別共用体で置く。`TimerState` は `idle`、`focus`、`break` の 3 つで、`focus` と `break` は `startedAt` と `plannedSec` だけを持つ。残り時間とオーバータイムは `view(state, now)` が現在時刻から計算する。`break` は `kind`（`short_break` または `long_break`）を持つ。
- [ ] `transition(state, command, now)` を純粋関数にして `{ state, record }` を返す。`Command` は `startFocus`、`endFocus`、`startBreak`、`skipBreak`、`endBreak`、`adjust`（+300 か -300 秒）、`editDraft` の判別共用体にする。予定時間は 300 秒を下回らない。
- [ ] 連続の数え方を `Streak`（`completed` と `lastPhaseEndedAt`）にまとめる。4 回目の `completed` の後の休憩を `long_break` にし、長い休憩の終了と、前のフェーズの終了から 60 分以上空いた集中の開始で 0 に戻す。休憩をスキップした場合も間隔を正しく測るため、基準は休憩ではなく直前のフェーズの終了にする。
- [ ] 状態の正本は 1 つにする。`popover` と `front` の 2 つの WebView はそれぞれ別に止まるので、どちらも状態を持ち続けない。`save_state` を受けた Rust がメモリ上の最新の状態を持ち、`state-changed` イベントで配る。各ウィンドウは表示されるたびに `load_state` で読み直す。
- [ ] `record.ts` に `SessionRecord` と、タイムゾーン付きの ISO 8601 を作る関数を置く。形は `docs/spec.md` のセッションログの表どおりにする。
- [ ] `constants.ts` に時間の定数を置く。デバッグビルドでだけ、起動時に Rust から受け取る `POMO_TIME_SCALE` で予定時間を割る。
- [ ] `schedule.rs` に `Schedule`（`label`、`kind`、`started_at`、`planned_end`）を置く。TypeScript は遷移のたびに `set_schedule` で渡す。Rust は 1 秒ごとのスレッドでメニューバーの文字列を作る。予定時刻を過ぎた最初の 1 回だけ `phase-due` イベントを出す。
- [ ] メニューバーの文字列は、集中中が `18:32 タイトル`、オーバータイムが `+03:12 タイトル`、休憩中が `☕ 03:10` にする。タイトルは表示幅で全角 12 文字に切り、`…` を付ける。
- [ ] `store.rs` に `append_record` と `save_state` と `load_state` を置く。JSONL は追記モードで 1 行ずつ書く。`state.json` は一時ファイルに書いてから rename する。起動時に Rust が `state.json` の `schedule` を読み、WebView の読み込みを待たずにメニューバーの表示を再開する。
- [ ] `App.tsx` の待機画面に、タイトル入力と開始、終了、±5 分のボタンを置く。仕上げは pomo-4 で行う。
- [ ] `POMO_TIME_SCALE` を使う理由、既定値（未設定なら 1）、効く範囲（デバッグビルドのみ）、撤去する条件を `docs/spec.md` に書く。

**You see.**

- [ ] ポップオーバーでタイトルを入れて開始すると、メニューバーが `24:59 タイトル` から 1 秒ずつ減る。ポップオーバーを閉じても減り続ける。予定時間を過ぎると `+00:01 タイトル` に変わる。終了すると `sessions.jsonl` に 1 行増える。

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] `timer.test.ts` で、4 回の完了の後に長い休憩になること、途中終了は数えないこと、60 分空くと数え直すこと、-5 分で経過時間を下回るとオーバータイムになること、予定時間が 300 秒を下回らないことを確かめる。Run `pnpm test src/domain`.
- [ ] `record.test.ts` で、`started_at` と `ended_at` が `+09:00` 付きで出ることと、休憩の行の `title` が null になることを確かめる。Run `pnpm test src/domain/record`.
- [ ] `schedule.rs` のテストで、表示幅による切り詰め、オーバータイムの書式、`phase-due` が 1 回だけ出ることを確かめる。Run `cargo test --manifest-path src-tauri/Cargo.toml schedule`.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on the configured `swarm workers` role at the PR head, per the boot recipe.

- [ ] Lane 1. Regression lane against trunk. trunk ではタイマーがないことを記録し、head で集中を開始して予定時間まで待ち、終了する。Save `pomo-2-focus-cycle.png`. Pass when `sessions.jsonl` に `kind` が `focus`、`outcome` が `completed` の行が 1 行あり、`actual_sec` が 25 以上になる。
- [ ] Lane 2. 集中を開始してポップオーバーを閉じ、20 秒待つ。Save `pomo-2-hidden-tick.png`. Pass when `scripts/pomoctl title` を 1 秒ごとに読んだ値が毎回変わり、止まった区間がない。
- [ ] Lane 3. 予定時間を過ぎても終了せず 5 秒待つ。Save `pomo-2-overtime.png`. Pass when メニューバーの文字列が `+00:0` で始まる。
- [ ] Lane 4. 集中中に -5 分を押して予定時間を経過時間より短くする。Save `pomo-2-minus-to-overtime.png`. Pass when `state.json` の phase が focus のまま残り、メニューバーがオーバータイムの表示に切り替わる。
- [ ] Lane 5. 予定時間の前に終了する。Save `pomo-2-ended-early.png`. Pass when 記録の `outcome` が `ended_early` で、状態が待機に戻る。
- [ ] Lane 6. 完了した集中と休憩を 4 回くり返す。Save `pomo-2-long-break.png`. Pass when 4 回目の後の休憩の `kind` が `long_break` になる。
- [ ] Lane 7. 集中中にアプリを `kill -9` して再起動する。Save `pomo-2-resume.png`. Pass when WebView を開く前から、メニューバーが止める前の続きの時間を表示する。
- [ ] Lane 8. 全角 20 文字のタイトルで開始する。Save `pomo-2-truncate.png`. Pass when メニューバーの文字列のタイトル部分が全角 12 文字分と `…` になる。
- [ ] Lane 9. 休憩を予定時間の途中で終える。Save `pomo-2-break-end-early.png`. Pass when 休憩の行の `actual_sec` が実際に休んだ秒数になり、`title` が null になる。
- [ ] Lane 10. 記録を 3 行残した後に `sessions.jsonl` を `jq -c .` で読む。Save `pomo-2-jsonl-valid.png`. Pass when 3 行とも JSON として読め、時刻がタイムゾーン付きになっている。

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. ポップオーバーを閉じた集中中の、メニューバー更新間隔の p99 と最大値。あわせて集中中のアプリ全体の CPU 使用率の 60 秒平均。trunk には集中がないので、追加した Rust のティッカーの絶対値で測る。
- [ ] Probe. `POMO_TIME_SCALE=1` で集中を開始してポップオーバーを閉じ、`scripts/pomoctl title` を 200ms ごとに読み、値が変わった時刻を 5 分記録する。同時に `top` で CPU を記録する。head で 3 回測る。
- [ ] Baseline. Record the trunk value first. trunk には集中がないので値なしと記録し、待機中の CPU は pomo-1 の中央値を使う。
- [ ] Rule. 更新間隔の p99 が 1.1 秒を超えるか、最大値が 2 秒を超えるか、CPU の 60 秒平均が 1% を超えたら失敗。

**Review gate.** The operator reviews before merge.

- [ ] Copy lane 1, 3, and 7 screenshots into `docs/media/pomo-2-review-*.png`.
- [ ] Record a 30 to 60 second video of the change on a live lane. Save it as `docs/media/pomo-2-review.mp4`.
- [ ] Post the screenshots and the video in chat. Stop at merge-ready. Wait for the operator's click.

**Merge.**

- [ ] Root's clean verdict at the exact head SHA.
- [ ] Bugbot triage done.
- [ ] After the verdict, an owner merge uses Shipping step 4 to move the PR from its recorded patch base onto current trunk. An appended stack child keeps its recorded parent tip until that parent lands. Record the current landing SHA. Preserve the verdict only when the patch ID stays unchanged.
- [ ] 実行役はマージしない。作者が pomo-1 の後に squash でマージする。この PR は同じリポジトリの pomo-1 のブランチを base にする。

## Show the front window and notify at phase end (pomo-3)

**Depends on.** pomo-2.

**Files.**

- [ ] Create `src-tauri/src/panel.rs`、`src-tauri/src/notify.rs`。
- [ ] Create `src/front/FocusEnd.tsx`、`src/front/BreakEnd.tsx`、`src/front/front.tsx`。
- [ ] Edit `src-tauri/src/lib.rs`、`src-tauri/tauri.conf.json`、`src-tauri/Cargo.toml`。
- [ ] Create `e2e/front.e2e.ts`。

**Build.**

- [ ] 最初の単位として、全画面アプリの上の前面ウィンドウで入力欄に文字を打てるかを確かめる。objc2 で NSPanel の設定を付ける方式（試作の P1(b)）を先に試し、打てなければ tauri-nspanel（P1(c)）に替える。結果を PR の本文に書く。
- [ ] `panel.rs` は前面ウィンドウ `front` に、`canJoinAllSpaces` と `fullScreenAuxiliary` の collectionBehavior と、十分に高い level を付ける。`phase-due` を受けたら Rust から `front` を出す。JS が止まっていても出るようにするためである。
- [ ] `notify.rs` は `phase-due` と同時に、システム音付きの通知を `tauri-plugin-notification` で出す。同じアプリで UNUserNotificationCenter を呼ばない（試作の A3）。
- [ ] `FocusEnd.tsx` は振り返りの入力、±5 分、「休憩開始」と「スキップ」を持つ。`BreakEnd.tsx` は次のタイトルとカテゴリの入力と「開始」を持つ。どちらも操作は pomo-2 の `Command` だけで行う。
- [ ] `front` を表示した時は、`view(state, now)` で時刻から表示を作り直す。止まっていた間の tick に頼らない。

**You see.**

- [ ] 他アプリを全画面で使っている最中に集中の予定時間が来ると、その上に集中終了のウィンドウが出て、同時に音付きの通知が届く。振り返りを書いて「休憩開始」を押すと休憩に入る。休憩の予定時間が来ると、次のタイトルを入れるウィンドウが出る。

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] `src/front/front.test.tsx` で、`FocusEnd` の各ボタンが正しい `Command` を出すことを確かめる。Run `pnpm test src/front`.
- [ ] `panel.rs` のテストで、collectionBehavior に 2 つのフラグが入ることを確かめる。Run `cargo test --manifest-path src-tauri/Cargo.toml panel`.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on the configured `swarm workers` role at the PR head, per the boot recipe.

- [ ] Lane 1. Regression lane against trunk. trunk では予定時間が来てもウィンドウが出ないことを記録し、head で同じ集中を予定時間まで進める。Save `pomo-3-focus-end.png`. Pass when `onscreen.swift` に `front` が載り、集中終了の画面が写る。
- [ ] Lane 2. `swift` で作った全画面ウィンドウを前面にした状態で、予定時間を迎える。Save `pomo-3-over-fullscreen.png`. Pass when `onscreen.swift` に `front` と全画面ウィンドウが同時に載る。
- [ ] Lane 3. Lane 2 の状態で `scripts/pomoctl key-window` を読み、`front` の振り返り欄に WebDriver から文字を入れる。Save `pomo-3-type-over-fullscreen.png`. Pass when `key-window` が `front` を返し、入れた文字が欄に表示され、確定後の記録の `notes` に残る。実際のキーボードで打てるかは、作者のレビューで確かめる。
- [ ] Lane 4. ポップオーバーを閉じて 60 秒以上待ち、WebView が止まった後に予定時間を迎える。Save `pomo-3-due-while-suspended.png`. Pass when 予定時刻から 1.5 秒以内に `front` が載る。
- [ ] Lane 5. `~/Applications/pomo-dev.app` で予定時間を迎えた時に `/usr/bin/log show --last 1m --predicate 'process == "usernoted"'` を読む。Save `pomo-3-notification.png`. Pass when `dev.alesion30.pomo.dev` の通知の配信が記録されている。
- [ ] Lane 6. 集中終了の画面で「スキップ」を押す。Save `pomo-3-skip.png`. Pass when `sessions.jsonl` に short_break の行が増えず、状態が待機に戻る。
- [ ] Lane 7. 集中終了の画面で +5 分を押す。Save `pomo-3-extend-from-front.png`. Pass when `front` が閉じ、メニューバーの残り時間が 5 分ぶん増える。
- [ ] Lane 8. 休憩の予定時間を迎え、次のタイトルを入れて開始する。Save `pomo-3-break-end.png`. Pass when `sessions.jsonl` に short_break の行が増え、新しい集中のタイトルがメニューバーに出る。
- [ ] Lane 9. -5 分で予定時間を過去にする。Save `pomo-3-due-once.png`. Pass when `front` と通知が 1 回だけ出る。
- [ ] Lane 10. 長い休憩の予定時間を迎える。Save `pomo-3-long-break-end.png`. Pass when 休憩終了の画面が出て、連続の数が 0 に戻る。

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. 予定時刻から `front` が画面に載るまでの時間。WebView が止まっている場合と動いている場合の両方で測る。trunk には `front` がないので、追加した処理の絶対値で測る。
- [ ] Probe. `onscreen.swift` を 100ms 間隔で回し、`phase-due` の時刻から `front` が載るまでを測る。止まっている場合と動いている場合を交互に 5 回ずつ測る。
- [ ] Baseline. Record the trunk value first. trunk には `front` がないので値なしと記録する。
- [ ] Rule. どちらの場合も、5 回の最大値が 1.5 秒を超えたら失敗。

**Review gate.** The operator reviews before merge.

- [ ] Copy lane 2, 3, and 8 screenshots into `docs/media/pomo-3-review-*.png`.
- [ ] Record a 30 to 60 second video of the change on a live lane. Save it as `docs/media/pomo-3-review.mp4`.
- [ ] Post the screenshots and the video in chat. Stop at merge-ready. Wait for the operator's click.

**Merge.**

- [ ] Root's clean verdict at the exact head SHA.
- [ ] Bugbot triage done.
- [ ] After the verdict, an owner merge uses Shipping step 4 to move the PR from its recorded patch base onto current trunk. An appended stack child keeps its recorded parent tip until that parent lands. Record the current landing SHA. Preserve the verdict only when the patch ID stays unchanged.
- [ ] 実行役はマージしない。作者が pomo-2 の後に squash でマージする。この PR は同じリポジトリの pomo-2 のブランチを base にする。

## Finish the popover memo inputs (pomo-4)

**Depends on.** pomo-3.

**Files.**

- [ ] Create `src/popover/Popover.tsx`、`src/popover/categories.ts`、`src/popover/categories.test.ts`。
- [ ] Edit `src/App.tsx`、`src-tauri/src/store.rs`。
- [ ] Create `e2e/popover.e2e.ts`。

**Build.**

- [ ] `Popover.tsx` に、現在のフェーズと時間、タイトル、カテゴリ、振り返り、開始、終了、±5 分を置く。集中中も入力でき、入力は `editDraft` で状態に入る。
- [ ] `store.rs` に `recent_categories` を置き、`sessions.jsonl` を読んで使った順にカテゴリを返す。
- [ ] `categories.ts` で、入力中の文字列に前方一致するカテゴリを候補にする。

**You see.**

- [ ] 集中中にポップオーバーを開いて振り返りを書き、閉じて開き直しても残っている。カテゴリ欄に 1 文字入れると、過去に使ったカテゴリが候補に出る。

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] `categories.test.ts` で、使った順に並ぶことと前方一致で絞られることを確かめる。Run `pnpm test src/popover`.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on the configured `swarm workers` role at the PR head, per the boot recipe.

- [ ] Lane 1. Regression lane against trunk. trunk と head の両方で、タイトルを入れて集中を開始し、終了する。Save `pomo-4-regression.png`. Pass when 両方で記録が 1 行増え、head では `category` と `notes` も入る。
- [ ] Lane 2. 集中中に振り返りを書き、ポップオーバーを閉じて開き直す。Save `pomo-4-draft-persist.png`. Pass when `notes` 欄に書いた振り返りが残っている。
- [ ] Lane 3. 集中中に振り返りを書いた後でアプリを再起動する。Save `pomo-4-draft-restart.png`. Pass when 再起動後も `notes` 欄に振り返りが残っている。
- [ ] Lane 4. カテゴリの違う記録を 3 行入れた `sessions.jsonl` を用意して起動し、カテゴリ欄に 1 文字入れる。Save `pomo-4-category-suggest.png`. Pass when 候補には前方一致するカテゴリだけが `recent_categories` の順で出る。
- [ ] Lane 5. 新しいカテゴリを入れて集中を終える。Save `pomo-4-category-new.png`. Pass when 次の集中で、そのカテゴリが `recent_categories` の先頭に出る。
- [ ] Lane 6. 待機中、集中中、休憩中にポップオーバーを開く。Save `pomo-4-phases.png`. Pass when `Popover.tsx` にそれぞれのフェーズ名と時間が出て、休憩中はタイトル欄が次の集中用になっている。
- [ ] Lane 7. 振り返りに改行と絵文字を入れて確定する。Save `pomo-4-notes-unicode.png`. Pass when `jq -r .notes` で同じ文字列が読める。
- [ ] Lane 8. タイトルを空のまま開始する。Save `pomo-4-empty-title.png`. Pass when 開始でき、メニューバーは残り時間だけを出し、記録の `title` が空文字になる。
- [ ] Lane 9. ポップオーバーから +5 分と -5 分を続けて押す。Save `pomo-4-adjust.png`. Pass when `state.json` の `plannedSec` が元に戻り、メニューバーの表示も一致する。
- [ ] Lane 10. 1 万行の `sessions.jsonl` を用意して起動し、ポップオーバーを開く。Save `pomo-4-large-log.png`. Pass when `recent_categories` の候補が出て、操作が止まらない。

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. 1 万行の `sessions.jsonl` で `recent_categories` を呼んでから結果が返るまでの時間と、ポップオーバーを開いてから入力欄が表示されるまでの時間。
- [ ] Probe. WebDriver から `recent_categories` を 20 回呼んで時間を測り、ポップオーバーの開閉を 20 回くり返して表示までを測る。trunk と head で交互に測る。
- [ ] Baseline. Record the trunk value first. trunk のポップオーバーの表示時間を先に測る。trunk には `recent_categories` がないので値なしと記録する。
- [ ] Rule. `recent_categories` の p95 が 100ms を超えるか、ポップオーバーの表示が trunk より 20% 以上遅くなったら失敗。

**Review gate.** The operator reviews before merge.

- [ ] Copy lane 2, 4, and 6 screenshots into `docs/media/pomo-4-review-*.png`.
- [ ] Record a 30 to 60 second video of the change on a live lane. Save it as `docs/media/pomo-4-review.mp4`.
- [ ] Post the screenshots and the video in chat. Stop at merge-ready. Wait for the operator's click.

**Merge.**

- [ ] Root's clean verdict at the exact head SHA.
- [ ] Bugbot triage done.
- [ ] After the verdict, an owner merge uses Shipping step 4 to move the PR from its recorded patch base onto current trunk. An appended stack child keeps its recorded parent tip until that parent lands. Record the current landing SHA. Preserve the verdict only when the patch ID stays unchanged.
- [ ] 実行役はマージしない。作者が pomo-3 の後に squash でマージする。この PR は同じリポジトリの pomo-3 のブランチを base にする。

## Release dmg builds with auto update and autostart (pomo-5)

**Depends on.** pomo-4.

**Files.**

- [ ] Create `.github/workflows/release.yml`、`src/popover/UpdateButton.tsx`。
- [ ] Edit `src-tauri/tauri.conf.json`、`src-tauri/Cargo.toml`、`src-tauri/src/lib.rs`、`src/popover/Popover.tsx`、`README.md`。

**Build.**

- [ ] `release.yml` は `v*` タグの push で `macos-latest` を使い、`tauri-apps/tauri-action` で aarch64 の dmg と更新用の `latest.json` を作り、GitHub Releases に置く。
- [ ] 更新の署名鍵は `pnpm tauri signer generate` でリポジトリの外に作り、`gh secret set` に直接渡す。鍵を画面にもファイルにも残さない。公開鍵だけを `tauri.conf.json` に書く。
- [ ] `tauri-plugin-updater` の確認先を `https://github.com/alesion30/pomo/releases/latest/download/latest.json` にする。起動時と 6 時間おきに確認し、見つかったらポップオーバーに「更新あり」を出す。押せるのは待機中だけにする。
- [ ] `tauri-plugin-autostart` でログイン時に起動する。デバッグビルドでは登録しない。
- [ ] Appendix A の A3 で許可が外れると分かった場合は、自己署名の証明書を作って Actions secrets に置き、署名を固定する。
- [ ] README に、dmg からの入れ方、`/Applications` に置くこと、初回だけ `xattr -cr /Applications/pomo.app` が要ることを書く。

**You see.**

- [ ] `v0.1.0` タグを push すると、Releases に dmg と `latest.json` が並ぶ。古い版を入れた状態で新しいタグを出すと、待機中のポップオーバーに「更新あり」が出て、押すと新しい版で起動し直す。

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] `src/popover/UpdateButton.test.tsx` で、待機中だけボタンが押せることを確かめる。Run `pnpm test src/popover/UpdateButton`.
- [ ] `gitleaks git` を PR の全履歴に対して実行し、署名鍵が入っていないことを確かめる。Run `gitleaks git --redact --no-banner .`.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on the configured `swarm workers` role at the PR head, per the boot recipe.

- [ ] Lane 1. Regression lane against trunk. trunk ではリリースのワークフローがないことを記録し、作者の許可を得てから、head のブランチで検証用のタグ `v0.0.1` を push する。Save `pomo-5-release-assets.png`. Pass when Releases に dmg と `latest.json` が並ぶ。
- [ ] Lane 2. Lane 1 の dmg を開いて `/Applications` に入れ、`xattr -cr` の後に起動する。Save `pomo-5-install.png`. Pass when `pomo.app` が起動してメニューバーに表示が出る。
- [ ] Lane 3. `v0.0.1` を入れた状態で `v0.0.2` を出し、ポップオーバーを開く。Save `pomo-5-update-available.png`. Pass when `UpdateButton` に「更新あり」が出る。
- [ ] Lane 4. 集中中に Lane 3 の状態でポップオーバーを開く。Save `pomo-5-update-disabled.png`. Pass when `UpdateButton` が押せない状態で表示される。
- [ ] Lane 5. 待機中に「更新あり」を押す。Save `pomo-5-update-applied.png`. Pass when 再起動後の版が `0.0.2` になる。検証の後に、2 つのリリースとタグを消す。
- [ ] Lane 6. Lane 5 の後に通知を出す。Save `pomo-5-notify-after-update.png`. Pass when 許可の再要求が出ず、通知の配信が `usernoted` のログに残る。
- [ ] Lane 7. リリース版を起動した後に `osascript -e 'tell application "System Events" to get the name of every login item'` を読む。Save `pomo-5-autostart.png`. Pass when pomo が含まれる。
- [ ] Lane 8. Releases の dmg を展開し、中身に秘密鍵や `.env` が無いかを `gitleaks dir` で調べる。Save `pomo-5-artifact-scan.png`. Pass when 検出が 0 件。
- [ ] Lane 9. `latest.json` の署名を改ざんした更新を用意して確認させる。Save `pomo-5-bad-signature.png`. Pass when `tauri-plugin-updater` が署名の検証で失敗し、版が変わらない。
- [ ] Lane 10. ネットワークを切った状態で起動する。Save `pomo-5-offline.png`. Pass when 更新の確認が失敗しても `schedule.rs` のティッカーが普段どおりメニューバーを更新する。

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. dmg の大きさと、起動してからメニューバーに表示が出るまでの時間。
- [ ] Probe. Releases の dmg の大きさを読む。リリース版の起動からメニューバーに表示が出るまでを 5 回測る。trunk のビルドと head のビルドで交互に測る。
- [ ] Baseline. Record the trunk value first. trunk のリリース版の起動時間を先に測る。trunk には dmg がないので大きさは値なしと記録する。
- [ ] Rule. dmg が 30 MB を超えるか、起動時間が trunk より 20% 以上遅くなったら失敗。

**Review gate.** The operator reviews before merge.

- [ ] Copy lane 2, 3, and 5 screenshots into `docs/media/pomo-5-review-*.png`.
- [ ] Record a 30 to 60 second video of the change on a live lane. Save it as `docs/media/pomo-5-review.mp4`.
- [ ] Post the screenshots and the video in chat. Stop at merge-ready. Wait for the operator's click.

**Merge.**

- [ ] Root's clean verdict at the exact head SHA.
- [ ] Bugbot triage done.
- [ ] After the verdict, an owner merge uses Shipping step 4 to move the PR from its recorded patch base onto current trunk. An appended stack child keeps its recorded parent tip until that parent lands. Record the current landing SHA. Preserve the verdict only when the patch ID stays unchanged.
- [ ] 実行役はマージしない。作者が pomo-4 の後に squash でマージし、マージ後に `v0.1.0` のタグを打つ。この PR は同じリポジトリの pomo-4 のブランチを base にする。

## Close the program

- [ ] Every box above is checked with its evidence.
- [ ] Reply to the operator with the report the execution playbook names.

## Appendix A. Prototype evidence

試作は使い捨てで、コードは git に入れていません。観測の詳細は、個人のパスを伏せて [prototype-report.md](prototype-report.md) に写しました。使った版は tauri 2.12.5、tao 0.37.2、tauri-plugin-notification 2.8.1、tauri-nspanel 2.1.1、objc2 0.6.5 です。

**A0. 実装担当の権限。** codex:gpt-6-luna の子は、pnpm の dlx キャッシュへの書き込みを拒否されて試作を始められなかった。Tauri のビルドは `~/.cargo` などへの書き込みを要るため、同じ権限のままでは owner も swarm workers も動かないと推論している。Claude の子は同じ試作を最後まで進めた。

**A1. 他アプリの全画面の上に出せる。** Swift で作った全画面ウィンドウが前面のとき、3 方式とも pomo のウィンドウが画面に載った。(a) Tauri 標準は layer 5 で載ったが、スペース切り替えの途中で消えたサンプルが 9 回あった。(b) objc2 で 8 行足す方式は layer 25 で 49 サンプルすべてに載った。(c) tauri-nspanel は layer 25 で載り、前面アプリも変わらなかった。全画面の上で入力欄に文字を打てるかは未確認で、pomo-3 の最初の単位で確かめる。

**A2. 隠した WebView の JS は止まる。** `hide()` の約 4.5 秒後に WebContent プロセスが止められ、JS の tick は 0 回になった。同じ 12.5 分で Rust のスレッドは 750 回、p99 1.006 秒で動いた。`background_throttling` を切っても JS は約 2 秒間隔だった。このため時刻の基準とメニューバーの更新を Rust に置く。

**A3. 再署名後の通知の許可は未確定。** プラグインの `isPermissionGranted` は常に許可済みを返すので、判定には使えない。通知は NSUserNotification で送られる。`~/Applications` に置いた .app は正しいバンドル ID で通知した。CDHash を変えて上書きしても再要求は出なかったが、作者が許可を出す前の観測なので結論は出ていない。作者が許可を出した後に、試作の `tools/p3-after-allow.sh` を実行して判定する。同じアプリで UNUserNotificationCenter を呼ぶと、以後の旧 API の通知が拒否された。

**A4. 未確認のまま計画に入れたもの。** WebdriverIO の embedded ドライバは試作で動かしていない。Tauri の公式文書が macOS 対応と書いているだけである。pomo-1 の最初の単位で確かめ、だめなら制御ソケットと `screencapture` に替える。`screencapture` は画面収録の権限がなく `could not create image from display` で失敗した。

## Appendix B. Alternatives rejected

| 案 | 採らなかった理由 |
|---|---|
| Electron | すべて TypeScript で書けるが、常駐アプリとして重い。公式文書では未署名だと通知が失敗するとある。 |
| Kairos-Pomodoro のフォーク | TS 1.6 万行の大半を削ることになり、保存先も SQLite から JSONL に作り直しになる。作者の方針は既存アプリに引きずられないこと。 |
| 時刻を JS の setInterval で進める | A2 のとおり、隠した WebView の JS は止まる。 |
| 状態遷移を Rust に置く | 遷移はすべて利用者の操作から起き、その時 WebView は表示中で動いている。TypeScript に置けば作者が読み書きしやすく、Rust は時刻と表示の副作用だけを持てばよい。 |
| Tauri 標準の always_on_top だけで前面に出す | A1 でスペース切り替え中に消えるサンプルがあった。 |
| SQLite に保存する | AI と jq から直接読める JSONL の方が目的に合う。追記だけなので壊れにくい。 |
| CI の gitleaks を gitleaks-action で動かす | アクション側のライセンス条件に左右されない CLI の直接実行にした。 |

## Appendix C. Risks

- **実装担当が動かない。** A0 のとおり、Codex の子の権限では Tauri をビルドできない見込みである。Arm the program の最初の判断で決める。全 PR に効く。
- **GUI の検証が 1 台の Mac で衝突する。** 複数のレーンが同時にトレイと前面ウィンドウを出すと、互いの観測を乱す。boot recipe のロックで GUI のレーンを 1 本ずつ流す。試作中は別プロセスの Computer Use が同じ Mac を操作して前面アプリが切り替わったので、検証中は他の自動操作を止める。全 PR に効く。
- **メニューバーの文字列を直接撮れない。** `screencapture` は画面収録の権限がなく失敗した。レーンは `scripts/pomoctl title` で Rust が最後に設定した文字列を読む。作者が画面収録の権限を与えるまで、メニューバーのスクリーンショットとレビュー用の動画は撮れない。pomo-2 以降に効く。
- **WebDriver が隠れたウィンドウに届かない。** 隠した WebView は約 4.5 秒で止まるので、隠れている間の操作と観測はすべて制御ソケットで行う。全 PR に効く。
- **全画面の上で文字を打てないかもしれない。** NSPanel のキーウィンドウの扱いによっては入力を受けない。pomo-3 の最初の単位で確かめ、打てなければ (c) に替える。
- **通知の API が古い。** プラグインは NSUserNotification を使う。将来の macOS で動かなくなったら、objc2 で UNUserNotificationCenter に移す。pomo-3 で owner が見張る。
- **更新のたびに通知の許可が外れるかもしれない。** A3 の判定次第で、pomo-5 で自己署名の証明書に替える。
- **`POMO_TIME_SCALE` が本番に効く。** デバッグビルドでだけ読むことを pomo-2 のレーンとレビューで確かめる。撤去条件は、時間を縮めた E2E が要らなくなったとき。
- **WebDriver の口と制御ソケットがリリース版に残る。** pomo-1 の Lane 5 で接続できないことを確かめる。
- **公開リポジトリに秘密情報が入る。** pre-commit、CI、GitHub の Push protection の 3 層で防ぐ。更新の署名鍵は Actions secrets にだけ置く。pomo-5 で owner が見張る。

## Appendix D. Links and reading list

- 仕様は `docs/spec.md`。各 owner は最初に読む。
- Tauri v2 の WebDriver 文書は https://v2.tauri.app/develop/tests/webdriver/ にある。macOS では `@wdio/tauri-service` の embedded ドライバと `tauri-plugin-wdio-webdriver` を使う。
- Tauri v2 の dmg と macOS 署名の文書は https://v2.tauri.app/distribute/dmg/ と https://v2.tauri.app/distribute/sign/macos/ にある。
- tauri-nspanel は https://github.com/ahkohd/tauri-nspanel にある。
- 実装例として https://github.com/shakibdshy/Kairos-Pomodoro のトレイと通知の扱いを参照してよい。コードは写さない。
- pomo-2 と pomo-3 は着手前に `skills/how/SKILL.md` で Tauri のトレイとウィンドウの扱いを読み、マージ前に `skills/interrogate/SKILL.md` にかける。
- 判断の記録は `skills/show-me-your-work/SKILL.md` に従い、各 owner の `decisions.tsv` に残す。
