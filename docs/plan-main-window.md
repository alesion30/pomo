# pomo main window plan

pomo を、メニューバーのポップオーバーから開くアプリから、Dock に出るメインウィンドウを中心に使うアプリに変えます。
利用者は作者 1 人です。ウィンドウはいつでも閉じたり開き直したりでき、閉じている間もタイマーは進みます。
操作の流れは、作者が普段使っている Session（stayinsession.com）を参考にします。見た目は pomo 独自のもので、ダークテーマだけにします。
このプログラムでは 3 つの規則を守ります。時刻の基準は Rust 側に置きます。状態遷移は TypeScript の純粋な reducer に集めます。ウィンドウは `main` の 1 枚だけにします。
PR は pomo-6、pomo-7、pomo-8 の順に入れます。どの PR も、1 つ前の PR がマージされてから `main` の上に作ります。

## How to read this

One box is one unit of work. Every box names the evidence that checks it. A nested box is a sub-step of the box above it. Check a box only when its evidence exists, a file, a log line, a screenshot, a test run, or a SHA. The body is a how-to. The appendices explain and record.

The program runs `skills/poteto-mode/playbooks/autopilot-full.md` under the installed plugin. 作者は 2026-11-12 に、マージとリリースを任せました。clean な verdict を得た PR から親の Claude が squash でマージし、`v*` タグを push してリリースします。作者の操作を待って止まる PR はありません。

Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

## Program checklist

### Arm the program

- [ ] State the protocol and this plan to the operator, then stop. Start execution only on the operator's explicit go. 作者は 2026-11-12 に「この計画で最後まで進めて」と go を出した。
- [ ] 前回のプログラムの分担を引き継ぐ（`docs/plan.md` の A0）。依存の取得、ビルド、GUI の確認、commit、push、PR の操作、マージ、リリースは親の Claude が行う。pomo-6 と pomo-7 のコードは `feature, refactoring` の役割の Codex（gpt-6-luna、medium）が書く。pomo-8 のデザインと実装は、作者の指定どおり Claude Fable 5.2 が行う。
- [ ] Read these from the installed plugin at program start. Re-read them at every tick.
  - [ ] `skills/poteto-mode/playbooks/autopilot-full.md`
  - [ ] `skills/swarm/SKILL.md`
  - [ ] `skills/poteto-mode/playbooks/opening-a-pr.md`
  - [ ] `skills/poteto-mode/playbooks/shipping.md`
  - [ ] `skills/poteto-mode/playbooks/feature.md`
  - [ ] `skills/show-me-your-work/SKILL.md`
  - [ ] `skills/principle-model-the-domain/SKILL.md`
  - [ ] `skills/principle-prove-it-works/SKILL.md`
- [ ] On the operator's go, arm the hourly audit tick as a real cadence with the tick prompt below. Never leave the cadence to memory.
- [ ] Use this tick prompt, verbatim. "Re-read the execution playbook from the installed plugin. Audit the operation against it and fix drift in this tick. Probe every active lane and judge progress by side effects only. Stand down a lane only on affirmative failure evidence, and dispatch its replacement in the same tick. Then post a short status message to the operator in chat only when the audit found a tracked change that no earlier status message reported, such as a PR opened, a code-ready head, a round launched or closed, a verdict, a merge, a stuck agent and the action taken, a blocker added or cleared, or a decision only the operator can make. Name every such change and nothing else. Do not repeat a table, the merged list, or an unchanged blocker. If the audit found none, end the turn with no reply text. Either way, log this tick's row in your decision trail. The row names the items reported, or none."
- [ ] On the operator's hold or stand-down, send every owner a zero-writes order at once.

### Spawn owners

- [ ] Spawn one owner per PR with the full lifecycle the execution playbook names. 分担に合わせて、owner の仕事を次の 2 つに分ける。
  - [ ] 親の Claude は、この T3 スレッドの専用 worktree を PR ごとに使い回す。`git fetch origin main` の後、取得した `origin/main` から PR のブランチを作る。依存の追加、ビルド、live レーン、commit、push、PR の操作、マージを親が行う。PR には `--assignee @me` を付ける。
  - [ ] コードの担当は同じ worktree で、T3 の `delegate_task` に `isolation: "shared"` を付けて起動する。担当が動かすのは、`pnpm test`、`pnpm lint`、`pnpm typecheck`、`cargo test --offline` などオフラインの検証だけにする。新しい依存が要るときは、名前と版を報告して止まる。親が依存を追加し、続きは新しい `delegate_task` で頼む。
- [ ] Follow this dependency graph. Start dependent work only after its parent merges. Every PR branches from current `main` and targets `main`.
  - [ ] pomo-6 is first.
  - [ ] pomo-7 after pomo-6 merges.
  - [ ] pomo-8 after pomo-7 merges.
- [ ] Hold the file boundaries. pomo-6 はウィンドウとアプリの生存期間を担当する（`src-tauri/`、`src/main.tsx`、`src/App.tsx`、`e2e/`、`README.md`、`docs/spec.md`）。pomo-7 は `src/domain/` と、ボタンを足す画面だけを触る。pomo-8 は `src/` の見た目（CSS とコンポーネントの構成）を担当し、`src/domain/` と `src-tauri/src/` は触らない。
- [ ] 作者はマージを任せたので、どの PR もレビューの承認を待たない。操作が変わる PR では、スクリーンショットと動画を PR とチャットに出し、作者が後から確かめられるようにする。

### PR mechanics, for every PR

- [ ] Resolve the forge once. Default to `gh`; if `command -v origin` succeeds and Origin can resolve the repository, use `origin pr` for every PR operation. Record any fallback to `gh`. Record the intended PR base repository as canonical `<base-repo>` and validate it through the active forge. Do not infer it from the checkout's default remote. Capture it as a shell variable and pass `--repo "$base_repo"` to every `gh pr` command. Resolve and validate `<head-url>` through Shipping step 1 and capture it as `head_url` for the live-lane fetch. When the head repository is a fork, validate its identity and record its owner and repository name as `<fork-owner>` and `<head-name>`. Never require `gt`.
- [ ] Open the PR before self-proof and follow the readiness rule in `skills/poteto-mode/playbooks/opening-a-pr.md`. Open it ready by default. When repository instructions require a draft until named evidence exists, keep it draft until that evidence is recorded. Use `origin pr create --status open --base "$base_branch"` or `gh pr create --base "$base_branch" --repo "$base_repo"` for a ready same-repository PR. A same-repository stack child targets its parent branch. Every fork PR targets trunk. With GitHub, capture the approved PR title and body as `<title>` and `<body>`, then create it with `gh api --method POST "repos/$base_repo/pulls" -f "title=$title" -f "body=$body" -f "head=$fork_owner:$branch" -f "head_repo=$head_name" -f "base=$trunk" --jq .html_url`; add `-F draft=true` when repository instructions require a draft. Otherwise use the resolved Origin command. Stacked fork branches retain local parent ancestry.
- [ ] Run the repo's lint and typecheck once before the PR-facing push. Push with hooks on. コマンドは `pnpm lint`、`pnpm typecheck`、`pnpm test`、`cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings`、`cargo test --manifest-path src-tauri/Cargo.toml`。
- [ ] Run `/deslop` before each commit and `/no-comments` before review.
- [ ] Triage every Bugbot and security-reviewer comment per `skills/poteto-mode/references/bugbot-triage.md` under the installed plugin.
- [ ] Rebase each independent PR and stack root onto current trunk before the code-ready report and babysit. Rebase each unmerged stack child onto its parent's exact tip. Keep that merge base in fix rounds. Rebase again only at merge prep, on a `git merge-tree` conflict with trunk, on a CI failure that comes from a change on trunk, or when a known concurrent change to the same files lands. After its parent merges, use Shipping's explicit old-base-to-trunk rebase before the child's merge-ready report.

### Verdict and merge, for every PR

- [ ] A full swarm runs once, at the code-ready head. Another full swarm runs only for new behavior, a redesign, or a large new diff. A rebase, a merge-conflict resolution, or a minor fix gets a single verifier at the new head, and a wording-only change gets none. Run each full swarm per `skills/swarm/SKILL.md`. One gates lane. The ten live lanes from the PR's **Verify, live** block. The perf lane from its **Verify, perf** block. Two or more audit lanes, each with its own focus, that read the diff and the receipts and distrust the PR body. The root audits the receipts in the merge-ready report before the verdict.
- [ ] Judge every finding by the execution playbook's blocking rule. The verdict is clean when none blocks. A failure on trunk behavior in a lane marked `Regression lane against trunk.` is recorded against trunk and does not block the PR. A new head gets a fresh verdict, except for results that stay valid under the patch ID rule in `skills/poteto-mode/playbooks/shipping.md`.
- [ ] clean な verdict の SHA、patch base、patch ID を記録してから、Shipping step 5 の手順で、期待する head を指定して squash でマージする。マージ直前に `main` へ載せ直して patch ID が変わったら、新しい verdict を取ってからマージする。
- [ ] マージ後に `main` を取得し、次の版のタグを打って push する。pomo-6 は `v0.2.0`、pomo-7 は `v0.3.0`、pomo-8 は `v0.4.0`。release ワークフローが成功し、Releases に dmg と `latest.json` が載ったことを `gh release view` で確かめる。

### Boot recipe, for every live lane

Each live lane is one `swarm workers` lane at the PR head, resolved through provider dispatch, in its own worktree or output directory, with its own receipt. Drive the surface only through the driver skill this plan names. 前回と同じく、`swarm workers` は Codex ではなく、親と同じ Claude の native lane（inherit-parent）で動かす。Codex の子はアプリを起動できないため（`docs/plan.md` の A0）。GUI を使うレーンは同時に 1 本しか動かせないので、1 人の worker が複数のレーンを順に受け持つ。

- [ ] `git fetch -- "$head_url" "refs/heads/$head_branch" && git checkout --detach "$head_sha"` in the lane's worktree.
- [ ] ビルドは head の SHA ごとに 1 回だけ行う。親が `pnpm install --frozen-lockfile` と `pnpm tauri build --debug --no-bundle` を実行し、成果物を `<scratch path>/build-<sha>/pomo` に置く。trunk と比べるレーンのために、trunk の SHA でも同じものを作る。GUI を使うレーンは、`mkdir /tmp/pomo-gui.lock` が成功するまで待ってから始め、終わったら消す。
- [ ] 起動時に `XDG_DATA_HOME=/tmp/pomo-l<n>` と `POMO_TIME_SCALE=60` を渡す。`/tmp/pomo-l<n>` は `<lane dir>/data` を指す短い symlink にする。Unix ソケットのパスは 104 バイトまでなので短くする。集中 25 分は 25 秒、休憩 5 分は 5 秒、長い休憩 20 分は 20 秒になる。本物の `~/.local/share/pomo/` には触れない。作者がインストールした `/Applications/pomo.app` が動いていても止めず、観測は試作のプロセスの PID で絞る。
- [ ] 入力は 3 つの経路からだけ入れる。1 つ目は表示中の WebView で、`pnpm e2e` の WebdriverIO（`@wdio/tauri-service` の embedded ドライバ）から入れる。2 つ目は WebView を通らない操作で、トレイのクリックなどをデバッグビルドだけにある制御ソケットへ `scripts/pomoctl` で送る。3 つ目は OS からの操作で、`open <app>` で Dock のクリックに相当する再表示を送る。`open` は `.app` が要るので、レーンでは `pnpm tauri build --debug --bundles app` の成果物を使う。読むだけの診断は 5 つ。`/tmp/pomo-l<n>/pomo/sessions.jsonl` と `state.json` の中身、`scripts/pomoctl title`、`scripts/pomoctl key-window`、`swift scripts/onscreen.swift pomo`（PID で絞る）、`lsappinfo info -only ApplicationType <pid>`。
- [ ] Save every screenshot to `<scratch path>/swarm-<pr-id>/worker-<n>/<slug>.png` and return the paths with the receipt path. WebView の中は `browser.saveScreenshot` で撮る。全画面アプリとの重なりなど画面全体は `screencapture -x` で撮る。

## Move the UI into one main window (pomo-6)

**Depends on.** None.

**Files.**

- [ ] Edit `src-tauri/tauri.conf.json`、`src-tauri/capabilities/default.json`、`src-tauri/src/lib.rs`、`src-tauri/src/panel.rs`、`src-tauri/src/debug.rs`、`src-tauri/Cargo.toml`。
- [ ] Edit `src/main.tsx`、`src/App.tsx`。
- [ ] Create `src/Main.tsx` と `src/QuitConfirm.tsx`。
- [ ] Delete `src/front/front.tsx`。ポップオーバーと前面ウィンドウを分けるための処理は残さない。
- [ ] Edit `e2e/wdio.conf.ts`、`e2e/windows.ts`、`e2e/*.e2e.ts`。
- [ ] Edit `README.md`、`docs/spec.md`。

**Build.**

- [ ] 最初の単位として、Regular のアプリで全画面アプリの上に `main` を前面化できるかを確かめる。A2 で観測できなかったためである。試作の道具（`proto-tools/` の fsapp、observe、run-a.sh）を使う。前面化できない、またはスペースが切り替わるときは、前面化の間だけ `ActivationPolicy::Accessory` に切り替える案を試す。結果を PR の本文に書く。
- [ ] `tauri.conf.json` のウィンドウを `main` の 1 枚にする。タイトルバーありで、リサイズはできない。大きさは 360×520 で、pomo-8 で見直す。`popover` と `front` は消す。
- [ ] `lib.rs` の `ActivationPolicy::Accessory` を消し、Dock に出す。トレイの左クリックと `RunEvent::Reopen` で `show_main` を呼び、`main` を表示してフォーカスを渡す。
- [ ] `WindowEvent::CloseRequested`（赤ボタン、⌘W）では `prevent_close` して隠す。プロセス、トレイ、タイマーは残す。
- [ ] 起動時の表示を `tauri_plugin_autostart::init` の引数 `--autostart` で分ける。この引数があるとき（ログイン時）は `main` を出さず、ないとき（手動の起動）は出す。
- [ ] 位置の記憶を `tauri-plugin-window-state` で行う。保存するのは位置だけにする。
- [ ] `panel.rs` は区切りを次の型で扱う。`DuePresentation { restore: Option<(PhysicalPosition, bool)> }`（前面化する前の位置と表示の有無）を `Mutex` で持つ。`present_due` は前の状態を記録し、`CanJoinAllSpaces|FullScreenAuxiliary` と level 25 を付け、マウスカーソルのある画面の中央に出してフォーカスを渡す。`end_due` コマンドは collectionBehavior と level を通常に戻し、記録した位置と表示の有無に戻す。前面化する前に隠れていたら、`main` を隠してアプリも hide する。そうすると、キー入力が元のアプリに戻る。どちらも何度呼んでも同じ結果になるようにする。
- [ ] `Main.tsx` は 1 つの `useTimer` から画面を選ぶ。集中が予定時間に達したら `FocusEnd`、休憩が予定時間に達したら `BreakEnd` を出す。待機（休憩をスキップした直後を含む）と、予定時間前の集中と休憩では、今のポップオーバーの画面を出す。前面ウィンドウにあった `next-focus` の画面は、待機の画面と同じ役割なので消す。前面化を始めたのが区切りなので、区切りの画面を抜けたら `end_due` を呼ぶ。
- [ ] ⌘Q は、アプリメニューの終了の項目を自前の項目（アクセラレータ `CmdOrCtrl+Q`）に差し替えて受ける。標準の Quit では `ExitRequested` が来ないため（A2）。メニューの終了が選ばれたとき、集中中か休憩中なら（`ActiveSchedule` が `Some`）`show_main` を呼び、`quit-requested` を emit する。待機中はすぐ `app.exit(0)` で終える。`QuitConfirm.tsx` は確認を出し、「終了」で `quit_app` コマンドを呼ぶ。Dock のメニューの終了と quit の Apple event は確認を通らずに終わる。この違いは `docs/spec.md` に書く。
- [ ] 「更新あり」をメインウィンドウに移す。押せるのは今と同じく待機中だけ。
- [ ] `debug.rs` の `tray-click` は `show_main` を呼ぶ。`key-window` は `main` を返す。`key-quit` を足す。このコマンドは ⌘Q のキーイベントを作り、メインメニューの `performKeyEquivalent:` に渡す。こうすると、メニューの経路を通した ⌘Q を検証できる。
- [ ] `e2e/` は `windowLabel: "main"` にし、ウィンドウの切り替えをやめる。
- [ ] `docs/spec.md` の「画面」と「起動と更新」を新しい構成で書き直す。README の「メニューバーに pomo が表示されます」と、ポップオーバーについての記述を直す。

**You see.**

- [ ] Finder から pomo を開くと、Dock にアイコンが出て、メインウィンドウが開く。赤ボタンで閉じてもメニューバーの残り時間は進み続ける。Dock のアイコンかメニューバーを押すと、同じ位置にウィンドウが戻る。
- [ ] 他のアプリを全画面で使っている間に予定時間が来ると、その上にメインウィンドウが区切りの画面で出る。「休憩開始」を押すと、ウィンドウは元の位置と表示の状態に戻る。
- [ ] 集中中に ⌘Q を押すと確認が出る。待機中はすぐに終わる。

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] `src/Main.test.tsx` で、状態ごとに選ばれる画面（`focus-end`、`break-end`、通常）と、区切りの画面を抜けた時に `end_due` を 1 回呼ぶことを確かめる。Run `pnpm test`.
- [ ] `src/QuitConfirm.test.tsx` で、`quit-requested` を受けて確認が出て、「終了」で `quit_app`、「キャンセル」で何も呼ばないことを確かめる。Run `pnpm test`.
- [ ] `panel.rs` のテストで、`DuePresentation` を記録して戻す処理が、2 回呼んでも同じ結果になることを確かめる。Run `cargo test --manifest-path src-tauri/Cargo.toml`.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on the configured `swarm workers` role at the PR head, per the boot recipe.

- [ ] Lane 1. Regression lane against trunk. 引数なしで起動する。trunk ではウィンドウが出ず、Dock にも出ないことを記録する。head では `main` が画面に載り、`lsappinfo` が `Foreground` を返す。Save `pomo-6-launch.png`. Pass when head で `onscreen.swift` に `main` が載り、Dock にアプリが出ている。
- [ ] Lane 2. 集中を始めて、`main` の赤ボタンに相当する閉じる操作をする。Save `pomo-6-closed.png`. Pass when `onscreen.swift` から `main` が消え、プロセスが残り、`pomoctl title` の残り時間が 3 秒後に減っている。
- [ ] Lane 3. Lane 2 の後に `open <app>` を送る。Save `pomo-6-reopen.png`. Pass when 閉じる前と同じ位置で `main` が載り、`key-window` が `main` を返す。
- [ ] Lane 4. ウィンドウを隠した状態で `pomoctl tray-click` を送る。Save `pomo-6-tray-open.png`. Pass when `main` が載り、`key-window` が `main` を返す。
- [ ] Lane 5. `swift` で作った全画面ウィンドウを前面にした状態で、集中の予定時間を迎える。振り返りの欄に WebDriver から文字を入れる。Save `pomo-6-due-over-fullscreen.png`. Pass when `onscreen.swift` に `main` と全画面ウィンドウが同時に載り、`key-window` が `main` を返し、確定後の記録の `notes` に入れた文字が残る。
- [ ] Lane 6. ウィンドウを隠した状態で区切りを迎え、「休憩開始」を押す。次に、ウィンドウを表示した状態で区切りを迎え、同じ操作をする。Save `pomo-6-due-restore.png`. Pass when 1 回目の後は `main` が画面から消え、2 回目の後は前面化する前の位置で、layer 0 で載っている。
- [ ] Lane 7. `--autostart` を付けて起動する。Save `pomo-6-autostart.png`. Pass when `onscreen.swift` に `main` が載らず、`lsappinfo` が `Foreground` を返し、`pomoctl title` が文字列を返す。
- [ ] Lane 8. 集中中に `pomoctl key-quit` を送る。確認で「キャンセル」を押してから、もう一度送って「終了」を押す。待機中にも送る。Save `pomo-6-quit-confirm.png`. Pass when 1 回目はプロセスが残って集中が続き、2 回目と待機中はプロセスが終わる。待機中は `quit-confirm` が出ない。
- [ ] Lane 9. Lane 8 で集中中に終了した後、引数なしで起動し直す。Save `pomo-6-resume.png`. Pass when `state.json` の `startedAt` が終了前と同じで、残り時間の表示が続きから進む。
- [ ] Lane 10. `main` を画面の別の位置へ動かしてから終了し、起動し直す。Save `pomo-6-position.png`. Pass when `onscreen.swift` の位置が、動かした位置と 2 px 以内で一致する。

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. 予定時刻から、区切りのウィンドウが画面に載るまでの時間。trunk では `front`、head では `main` を測る。ウィンドウを隠して WebView が止まった場合と、表示していて WebView が動いている場合の両方で測る。
- [ ] Probe. `onscreen.swift` を 100ms 間隔で回し、`state.json` の予定終了時刻から、ウィンドウが載るまでの時間を測る。trunk と head を交互に、両方の場合を 5 回ずつ測る。
- [ ] Baseline. Record the trunk value first.
- [ ] Rule. head の 5 回の最大値が 1.5 秒を超えたら失敗。head の中央値が trunk の中央値より 20 % 以上遅くても失敗。

**Review gate.** None. pomo-6 is not review-gated.

**Merge.**

- [ ] Copy lane 1, 5, and 8 screenshots into the PR body and chat. 画像は `gh` の添付機能で PR に載せる。
- [ ] Record a 30 to 60 second video of the change on a live lane. 閉じる、開き直す、全画面の上の区切り、⌘Q の確認までを 1 本に収め、PR に添付する。
- [ ] Root's clean verdict at the exact head SHA.
- [ ] Bugbot triage done.
- [ ] After the verdict, an owner merge uses Shipping step 4 to move the PR from its recorded patch base onto current trunk. Record the current landing SHA. Preserve the verdict only when the patch ID stays unchanged.
- [ ] 親の Claude が squash でマージし、`v0.2.0` をリリースする。

## Add break-now and discard to the focus phase (pomo-7)

**Depends on.** pomo-6.

**Files.**

- [ ] Edit `src/domain/timer.ts`、`src/domain/timer.test.ts`。
- [ ] Edit 集中中の画面のコンポーネント（pomo-6 の後の `src/popover/Popover.tsx`）。
- [ ] Create `src/DiscardConfirm.tsx`。
- [ ] Edit `e2e/timer.e2e.ts`、`docs/spec.md`。

**Build.**

- [ ] `transition` の `startBreak` を、集中中にも受け付けるようにする。中身は `endFocus` と同じ記録を作ってから休憩に入る。休憩の種類は `endFocus` が出す `offer` で決める。予定時間の前なら `ended_early` で記録し、回数に数えず、短い休憩に入る。予定時間を過ぎていれば `completed` で数え、4 回目なら長い休憩に入る。
- [ ] `Command` に `{ type: "discardFocus" }` を足す。集中中だけ受け付け、記録を作らずに待機へ戻す。`streak` は変えない。下書きのタイトルとカテゴリは残し、振り返りは空にする。
- [ ] 集中中の画面に「休憩」と「破棄」のボタンを足す。testid は `break-now` と `discard`。「破棄」は `DiscardConfirm` で確認してから `discardFocus` を出す。確認の testid は `discard-confirm` と `discard-cancel`。
- [ ] `docs/spec.md` のタイマーの節に、集中中の休憩と破棄を書く。

**You see.**

- [ ] 集中の途中で「休憩」を押すと、メニューバーが `☕ 05:00` に変わり、`sessions.jsonl` に `ended_early` の集中の行が 1 行増える。
- [ ] 「破棄」で確認して破棄すると、行は増えずに待機に戻る。タイトルとカテゴリの欄は残っている。

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] `src/domain/timer.test.ts` に 4 つのケースを足す。予定時間前の休憩、予定時間後の休憩、4 回目の後の休憩、破棄で記録と `streak` が変わらないこと。Run `pnpm test src/domain`.
- [ ] 集中中の画面のテストで、「休憩」が `startBreak` を、確認後の「破棄」が `discardFocus` を出し、確認のキャンセルでは何も出さないことを確かめる。Run `pnpm test`.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on the configured `swarm workers` role at the PR head, per the boot recipe.

- [ ] Lane 1. Regression lane against trunk. 集中を始めて 5 秒後に休憩へ入ろうとする。trunk には集中中の「休憩」がないことを記録する。head では「休憩」を押す。Save `pomo-7-break-now.png`. Pass when head の `sessions.jsonl` に `ended_early` の集中の行が増え、`state.json` が `short_break` の休憩になる。
- [ ] Lane 2. 予定時間を過ぎてから、区切りの画面ではなく集中中の「休憩」に相当する操作をする。Save `pomo-7-break-overtime.png`. Pass when 行の `outcome` が `completed` で、`streak.completed` が 1 増える。
- [ ] Lane 3. 予定時間を過ぎてから「休憩」で終える集中を 4 回続ける。Save `pomo-7-long-break.png`. Pass when 4 回目の後の休憩が `long_break` になる。
- [ ] Lane 4. 「破棄」を押して、確認でキャンセルする。Save `pomo-7-discard-cancel.png`. Pass when 集中が続き、`sessions.jsonl` の行数が変わらない。
- [ ] Lane 5. 「破棄」を押して確定する。Save `pomo-7-discard.png`. Pass when `state.json` が待機に戻り、行数が変わらず、タイトルとカテゴリの欄は残り、振り返りの欄は空になる。
- [ ] Lane 6. 集中を 1 回 `completed` で終えてから、次の集中を破棄する。Save `pomo-7-discard-streak.png`. Pass when `state.json` の `streak` が破棄の前後で同じ。
- [ ] Lane 7. Lane 1 の後に `pomoctl title` を読む。Save `pomo-7-title.png`. Pass when `pomoctl title` の文字列が `☕` で始まる。
- [ ] Lane 8. 予定時間前の「休憩」の後に、`streak.completed` を読む。Save `pomo-7-early-streak.png`. Pass when `streak.completed` が増えていない。
- [ ] Lane 9. 予定時間前に、今までの「終了」を押す。Save `pomo-7-end.png`. Pass when 今までどおり `ended_early` の行が増えて待機に戻り、休憩は始まらない。
- [ ] Lane 10. 予定時間前の「休憩」の後、休憩の予定時間まで待つ。Save `pomo-7-break-due.png`. Pass when 区切りの前面化は休憩の予定時間に 1 回だけ起き、「休憩」を押した時には起きない。

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. 「休憩」のクリックから、`state.json` が休憩に変わるまでの時間。trunk には集中中の「休憩」がないので、trunk では待機画面の「休憩開始」で同じ時間を測る。
- [ ] Probe. WebDriver でクリックした時刻と、`state.json` の更新時刻の差を測る。trunk と head を交互に 5 回ずつ測る。
- [ ] Baseline. Record the trunk value first.
- [ ] Rule. head の 5 回の最大値が 300ms を超えたら失敗。

**Review gate.** None. pomo-7 is not review-gated.

**Merge.**

- [ ] Copy lane 1 and 5 screenshots into the PR body and chat.
- [ ] Record a 30 to 60 second video of the change on a live lane. 集中中の「休憩」と「破棄」を 1 本に収め、PR に添付する。
- [ ] Root's clean verdict at the exact head SHA.
- [ ] Bugbot triage done.
- [ ] After the verdict, an owner merge uses Shipping step 4 to move the PR from its recorded patch base onto current trunk. Record the current landing SHA. Preserve the verdict only when the patch ID stays unchanged.
- [ ] 親の Claude が squash でマージし、`v0.3.0` をリリースする。

## Redesign the main window in a dark theme (pomo-8)

**Depends on.** pomo-7.

**Files.**

- [ ] Edit `src/` の画面のコンポーネントと CSS。`src/domain/`、`src/useTimer.ts`、`src-tauri/src/` は触らない。
- [ ] Edit `src-tauri/tauri.conf.json` のウィンドウの大きさと見た目の設定だけ。
- [ ] Edit `docs/spec.md` の画面の節。

**Build.**

- [ ] Claude Fable 5.2 がデザインし、合意を取らずにそのまま実装する。方針は 4 つ。ダークテーマだけにして、macOS がライトモードでもダークで表示する。モダンでシンプルにする。操作の流れと情報の配置は Session を参考にし、配色、アイコン、タイポグラフィは pomo 独自にする。Session のロゴ、名前、配色は使わない。
- [ ] 対象の画面は 7 つ。待機、集中、集中の区切り、休憩、休憩の区切り、破棄の確認、終了の確認。「更新あり」の表示も含める。
- [ ] 既存の testid と、E2E が照合する文字列（「待機中」「集中」「短い休憩」）は残す。変えるなら、同じ PR で E2E を直す。
- [ ] 色は CSS のカスタムプロパティにまとめる。ウィンドウの背景を `tauri.conf.json` でもダークにし、表示の直後に白い画面が見えないようにする。

**You see.**

- [ ] どの画面もダークで、macOS をライトモードにしても見た目が変わらない。

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] 既存の `pnpm test` がすべて通る。デザインで振る舞いは変えないので、新しいテストは振る舞いを足した部分にだけ書く。Run `pnpm test`.
- [ ] `pnpm e2e` がすべて通る。Run `pnpm e2e`.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on the configured `swarm workers` role at the PR head, per the boot recipe.

- [ ] Lane 1. Regression lane against trunk. 待機、集中、休憩の 3 画面を trunk と head で撮る。Save `pomo-8-compare.png`. Pass when head の 3 画面がダークで、trunk と同じ操作の要素（testid）が全部ある。
- [ ] Lane 2. 待機画面を撮る。Save `pomo-8-idle.png`. Pass when `title-input`、`category-input`、`start` が見え、ウィンドウ内にスクロールが出ない。
- [ ] Lane 3. 集中画面を撮る。Save `pomo-8-focus.png`. Pass when 残り時間、タイトル、振り返り、±5 分、休憩、終了、破棄が見え、スクロールが出ない。
- [ ] Lane 4. 集中の区切りを撮る。Save `pomo-8-focus-end.png`. Pass when オーバータイムの表示と、休憩開始、スキップ、±5 分が見える。
- [ ] Lane 5. 休憩画面と休憩の区切りを撮る。Save `pomo-8-break.png`. Pass when `phase` が休憩と分かる表示で、終える操作と次のタイトルの入力が見える。
- [ ] Lane 6. 破棄の確認と終了の確認を撮る。Save `pomo-8-confirms.png`. Pass when 2 つの確認が読めて、キャンセルと確定のボタンが区別できる。
- [ ] Lane 7. macOS をライトモードにして全画面を撮る（`osascript -e 'tell app "System Events" to tell appearance preferences to set dark mode to false'`。撮り終えたら元に戻す）。Save `pomo-8-light-mode.png`. Pass when Lane 2 から 6 と同じダークの見た目になる。
- [ ] Lane 8. 各画面の文字と背景のコントラスト比を、WebDriver で取った計算済みの色から求める。Save `pomo-8-contrast.png`. Pass when 本文の文字が 4.5:1 以上、大きな数字が 3:1 以上。
- [ ] Lane 9. 長いタイトル（全角 40 文字）と長いカテゴリを入れて、集中画面を撮る。Save `pomo-8-long-text.png`. Pass when 文字がはみ出さず（`scrollWidth` が `clientWidth` 以下）、ボタンが押せる位置に残る。
- [ ] Lane 10. ウィンドウを隠した状態から開き直した直後を `screencapture` で 100ms 間隔で撮る。Save `pomo-8-first-frame.png`. Pass when どのフレームにも白（`#ffffff`）の画面が写らない。

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

- [ ] Metric. 起動から `[data-testid="phase"]` が表示されるまでの時間と、`dist/` の JS と CSS の合計サイズ。
- [ ] Probe. 引数なしの起動を trunk と head で交互に 5 回ずつ行い、WebDriver のセッション開始から要素が見えるまでの時間を測る。サイズは `pnpm build` の後に `du -b dist/assets` で測る。
- [ ] Baseline. Record the trunk value first.
- [ ] Rule. head の起動時間の中央値が trunk より 20 % 以上遅いか、合計サイズが trunk の 1.5 倍を超えたら失敗。

**Review gate.** None. pomo-8 is not review-gated.

**Merge.**

- [ ] Copy lane 2, 3, 4, 5, and 6 screenshots into the PR body and chat.
- [ ] Record a 30 to 60 second video of the change on a live lane. 待機から集中、区切り、休憩までを 1 本に収め、PR に添付する。
- [ ] Root's clean verdict at the exact head SHA.
- [ ] Bugbot triage done.
- [ ] After the verdict, an owner merge uses Shipping step 4 to move the PR from its recorded patch base onto current trunk. Record the current landing SHA. Preserve the verdict only when the patch ID stays unchanged.
- [ ] 親の Claude が squash でマージし、`v0.4.0` をリリースする。

## Close the program

- [ ] Every box above is checked with its evidence.
- [ ] Reply to the operator with the report the execution playbook names.

## Appendix A. Prototype evidence

試作は使い捨てで、コードは git に入れていません。

**A1. Session の挙動。** 公式の Getting Started、Changelog、URL scheme、Export のページと、インストール済みの Session v2.13.48 の文字列から確かめた。時間に達しても自動で休憩に入らず、経過時間を数え続けて、休憩か停止を選ばせる。途中で止める操作は、記録を残す Finish と、記録しない Abandon の 2 つがある。一時停止は集中中だけ使える。作者は一時停止を入れないことにした。

**A2. 通常アプリの生存期間。** 2026-11-12 に、Regular にした試作（tauri 2.12.5、tao 0.37.2、objc2 0.6.5）で観測した。ログは試作の scratch に置いた。

- 標準のアプリメニューの Quit（⌘Q）でも quit の Apple event でも、`RunEvent::ExitRequested` は来ずに `RunEvent::Exit` で終わった。tao の app delegate に `applicationShouldTerminate:` がないため、`prevent_exit()` では止められない。
- delegate に `applicationShouldTerminate:` を足すと、⌘Q と Apple event の両方を止められた。ただし、ログアウトとシャットダウンも止めるおそれがあり、試していない。
- 自前の Quit 項目（`CmdOrCtrl+Q`）に差し替えると、⌘Q はメニューのイベントとして届いた。Apple event の quit は止まらずに終わった。pomo-6 はこの方式を採る。
- tao のイベントのコールバックの中から `terminate:` を同期で呼ぶと、デッドロックした。
- 起動中の `.app` に `open` すると、`RunEvent::Reopen` が `has_visible_windows=false` で届いた。
- `performClose:` に対して `CloseRequested` で `prevent_close` して隠すと、プロセスとトレイは残った。
- 全画面アプリの上での前面化は、画面がロックされていたため観測できなかった。pomo-6 の最初の単位で確かめる。

## Appendix B. Alternatives rejected

| 案 | 採らなかった理由 |
|---|---|
| ポップオーバーをメインウィンドウと並べて残す | タイトル、カテゴリ、振り返りの入力が 2 か所に分かれ、同期と E2E が二重になる。 |
| 区切りの前面ウィンドウを別に残す | 同じ入力を 2 枚のウィンドウに置くことになる。メインウィンドウに前面化の間だけ設定を付ければ足りる。 |
| ウィンドウを閉じたら Dock から消す | Dock の出入りがちらつき、⌘Tab で戻れない時間ができる。 |
| 一時停止 | 作者がヒアリングで不要とした。 |
| ⌘Q を app delegate の `applicationShouldTerminate:` で止める | ログアウトとシャットダウンも止めるおそれがある。自前の Quit 項目なら、作者が決めた ⌘Q の確認だけを足せる。 |
| 確認を `window.confirm` やネイティブのダイアログで出す | WebView の中の確認にすれば、デザインを揃えられ、WebDriver で検証できる。 |
| 開始前に予定時間を決める | 作者が、開始後に ±5 分で調整する今の方式を選んだ。 |

## Appendix C. Risks

- **通常アプリにすると、全画面アプリの上で前面化できないかもしれない。** 今の前面化は Accessory のアプリで確かめたもので、Regular で同じ動きになるかは A2 で確かめる。pomo-6 の Lane 5 で見張る。
- **区切りの後に元の状態へ戻す処理が、スペースの切り替えを起こすかもしれない。** 前面化の前に表示していたウィンドウを戻すと、macOS がそのスペースに移ることがある。pomo-6 の Lane 6 で見張る。
- **E2E の前提が大きく変わる。** `popover` のラベル、`tray-click`、`front` の判定に依存している箇所を、pomo-6 で全部書き換える。
- **GUI の検証が 1 台の Mac で衝突する。** 作者の本物の pomo と、検証用のデバッグ版が同時に動く。観測は PID で絞り、GUI のレーンはロックで 1 本ずつ流す。全 PR に効く。
- **デザインの PR で testid や文言が変わり、E2E が壊れる。** pomo-8 で `pnpm e2e` を必須にする。
- **ログイン時の起動引数が古い LaunchAgent に残る。** リリース版は起動するたびに LaunchAgent を登録し直すので、更新後の初回起動で引数が入る。それより前のログインでは、ウィンドウが 1 回出るだけで済む。

## Appendix D. Links and reading list

- 仕様は `docs/spec.md`。前回のプログラムは `docs/plan.md` と `docs/prototype-report.md` にある。
- Tauri v2 の `RunEvent` は https://docs.rs/tauri/latest/tauri/enum.RunEvent.html にある。`Reopen` と `ExitRequested` を使う。
- `tauri-plugin-window-state` は https://v2.tauri.app/plugin/window-state/ にある。
- pomo-6 は着手前に `skills/how/SKILL.md` で Tauri のウィンドウの扱いを読み、マージ前に `skills/interrogate/SKILL.md` にかける。
- 判断の記録は `skills/show-me-your-work/SKILL.md` に従い、`decisions.tsv` に残す。コミットはしない。
