# Lab4Net changes

## Fixes, phase 6: Home, Progress and Practice

Home and Progress repeated each other, "20%" next to a bar read as "20% done", Practice was three cards and empty space, and the quiz counter "1/110" looked like a score.

- **Home is about what to do next.**
  - It starts with one clear next step (Continue, or Start here).
  - Then "Recently": the last three labs finished or lessons read, with grades.
  - Then "Next up", and one line of totals ("2 of 77 labs · 1 of 66 lessons · 2 of 110 quiz questions right") with a "See your progress" link.
  - The progress bars and the exam-topic table are on Progress only.
- **The exam weight is in words.** On Progress, each exam topic shows "20% of the exam" in muted text next to its name, no longer as a bare "20%" next to its progress bar.
- **Practice has buttons and results.**
  - Each card has a Start button and its last result: the last exam with its grade, checks and date; the quiz's correct count and how many are left to review; the subnetting score, or "Not tried yet".
  - The Quiz card has "Review *n*", which opens the quiz with "Only missed or unanswered" switched on.
  - The last five exams are listed below the cards.
- **The quiz counter says where you are.** It reads "Question 1 of 110". With "Only missed or unanswered" on, each answer also says how many are left to review.
- **Accessibility.** The "See your progress" link in Home's summary line is underlined, because a link inside a sentence must not be told apart by colour alone (axe caught it).
- **Tests.** A new browser test, `hub.spec.js`, checks:
  - Home's order, its Recently list and the summary link, and that it has no bars or exam topics;
  - that a new visitor sees Start here;
  - that no bar on Home, Progress, Practice, the quiz, Lessons or Labs has a percentage next to it that isn't its own value;
  - Practice's cards, Start and Review, and the "left to review" count going down after a right answer.

  `counts.spec.js` now reads Home's totals from the summary line and the quiz's from "Question 1 of *n*". `quiz.spec.js` reads the new counter. It's the same check with the new wording.



At 1366×768 the first task started at the bottom edge of the Tasks panel, the map took about 40% of the height even for a line of routers, and "Why" was squeezed into one strip of small text.

- **Tasks first.** The Tasks panel now goes: the scenario, step-by-step, the tasks, then the address plan.
  - The address plan is a folded "Addresses" section, open by default only in the two capstones, where it is the brief.
  - "Read the lesson first" and the step-by-step tip are now compact rows with a close button, not cards.
  - The first task is fully visible without scrolling in all 75 build labs and incidents.
- **The map fits the network.** Its default height comes from the topology, worked out the way the map fits devices: short for a line of routers, taller for a mesh, never more than half the space. Static routing's map is 160 px (it was 290), and the console now shows 20 lines. Incident 07's triangle gets 293 px. A height you drag yourself is still remembered and wins.
- **"Why" opens.** The explanation under the console is one line with a "More" button. "More" opens it at normal body size, up to 40% of the console; "Less" closes it. It stays open or closed for the next command while the lab is open, and the button reports its state to screen readers.
- **On a phone,** task 1 shows near the top of the Tasks tab.
- **A smaller file.** The size budgets were close to full (app code 299.7 of 300 KB, CSS 69.7 of 70 KB), and these phases add interface code. Instead of raising the budgets, the build now drops what never mattered:
  - indentation in the app code;
  - indentation and the spaces after `:` `;` `,` and around braces in the CSS.

  The app code is 279.1 KB and the CSS 62.1 KB. `index.html` went from 1,593.8 to 1,566.3 KB, smaller for every visitor. The build refuses app code with a template literal or a line ending in a backslash, and CSS with a quoted string holding a separator and a space, the only cases where this could change what is shown. The strict screenshots from phase 2 confirm that every screen this phase didn't change renders exactly as before.
- **Tests.** A new browser test, `layout.spec.js`, checks:
  - the first task in all 75 build labs and incidents at 1366×768;
  - the map and console sizes;
  - that a mesh gets a taller map than a line;
  - the address plan's place and folding;
  - the phone;
  - the "Why" line's More and Less.

  In `map.spec.js`, "Restore the map" used to be checked as "taller than 160 px", which was the old default height. It is now checked more strictly: the map comes back to exactly the height it had before.



A lab graded S used to say "0 of 5 done" in its header, "0 of 5 tasks" on Home and "0/5" in the Labs list, and still offered "Read the lesson first". Task ticks and grading were two separate records, and grading never touched the ticks. Now a lab that is done looks done everywhere.

- **A full grade ticks every task.** When a grade passes every check, all of that lab's tasks are ticked and saved with the lab's work. A partial grade changes nothing, and you can still tick tasks by hand.
- **The header counts checks after a grade.** Before a grade it says "2 of 5 done" (tasks). After one it says "6 of 6 checks", the real measure. After a reload it counts the ticked tasks again.
- **The Labs list and Home say Done.** A finished lab shows "Done" and its grade, never "0/5". Home's Continue card for a finished lab reads "Routing · Done · S".
- **Banners that have done their job go.**
  - "Read the lesson first" no longer shows once the lab is done (as before, it also goes once the lesson is read or the banner was opened or skipped).
  - The step-by-step tip goes for good once step-by-step has been switched on, as well as when "Got it" is pressed.
- **Progress from before this change.** A lab marked done with no ticked tasks shows its tasks ticked and "Done" everywhere. This is worked out when the screen is drawn. Nothing in the saved data is rewritten when it loads, and the ticks are saved only once you work in that lab again.
- **Tests.** A new browser test, `progress-one.spec.js`:
  - grades Static routing with its solution, then checks the ticks, the "6 of 6 checks" header, the saved work, the reload, the Labs row, Home and the banner;
  - loads a profile from before this change and checks the same screens, and that nothing was written;
  - checks that using step-by-step retires its tip.

  `tests/migrate.cjs` and `tests/validate.cjs` pass unchanged.
- **Size.** The app code is now 299.7 KB of its 300 KB budget. Phases 5 to 7 add interface code, so that budget will need attention. See the note in phase 5.



Small things that made the app look unfinished.

- **Incident titles start with a capital.** 34 of the 37 incidents showed titles like "one branch fell off the map", because the app removed "Incident 07: " and kept what followed as it was. The title shown on its own now starts with a capital ("One branch fell off the map") in the Labs list, the workspace header, the palette, Home, Progress, the stage checks, the exam history and the popped-out Tasks window. The stored title doesn't change, because it feeds the lab's address and saved progress.
- **Lab numbers follow the Path.** Labs were numbered in the order they were written, so the Path read LAB-01, LAB-17, LAB-38 and looked as if labs were missing. They are now numbered in Path order: LAB-01 to LAB-38 down the eight stages, then INC-01 to INC-37, then CAP-01 and CAP-02. Search by number uses the new numbers. Nothing stores these numbers, so no saved data changes.
- **The landing page shows the real workspace.** The picture under "Start" was grey bars. It is now a drawing of the Static routing lab:
  - the breadcrumb and the Grade button;
  - the tasks, two of them ticked;
  - the PC1–R1–R2–R3–PC2 map with the working path lit up and the "Reply received" line;
  - the R1 console with `show ip route static` and a successful ping, copied from what the simulator prints.

  It uses the app's colours, so it matches both themes, and it fits the markup budget (20.7 of 30 KB).
- **The Lessons side panel shows whole sentences.** It showed the start of the lesson cut off mid-sentence. It now shows whole sentences from the first paragraph, up to about 300 characters. A full stop inside an address such as 192.168.3.0 doesn't count as the end of a sentence. All 66 summaries end on a complete sentence.
- **An empty sandbox says what to do on the map.** The map was blank, and "No devices yet" sat in the console area. The map now says "Your network is empty. Add a device from the Build panel on the left" ("from the Build tab below" on a phone). The console says "No console yet. Each device you add gets a console here."
- **Tests.** A new browser test, `titles.spec.js`, checks that every incident row and every incident's workspace header starts with a capital and has no "Incident NN:" prefix, and that the Labs list numbers LAB, INC and CAP in Path order with no gaps. `sandbox.spec.js` checks the new empty-state wording on the map and in the console.



Nothing changes for learners. The tests now catch the kinds of mistakes that slipped through before.

- **Screenshots are strict.** Before, a screenshot passed if up to 1% of its pixels differed. Changing "56 lessons" to "66 lessons" on almost every screen passed all 102 screenshots. Measured on the CI machines:
  - a changed digit in a count alters 5 to 7 pixels at the default colour threshold;
  - screens that didn't change match to the pixel, run after run.

  Now:
  - at most 2 pixels may differ;
  - the exam clock is masked, the one thing that changes on purpose between runs;
  - a screenshot with no baseline fails in CI. Before, it was written fresh and passed.

  The proof: a scratch build that showed the lesson total in the sidebar as 56 failed 50 screenshots (every one with the desktop sidebar), along with `counts.spec.js`. Every other screenshot still matched.
- **"Full" screenshots show the whole screen.** The app scrolls inside its main panel, not the page, so the gallery's "full page" screenshot stopped at the first screenful. A changed number lower down went unseen: a scratch build that changed the gallery's lesson bar passed every screenshot. Full screenshots now grow the window until nothing scrolls. The gallery is 2,836 pixels tall at desktop width and 6,594 on a phone.
- **The palette screenshot is steady.** The test opened the palette by clicking the sidebar search box, which left a focus ring whose corners rendered differently between runs. It now opens the palette directly.
- **Baselines refreshed.** The "Update screenshot baselines" workflow refreshed the baselines with the new settings. The first pass updated 69: the screens that show a lesson count (the desktop sidebar, Home, Progress, the landing page and the gallery) and the exam screens, where the clock is now masked. A second pass after the gallery fix updated the six gallery baselines. The palette ones still matched.
- **No automatic retries.** CI used to rerun a failed browser test once, so a flaky test passed quietly. Now a failure is a failure. It found a second flaky test at once: "a reload resumes" in `exam.spec.js` started a random exam and typed `enable`, so when the exam happened to pick a lab with an enable password, the console stopped at "Password:". The test now starts a fixed exam (seed "resume"). Starting an exam from the screen is still covered by the test before it.
- **Totals are checked against the data.** A new browser test, `counts.spec.js`, reads the number of labs (and of builds, incidents and capstones), lessons and quiz questions from the page's own data. It checks every place that shows them: the sidebar, Home, Progress, Practice, the quiz, the lesson groups, the landing page, and the page description and share tags (which are still typed by hand until phase 8). It has no numbers typed in. A scratch build with "56 lessons" back in the page description fails it with a clear message.
- **The lesson checker rejects Markdown.** `tests/lessons.cjs` now fails a lesson containing a Markdown link `[text](url)`, bold `**` or a backtick, anywhere in its text, terms, exam notes, mistakes, quiz or story. The message names the field and says what to use instead. A new test, `tests/lessons-markdown.cjs`, proves it. It rebuilds the DNS lesson as it was first pasted (with the two links), adds bold and a backtick, and checks for exactly those four errors. It also checks that a clean copy passes. None of the 66 lessons had any of these.
- **The flaky console test is fixed.** "Fast pace finishes on its own; another command finishes it at once" failed once in Firefox during a full run. It couldn't be reproduced in 100 runs under heavy load. The cause is in the test: it had to catch the "Running…" state during the roughly 1.5 seconds a fast-paced ping lasts, against the real clock, and a slow moment could miss it. The test now freezes the page's clock while the ping plays (Playwright's `page.clock`), so the state can't end before it is checked. It then moves time on by hand to prove the ping also finishes by itself. It passed 30 of 30 in Firefox with the whole suite running alongside. The app was not changed.

Where this differs from the plan:

- The plan suggested starting from `maxDiffPixels: 40`. A changed digit alters only 5 to 7 pixels, so 40 would still let it through. The limit is 2.
- The plan didn't mention retries, the "write missing baselines" setting, or full screenshots stopping at the first screenful. All three hid failures, so all three are fixed.



Nothing changes for learners. This phase changes how a change reaches the live site.

Before this phase, a push to `main` went live at once, while the tests were still running, and nothing stopped a broken build. Now:

- **Changes reach `main` through pull requests**, and a pull request merges only when its checks pass.
- **The site deploys only after every test passes.** A new workflow, "Test and deploy" (`.github/workflows/deploy.yml`), has two jobs:
  - `browser` runs on every pull request and every push to `main`: the build check, every Node test (`tests/run-node.cjs`), a check that `lessons/` and `sitemap.xml` are up to date, and every browser test.
  - `deploy` publishes the site to GitHub Pages, only from `main` and only if `browser` passed. If a run fails, the live site stays as it was.
- **"Simulator regression checks"** (`lab-tests.yml`, job `labs`) keeps running the build check and the Node tests on every push to a branch and every pull request. Its browser job moved into `deploy.yml`, and it no longer runs on `main`, where "Test and deploy" covers everything.
- **Docs.** `docs/DEVELOPING.md` has a new section, "Shipping a change", on pull requests, the two checks, the deploy and how to roll back. The README's line about CI is updated.

**What the site serves.** The deploy publishes exactly these files, at the same addresses as before:

- `index.html`
- `og.png`
- `sitemap.xml`
- `lessons/`: the 66 lesson pages, `index.html`, `site.css` and `fonts/` (two `.woff2` files)
- `LICENSE` and `THIRD-PARTY-NOTICES.md`, for the code and the fonts

That covers every address in `sitemap.xml`, the share image every page points to, and every file the app and the lesson pages link to. Before, Pages served the whole repository, so files such as `README.md`, `docs/`, `src/` and `tests/` could also be opened on the site. Nothing links to them there, and they are no longer published. They stay on GitHub as before.

**Owner steps, in this order:**

1. Switch GitHub Pages to deploy from GitHub Actions. The live site keeps serving the current version until the next deploy:

   ```bash
   gh api -X PUT repos/yasukeblk/Lab4Net/pages -f build_type=workflow
   ```

2. Protect `main`: require a pull request (no approvals needed, since there is one maintainer), require the `labs` and `browser` checks, apply the rule to admins too, and block force pushes and deletion:

   ```bash
   gh api -X PUT repos/yasukeblk/Lab4Net/branches/main/protection --input - <<'EOF'
   {
     "required_status_checks": { "strict": false, "contexts": ["labs", "browser"] },
     "enforce_admins": true,
     "required_pull_request_reviews": { "required_approving_review_count": 0 },
     "restrictions": null,
     "allow_force_pushes": false,
     "allow_deletions": false
   }
   EOF
   ```

3. Merge this phase's pull request. The merge is the first deploy through the new workflow.

For an emergency fix while the checks are broken, an admin can turn off "Do not allow bypassing the above settings" for `main` in Settings › Branches, merge, and turn it back on.

**Where this differs from the plan:**

- The plan kept the browser tests for pull requests in `lab-tests.yml`. Instead they moved into `deploy.yml`, whose `browser` job runs on pull requests too. That way the exact job that guards the deploy is the one tested on every pull request, the browser suite doesn't run twice, and the job named `browser` is the required check.
- The plan's check was a hand run of the workflow on this branch. GitHub only allows hand runs of a workflow that already exists on `main`, so the pull request run of the same `browser` job is the check instead.
- `LICENSE` and `THIRD-PARTY-NOTICES.md` are published too. They were served before, and the fonts' licence asks for its notice to travel with the fonts.

## Lessons, batch 1: ten new topic lessons

Lab4Net now has 66 lessons (38 lab lessons and 28 topic lessons). The ten new ones are topic lessons, so they have no story on a lab map:

- Binary and the powers of two (1.6)
- Subnetting questions the exam asks (1.6)
- VLSM: subnets of different sizes (1.6)
- DNS: names to addresses (4.3)
- ARP and the journey of a packet (1.13, 3.2)
- The OSI and TCP/IP models (1.5, 1.13)
- IPv6 neighbor discovery (1.8, 1.9)
- Protecting the spanning tree (2.5)
- OSPF neighbor states and troubleshooting (3.4)
- Finding a fault step by step (1.4, 3.1)

What else changed with them:

- **Size budget.** `index.html` is now 1,590 KB, over the old 1,550 KB total. The total budget is raised to 1,900 KB and the gzipped budget from 570 KB to 700 KB, because lesson content is growing on purpose and more batches are planned. The budgets for the app code, CSS, fonts and markup are unchanged, so the interface itself still can't grow unnoticed.
- **Web pages.** Each new lesson has its own page under `lessons/`, and they are in the lessons index and `sitemap.xml`.
- **Slugs.** The ten new lesson slugs are added to `tests/fixtures/slugs.json`. No existing slug changed.
- **Counts.** Every "56 lessons" is now 66: the README, the developer and lesson-writing guides, the page description and share tags, the landing page, the share image (`og.png`, rebuilt), and the browser tests that count lessons.
- **Screenshot baselines.** None needed updating. The "Update screenshot baselines" workflow ran on this branch and all 102 screenshots still matched: the count changing from 56 to 66 is well inside the 1% pixel tolerance in `playwright.config.js`, so the baselines stay as they were.
- **One fix to the pasted text.** In the DNS lesson, `www.example.com` had arrived as a Markdown link, `[www.example.com](https://www.example.com)`, twice: once in the first section and once in the `nslookup` example. That was the chat turning the name into a link. It is back to plain `www.example.com`. Nothing else in the lessons was changed.

## CI after the merge

The redesign is merged into `main` and live, so the test setup now treats `main` as home.

- **The browser tests** run on every push to `main` and on every pull request. Before, they ran only on the `redesign` branch. The build check and the Node tests still run on every push.
- **The "Update screenshot baselines" workflow** is started by hand again (Actions › Update screenshot baselines › Run workflow). The `[baselines]` commit-message trigger is gone: it was only there because GitHub can't start a workflow by hand until it is on `main`.

## Redesign, phase 9: polish and release

The last phase: a phone and accessibility pass on every screen, the remaining tests, new docs, a new demo and screenshots.

- **Phones.** Every control on every screen is now at least 40 px tall on a phone: the panel tabs, the segmented choices (exam mode and time, tools, settings), the large buttons, the switches and the panel header buttons. No route scrolls sideways at 390 wide, including a running exam.
- **The sandbox on a phone.** The bottom bar now says "Build" (not "Tasks"), and the divider is called "Resize the Build panel".
- **Map bug fixed.** On a link too short for both port names, the two names were pushed past each other and ended up at the wrong ends. Router-on-a-stick and Incident 04 showed R1's port as `Gi0/1` and the switch's as `Gi0/0`. Such a name is now hidden until there is room (zoom in, in the sandbox). Hovering a device still lists its ports, and the screen-reader list still names both ends. Of the 77 lab maps, only that one link in those two labs is affected.
- **New tests.**
  - `themes.spec`: dark, light and system (with the computer set to either) on every route, each checked against the colours in `tokens.css`; "Console: always dark" in the light theme; the first paint already has the theme, its colours and Inter.
  - `motion.spec`: with reduced motion from the system or from Settings, no animation or transition runs in menus, dialogs, toasts or the palette; a real-time ping prints at once; no packet moves on the map and the result is still shown; a lesson story step is a still picture.
  - `a11y.spec` adds:
    - the keyboard-only run: open the palette, find a lab, finish it in the console, grade it with `Ctrl+Enter`, open its lesson and mark it read, answer a quiz question with the number keys, and change the theme, all from the keyboard;
    - the keyboard patterns of the pane divider, the tabs, a menu and a dialog;
    - the live regions for the trace line and the console output;
    - axe on a running exam, in both themes.
  - `phone.spec` adds the running exam to the sideways-scroll check, and a 40 px check of every control on every screen.
- **Docs.**
  - `README.md` is rewritten for the new app, with six screenshots in `docs/screens/`, the font credits and the new test commands.
  - `docs/DEVELOPING.md` is rewritten: file layout, build, size budget, the interface, storage and migration, testing, and the rules. The engine reference, the known limits and the roadmap are kept, because the engine has not changed.
  - `docs/LESSON-WRITING.md` now points at `src/data/lessons.js` and the lesson reader, and says 56 lessons.
  - The references to `docs/REVIEW-FIXES.md` that no longer apply (the old browser tests) are gone from the developer guide. The file itself and the history entries below stay as a record. Comments in the engine tests still mention it, because those tests are not edited.
- **Demo.** A new `docs/demo.gif` from the new app: Incident 07, where PC1's ping fails, R3's OSPF networks are moved from area 1 to area 0, the neighbours come up, the ping works and the grade is S. `tools/build-demo.cjs` records it with Playwright and ffmpeg, so it can be made again.
- **Size.** `index.html` is 1,524 KB of the 1,550 KB budget, 498 KB gzipped of 570.
- **Baselines.** The 102 screenshot baselines (17 screens, both themes, 1366, 1920 and 390 wide) were made by GitHub Actions on this branch and are committed in `tests/browser/__screenshots__/`. From now on CI compares against them.

Where the build differs from the plan:

- **Visual baselines.** The plan asks for final baselines. They are made on Linux, so GitHub Actions makes them with the "Update screenshot baselines" workflow and commits them to the branch. GitHub only lets a workflow be started by hand once it is on `main`, so a push to any other branch whose commit message contains `[baselines]` now starts it too.
- **Dialogs and Tab.** Dialogs use the browser's own modal dialog. The page behind it is inert, so Tab never reaches it, but after the last control Tab can move to the browser's own toolbar, as it does on any site. The test allows that.
- **The demo GIF** is 4.1 MB, against 3.2 MB for the old one. It is longer, because it shows the cause (`show ip ospf interface brief`) as well as the fix.

### How to roll back

If the redesign has to come off the live site after the merge:

1. Revert the merge commit on `main` (`git revert -m 1 <merge commit>`) and push. GitHub Pages serves the old app again within a few minutes. The tag `v1-arcade` marks the same code.
2. Nobody loses progress. The new app wrote only its own keys (`lab4net:v2` and the keys under it). It never changed or deleted the old app's keys, so the old app finds everything as it was before the redesign. Progress made in the new app stays in its keys, ready for when the redesign comes back.
3. The lesson pages (`lessons/`) and `sitemap.xml` come back with the revert, and their addresses never changed, so shared links keep working.

## Redesign, phase 8: the sandbox

Free build is back, inside the same workspace as the labs.

- **The Build panel** takes the Tasks panel's place:
  - add a device (Router, Router with 5 ports, Switch, Switch with 24 ports, Layer 3 switch, PC, Server);
  - the tools (Select, Cable, Note, Delete);
  - Undo and Redo;
  - the four goals (the old "challenges") with a check as each is met;
  - the four starter kits;
  - Save to file, Load from file and Clear all.
- **The map** is a larger canvas (1600 by 660) with zoom (`−`, `+`, Fit) and pan (drag the background, or the arrow keys while the map has focus). Devices can be dragged. Cabling asks which port on each end in a small menu, and ports already in use are marked. Delete removes a device, a cable or a note. Notes are plain text on the map.
- **The console** is the same component as in the labs, with the "Why" line.
- **Undo** keeps 80 steps of the build and its commands. `Ctrl+Z` is undo only outside the console. Inside the console it is still IOS `end`, as before. `Ctrl+Shift+Z` redoes. After undo or redo, focus stays on the map.
- **Limits.** At most 20 devices. Reaching the limit says so in words: "The sandbox holds up to 20 devices. Delete one to add another."
- **Files.** Save writes `lab4net-sandbox.json`. Load checks a file field by field before use:
  - names, device types, positions and limits;
  - cables (both ends real devices, ports in the right form and used once);
  - notes (`<` and `>` removed);
  - commands (one line, under 512 characters, on a device that exists).

  It also checks that the network builds and the commands replay. Anything that does not fit is refused, with the reason in a toast. A file carries data only. The old app's sandbox files (`def` and `journal`) still load.
- **Goals.** Starting a goal loads its starter kit. A goal met shows a check and one toast, nothing more.
- **Storage.** The build lives in `lab4net:v2:sandbox` and travels in backups. As the plan says, old sandbox builds are not imported. The old key stays where it is.
- **Data.** The starter kits and the goal checks are content, so they live in `src/data/sandbox.js` beside the quiz and the stages.
- **Bug fixed while testing.** When the build changed, the closing workspace could save its old command list over the new build. A generation counter now stops that.
- **Tests.** `sandbox.spec`:
  - build two PCs and a switch with real clicks (cabling through the port menu), address them, ping across and see the reply and the marker on the map;
  - undo and redo each step, with buttons and keys;
  - `Ctrl+Z` in the console is IOS `end`;
  - save, clear and load give the same network and commands;
  - doctored files (a markup name, a missing port, 21 devices, the wrong format) are refused, and markup in notes and commands runs nothing;
  - the 20-device limit;
  - each of the four goals can be met.

  `visual.spec` adds the sandbox with a small network. 418 browser tests pass.

Where the build differs from the plan:

- **Renaming devices** (in the old right-click menu) is left out. The plan's Build panel does not list it, and a device's name is its console tab and its key on the map.
- **A structural change** (a device or a cable added or removed, a kit, a file) rebuilds the network, so the workspace redraws for it. Commands, dragging, zoom and pan never redraw.

## Redesign, phase 7: practice and progress

- **Practice.** One page with three cards and their numbers: Exam (the last result and how many passed), Quiz (correct out of 110) and Subnetting (fields right on the first try).
- **Exam.** A setup page with the mode (Fault-find, Build, Incident or Today's) and the time (10, 20 or 30 minutes), then "Start exam". The exam runs in the lab workspace with the mode and a clock in the top bar. Under two minutes the clock turns amber and gains a clock icon. There is no help: step-by-step, "why", the walkthrough, clues, the Commands tab, the lesson link and the "Why" line under the console are not in the page at all. Grade shows only "2 of 5 checks pass" until the exam ends. The end shows, in the Tasks panel, passed or not, the grade, the time used, every check and the faults that were hidden. The menu has "Give up". History keeps the last 40 exams (date, mode, lab, result, grade, time).
- **Exam rules, carried over from the old app.**
  - Faults come from the simulator's own fault generators: one or two for fault-find, two for Today's, three (or two) for a stage check.
  - Today's exam is seeded by the date, so it is the same for everyone that day.
  - The clock is the wall clock. An exam whose time ran out while it was not open is graded from its saved commands, on the next load or as soon as the time is up.
  - Only one exam runs at a time.
  - An exam never changes a lab's own progress, grade or saved work.
- **The lock.** While an exam runs, other labs, lessons, the quiz, the subnetting drill and the sandbox wait. Trying one shows a toast with "Resume exam" and "Give up", not a dialog. Home's Continue card becomes the exam, with its clock.
- **Stage checks.** On the Labs list, a stage's check starts here: a fault-find exam on that stage's labs (or three faults for the last stage), with the stage's own time. A passed check shows on the list and on Progress.
- **Exam storage.** An exam is rebuilt from its seed, so storage keeps only the mode, seed, clock and the commands typed. No fault commands are ever stored or imported. Exam history travels in backups and is merged by date.
- **Quiz.** A topic filter (the eight quiz domains) and "Only missed or unanswered". One question at a time, with the four options in the old order. Keys `1` to `4` pick and `Enter` checks, then goes to the next. A thin bar shows your place, and the score per topic is at the side. Answers are saved by question index, as before.
- **Subnetting.** Three ranges (Mixed /8 to /30, Warm-up /24 to /26, Small networks /27 to /30). A large address and prefix, then six fields. "Check" marks each with an icon and gives the right answer for wrong ones, then the worked reason by the block method (the old drill's words). Only the first check of each question counts.
- **Progress.** The summary (labs, lessons, quiz, exams passed). Exam topics, as a table of the six domains (weight, labs done, lessons read, coverage), where each row expands to its objectives with their labs and lessons as links. The Path, with each stage's bar and stage-check result. Grades as five small numbers. Exam history. The last ten labs and lessons finished, with dates (lessons now record when they were read). No streaks, points or badges.
- **Palette.** Practice: Start exam…, Today's exam, Resume exam (while one runs), Start quiz, Subnetting drill.
- **Size.** The budget broke here (CSS 70.3 of 70 KB, app JavaScript 296 of 300 KB). As the plan's risk 12 allows, the build now leaves out the app's own full-line comments and CSS comments. The code itself is unchanged and readable; the comments stay in `src/`. The simulator and data are never touched (the engine hash still matches). The file is now 1,495 KB (490 KB gzipped).
- **Bug fixed.** The exam clock ran in the pop-out window, which has no store, and threw an error every second there. Found by the security test.
- **Tests.** `node tests/exam.cjs`, `node tests/quiz.cjs` and `node tests/campaign.cjs` pass untouched. New browser tests:
  - `exam.spec`: each mode starts, with help absent from the page; the same seed gives the same faults; Today's is the same on two fresh profiles; fixing the faults passes and leaves the base lab untouched; a reload resumes; a second exam cannot start; labs, lessons and practice are locked with the toast; time running out grades and records, open or not; a stage check starts from the Labs list and shows as passed.
  - `quiz.spec`: answers saved by index; keys; filters; Progress numbers equal the store for a seeded profile.
  - `subnet.spec`: marks, the first check counting once, ranges.
  - `visual.spec`: Practice, a quiz answered, an exam running and Progress.

  404 browser tests pass.

Where the build differs from the plan:

- **A running exam has its own address**, `#/practice/exam/run`, so a reload comes back to it. `#/practice/exam` shows Resume and Give up while one runs.
- **Help during an exam is removed from the page, not hidden** (the plan's acceptance asks for it to be absent from the DOM).

## Redesign, phase 6: lessons, in the app and on the web

- **Lessons list.** The same list-and-detail layout as Labs. It is grouped by exam topic (the six domains) or by type (lab lessons, topic lessons). Each row shows whether you have read it, the minutes, objective chips and your quick-check score ("3/4"). The detail pane shows the minutes, objectives with names, the opening of the first section, "Read" and "Open the lab". The top bar links to "These lessons are also on the web".
- **Lesson reader.** A 680 px reading column at 16 px, with "On this page" at the right from 1280 px. The top bar shows the minutes, a read chip and "Practise in the lab". The content runs: title and objectives, the sections, "See it happen", key terms, exam notes and common mistakes, the quick check, then previous and next. `N` and `P` move between sections.
- **See it happen.** The lab's own map, drawn by the same map component as the workspace, steps through the lesson's story with Previous and Next. Each step sends the packet along its path (a hollow dot for a reply) and marks where it ends, with the label in green or red. With reduced motion each step is a still picture.
- **Quick check.** Four options per question in the same fixed shuffled order as before (the old app's stable shuffle, copied exactly). Picking one shows right or wrong in words and the explanation. Answers are saved by question index, as before.
- **Read.** A lesson is marked read when you reach the end of its sections, or press "Mark as read". It counts in the sidebar, on Home and in the list.
- **The lesson banner in labs.** The first time a build lab with a lesson opens, a one-line banner says "Read the lesson first (8 min)", with "Open lesson" and "Skip". It does not block the lab and does not come back.
- **Palette.** "Open lesson: …" for all 56 lessons.
- **The lesson web pages** (`lessons/`, made by `tools/build-site.cjs`) are redesigned to match. Each page has a slim header (the mark, "Lab4Net", "Lessons", "Open the app"), a 680 px reading column, and the lab's network drawn with the app's device icons. Then come the sections, the story steps as a numbered list, key terms, exam notes, mistakes, the quick check with answers behind "Show the answer", a "Practise it" button, previous and next, and the footer with the trademark notice. The index groups lessons by CCNA domain as list rows. The theme follows the visitor's system setting through `prefers-color-scheme`. There is no theme button, because the only script is the visit counter. The colours come from `src/styles/tokens.css` and the fonts are the app's own (`lessons/fonts/`). File names, titles, descriptions, canonical links, share tags and structured data are unchanged.
- **Share image.** A new `og.png` (1200 by 630): dark background, the mark and wordmark, "Learn the CCNA by doing it.", and a real photograph of the lab workspace after a successful ping. It is made by `tools/build-og.cjs` from `tools/og.html` with Playwright, and the PNG is committed. The app's description and share text no longer mention the campaign; they now say "56 lessons, practice exams and a sandbox".
- **Tests.** `node tests/lessons.cjs` and `node tests/sitepages.cjs` pass unchanged, so no edits to them were needed. The set of file names in `lessons/` is the same as on `main`. New browser tests:
  - `lessons.spec`: all 56 lessons open in the reader; reaching the end marks one read; Mark as read; quick-check answers saved by index; story steps with and without reduced motion; grouping; `N` and `P`; the lab banner.
  - `lessonpages.spec`: the same page set as on `main`; one `h1` per page; no script but the counter; no sideways scroll at 390 wide; the right colours in both colour schemes; links into the app open the right lab and lesson.
  - `visual.spec` gains the lesson reader and a lesson web page in both schemes.

  368 browser tests pass.

Where the build differs from the plan:

- **Lesson titles.** In the app the lesson's own name is its title ("How to tell a router about distant networks"), as the old app showed it. The web pages keep the lab title as the `h1` (with the name under it), as they always had, so their titles and search listings do not change.
- **The CSS budget is nearly used** (68 of 70 KB). Phases 7 and 8 reuse existing classes; Phase 9 checks the budget.

## Redesign, phase 5: Home, the Labs list, your old progress, backups and the landing page

A returning user now lands in the new app with their history.

- **Home.** One column: Continue (the lab you touched last, with "4 of 9 tasks" and Resume), or for a new user a "Start here" card with the first lab and three lines (read the tasks, type commands, press Grade). Then Next up (the next three labs on the Path that are not done), Progress (labs, lessons and quiz, with thin bars), Exam topics (the six CCNA domains with their exam weight and a coverage bar) and Practice (Today's exam, Quiz, Subnetting).
- **Labs list.** Grouped by Path (the default: the eight stages in order, each with its count and a thin bar, ending in a "Stage check" row), by Type, or by Exam topic. Filters for text (`/`), status and type combine. The text matches titles, IDs, briefs, groups, objective numbers (such as `3.4`) and objective names. Rows show a status icon, an ID (`LAB-01`, `INC-07`, `CAP-01`), the title (incidents without their "Incident 07:" prefix), up to two objective chips, the grade and the ticked tasks. From 1280 px wide a detail pane shows the brief, objectives with their names, the task and device count, a small still map, the grade, the lesson link, "Open lab" and "Reset". Narrower, a row opens the lab directly. `J`/`K` or the arrows move and `Enter` opens. An empty result says "No labs match." with "Clear filters".
- **Stage checks.** The Path shows each stage's check with its story in the detail pane (the outro once complete). An incident check opens that incident and counts as passed when it is done. A stage with `need` says how many labs unlock it. Exam-based checks start with the exam in Phase 7.
- **Palette.** "Open lab: …" for all 77 labs, matching group, objective number and name. Data: "Export backup" and "Import backup".
- **Your old progress.** On the first load of the new app (when `lab4net:v2` does not exist), `core/migrate.js` reads the old keys once:
  - finished labs (`ccna-bench-v2` and `cleared`);
  - grades;
  - quiz answers, dropping the nine rewritten questions for old answer sets;
  - the subnetting score;
  - lessons read with their quick-check answers;
  - saved work (kept only if it still replays on the lab);
  - the last lab;
  - revealed clues;
  - the capstone guide choice;
  - whether the old title screen was seen.

  Old data is checked exactly like a backup. `Exam · …` titles are skipped. **The old keys are never deleted**, so a rollback still finds them. One toast says what was carried over ("Your progress was carried over: 23 labs and 12 lessons."), once.
- **Plain matching.** Search and filters only match loosely on titles. Keywords and briefs need the word itself, so "ospf" no longer matches a lab whose brief happens to contain those letters in order.
- **Settings › Data.** Export backup downloads `lab4net-backup.json` (version 2: the main key, saved work and the sandbox). Import backup reads version 2 files and the old app's version 1 files, says what it will add in a confirm dialog, and merges: finished labs and the better grade are kept, and saved work is replaced only for labs in the file. The checked result waits in `lab4net:v2:pending` until you press "Reload now". It never reloads by itself. As a second line of defence, `<` and `>` are stripped from every imported string that is not a console command. Files over 5 MB are refused. Reset everything asks first.
- **Old links.** `?lab=<slug>` and `?lesson=<slug>` go to the new routes, skip the landing section and are removed from the address bar. An unknown slug lands on the list with "That link is out of date."
- **Landing section.** Static HTML at the top of the page, so search engines and link previews can read it. It has the mark, "Learn the CCNA by doing it.", one paragraph, Start with links to the free lessons and the source, a drawn still of the workspace, five facts, three feature blocks with live counts, and the footer (storage, the counter sentence on the public site only, the Cisco notice, the licence). It shows only on a first visit with no deep link, or with `?welcome`, decided before the first paint. Start (or `Esc`) remembers it and goes Home. Settings › About has "Show the landing page again".
- **Counter and donate link.** `site.js` sends one cookieless page view on the public site only, never with Do Not Track, and a `start` event when Start is pressed. The donate link is a normal link opened in a new tab.
- **Focus rings.** Headings that take focus when a screen opens no longer show a ring.
- **New tests.** Node: `tests/migrate.cjs` (old storage becomes the expected new state; bad values dropped; `Exam · …` skipped; old keys untouched; version 1 and 2 backups; merging) and `tests/validate.cjs` (every stored shape, good and bad, no prototype pollution). Both are in GitHub Actions. Browser:
  - `deeplinks.spec`;
  - `firstrun.spec` (a browser seeded with the old keys shows the same finished labs, grades, read lessons and saved work, the toast once, and keeps the old keys);
  - `offline.spec` (no requests from a file, none to other hosts from a server, exactly one count on the public host name and none with Do Not Track);
  - `labs.spec` (the list keyboard, combined filters, the empty state, grouping, the palette);
  - `security.spec`'s backup and storage part (doctored version 1 and 2 backups and doctored storage, then every screen);
  - visual states for the landing page, Home with progress, and the Labs list.

  All 344 browser tests and 20 Node tests pass.

Where the build differs from the plan:

- **The old `lastLab`** was a list position, not a title. It is mapped to the lab at that position.
- **A fresh browser** (no old keys) records `migrated: {from: 'none'}`. "Reset everything" records `from: 'reset'`, so the old keys are not imported again after a reset.
- **Stage checks that are exams** show in the list now but start in Phase 7, with the exam.
- **The paste test** uses a paste event in Chromium and WebKit and a real clipboard only in Firefox. The real clipboard is shared by test runs going in parallel.
- **Size.** The file is 1,462 KB (485 KB gzipped) against the 1,550 KB budget, with three phases to go. The remaining screens are written compactly. Phase 9 checks the budget.

## Redesign, phase 4: step-by-step, clues, grades and the pop-out

The workspace is complete.

- **Step-by-step.** A switch in the Tasks panel (and "Toggle step-by-step" in the palette). With it on, each task shows its commands grouped by device ("On R1"), each with the prompt it runs at. Clicking a step selects that device's console and puts the command in the input; it does not run it. A step starting with `#` is a note, shown as text. Capstones open with step-by-step off, and the choice is remembered per capstone. For other labs the switch also sets "Start labs with step-by-step on" in Settings, as the old guide switch was remembered.
- **Walkthrough.** "Show walkthrough" in the lab menu (and the palette) adds every device's commands with the reason for each at the end of the Tasks panel. It lowers the grade, as before.
- **Clues** (incidents). "Reveal clue 1 of 3", with a note that each costs 5 points. Clues are labelled Direction, Evidence and Repair, as before. Resetting the lab hides them again.
- **Commands tab.** Beside Tasks: a search box, an "All modes" switch, and every command the selected device supports in its current mode, each with its explanation. A click puts it in the console input. It follows the device and mode as you work.
- **Grades.** The grade is worked out exactly as in section 2 and the old rank rules, and stored per lab (the best is kept). As before, a grade is only awarded for a run that started from a fresh lab. Turning on step-by-step, opening the walkthrough and revealing clues are counted the moment they happen.
- **First run.** The first time a lab opens, the Tasks panel shows one callout: "New here? Turn on step-by-step to see the commands for each task." It has a "Got it" button and never comes back.
- **Pop out.** "Pop out tasks" in the lab menu (and the palette) opens the Tasks panel in its own 420 by 760 window (`index.html?panel=tasks`), for two monitors. The workspace then shows a strip saying "Open in the other window", with a Dock button. The pop-out shows the brief, address plan, step-by-step, tasks, steps, clues and results, and follows the main window when you change labs. A step clicked in the pop-out goes into the main console's input. Ticks, the step-by-step switch and clues work from either window. If the pop-out closes or goes quiet for 9 seconds, the panel docks itself. After the main window reloads, an open pop-out reconnects within 3 seconds. The pop-out is not offered from a local file or on phones.
- **Pop-out security.** The main window owns all state and storage. The pop-out stores nothing (a test checks its storage stays empty) and draws only what it is sent. The two talk over a `BroadcastChannel`. Every message is checked on its first line for the same origin, then for a known type and the right shape. Messages carry data only: the pop-out renders lab text from its own copy of the lab data, looked up by slug, so it never receives HTML. A step from the pop-out is accepted only if it is one of that lab's steps. Nothing listens for `postMessage` at all.
- **Map labels.** Link marks and port names are now pushed along each link until they clear the device's icon and label, so a switch with many links fanning out no longer has port names over its hostname.
- **New tests.** `guide.spec` finishes five labs (two build labs, OSPF, an incident and a capstone) by clicking every step row and pressing Enter. It also checks the capstone memory and the grade table: a clean run with a check command gives S; none gives A; extra show and ping commands never lower it; the guide, the walkthrough, clues and typos each lower it by the right amount; the best grade is kept. `popout.spec` covers opening, stepping to the console, ticking, changing lab, reconnecting after a reload, closing (it docks) and the Dock button, and that a local file does not offer it. `security.spec` gains its message part: a hostile site that opens the app or the pop-out and posts messages cannot inject markup, type into the console or pose as the pop-out; channel messages with wrong types, huge strings, extra fields or commands that are not steps are ignored. 308 browser tests pass.

Where the build differs from the plan:

- **`Alt+S`** for step-by-step was dropped in Phase 1 (Firefox's History menu). The switch and the palette command remain.
- **A hostile site can open the real pop-out page.** Being our own same-origin page, it can connect to an open lab, as a pop-out opened after a reload must. It still shows only what the main window sends, and the hostile site can neither script it nor send it anything.

## Redesign, phase 3: the network map and the panes

The map is real again, and the workspace panes resize, collapse and remember their sizes.

- **The map.** One SVG, built once per lab. Every device and link is created once and kept by key, and a command only changes attributes and classes. That removes the old hover flicker and lost focus (a test checks the elements are the same after 20 commands).
- **Devices.** The new device icons at 36 px, with the hostname under each. The selected device has an accent ring. Click, `Enter` or `Space` opens its console, and the arrow keys move between devices by position.
- **Links.** Up links are a thin line with a green dot at each end. Down links are dashed red with hollow rings, so shape changes as well as colour. Port names sit beside each end, unless the lab hides them. An err-disabled port shows a warning glyph. A port spanning tree blocks shows a short bar ("Blocked by spanning tree", with the VLANs). Parallel links are drawn 12 px apart.
- **Tooltips.** Hovering anywhere on a device (icon, label or the space between) shows its hostname and kind, each interface with its state and address, and one more line (routes, VLANs or default gateway). It appears after 120 ms and hides 80 ms after you leave. It never sits under the pointer or over its device. Keyboard focus shows it too, and `Esc` hides it. Every value is text.
- **Packets.** Ping, traceroute, Telnet and SSH animate along the real path: a solid dot for the request, a hollow dot for the reply, and each link highlighted as it is crossed. ARP broadcasts and unknown-address floods fan out along every edge, stopping at a bar on a blocked port. Highlights fade 1.5 s after the run. A new command cancels the animation at once. With reduced motion no dot moves: the path lights up in one step.
- **Markers.** Success puts a green check on the source device. Failure puts a red cross on the device where the packet stopped, with the reason in words beside it ("Blocked by ACL", "No route from here", "Reply has no route back", "Port closed"). Markers stay until the next command.
- **Trace strip.** One line under the map: the result, the path ("stopped at R1" for a failure), Details and Replay. Details shows the request and reply paths, a plain explanation and, for switched networks, what each switch did, with the `show mac address-table` tip after a flood. It is read out to screen readers.
- **Screen readers.** The map is labelled ("Network map: 5 devices, 4 links"), each device is a button with its state, and a hidden list describes every link ("R1 Gi0/1 to R2 Gi0/0, down.") and updates when one changes.
- **Panes.** Two dividers you can drag, or focus and move with the arrow keys (16 px a step; `Home` and `End` for the limits; double-click or `Enter` resets). Tasks stays between 280 and 520 px and never squeezes the console under 80 columns. The map stays at least 160 px tall and the console at least 200. Sizes are saved as fractions, per layout.
- **Collapse and maximise.** Tasks collapses to a 36 px strip with its count ("0/5"). The map collapses to its header and the trace strip stays. "Maximise" on the console collapses the map, and again restores it. All of this is saved.
- **Side by side.** From 1600 px wide, the lab menu offers "Layout: side by side" (Tasks, Map and Console as three columns). Stacked stays the default.
- **Phones.** One pane at a time, switched by a bottom bar (Tasks, Map, Console). The console has helper keys under the input (`Tab`, `?`, `↑`, `↓`, `Ctrl+C`, `Ctrl+Z`) and output wraps. A ping shows a one-line result above the input with "View on map". Buttons and tabs are 40 px tall. Nothing scrolls sideways.
- **Palette.** New lab commands: Replay last packet, Collapse or expand the Tasks panel or the map, Maximise the console, Reset panel sizes, and the layout switch.
- **Tests.** `map.spec` (Chromium, Firefox and WebKit) covers clicking and `Enter` on devices; the hover test (icon to label and back in 2 px steps: the tooltip shows once, never hides and is never under the pointer); the same DOM nodes after 20 commands; success and failure markers; a link shut at both ends; reduced motion; dividers with the pointer and the keyboard, their limits and surviving a reload; collapse and maximise; 80 console columns at 1366 by 768; and the side-by-side layout. `phone.spec` covers no sideways scroll on every route, the drawer, the pane bar, the helper keys, the ping result bar and 40 px targets. `visual.spec` adds the workspace default, after a failed ping, and with Tasks collapsed. 285 browser tests pass.

Where the build differs from the plan:

- **Map scaling.** The plan fits the map with `viewBox` and `preserveAspectRatio`. The map instead fits the lab's positions into the pane's own pixels, so icons stay exactly 36 px and labels 12 px at every pane size, as the plan asks. A resize only moves elements; nothing is rebuilt.
- **Port names** use the simulator's own short form (`Gi0/1`, `Fa0/2`), the same as `show` output, rather than `G0/1`.
- **`Alt+1` to `Alt+3`** were dropped in Phase 1. A collapsed Tasks panel opens from its strip, `F6`, or the palette.
- **Map tooltip and pane data** come from two new bridge functions, `sim.links` and `sim.describe`. Screens still never call the simulator directly.

## Redesign, phase 2: the console and the lab workspace

Labs open again: `#/labs/<lab>` shows the new workspace with the Tasks panel on the left and the map and console on the right. Every lab can be finished and graded from the console.

- **The bridge to the simulator.** All engine calls go through `src/app/core/sim.js`. Screens never call the simulator directly. The engine itself is unchanged (its hash still matches).
- **The console.** One tab per device with its icon and a link-state dot. A mode chip ("Privileged EXEC", "Interface configuration", "Host console", "Answer"), Clear, and the prompt and input on one line, as on a real terminal. Output keeps the last 2,000 lines per device, and every line is plain text. Colours: errors and the `^` marker red, warnings amber, success green, log messages dim. Under the console, the "Why" line explains the last command. Otherwise it shows the key hints.
- **Console keys.** `?` lists the choices at once, without Enter. `Tab` completes a word when exactly one fits and never leaves the input. `Esc` leaves the input, and screen readers are told this once. `↑`/`↓` and `Ctrl+P` walk the history per device. `Ctrl+A`/`Ctrl+E` jump to the start or end, `Ctrl+U` clears the line, `Ctrl+L` clears the screen and `Ctrl+Z` is IOS `end`. `Ctrl+C` or `Ctrl+Shift+6` stops a running ping or traceroute.
- **Live output.** Ping and traceroute play at the speed set in Settings: Real time, Fast (the old 40%, the default) or Instant. Reduce motion makes it instant. Running another command finishes the current output at once, so nothing is lost or reordered.
- **Pasting** several lines runs them one at a time, in order, up to 200 lines. The old app asked first in a dialog; the plan says run them.
- **Passwords** are typed into a password field, never echoed, and kept out of the history, both live and on replay.
- **Saved work** lives in its own key, `lab4net:v2:work`, and is replayed onto a fresh network at the times it was typed. A saved lab that does not fit opens fresh with a toast. Leaving a lab saves it first.
- **Grade.** The Grade button (and `Ctrl/Cmd+Enter` from anywhere in the lab) runs every check. Results show in the Tasks panel with a pass or fail icon and word for each check, plus one toast. A finished incident shows its root cause, and there is a "Next lab" button. Typing after grading greys the results with "Commands run since grading. Grade again."
- **Grades.** `src/app/core/grade.js` holds the old rank rules exactly. As in the old app, a grade is awarded only for a run that started from a fresh lab. The new Node test `tests/grade.cjs` checks a table of runs.
- **Tasks panel (first part).** The brief with objective chips, the incident note, the address plan, the task list with your own tick boxes (grading ignores them) and "Why" for each task, then the results.
- **Map (placeholder).** The devices as buttons, so a console can be picked. Phase 3 draws the real map.
- **Lab shortcuts.** `Alt+.` and `Alt+,` switch device consoles, and `F6`/`Shift+F6` move between the panes. The palette gains "In a lab" commands: Grade, Reset, Focus console/map/tasks, Clear console, Open this lab's lesson, and Switch to each device.
- **The test hook** `window.L4N.test` (`openLab`, `exec`, `grade`, `state`) goes through the same code as pressing Enter and clicking Grade.
- **New browser tests.** `labs-all.spec` opens all 77 labs, runs each solution through the console path, presses the real Grade button, checks every check passes and the lab is marked done, then reloads and checks again. `console.spec` covers the console list from the plan in Chromium, Firefox and WebKit. `security.spec` covers its console part: markup typed into router and PC consoles (banner, description, `ip host`, username, raw commands, ping, tracert, telnet and ssh targets) stays text. 233 browser tests pass.
- **Build.** `tools/build.cjs` retries for a moment if Windows is holding `index.html` open.

Where the build differs from the plan:

- **`Ctrl+N`** is bound for "next command", but Chrome and Edge keep `Ctrl+N` for a new window and never pass it to a page. `↓` always works.
- **Pasting** in tests uses a real keyboard copy and paste. Firefox empties the clipboard data of a pasted event made by a script.
- **A hostname with spaces** (such as the security probe) is refused by the simulator, as IOS refuses it. The probe still reaches the console through banners, descriptions and raw commands.

## Redesign, phase 1: the new look and the app shell

The branch is now the new app. The old interface is gone; the simulator, labs, lessons and data are unchanged (the engine hash still matches).

- **Design system.** Every colour, size, radius, shadow and duration is a token in `src/styles/tokens.css`, from the plan. Dark is the default; light is a full theme of its own. One blue accent, green for works, red for failed, amber for warning.
- **Fonts.** Inter (the variable latin file, 48 KB, under the plan's 90 KB limit, so one file covers every weight) and JetBrains Mono Regular, taken once from the Fontsource npm packages (5.3.0) and committed to `src/fonts/`. Both are SIL OFL 1.1; `THIRD-PARTY-NOTICES.md` now lists them instead of Barlow Condensed, VT323 and IBM Plex Sans. Tabular numbers survive the subset (checked in a browser: with them on, "1111" and "8888" are the same width) and are used for counts and tables.
- **Icons.** Two sprites drawn for Lab4Net: 57 interface icons (16 px, 1.5 px stroke) and 7 map devices (router, switch, Layer 3 switch, PC, server, IP phone, access point). New logo mark and favicon: a blue tile with a cable between two devices and a packet on it.
- **Components.** Buttons, inputs, switches, checkboxes, segmented controls, chips, key chips, tabs, lists, tables, dialogs, toasts, tooltips, menus, empty states, progress bars, divider handles, callouts and command rows. All of them are on `#/dev/components` in both themes side by side.
- **App shell.** The sidebar (collapses to an icon rail with `[`; a drawer on phones), the top bar with breadcrumbs, the hash router, the command palette (`Ctrl/Cmd+K`: navigation, theme, console colours, sidebar, help), the shortcut list (`?`), `G` then a letter to move between screens, toasts and a screen-name announcement for screen readers.
- **Settings.** Appearance (theme, reduce motion, sidebar in labs), Console (colours, output speed, step-by-step default) and About. Settings are saved in the new `lab4net:v2` key, checked field by field when read. The theme is applied before the first paint, so there is no flash.
- **Placeholders.** Every other route shows a proper empty state until its phase rebuilds it.
- **Lesson pages.** `tools/build-site.cjs` now takes its fonts from `src/fonts/` and its colours from `src/styles/tokens.css` (the smallest change, so the pages keep working until Phase 6 redesigns them). The old font files in `lessons/fonts/` are replaced.
- **Browser tests.** Playwright 1.64.1 and axe-core are pinned as test-only dev dependencies. New `tests/browser/`: `shell.spec` (routes from a server and from a file, titles, sidebar, palette, every shortcut, keyboard-only use with visible focus, theme, reduced motion; Chromium, Firefox and WebKit), `a11y.spec` (axe on every route and the palette in both themes: zero violations) and `visual.spec` (gallery, Home, Settings and the palette at 1366×768, 1920×1080 and 390×844 in both themes). GitHub Actions runs them on the `redesign` branch and on pull requests. Screenshot baselines are compared on Linux in CI only; the new manual workflow "Update screenshot baselines" makes and commits them.
- **Old browser tests removed.** `ui.cjs`, `guidewin.cjs`, `pageflows.cjs`, `landing.cjs` and `security.cjs` drove the old interface. Their scenarios come back as Playwright specs in Phases 2 to 5, as the plan says.
- **`tests/build.cjs`** also checks that no old font, colour or class name (`VT323`, `Barlow`, `Plex`, `--yel`, `--mag`, `skewX`) is left in the app.

Where the build differs from the plan:

- **Alt shortcuts (risk 14).** `Alt+1`, `Alt+2` and `Alt+3` switch tabs in Chrome and Firefox on Linux, and `Alt+S` opens Firefox's History menu on Windows and Linux. Those are dropped; their actions stay in the palette, and `F6` moves between lab panes. `Alt+.` and `Alt+,` have no known clash and stay. Shortcuts match the physical key, so they work on a Mac, where Option changes the typed character. A test checks that all three engines report them correctly. A browser's own menu shortcuts cannot be seen from a test, so the clash list comes from the browsers' documented shortcuts.
- **The lesson pages still use their old class and variable names** (`--yel`, `--mag` and so on) inside `tools/build-site.cjs`, now filled with the new colours. Phase 6 rewrites them. The app itself has none of the old names.
- **Settings › Console and Reduce motion** arrive now rather than later, because they are only settings.
- **Sidebar in labs** is stored as `auto` (collapse below 1600 px, the default) or `open`.


## Redesign, phase 0: the source is split into files, with a build

Nothing you can see has changed. The built `index.html` is byte-for-byte the same as `main`'s (tag `v1-arcade`, commit `3f158d6`).

- **Source files.** The app is now edited in `src/` and built into the one `index.html` by `node tools/build.cjs`. The simulator is in `src/engine/` (15 files, cut at its own section comments, order kept). The quiz, the stages, the lessons and the extra objective names are in `src/data/`. The old interface, stylesheet, fonts and page markup are in `src/legacy/` until the new design replaces them.
- **Fonts are files now.** The five fonts are `.woff2` files in `src/legacy/fonts/`. The build turns them back into the embedded font lines, so no source file holds base64 font data any more.
- **The build.** `src/manifest.json` lists the files in order. `node tools/build.cjs --check` fails if the committed `index.html` is not what `src/` builds. The build prints a size table and fails if the size budget is broken. It uses Node only, no packages, and gives the same bytes every time.
- **New tests.** `tests/build.cjs` checks the build is up to date, every marker the other tests rely on is there once, the simulator block is unchanged (its SHA-256 is in `tests/fixtures/engine.sha256`), and the size budget holds. `tests/slugs.cjs` checks every lab and lesson slug is unique and matches the frozen list in `tests/fixtures/slugs.json`. Both run in GitHub Actions, with the build check. `npm test` (or `node tests/run-node.cjs`) runs every Node test.
- **Line endings.** A new `.gitattributes` keeps text files LF on every system, so the build gives the same bytes on Windows too.
- **Old name fixed.** `install-lxc.sh` and `docker-compose.yml` said "CCNA Lab Bench"; they now say "Lab4Net". The Docker service and container are now called `lab4net`, so an existing `docker compose` setup starts a new container under the new name (stop the old `ccna-lab-bench` container by hand).
- **Baseline.** Before anything changed, all 15 Node tests in the workflow passed on `main`.

Where the repo and the redesign plan differ (the repo wins):

- The plan says the interface JavaScript is 215 KB. Measured by the build, the old interface is 172 KB and the engine plus data is 1,040 KB (the plan says 996 KB). The plan's split counted the quiz and stages with the interface. The total (1,435 KB) and gzipped size (518 KB) match.
- The plan puts the template at `src/index.template.html`. In Phase 0 the old page markup lives with the rest of the old interface, at `src/legacy/index.template.html`, so deleting `src/legacy/` in Phase 1 removes all of it. Phase 1 adds the new `src/index.template.html`.
- The old interface has data in the middle of it (the quiz, the lessons and the stages sit between interface blocks). To keep the file identical, Phase 0's manifest interleaves `src/legacy/ui-*.js` with the data files. From Phase 1 the order is the plan's: engine, data, app.

## Security fixes

- **Guide window.** Another website could open Lab4Net's guide page (`?guide`) and send it HTML through `postMessage`, which ran as code on the Lab4Net site. Both the guide page and the app now only accept messages from Lab4Net itself (same origin), so other sites can no longer drive either one.
- **Backup import.** A doctored backup file could run code once imported, through the Exam sim history and other stored values. The Exam sim history is now checked when it loads and fully escaped when shown, and imports replace `<` and `>` in every imported value, so a backup can only ever carry data.
- **New test.** `tests/security.cjs` (browser) plays a hostile website and a doctored backup and checks that nothing runs. It also checks that markup typed into consoles stays text (it already did).

## Lessons on the web

- **56 lesson pages.** Every lesson now has its own public page at `yasukeblk.github.io/Lab4Net/lessons/<name>.html`, plus an index of all of them grouped by CCNA domain. Each page carries the lesson's text, the lab's network diagram, the "see it happen" steps, key terms, exam notes, common mistakes and the quick check (answers hidden until clicked), with a button that opens the matching lab. Search engines can find them, and they are easy to share. They are plain HTML in the app's style, work on phones, and use the same fonts and visit-counter rules as the app.
- **Generated, never hand-edited.** `tools/build-site.cjs` builds the pages from the lessons inside `index.html`, so the app and the website always say the same thing. `tests/sitepages.cjs` (in GitHub Actions) fails if they ever drift.
- **Links into the app.** `?lab=<name>` opens a lab and `?lesson=<name>` opens a lesson directly, skipping the title screen. Saved work is kept.
- **Sitemap** now lists all 58 pages. The title screen and How to use link to the lessons.

## Visitor counter on

- `SITE.counter` is set to `lab4net`. The public site (yasukeblk.github.io) now sends one anonymous page view per visit, plus a "pressed Start" event, to lab4net.goatcounter.com: no cookies, no personal data, and nothing with Do Not Track. Self-hosted copies and local files send nothing. The title screen footer and How to use now say this on the public site.

## Demo GIF and sitemap

- **Demo GIF.** `docs/demo.gif` (37 s, 918×784) shows Incident 07 played in the real app: PC1's ping stops at R1, R3's `network` statements move from area 1 to area 0, both OSPF neighbours come up, and the ping succeeds along PC1 → R1 → R3 → PC3. The README shows it under the link to the site.
- **Sitemap.** `sitemap.xml` lists the site's one page, for Google Search Console. There is no `robots.txt`: search engines only read it at the root of the domain (`yasukeblk.github.io/robots.txt`), not in a project folder, and with none present everything may be indexed.

## Donation button on

- `SITE.donate` is set to https://buymeacoffee.com/yasukeblk, so the gold **♥ Support Lab4Net** button now shows on the title screen and in How to use. It opens the page in a new tab. Nothing is sent anywhere unless someone clicks it.

## Title screen, share previews and an optional visitor counter

- **Title screen.** First-time visitors now land on an arcade-style title screen: what Lab4Net is, six feature tiles with live lab counts, a small animated network, and **Press start ▶**. Start (or Esc) enters the lab, and returning visitors skip it. How to use has a **Show the title screen** button, and `?welcome` on the address shows it too. It's plain HTML in the page, so search engines can read it.
- **Share previews.** Links to the site now show a proper card (title, description and a 1200×630 image, `og.png`) on Reddit, Discord, LinkedIn and others. The page also has a description for search results, an icon, and a machine-readable description of the app.
- **Visitor counter (off until set up).** `SITE.counter` in `index.html` takes a GoatCounter code. When set, the public site sends one page view and one "pressed Start" event per visit: no cookies, no personal data, and nothing at all with Do Not Track or on a self-hosted copy. The About text and the title screen say this only while the counter is on.
- **Donation button (off until set up).** `SITE.donate` takes a donation link. When set, a **♥ Support Lab4Net** button appears on the title screen and in How to use.

Tests: new `tests/landing.cjs` (optional, Playwright). All Node tests and the four browser suites pass. Checked in headless Chromium at 1440×900, 1366×768 and 390×844, with no page errors and no network requests while the counter is off. With a test code on a simulated public site the two counts are sent; with Do Not Track or on a self-hosted address nothing is sent.

## Public release

- **Licence:** Lab4Net is now MIT licensed (`LICENSE`). Anyone may use, share and change it, with no warranty.
- **Font credits:** `THIRD-PARTY-NOTICES.md` credits the three embedded fonts (Barlow Condensed, VT323, IBM Plex Sans) and includes the SIL Open Font License, as that licence requires.
- **Disclaimer:** the README, the notices file and the app's How to use dialog (new "About Lab4Net" section) say Lab4Net is independent and not affiliated with Cisco, name the trademarks, and say that progress stays in the browser (no server, accounts, tracking or ads).
- **Help text corrected:** How to use no longer says Telnet and SSH can't open a remote shell. They can, since the prompts build.
- **README rewritten** for visitors: what Lab4Net is, the link to use it online, how to self-host, how to contribute, and the licence.
- **Developer guide made public:** `docs/DEVELOPING.md` is the technical half of the old handoff notes (file map, engine, interface, tests, rules, known limits, roadmap). The personal working notes and the completed lab-library spec moved out of the repo into the maintainer's private notes.
- **Ready for GitHub Pages:** an empty `.nojekyll` file makes GitHub Pages serve the page as-is.

## The pop-out guide can no longer hide behind other windows

- The bug: with the guide popped out, its window could end up behind the map or console. The checklist showed no steps, so the step-by-step switch looked broken.
- Now, whenever the guide is popped out and switched on, the checklist says "The steps are in the pop-out guide window, not here" with a **Bring it to the front** button. With the guide in its own browser window, the button says **Show that window** and focuses it.
- Switching step-by-step on while the guide is popped out brings the pop-out to the front and flashes its border (the flash is off under reduced motion). It also comes to the front every time it appears, for example after opening another lab.
- Checked all 77 labs in a browser: every task shows its guide steps, every walkthrough has content, clicking a step fills the console, and campaign, drill, quiz and sandbox open without errors.

Tests: `tests/guidewin.cjs` now buries the pop-out under the other windows and checks the note, the button and the switch bring it back. All Node tests, ui.cjs and guidewin.cjs pass.

## Campaign button in the top menu

- Campaign (the story mode) now has its own gold button at the start of the top menu: **Campaign · Lab library · Study map · How to use · Trophies**. Before, it was only reachable from the bottom of the lab dropdown or the bottom of the Lab library. The button stays underlined while you're on the stage select.
- With a fifth item, the menu stays on one line from 1024px wide upward: labels never break, spacing tightens below 1420px, and the XP and progress bars hide below 1180px (the level, title and "passed" count stay). On a phone the menu wraps onto a second row instead of being cut off.

Verification: all Node tests, ui.cjs and guidewin.cjs pass. Header checked in headless Chromium at 1024, 1100, 1280, 1366 and 1920 wide (one 46px line, nothing overlapping) and at 360, 390 and 700 on a phone (every button visible). The button opens the campaign and highlights only there.

## Smaller trace box under the network map

- The box under the map that reports the last ping, telnet or ssh is now one line: the result (for example "✓ Reply received" or "! Blocked by ACL 10 outbound on Gi0/1") and the path, with **Details** and **Replay** buttons.
- **Details** opens the rest as before: request and reply paths, the explanation, and the switching notes. It's capped at about a third of the screen height and scrolls, so it can't swallow the map. Whether it's open or closed is remembered in this browser, and Transfer progress carries it.
- The map keeps the space. On a 1366×768 laptop after a ping, the map picture was 109px tall and the box 241px. Now the map is 305px and the box 45px. Every window keeps its default size; the room went to the map, not the console.
- When there's no room for one line (a narrow map window, or a phone), the path wraps onto a second line and the buttons stay visible.

Verification: all Node tests, ui.cjs and guidewin.cjs pass. Checked in headless Chromium at 1366×768, 1440×900, 1440×1000 and 390×844: a successful ping, an ACL failure, Details open and closed, and the setting kept across a reload. Screenshots checked by eye; no page errors.

## Review fixes, part 6: the rest of the polish (switching, OSPF, IPv6, quiz)

This finishes `docs/REVIEW-FIXES.md`. Two small things the review listed as owed (`show ip ospf database`, suspending a Telnet session) are on the Still owed list.

**Switching**
- `show interfaces counters` and `show interfaces counters errors`: the standard views for chasing a duplex problem (FCS errors and runts on the full-duplex end, late collisions on the half-duplex end).
- `clear counters fa0/1` asks about "this interface"; "Last clearing" shows the time since the clear.
- The CDP duplex-mismatch warning repeats every minute while the mismatch lasts.
- `show interfaces status` right-aligns Duplex and Speed like IOS, and a switch's gigabit port reports 10/100/1000BaseTX.
- An ARP nobody answers (pinging an unused address) still floods the VLAN; every switch learns the sender, and the trace says nobody answered.
- A broadcast storm names only the switches on the loop, and the map animates the loop's real links.

**OSPF show commands**
- Areas set with `ip ospf 1 area 0` on an interface count in `show ip ospf` and `show ip protocols`, areas are listed in number order, and `show ip protocols` says "It is an area border router" and lists the interfaces configured explicitly.

**IPv6**
- The first IPv6 echo is no longer lost: IOS queues a packet while it resolves a neighbour (unlike ARP), so even a cold `ping` shows `!!!!!`.
- `show ipv6 neighbors` shows each entry's age in minutes, REACH for 30 seconds after it was confirmed and STALE after that, and the FE80 link-local neighbours.

**Theory quiz**
- Nine near-duplicate questions were rewritten to test something new: the TCP handshake, the BSSID, Terraform, NTP stratum 16, `logging trap warnings`, the PUT verb, unique local addresses, the management plane and NETCONF. Old answers to those nine are cleared once, so the Theory Check trophy counts them fresh.
- The `ip name-server` question explains that the hang after a typo comes from `ip domain-lookup` being on with no reachable name server.

Tests: new checks in `switching.cjs`, `duplex.cjs`, `ospfarea.cjs`, `ping6.cjs` (now expects the queued first echo), `quiz.cjs` and `pageflows.cjs`.

Verification: all seventeen suites pass.

## Review fixes, part 5: polish for exams, Telnet and the extended ping

From the Polish list of `docs/REVIEW-FIXES.md`.

- **Exam bar on a phone** wraps its note under the clock instead of squeezing it into a tall column, and starting an exam (a campaign boss included) scrolls back to the top so the clock is in view.
- **Quit asks first** ("Give up this exam?"), and afterwards the bar reads cleanly. Choosing Boss in the Exam dialog sets the clock to its fixed 30 minutes. Root-cause text starts with a capital letter. The daily challenge is worked out once a day, so the Exam dialog opens faster.
- **The default-gateway exam fault** points at a free address in the right subnet, never at another device.
- **Telnet looks like IOS**: `Trying 10.0.12.2 ... Open` on one line, two blank lines, the banner, then User Access Verification. `show users` stars your own line (your VTY line when you are inside a session). Three wrong `enable password` answers say `% Bad passwords` (`% Bad secrets` only with an enable secret).
- **`copy running-config startup-config` honours the filename**: Enter saves the startup-config; another name saves a copy in NVRAM and leaves the startup-config (and so the next reload) unchanged.
- **The extended ping uses your answers**: the timeout sets how long each `.` waits, "Set DF bit" with a packet over the 1500-byte MTU gives `M` (could not fragment), and "Sweep range of sizes" asks for the minimum, maximum and interval and pings every size.

Tests: `pageflows.cjs` (exam bar, Quit confirmation, Boss clock, phone layout), `exam.cjs` (gateway fault, capital letters), `prompts.cjs` (Telnet output, `show users`, `% Bad passwords`, copy to another name, DF bit, sweep, timeout).

Verification: all seventeen suites pass. Checked the boss bar at 390x844 in Edge.

## Review fixes, part 4: switching, OSPF and the quiz

Items 21 to 27 of `docs/REVIEW-FIXES.md`.

**Switching**
- **Blocked ports learn nothing.** A port spanning tree blocks no longer shows a neighbour switch's address in `show mac address-table`, and a neighbour is learned from its BPDUs only when its own port is forwarding.
- **Tables are flushed when the tree changes.** When the spanning tree between switches changes (a link goes down, a new root), the dynamic MAC entries in that VLAN are flushed on every switch, as Rapid PVST+ does; a PC's port going down does not flush anything. A switch also never "forwards" a frame back out of the port it came in on in the trace.
- **A forced speed changes cost and bandwidth.** `speed 10` makes the spanning-tree cost 100 (19 at 100 Mb/s, 4 at 1000) on both ends, and `show interfaces` shows BW 10000 Kbit; OSPF uses that bandwidth for its cost too.
- **Duplex-mismatch errors count the right way.** CRC errors and runts count only on frames the full-duplex end receives, and late collisions only on frames the half-duplex end sends, at a realistic rate rather than one per frame.

**OSPF**
- **An ABR only uses the backbone for other areas' routes** (RFC 2328 16.2). With two ABRs sharing areas 0 and 1, the ABR now reaches a third area through area 0 at the real cost, not through a cheaper area-1 shortcut, and advertises the cost it really uses.
- **An area mismatch is logged**: `%OSPF-4-ERRRCV: Received invalid packet: mismatched area ID …` on both routers (the backbone form, "must be virtual-link but not found", on the side whose interface is not in area 0), repeated at most once a minute. It is the main clue for Incident 37.

**Quiz**
- The PortFast question now asks for one feature (BPDU guard) and explains why BPDU filter is not protection.

Tests: new checks in `switching.cjs` (blocked port, flush and ingress port, speed and cost), `duplex.cjs` (error direction and rate), `ospfarea.cjs` (ABR backbone rule, area-mismatch log) and `quiz.cjs`. Three older switching assertions had locked in item 21's bug and were corrected.

Verification: all seventeen suites pass; a live ping still takes about 1 to 2 ms on the biggest switched labs.

## Review fixes, part 3: sessions and logins

Items 16 to 20 of `docs/REVIEW-FIXES.md`.

- **`reload` over Telnet or SSH asks first**, like the console: "System configuration has been modified. Save? [yes/no]" when something changed, then "Proceed with reload? [confirm]". Confirming closes your session; the reload message and the boot text appear on the device's own console. Answering `n` keeps you connected.
- **A device's own console wakes up properly after a reload.** If someone reloads a router over Telnet while its console was in interface configuration, the console now starts again at `R2>` ("Press RETURN to get started") instead of sitting in a mode whose interfaces no longer exist.
- **VTY lines behave like a fresh IOS 15 router.** `line vty 0 4` has `login` out of the box and no password, so Telnet connects and is told "Password required, but none set" (Windows: "Connection to host lost."), not "Connection refused". `no login` lets anyone straight in with no password at all, which is the insecure case to recognise. `login local` with no usernames asks for a username and answers "% Login invalid".
- **`login` replaces `login local`** on a line, as in IOS.
- Password answers stay out of the command history after a reload (fixed with part 1).

Tests: `prompts.cjs` covers the VTY defaults, `no login`, `login local` with no users, `login` replacing `login local`, the VTY reload questions, the session closing, the boot messages on the console, and the console coming back at `>`.

Verification: all seventeen suites pass.

## Review fixes, part 2: exams and the campaign

Items 8 to 15 of `docs/REVIEW-FIXES.md`.

- **One exam at a time, and no peeking.** While an exam or boss fight is running you cannot open anything else: other labs (including the lab the exam is based on, with its walkthrough and lesson), the practice views, lessons or the sandbox. The status line tells you why. Opening Exam sim while one is running offers **Resume** or **Give up**; giving up counts as not cleared. Starting the daily challenge again no longer gives a fresh clock.
- **An exam that ran out while you were away is settled properly.** If the page was closed when time ran out, the next load grades the network you left and records the result (a clear if everything passed), with a short notice, instead of dropping you back into a Time's-up card.
- **Exam XP stays put.** XP from exams comes only from the exam history, so it no longer drops after a reload, and exam labs no longer leave entries in your lab progress, saved work or ranks.
- **Reloading after an exam reopens your last real lab**, not a capstone.
- **Boss fights**: three hidden faults whenever the labs allow it (a campaign boss limited to the IPv6 labs may have two, and the bar says so); the health bar starts at the number of checks actually failing and keeps its value after a reload.
- **The time's-up card says "Time's up"**, not "Stage clear".
- **Status-line notices clear themselves** after five seconds, so the "Exam started" notice no longer sits over the Grade button.

Tests: `pageflows.cjs` now covers one exam at a time, the navigation lock, giving up, notices clearing, an exam settled after the page was closed, no exam titles left behind, XP equal before and after a reload, the last real lab, a three-fault boss with its real starting health kept across a reload, and the time's-up title.

Verification: all seventeen suites pass. Checked in Edge at 1440x1000: the boss bar (3 / 3 HP, "three hidden faults") and the Resume / Give up dialog.

## Review fixes, part 1: the seven "must fix" items

From `docs/REVIEW-FIXES.md` (a review of the 9 October builds). Each fix has a regression test that fails without it.

- **No more crash with spanning tree off.** Turning spanning tree off on a switch at the end of a chain (`no spanning-tree vlan 10` on a two-switch lab, or a switch hanging off a triangle with STP off) crashed pings, `show spanning-tree` and the map. The switch that still runs STP now sees an ordinary edge port there. If the simulator ever hits a bug on one command, the console prints an internal-error line for that command and everything else keeps working; saved work replays past it instead of being thrown away.
- **Saved work replays exactly as you typed it.** Each saved command now remembers when it was typed, and replay runs it at that time. Before, a lab using `login block-for` could replay wrongly after a reload: the quiet period had not "ended" during the instant replay, the telnet was refused, and the commands meant for R2 ran on R1. Password answers also stay out of the command history after a reload.
- **Transfer progress keeps everything.** The backup now includes exam history, the campaign and sandbox challenges, so XP, cleared stages and the daily-challenge count survive a move to another browser. Damaged stored values no longer stop the page loading.
- **`enable` over Telnet needs an enable password.** With no enable secret or password, a Telnet or SSH session now gets `% No password set` and stays at `R2>`, as on real IOS. The console still goes straight in.
- **Duplex follows the real rule.** A port stops negotiating only when both speed and duplex are hard-coded. An auto port facing one that does not negotiate falls back to half duplex at 10/100 Mb/s but full at 1000 Mb/s. So the classic mismatch is `speed 100` plus `duplex full` on one end with auto on the other; forcing duplex alone, or gigabit, no longer causes one.
- **A pass at time-up counts.** If every check passes when an exam's clock reaches zero, it is recorded as a clear (and clears a campaign boss).
- **Quiz fix.** The default OSPF cost of a FastEthernet interface is 1, not 10.

Tests: new `tests/pageflows.cjs` (browser, like `ui.cjs`): replaying a saved `login block-for` journal on reload, an engine error contained live and in replay, Transfer progress carrying the new stores and loading damaged ones, a time-up clear. New checks in `switching.cjs`, `prompts.cjs`, `duplex.cjs` (corrected) and `quiz.cjs`.

Verification: all seventeen suites pass (fourteen Node, plus `ui.cjs`, `guidewin.cjs` and `pageflows.cjs` in Edge). Each new check was run against the previous `index.html` and failed there.

## Multi-area OSPF, and the wired side of a wireless LAN

**Multi-area OSPF in the engine**
- OSPF now runs its shortest-path calculation per area, over the adjacencies on that area's interfaces. Routes inside your own area are `O`; prefixes an area border router summarises from another area are `O IA`, with the metric being the cost to the ABR plus what the ABR advertised. An intra-area route always wins over an inter-area route to the same prefix, before the metric is compared, as on real gear.
- An ABR is a router with an interface in area 0 and in another area. It advertises its other areas into each area, and passes summaries it heard over area 0 into its non-backbone areas, never the other way round, so an area that does not touch area 0 is isolated (no virtual links). Moving one end of a link into another area breaks that adjacency, as before.
- `show ip route` prints `O IA` lines (the legend now lists IA), `show ip route <address>` says "type inter area", `show ip route ospf` lists both kinds, and `show ip ospf` says "It is an area border router" where that is true. Single-area labs behave exactly as before.

**Two new labs, each with a lesson**
- **Multi-area OSPF** (Routing, lab 37): four routers in a line, R2 and R3 as ABRs between area 1, area 0 and area 2; verify the ABR lines, the neighbours per area and the O IA routes, then ping across. Lesson: "Why OSPF is split into areas".
- **Incident 37: the area that lost its backbone**: one end of the backbone link was moved into area 1.
- **Wiring a wireless LAN** (Fundamentals, lab 38): a controller and a lightweight access point on the switch. Management and client VLANs, an access port in the management VLAN for the AP, a trunk with native VLAN 10 for the controller, router-on-a-stick gateways, then prove the AP reaches the controller on CAPWAP (UDP 5246/5247) and that the admin PC can open its web page. Lesson: "How an access point joins its controller" (CAPWAP, which port is which, how the AP finds the controller, where the WLAN itself is built). The AP's console here only has the host tools; the radio side is not simulated.
- Both labs sit in the campaign (stage 3 and stage 1) and in the exam sim's pool.

Tests: new `tests/ospfarea.cjs` (in GitHub Actions): areas and ABRs, O versus O IA with exact metrics, the route output, the backbone rule two ways, intra beating a cheaper inter-area route, single-area unchanged. `lessons.cjs` now checks 56 lessons; `labs.cjs` 77 labs, 445 checks, 1571 guide commands.

Verification: all sixteen suites pass. In a real browser: both labs opened on their lessons, the solutions graded clean, `show ip route` on R1 showed the three `O IA` routes with metrics 2, 3 and 4, and the wireless lab's final telnet to the controller's port 443 opened.

## Campaign: the labs as a story in eight stages

**Where**: Lab library → "Campaign →" (first button), or "Campaign" at the top of the Practice group in the lab menu.

- You are the new network engineer at Harbor Street Logistics. Eight stages follow the lab groups in order: First day (fundamentals), The warehouse floor (switching), Three sites, one network (routing), The address that never runs out (IPv6), The things people only notice when they break (IP services), Lock the doors (security), On call (troubleshooting), The big build (capstones). Each has a short story and an outro.
- A stage's missions are the labs you already have, graded exactly as always; passes you already earned count. Finish the missions to unlock the next stage. Beat the stage's boss to clear it: a sabotage exam on one of that stage's own labs (First day, Three sites, IPv6, services), a specific incident (The warehouse floor: the broadcast storm; Lock the doors: the admins locked out), or a boss fight (On call, after any twelve incidents). The big build has no boss: the two capstones are the finale.
- The stage select is an arcade map: locked, open, current and cleared stages, a progress bar each, the boss state. Each stage page lists its missions with your best rank, a "Next mission" button, and the boss button once the missions are done.
- Rewards: 150 XP per cleared stage, Stage Clear (first stage) and Harbor Street Legend (all eight) trophies, and a status-line fanfare when a stage clears.
- Nothing here changes how labs or ranks work; the campaign only reads your progress and the exam history.

Tests: new `tests/campaign.cjs` (in GitHub Actions): eight stages, every lab group exactly once, stories, mission counts reachable, boss incidents exist, sabotage bosses have a lab they can break.

Verification: all fifteen suites pass. In a real browser: the stage select showed stage 1 open and seven locked; passing the two fundamentals labs opened stage 2 and the boss button; the boss started a sabotage exam limited to a stage-1 lab (tagged for the campaign); fixing it and grading cleared the exam, marked stage 1 CLEAR with its outro, and unlocked Stage Clear.

## Switching follow-ups: broadcast storms, neighbours in the MAC table, per-VLAN aging, IPv6 learning

**Broadcast storms**
- `no spanning-tree vlan <list>` (and `spanning-tree vlan <list>` to turn it back on) now exist, and show in the running-config. `show spanning-tree vlan N` on such a switch says the instance does not exist.
- A switch with spanning tree off is a transparent bridge for the others: the switches still running STP see each other through it and still block one port, so one careless switch does not break the network. The last STP switch on a loop even blocks one of its own ports when its BPDUs come back to it.
- Switch it off on every switch of a loop and you get the real thing: the first broadcast circles for ever. Pings time out, the trace panel names the loop ("Broadcast storm in VLAN 1: SW1, SW2, SW3 form a loop with no spanning tree"), the map shows the frame lapping the loop, and every switch on it logs `%SW_MATM-4-MACFLAP_NOTIF: Host … in vlan 1 is flapping between port Gi0/1 and port Gi0/2` on its console, exactly the symptom you read about.
- New **Incident 36: the network that ate itself** (spanning tree switched off on all three switches of the triangle). The exam sim's sabotage also knows this fault.

**Neighbours in the MAC table**
- A switch always knows the MAC of the switch or router port on the other end of a link, because CDP (every 60 s) and BPDUs (every 2 s) keep arriving: those rows now appear in `show mac address-table` as DYNAMIC on the uplink, in the native or access VLAN for CDP and in every carried VLAN for a neighbouring switch's BPDUs. They never age out and come straight back after `clear mac address-table dynamic`. A frame to a router's port is therefore never flooded.

**Per-VLAN aging**
- `mac address-table aging-time <seconds> vlan <n>`, its `no` form, and `show mac address-table aging-time [vlan N]` listing the per-VLAN values.

**IPv6 teaches the switches too**
- IPv6 pings and traceroutes now learn MAC addresses on the switches like IPv4 ones, and the map shows the first exchange as a "Neighbor solicitation" flood instead of an ARP broadcast. The Switching section says the same.

Tests: `tests/switching.cjs` gained the neighbour rows, per-VLAN aging, the storm (reason, logs on every switch, transparent switch, self-loop block, repair, EtherChannel never a loop), the storm exam fault and the incident; `tests/ping6.cjs` checks IPv6 learning and the solicitation event. The curriculum test now ignores console message queues, which the storm probe fills.

Verification: all fourteen suites pass (74 labs, 421 checks, 1483 guide commands; 36 incidents). In a real browser: Incident 36 showed the storm title and Switching story, the frame lapping the triangle on the map, and the MAC flap message on SW1's console after one ping from PC1.

## Boss fights

- Exam sim → **Boss fight**: a finished lab with three hidden faults at once and 30 minutes on the clock. The boss has a health bar in the mission window: its HP is the number of checks still failing, so every Grade is a strike. When it drops, the bar shakes and the hit sounds; at zero it reads BOSS DOWN and the exam is cleared with the normal rank.
- New trophy: Boss Slayer. Everything else follows the exam rules: no guide, no why, no walkthrough, no clues, results scored as always, and the fault list is revealed as the root cause once you win or the clock runs out.

Verification: all thirteen suites pass. In a real browser: a boss fight started on Standard ACL with three faults (a removed route, a wrong next hop, a deny slipped into the ACL); the first Grade took the boss from 5/5 to 2/5 HP.

## IPv6 pings and traceroutes play live, with a neighbour cache

- `ping 2001:db8::1` on a router or switch now plays echo by echo like the IPv4 ping, with `repeat` and `size`. Each device keeps an IPv6 neighbour cache (Neighbor Discovery's answer to ARP): the first echo through a cold IOS device is lost (`.!!!!`), the next ping is clean. A router with no route answers `U` when it can reach you back.
- On a PC, `ping` to an IPv6 address prints the Windows lines live ("Reply from 2001:db8::1: time<1ms", no TTL, as Windows does for IPv6), with the statistics; a host queues its first packet while it resolves the gateway.
- `traceroute 2001:db8::1` (and `traceroute ipv6`) on IOS, and `tracert` on a PC, show each hop live, answering from its global address.
- `show ipv6 neighbors` lists the learned neighbours with their link-layer address, state and interface; `clear ipv6 neighbors` forgets them.
- The map animates IPv6 pings as before (no flooding story yet: IPv6 traffic does not teach the MAC tables).

Tests: new `tests/ping6.cjs` (in GitHub Actions).

Verification: all thirteen suites pass.

## Duplex and speed mismatches that behave like the real thing

- Every physical port now settles its speed and duplex against the far end by the IEEE rules. Two ends forced to different speeds keep the link down (down/down, with the LINK-3-UPDOWN logs). A forced speed on one end is simply sensed by an auto end. A forced duplex on one end leaves an autonegotiating far end at half duplex: the classic mismatch.
- A duplex mismatch keeps the link up and light traffic still gets through, as in real life. CDP reports it on both devices with the real message (`%CDP-4-DUPLEX_MISMATCH: duplex mismatch discovered on GigabitEthernet0/1 (not half duplex), with R2 GigabitEthernet0/0 (half duplex).`), and the counters show it: late collisions on the half-duplex end, CRC errors and runts on the full-duplex end. Forcing half on one end with auto on the other is not a mismatch (the auto end falls back to half as well).
- `show interfaces` now ends with the full counter block (packets and bytes in and out, runts, CRC, input errors, late collisions, and the rest), counted from the live pings, traceroutes, Telnet and SSH you send, and it shows the negotiated duplex and speed. `show interfaces status` shows a-full/a-100 when negotiated and full/100 when forced.
- `clear counters` (all interfaces or one), with the real confirm prompt and `%CLEAR-5-COUNTERS` log.
- A switch port forced to full duplex with a PC behind it is a mismatch too: PC NICs always autonegotiate.
- The exam sim gained a fault: both ends of a link forced to different speeds, so the link never comes up.

Tests: new `tests/duplex.cjs` (in GitHub Actions). `tests/console.cjs` now expects the CDP warning when `duplex full` is forced against an auto far end.

Verification: all twelve suites pass. In a real browser: forcing `duplex full` on R1 printed the CDP warning, and after a ping `show interfaces g0/0` on R2 showed Half Duplex and 2 late collisions in the real layout.

## Theory check grows to 110 questions; sandbox challenges earn XP and trophies

- The theory check now has 110 questions (82 new) across every exam domain: network fundamentals 16, security 17, automation 15, IP services 15, routing 13, switching 13, wireless 12, IPv6 9. New ones cover switching (MAC learning and flooding, native VLAN, STP roles and root election, BPDU guard, Rapid PVST+, LACP modes, EtherChannel, port security, CDP/LLDP), routing (longest match, administrative distance order, floating statics, default routes, OSPF DR election, router ID, neighbour requirements, cost, passive interfaces, HSRP, VRF), services (DORA, helper addresses, PAT, static NAT, NTP, syslog levels, SNMPv3, DSCP EF, TFTP, WRED), security (AAA, TACACS+ vs RADIUS, enable secret, DHCP snooping, DAI, wildcard masks, ACL placement, 802.1X roles, IPsec, social engineering, sticky MACs, password types), wireless (bands and channels, SSID, CAPWAP, AP modes, WPA2/WPA3, AP switch ports, WLC) and automation (REST codes, Ansible, planes, statelessness, northbound APIs, YAML, controllers).
- Your earlier answers are kept: new questions were added after the existing ones.
- The right answer no longer sits in the first slot of the bank: the new questions are spread across all four, on top of the on-screen rotation.
- Completing a sandbox challenge now counts: 60 XP each, the Builder trophy for the first, Architect for all four. Challenges you completed before this change are not known to the new counter; complete one again to register it.

Tests: new `tests/quiz.cjs` (in GitHub Actions) checks every question has four distinct options, a valid answer, an explanation and a known domain, that no question is duplicated, that each domain has at least four, and that answer slots are not lopsided.

Verification: all eleven suites pass. In a real browser: the theory check showed question 110 of 110 with its options and explanation, and finishing a sandbox challenge unlocked Builder.

## Exam sim: a random lab, a clock, and no help

**Where to find it**: Lab library → "Exam sim →", or "Exam sim" at the bottom of the lab menu.

**Three kinds of exam**
- **Sabotage** (the one that cannot be memorised): a finished lab, built and working, with one or two hidden faults. You get the lab's requirements (the checklist) and nothing else: find what changed, fix it, and prove it. The faults are real misconfigurations chosen to fit the lab: a shut interface, a port in the wrong VLAN, a deleted VLAN, a missing or misdirected static route, a trunk turned into an access port, a VLAN pruned from a trunk, a native VLAN mismatch, a missing OSPF network statement, a passive interface facing a neighbour, a duplicate router ID, a wrong mask or address, NAT missing from an interface, a wrong default gateway, a "deny any" slipped into an applied ACL, Telnet-only VTY lines on an SSH lab, ip routing switched off on a Layer 3 switch, a subinterface tagging the wrong VLAN, a bogus static MAC on a secure port. Every fault is applied through real IOS commands and is only used when it breaks one of the lab's own checks.
- **Build lab**: a random build lab, timed, with no help.
- **Incident**: a random troubleshooting incident with no clues.
- **Daily challenge**: a sabotage with two faults, chosen by the date, so it is the same for everyone on that day. Cleared, it is recorded for the day.

**The rules**
- No step-by-step guide, no "why" after commands, no walkthrough, no clues, no command guide. The console still gives `?` and Tab, as IOS does.
- A clock (10, 15, 20 or 30 minutes; the daily is 20). The exam bar at the top of the mission window shows it; the last minute flashes. When it runs out the network is graded as it stands, the console locks, and a card shows what passed and what was wrong. "Review the network" unlocks the console; nothing more counts for that exam.
- Ranks are scored on results, exactly as in any lab: a clear before the clock runs out gets the normal rank, and time and command count never lower it. Grade whenever you like; a full pass ends the exam.
- Leaving the exam for another lab leaves the clock running. A reload resumes the exam where it was.
- New trophies: Exam Ready (clear an exam), Fault Hunter (clear a sabotage with no help), Daily Grind (three daily challenges). Each cleared exam is worth 80 XP, and recent exams are listed in the Exam sim card.

**Behind the scenes**
- An exam is a temporary lab, "Exam · <lab>", that exists while it runs and is not counted in the lab totals.
- Sabotage faults come from a seeded random generator, so the same seed always gives the same exam (that is how the daily works).

Tests: new `tests/exam.cjs` (in GitHub Actions) builds every build lab, applies its solution, and proves that each fault generator produces real, accepted configuration that breaks a check on at least one lab, that most lab/seed pairs yield a fault, that a seed reproduces its fault, and that the exam lab carries the base requirements, checks and root cause.

Verification: all ten suites pass (labs, forwarding, curriculum, lessons, ping, console, switching, prompts, exam, ui, guidewin). In a real browser: the Exam sim card showed today's daily; a 10-minute sabotage started with the exam bar and clock, the guide switch, why text, walkthrough and command guide hidden, and two faults applied; a shortened deadline plus a reload resumed the exam and ended it with the time's-up card and a locked console; a second sabotage was fixed and graded, which stopped the clock, recorded the result with its rank, and unlocked Exam Ready; the guide setting came back untouched after the exam.

## Ping and traceroute from a chosen source, and the interactive extended ping

- `ping 192.168.3.10 source g0/0` (or `source 192.168.1.1`, or `source loopback 0`) sends the echoes from that address, and prints "Packet sent with a source address of 192.168.1.1" like IOS. The replies must find their way back to that address, so this is the real test of a return route: a ping from a loopback nobody has a route to comes back `.....`, and the map shows the reply failing.
- An address or interface that is not one of the router's own up interfaces is refused with "% Invalid source address - IP address not on any of our up interfaces".
- `traceroute 192.168.3.10 source g0/0` works the same way.
- `ping` on its own (on a router or switch) starts the extended ping dialog with the real questions and defaults: Protocol [ip], Target IP address, Repeat count [5], Datagram size [100], Timeout in seconds [2], Extended commands [n], and with `y`: Source address or interface, Type of service, DF bit, Validate reply data, Data pattern, Loose/Strict/Record/Timestamp/Verbose, Sweep range of sizes. Enter accepts a default; a bad number gets "% A decimal number between 1 and 2147483647." and the question again; a host name is looked up like anywhere else.
- `traceroute` on its own asks its own questions (target, source, numeric display, timeout, probe count, TTLs, port).
- The walkthrough shows "⏎ Enter" where a step is just Enter.

Tests: `tests/prompts.cjs` now also covers source by address, interface and spaced interface name, the invalid-source message, the traceroute source, both dialogs question by question, and a bare `ping` on a PC still printing the Windows usage text.

Verification: all nine suites pass.

## Passwords that are asked for, real Telnet and SSH sessions, and reload

**The console now asks**
- `enable` asks for the enable secret (or the enable password when there is no secret). What you type is hidden, as on a real router. Three misses: `% Bad secrets`.
- `exit` or `logout` at the `>` or `#` prompt ends the console session, as on real gear: "R1 con0 is now available … Press RETURN to get started." The next Enter starts a new session, and if the console line has `login` it asks for the password (or, with `login local`, a username and password; a privilege-15 user lands straight in `#`). Three misses: `% Bad passwords` and back to Press RETURN. A banner motd is shown first. `login` with no password set locks the console with the real message ("% Login disabled on line 0, until 'password' is set"), so set the password first.
- `copy running-config startup-config` asks "Destination filename [startup-config]?"; press Enter to accept. `write memory` and `wr` save without asking.
- Guides and walkthroughs show the extra lines: the password after `enable` where a lab starts with one set, and "⏎ Enter" where a prompt wants Enter.

**Telnet and SSH open a real session on the other device**
- `telnet 10.0.12.2` from a router or switch: "Trying … Open", the far device's banner, "User Access Verification", its VTY password (or username and password with `login local`), and then you are on that device: its prompt, its commands, its `enable` secret. `exit` prints "[Connection to 10.0.12.2 closed by foreign host]". Three bad passwords close the connection.
- From a PC, Windows messages: "Connecting To 10.0.12.2...", and "Connection to host lost." when it ends; a refused connection says "Could not open connection to the host, on port 23: Connect failed".
- `ssh -l admin 192.168.1.1` from IOS asks only for the password. From a PC it behaves like OpenSSH: the first connection asks you to accept the host key ("Are you sure you want to continue connecting (yes/no/[fingerprint])?"), then "admin@192.168.1.1's password:", "Permission denied, please try again." on a miss, and "Connection to 192.168.1.1 closed." at the end. `ssh admin@192.168.1.1` works too.
- A VTY line with `login` but no password answers "Password required, but none set". Console messages from the far device stay on its own console (switch to its tab), unless you run `terminal monitor` in the session.
- `show users` lists the console and every open Telnet or SSH session with where it came from. `login block-for` now really triggers: too many failures put the device in quiet mode (new connections refused, `%SEC_LOGIN-1-QUIET_MODE_ON` logged, `show login` shows the countdown). `login on-failure log` and `login on-success log` log each attempt.
- Commands you run over Telnet or SSH count for grading and for your rank like any other.

**reload**
- "System configuration has been modified. Save? [yes/no]:" when the running config differs from what is saved, then "Proceed with reload? [confirm]" (Enter or y; n cancels). The device logs `%SYS-5-RELOAD`, prints a short boot, and comes back with its saved configuration. Everything a real device loses is gone: unsaved changes, ARP and MAC tables, logs, NAT translations, DHCP bindings, err-disabled ports, unsaved sticky addresses.
- A lab that starts with a configured device counts that as saved (so `show startup-config` shows it, and a reload keeps it). A factory device that was never saved boots into "Would you like to enter the initial configuration dialog? [yes/no]:"; answer no.
- Any Telnet or SSH session into a device that reloads is dropped.

**Mind the change**
- Saved work in your browser replays through the new prompts. A journal that typed `exit` at the `#` prompt and carried on, or saved with `copy run start` and carried on, will now stop at the prompt it never answered. If a lab you resume looks wrong, start it over.

Tests: new `tests/prompts.cjs` (in GitHub Actions) covers every flow above. `labs.cjs` now runs 1465 guide commands (the extra lines are the passwords, the host-key answers and the Enters).

Verification: all nine suites pass (labs, forwarding, curriculum, lessons, ping, console, switching, prompts, ui, guidewin). In a real browser: `enable` on R1 showed "Password:" with the typed text hidden; telnet from R1 to R2 asked for R2's VTY password, showed `R2>` with the mode chip "User EXEC", ran `show ip interface brief` on R2 and closed with the foreign-host message; `reload` asked Save?, then confirm, played the boot, and came back as R1 without the unsaved enable secret.

## Switching realism: MAC address tables, flooding on the map, and frames that follow the spanning tree

**Switches learn, like real ones**
- Every switch now keeps a MAC address table. It learns the source address of each frame you send from a console (ping, traceroute, telnet, ssh, a DHCP request) on the port the frame arrived on, per VLAN.
- A frame to an address the switch has not learned is flooded out of every other port in that VLAN. A frame to a known address goes out one port. An ARP request is a broadcast, so it is flooded everywhere in the VLAN and every switch learns the sender; the ARP reply comes back along one path.
- Learned entries age out after 300 seconds of silence from that address (real time), leave at once when their port goes down, and leave when their VLAN is deleted.
- `show mac address-table` in the real 2960 layout, with the reserved CPU addresses, the switch's own address per SVI, secure port addresses as STATIC, then the learned entries, and "Total Mac Addresses for this criterion". Also `dynamic`, `static`, `vlan N`, `interface X`, `address H.H.H`, `count` and `aging-time`, in any combination, and the older spelling `show mac-address-table`.
- `clear mac address-table dynamic` (all, or by vlan, interface or address), `mac address-table static H.H.H vlan N interface X`, `mac address-table aging-time N` (0, or 10 to 1000000) and their `no` forms. Static entries and a changed aging time appear in the running-config.
- Router and switch ports each have their own MAC address now. `show interfaces`, `show ip arp`, `arp -a` and the MAC tables all agree, so you can trace an address from one device to the next.
- The HSRP virtual MAC (0000.0c07.acXX) is what a switch learns for the gateway, on the active router's port, as on real gear.

**The map shows the flood**
- When a frame has to be flooded, the map fans it out along every link it reaches at once, with a label ("ARP broadcast" or "Unknown MAC: flooded"). A frame that reaches a spanning-tree blocked port is shown dying there. The ARP reply then comes back along one path before the ping itself goes.
- The trace panel has a new Switching section: for each switch, which VLAN, whether it flooded or forwarded out one port, and which address it learned. Floods end with a reminder to run `show mac address-table`.
- A soft three-note sound plays on a flood (when sound is on). Everything is still off under reduced motion.

**Pings follow the spanning tree**
- A blocked (Altn/BLK) port carries nothing, so the animated path now matches `show spanning-tree`. Making a different switch root really changes the path a ping takes.
- EtherChannel bundles are one spanning-tree port: `show spanning-tree` lists `Po1` (cost 3 for two gigabit links, 12 for two FastEthernet) instead of the members.
- A switch cut off from the others elects itself root instead of believing in one it cannot hear.

**Not in this build**
- Switches only learn from traffic you send. A real switch would also learn its neighbours' addresses from their CDP, STP and other background frames, so a freshly opened lab starts with empty tables.
- Per-VLAN aging time, `mac address-table notification`, and IPv6 traffic do not touch the table.
- There is no `no spanning-tree vlan`, so a broadcast storm cannot be shown yet.

Tests: new `tests/switching.cjs` (runs in GitHub Actions) covers the spanning-tree path change, island roots, ARP and unicast learning, flooding of unknown addresses, every show/clear/static/aging form and its layout, per-port router MACs, the HSRP virtual MAC, EtherChannel as one STP port, DHCP learning and a switch SVI as the sender.

Verification: labs.cjs (73 labs, 416 checks, 1439 guide commands), forwarding.cjs, curriculum.cjs, lessons.cjs, ping.cjs, console.cjs, switching.cjs, ui.cjs and guidewin.cjs all pass. In a real browser: the ARP broadcast fanned out over every link of the spanning-tree lab, the trace panel's Switching section read correctly, `show mac address-table` on SW1 listed the two PCs on the right ports, and after `clear mac address-table dynamic` the next ping showed "Unknown MAC: flooded" at SW1 while SW3 still knew the address.

## Console realism, and the guide in its own browser window

**Errors that behave like IOS and Windows**
- Invalid input now shows the `^` under the word IOS could not accept, with the "% Invalid input detected at '^' marker." line underneath. A value a command rejects (for example `duplex sideways`) gets the `^` under that value.
- Unfinished commands say "% Incomplete command." (for example `ip add 1.1.1.1` with no mask).
- Ambiguous abbreviations are refused, as on a real router: `sh i` now says `% Ambiguous command:  "sh i"` instead of quietly running `show interfaces`. `sh ip int br` and `sh run` still work.
- A word that exactly matches a keyword is never treated as an abbreviation of a longer one, so `ip` no longer slips into an `ipv6` command.
- Typing a single unknown word at the `>` or `#` prompt does what real IOS does: it tries to look it up as a hostname ("Translating "hellp"...domain server (255.255.255.255)"), pauses, then says "% Unknown command or computer name". With `no ip domain-lookup` it answers at once. This is why that command is in every lab's basic setup.
- PCs answer like Windows: "'foo' is not recognized as an internal or external command", "Error: unrecognized or incomplete command line.", and the ping or tracert usage text when you leave out the target.
- All of these count as rejected commands for ranks, including output that is still playing when the command finishes.

**Output filters and help**
- `show ... | include`, `| exclude`, `| begin`, `| section` and `| count`, with regular expressions, as on IOS (`show run | section interface`, `show ip int br | exclude down`).
- `?` now gives a short description next to each keyword, and lists `|` after a complete show command.

**Everyday commands that were missing**
- `show version` (model, IOS version, uptime, interfaces, configuration register 0x2102 or 0xF).
- `show vlan id <n>`, `show running-config interface <name>`, `show interfaces description`.
- `show interfaces` now prints the hardware/MAC, description, MTU and bandwidth, encapsulation and duplex/speed lines.
- `duplex`, `speed` and `bandwidth` on interfaces: saved, shown in the running-config and `show interfaces`. `bandwidth` changes the OSPF cost, as on IOS.
- `terminal length 0` and `terminal monitor`.
- `ip host <name> <address>` and `ip name-server`, `show hosts`, and `ping`, `traceroute` and `telnet` by name. Unknown names try DNS first unless lookups are off.
- `security passwords min-length`, which rejects short new passwords with the real IOS message; `enable algorithm-type scrypt secret` (type 9) and `sha256` (type 8); `login block-for ... attempts ... within ...` with `show login`.
- `debug ip icmp`, `undebug all`, `no debug all` and `show debugging`. Debug messages appear in that router's own console tab (for example, ping a router from a PC, then switch to the router's tab), and they survive a reload.
- On PCs: `hostname`, `netstat`, `tracert -d` and `help`.

**Step-by-step guide in its own browser window**
- The pop-out guide has a new "New window ↗" button. It opens the guide as a separate browser window you can drag to a second monitor.
- Clicking a command in that window puts it in the main window's console, on the right device. Changing lab updates it. Reloading the main window reconnects to it. Closing it brings back the guide inside the page. "Dock to Lab4Net" in that window closes it and docks the guide.
- The guide window never starts the app itself, so it cannot change or overwrite your saved work.
- If the browser blocks pop-ups, a message says so.

**Not in this build**
- `show mac address-table` is saved for the switching realism build, where switches will learn MAC addresses from traffic.
- Prompts are saved for a later build with password prompts: `reload`, the interactive extended ping, and `copy run start` asking for a filename.
- Speed and duplex mismatches are not simulated yet; the settings are saved and shown only.
- `login block-for` is shown but cannot trigger until logins prompt for passwords.
- `nslookup` is not added, because there is no DNS server in the simulator.

Tests: new `tests/console.cjs` covers all of the above and runs in GitHub Actions. New `tests/guidewin.cjs` (optional, needs Playwright, like `ui.cjs`) opens the guide window over http and checks steps, lab changes, reconnecting, closing and docking. `tests/ping.cjs` now expects the `^` line.

Verification: labs.cjs (73 labs, 416 checks, 1439 guide commands; none of them rejected under the stricter parser), forwarding.cjs, curriculum.cjs, lessons.cjs, ping.cjs, console.cjs, ui.cjs and guidewin.cjs all pass. In headless Chromium: `?` help, the caret, the hostname-lookup pause, a typo counted as rejected, and debug messages in R1's tab after a PC ping (still there after reload) were driven and screenshotted. The guide window was tested over http, as on the container, and over file://.

## Ranks scored on results, not on how many commands you run

- Checking your work no longer costs anything. Extra `show`, `ping` or other commands, and the time they take, are never counted against your rank. Time and command count still appear on the results card, marked "not scored".
- A rank now comes from:
  - **Finishing the lab.** Every check must pass, as before.
  - **Testing it yourself.** An S needs at least one check of your own during the run: `show`, `ping`, `traceroute`/`tracert`, `telnet`, `ssh`, `ipconfig` or `arp`. Without one the best you can get is A, because a real engineer verifies before closing a ticket.
  - **Doing it yourself.** Help still lowers the rank: the walkthrough costs 25 points (B), the step-by-step guide 15 (A), each incident clue 5.
  - **Typos.** The first two rejected commands are free; after that each costs 2 points, up to 10.
- Removed: the command par and the time par. The results card now shows checks passed, how many checks you ran, rejected commands, time and commands (not scored), and help used.
- The Trophy case explains the new rules. Ranks you already earned are kept.

Verification: all six test files pass. In headless Chromium: Static routing with 150 extra show commands still gave S; a run with no check commands gave A; the guide gave A; two typos stayed S; five typos dropped to A. No page errors; the results card was checked by eye.

## Quicker ping and traceroute playback

- Live ping and traceroute output now plays at 40% of real time. A router timeout (`.`) takes 0.8 seconds instead of 2, PC replies arrive every 0.4 seconds instead of 1, and a clean `!!!!!` takes about a third of a second. Traceroute stars are quicker too, so a broken path reaches hop 30 in well under a minute (Ctrl+C or Ctrl+Shift+6 still stops it sooner).
- The engine still describes real-world timings; the console applies one speed setting (`PACE_SCALE` in the live console block), so the pace can be changed in one place.

Verification: all six test files pass. In headless Chromium a cold router ping (`...!!`) finished in about 3 seconds, a warm `!!!!!` in under half a second, and a PC ping in about 2 seconds, with no page errors.

## Pings and traceroutes that behave like real life

- Ping and traceroute output now plays live in the console instead of appearing all at once. On a router each `!` lands as its echo returns, a `.` waits the full 2-second timeout, and the prompt only comes back when the run is over. On a PC each "Reply from" line arrives about a second apart. Ctrl+C or Ctrl+Shift+6 stops a run early and prints the summary for the echoes actually sent, as IOS and Windows do. Typing the next command finishes the current output instantly. Reduced motion shows everything at once.
- Each device now keeps an ARP cache. The first ping through routers that have not yet resolved their next hop loses one echo per router (`.!!!!` or `...!!` on a fresh network); the next ping is `!!!!!`. New commands: `show ip arp` and `show arp`, `clear arp-cache`, and on PCs `arp -a` and `arp -d`.
- Failures now look the way they do on real gear:
  - A router with no route, or an ACL that drops the echo, sends an ICMP unreachable back if it can reach you: `U.U.U` on IOS, and "Reply from 10.0.12.2: Destination host unreachable." on Windows. Windows counts those as received, so the statistics can say 0% loss while nothing got through. That quirk is real and is called out in the code.
  - A missing return route gives timeouts (`.....`, "Request timed out.").
  - A PC with no default gateway prints "PING: transmit failed. General failure." A PC that cannot ARP for a host on its own subnet gets "Destination host unreachable" from its own address.
- Traceroute (`traceroute` on IOS, `tracert` on Windows) now:
  - shows `* * *` for a hop that has no route back to you, and keeps going to hop 30 until you stop it, as the real tools do
  - shows `!H` (no route) or `!A` (ACL) from the router that refused the probe, or "reports: Destination host unreachable." on Windows
  - shows a `*` on the last hop when the destination is a Cisco device, because of its ICMP rate limit
- Round-trip times vary a little per echo and grow with the number of routers. Windows TTL counts down from 128 (PC) or 255 (Cisco) per router. Windows statistics include the "Approximate round trip times" block and the trailing comma.
- Extended options: IOS `ping <ip> repeat <n> size <bytes>` (wrapping at 70 characters per line), Windows `ping -n <count> -l <bytes> <ip>` in either order. Up to 500 echoes per run. Unknown names say "could not find host"; bad options say how to use the command.
- New sounds when sound is on: a tick for each reply, a low note for each timeout, a buzz for each unreachable.
- Console colours: an all-`!` line is green, a mixed line amber, an all-`.` or `U` line red; the success rate line follows the same rule, and unreachables are red.
- The "why" text for ping, traceroute and tracert now explains `!`, `.`, `U`, `*`, `!H` and `!A`.
- Timings: router timeouts are the real 2 seconds; Windows timeouts are shortened (2 seconds per echo, about 1.5 seconds per traceroute star instead of 4) so a failing test does not drag.
- Not changed: IPv6 pings still print all at once with the old fixed output. Pings run from the step-by-step guide's prompt recorder and from saved-work replay print instantly, since those are not typed live.
- Tests: new `tests/ping.cjs` covers the ARP first echo, warm cache, `clear arp-cache`, extended ping, Windows TTL and statistics, both traceroute formats, return-route stars, `U.U.U` and `!H`, unreachables counted as received, ACL reports, host-side failures and abort summaries. It runs in GitHub Actions.

Verification: labs.cjs (73 labs, 416 checks, 1439 guide commands), forwarding.cjs, curriculum.cjs, lessons.cjs, ping.cjs and ui.cjs all pass. In headless Chromium at 1440x1000, a live router ping was watched mid-run with the prompt hidden, a 30-echo ping was stopped with Ctrl+Shift+6, a running PC ping was flushed by typing the next command, a tracert with a broken return route was stopped with Ctrl+C, a lab was switched mid-ping, and reduced motion printed instantly, with no page errors. Screenshots checked by eye. Not tested: the Lab4Net container, Firefox, Safari, and how the new sounds actually sound.

## Lessons for every lab and every exam topic

The DHCP pilot is now the full set: 54 lessons.

- **36 lab lessons**, one for every build lab. Each opens in the mission window the first time you open its lab, until you press Start the lab. It explains the problem the feature solves, how it works and how this lab configures and checks it, using the lab's own devices and addresses. Its "See it happen" story steps through the traffic on the lab's own map (a frame being tagged, a route chosen, an address translated, a port blocking). Then key terms, what the exam expects, common mistakes and a 4 or 5 question quick check. Incidents link to the lesson of the lab they break.
- **18 topic lessons** for the CCNA 200-301 v1.1 objectives that have no lab: network components and topologies, cabling and interface faults, TCP and UDP, IPv4 addressing and subnetting, how a switch forwards frames, virtualization and the cloud, wireless principles, wireless architectures and AP modes, securing and configuring a WLAN (the controller GUI described step by step), device management and AAA, security concepts, passwords, MFA and VPNs, SNMP, TFTP and FTP, QoS, controller-based networking, REST APIs and JSON, Ansible and Terraform, and AI in network operations.
- **Lessons view**: a new Lessons entry under Practice in the lab menu lists every lesson by exam domain with what you have read. Topic lessons open beside the list; "Mark read, next lesson" moves through them. Lab lessons (tagged Lab) open in their lab.
- **Study map**: each exam domain lists its topic lessons. Domains with no lab say the lessons cover them.
- **Rewards**: 30 XP for each lesson read and 10 for each quick-check answer right. A new trophy, Bookworm, for reading every lesson.
- Quick-check answers appear in a fixed shuffled order per question, so the right answer is not always in the same place.
- The objective tags now cover every CCNA v1.1 objective, so topic lessons show theirs.

How they were made: written to one brief (now `docs/LESSON-WRITING.md`), then every lesson was read for accuracy, and specific claims about the labs (for example which address a PC is leased) were checked against the simulator.

Tests: new `tests/lessons.cjs` (also in CI) checks every lesson's structure and allowed markup, that every quiz has four different options and a valid answer, that every story step uses devices on the lab's map that are cabled together, and that every build lab has a lesson. It can also check a draft file before it is added. ui.cjs checks the lesson opening on the first visit, the story, an answer being kept, the incident link and the Lessons view.

Verification: labs, forwarding, curriculum, lessons and ui all pass (ui grades all 73 labs in Edge with every lesson in place). Checked in Edge at 1440x1000 and 390x844 with no page errors. index.html is now about 1.16 MB. Not checked: the container, Firefox, Safari.

## Lessons: learn the concept before the commands (pilot: DHCP)

The labs taught which commands to type but not the networking behind them. A lab can now have a lesson that teaches the concept first. This is a pilot with one lesson, for DHCP server and relay, so the format can be reviewed before the other labs get theirs.

- The first time you open the lab, the mission window shows the lesson instead of the mission. "Start the lab" marks it read and goes to the mission. After that, a card at the top of the mission offers the lesson again, with whether you have read it and your quick-check score.
- The lesson covers what DHCP solves, pools (one per subnet, and how the server picks one), leases and exclusions, the four DORA messages, why remote subnets need a relay and where the helper address goes, and how to check it worked.
- See it happen: seven steps, each animated on the lab's own network map with an explanation (Discover, Offer, Request, Acknowledge, a broadcast stopping at R2, the relayed Discover, the reply coming back). You step through at your own pace.
- Key terms, what the CCNA exam expects (objectives 4.3 and 4.6), common mistakes, and a four-question quick check with an explanation for each answer.
- The DHCP incident links to the same lesson ("Lesson for this topic").
- Lesson progress is saved in the browser (lab4net-lessons-v1) and included in Transfer progress.

Tests: ui.cjs checks the lesson opens on first visit, steps the story, records an answer, closes with Start the lab, does not reopen, and is linked from the incident. All four tests pass, and the lesson was checked in Edge at 1440x1000 and 390x844 with no page errors.

## Windows fit where you drop them

Dragging a window by its title bar now places it in the layout instead of leaving it floating over the others. A dashed preview shows where it will land, cyan outlines show what else will move, and a label says what will happen.

- Drop on the middle of another window: the two swap places and sizes.
- Drop near another window's edge: that window's space is split in half between the two.
- Drop in empty space: the window grows to fill the empty area around the pointer.
- A window that sat flush against the space the dragged window left, and is no wider (or taller) than it, grows to fill it.
- A short nudge returns the window to its place.
- Resizing an edge that other windows share moves it like a divider: the windows on both sides resize together, and none goes below the minimum size.
- Hold Alt to place or resize one window freely, as before. The screen-edge half and full snaps are unchanged. Windows slide into place (no animation with reduced motion).
- How to use explains all of this under "Arrange your windows".

Fixed on the way: the mission window could never be taller than 45% of the screen in the free layout (an older stacked-layout rule outranked the free-layout one), so it was cut short after a resize or swap.

Tests: ui.cjs drags real windows with the mouse: a nudge, a swap, a split with the neighbour filling the space, and a shared-edge resize. Verification: all four tests pass, and swap, split, fill, Alt placement and the layout surviving a reload were checked in Edge at 1440x1000 with screenshots. Not checked: the container, Firefox, Safari.

## Lab library, phase 5: capstones and theory questions

A new Capstone group, after the incidents. Each capstone starts from factory defaults and is graded on the whole network working, so it pulls several labs together without telling you the order.

- **Capstone: branch office from scratch**: VLANs for staff and guests, a trunk with native VLAN 99, router-on-a-stick with a native subinterface, DHCP pools for both VLANs, PAT to the ISP, a guest ACL that only allows web browsing (and still lets DHCP through), and SSH-only management limited to the staff subnet.
- **Capstone: campus core**: a Catalyst 3560 distribution switch with an LACP EtherChannel trunk to the access switch, port security on the access ports, the distribution switch as the spanning-tree root, SVIs as gateways, a routed uplink running OSPF with the router, and DHCP relay to a central server.

Capstones open with the step-by-step guide off, whatever the global guide setting. Turning it on inside a capstone is remembered for that capstone only (`lab4net-capstone-guide`, included in Transfer progress), and the global setting is untouched. The library and brief label them CAPSTONE 01 and 02, the Study map counts them separately, and its note explains the guide default.

Engine changes behind them:

- `encapsulation dot1Q N native` on a router subinterface: untagged frames on the parent port go to that subinterface, and it appears in the running config.
- An inbound ACL now filters DHCP discovers (UDP 68 to 67, to 255.255.255.255) before they reach a server or relay, so a guest ACL must permit bootps. The `bootps`, `bootpc`, `ntp`, `snmp` and `syslog` port names are accepted.

Theory check: 12 new questions (28 in all) on automation (Ansible, northbound APIs, JSON, why automate), wireless (WPA3, lightweight access points and the controller), security (DHCP starvation, multifactor authentication), network fundamentals (control plane, private ranges) and IPv6 (solicited-node multicast). They were added at the end, so saved answers keep their places.

Tests: ui.cjs checks that a capstone opens with the guide off when the global guide is on, that turning it on is remembered per capstone, and that the brief shows CAPSTONE 01.

Verification: labs.cjs passes 73 labs, 416 checks and 1439 guide commands. forwarding.cjs, curriculum.cjs and ui.cjs pass (ui.cjs grades all 73 in Edge). Both capstone guides were run through the real console in Edge and graded, with no rejected commands and no page errors, and the screens were checked at 1440x1000 and 390x844. Not checked: the container, Firefox, Safari.

## Lab library, phase 4: 29 more troubleshooting incidents

The Troubleshooting group now has 35 incidents, at least one for every build lab. Each starts from the finished lab with one fault added (sometimes with a little background setup), reproduces a real failing service, has three clues (Direction, Evidence, Repair), a lesson, and an inline step-by-step guide, and is graded with the original lab's checks.

- Spec list: OSPF uplinks in the wrong area (07), BPDU Guard err-disabling a switch's uplinks (08), an EtherChannel forced on against LACP (09), PAT inside and outside reversed (10), a standard ACL on the wrong interface and direction (11), an extended ACL deny inserted above the permit (12), a port security violation in shutdown mode after a laptop swap (13), and static NAT to the wrong inside global (14).
- Phase 1 labs: native VLAN mismatch breaking switch management (15), a wrong switch default gateway (16), access-class permitting the wrong subnet (17), the OSPF uplink made passive (18), a deleted VLAN (19), CDP turned off globally instead of per interface (20), a wrong DHCP default-router (21).
- Phase 2 labs: a primary static route with an unreachable next hop hidden by the floating route (22), a host route on the wrong server (23), mismatched OSPF hello timers (24), LLDP transmit and receive swapped (25), a deleted voice VLAN (26), a NAT pool outside the routed block (27), an ACL exception added after the deny (28), a wrong NTP server (29).
- Phase 3 labs: ip routing off on the Layer 3 switch (30), the snooping uplink untrusted (31), a DAI static binding on the wrong port (32), IPv6 unicast routing off (33), an IPv6 route to a mistyped prefix (34), the HSRP virtual IP changed away from the hosts' gateway (35).

Engine changes behind them:

- Err-disabled ports: BPDU Guard on a port that hears BPDUs, the EtherChannel guard when one end is forced on, and port security violations in shutdown mode. The real log messages appear, the port is down at both ends, show interfaces says (err-disabled), and recovery is shutdown then no shutdown (it trips again if the cause is still there). The map shows the dead links.
- Port security tracks MAC addresses: dynamic, sticky (written to the config, kept until removed) and static, with the maximum enforced and violations counted. restrict and protect keep the port up and drop the offending host. show port-security, show port-security interface and show port-security address show the real details.
- show interfaces status (and err-disabled), spanning-tree portfast bpduguard default, no channel-group, no switchport trunk native vlan, no ip nat inside source static, and IOS refusing to redefine a NAT pool in use.
- OSPF hello and dead intervals (ip ospf hello-interval and dead-interval) must match for an adjacency. A network-type mismatch now forms the adjacency but loses the routes through it, as on a real router (phase 2 had simplified this).
- show spanning-tree vlan N says when the VLAN has no instance.
- The Fault Finder trophy now asks for every incident, not six.

Tests: tests/curriculum.cjs accepts any number of incidents and non-packet symptoms (a check function, for discovery, NTP, IPv6 or a preferred path), requires a lesson, rejects any repair command IOS would refuse, and ignores counters, logs and NAT translations when it checks that the diagnostic probe changed no configuration. tests/forwarding.cjs adds BPDU Guard trip and recovery, the EtherChannel guard, and port security shutdown and restrict.

Verification: labs.cjs passes 71 labs, 400 checks and 1262 guide commands. forwarding.cjs, curriculum.cjs and ui.cjs pass (ui.cjs grades all 71 in Edge). Every new incident's guide was run through the real console in Edge and graded, with no rejected commands and no page errors, and the screens were checked at 1440x1000 and 390x844. Not checked: the container, Firefox, Safari.

Not done: randomised faults. Every incident is still a fixed scenario.

## Lab library, phase 3: Layer 3 switching, Layer 2 security, IPv6 and HSRP

New labs, appended after phase 2, plus a new IPv6 group in the lab library:

- **Inter-VLAN routing on a Layer 3 switch** (Switching): a Catalyst 3560 becomes the gateway for both VLANs with ip routing and SVIs, and gets a routed uplink with no switchport. The trace shows one hop between VLANs instead of a trip through the router.
- **DHCP snooping** (Security): a rogue DHCP server on the access switch answers first and hands out itself as the gateway. Snooping with a trusted uplink silences it; then the real server goes quiet too, because of option 82, which the learner has to diagnose and fix.
- **Dynamic ARP Inspection** (Security): DAI against the snooping binding table. Turning it on first cuts off the gateway until the uplink is trusted; the printer with a fixed address needs a static source binding; the host with a hand-set address is dropped.
- **IPv6 addressing** (IPv6): global, link-local and EUI-64 addresses on R1, multicast groups in show ipv6 interface, SLAAC on two hosts and a static host.
- **IPv6 static and default routes** (IPv6): a network route, a default route, a /128 host route, and floating routes over a backup link that only has link-local addresses, which forces the exit-interface rule.
- **First-hop redundancy with HSRP** (Routing): R1 and R2 share a virtual gateway; R2 takes over when R1's LAN link fails and R1 pre-empts back when it returns.

Engine changes behind them:

- Layer 3 switch: a Catalyst 3560-24PS model with ip routing off by default. When routing is on it routes between SVIs and routed ports and runs static routes, OSPF, ACLs and DHCP relay. It refuses switchport mode trunk until the trunk encapsulation is set to dot1q, as the real switch does. show ip route on a switch without routing shows its default gateway. **The sandbox has a Layer 3 switch** (this clears that owed item).
- DHCP: a client takes the nearest answer from every server that can reply, including a host running a DHCP service. DHCP snooping (per VLAN, trusted ports, option 82, binding table, rate limit), and the IOS server and relay rule that drops option 82 without a relay address unless trusted.
- Dynamic ARP Inspection in the forwarding path: on each Layer 2 hop, both ends' ARP is checked on untrusted ports against the binding table; drops show in the trace panel and the counters. ip source binding for fixed-address hosts. ipconfig /all shows the MAC address.
- IPv6: 128-bit addresses printed the IOS and Windows way, global/link-local/EUI-64 addresses with a separate MAC per router port, ipv6 unicast-routing, IPv6 static routes with distance and the link-local next-hop rule, a separate IPv6 routing table and forwarding path, SLAAC and static addressing on hosts (ipv6config, as in Packet Tracer), ping and traceroute, show ipv6 interface (with joined multicast groups) and show ipv6 route.
- HSRP: groups with virtual IP, priority, preempt and version 2; election state kept between commands; the active router answers for the virtual IP; state changes logged; show standby and show standby brief.
- The Study map note now says what is not simulated: wireless, automation and IPv6 routing protocols.

Tests: tests/forwarding.cjs was extended first for IPv6 (address text forms, EUI-64, SLAAC, the unicast-routing switch, the link-local next-hop rule, longest match and a floating default), then for Layer 3 switching, DHCP snooping against a rogue server, DAI drops and static bindings, and HSRP failover with and without pre-emption.

Verification: labs.cjs passes 42 labs, 239 checks and 881 guide commands. forwarding.cjs, curriculum.cjs and ui.cjs pass (ui.cjs in Edge). Each new lab's guide was run through the real console in Edge and graded, with no rejected commands and no page errors; the maps were checked at 1440x1000 and the Mission window at 390x844. The DAI map's port labels crowded around the switch and the devices were spread out. Not checked: the container, Firefox, Safari.

Simplified, and recorded in the handoff: IPv6 has static routing only (no OSPFv3, no DHCPv6, no IPv6 ACLs); HSRP has no object tracking and fails over instantly instead of after the hold time; the DHCP snooping rate limit is configured and shown but not enforced; DAI has no ARP ACLs or extra validation options.

## Lab library, phase 2: eight labs with engine extensions

New labs, appended after phase 1:

- **Floating static route** (Routing): a backup route at distance 5 that stays out of the routing table until the primary link fails, then takes over and steps back when it returns.
- **How a router chooses a route** (Routing): OSPF cost moves the preferred path, a /32 host route pins one server to the other path (longest match first), and a /24 backup at distance 130 loses to OSPF's 110.
- **OSPF on a shared segment** (Routing): four routers on one LAN. Raising a priority changes nothing (no pre-emption); priority 0 makes the DR and BDR give up their roles in turn; the WAN link runs point-to-point with a realistic cost.
- **LLDP** (Switching): a Linux server that CDP cannot see shows up once LLDP runs; transmit is turned off on its port while receive stays on.
- **Voice VLAN** (Switching): an IP phone with a PC plugged into it, on one switch port. Before the voice VLAN both land in the data VLAN; after it, the phone renews into the voice subnet and the PC stays in data.
- **Dynamic NAT with a pool** (IP services): two public addresses for three PCs, so the third fails and the miss counter climbs; IOS refuses to change the rule until the translations are cleared; overload then shares one address.
- **Named ACLs and sequence numbers** (Security): insert lines between existing ones, delete one line by number, and resequence.
- **NTP and syslog** (IP services): both routers sync to a stratum 1 server, log with date-and-time stamps, and send only warnings and worse to the syslog server. The eight severity levels are taught in the explanations.

Engine changes behind them:

- The routing table now holds one route per prefix: the lowest administrative distance wins. ip route takes a distance, an exit interface or both, and a name. A route whose next hop is no longer on a connected subnet drops out, which is what makes floating routes work. Exit-interface-only routes on Ethernet work through the neighbor's proxy ARP (no ip proxy-arp turns it off).
- show ip route ADDRESS (the entry a given address uses, as IOS describes it) and show ip route static, ospf or connected.
- OSPF uses shortest-path costs: ip ospf cost, auto-cost reference-bandwidth, ip ospf network point-to-point, ip ospf priority and ip ospf PID area N. The DR/BDR election follows RFC 2328 and persists between commands. Neighbor states are the real ones (FULL/DR, FULL/BDR, FULL/DROTHER, 2WAY/DROTHER, FULL/ -). New show ip ospf interface and its brief form.
- LLDP: lldp run, lldp transmit and receive per port, show lldp, show lldp neighbors (and detail), show lldp interface.
- IP phones: a new device that bridges a PC behind it, learns its voice VLAN from the switch over CDP and tags its own traffic. Access ports carry a voice VLAN everywhere it matters (forwarding, VLAN interface state, spanning tree, show vlan brief). show interfaces switchport. DHCP option 150.
- NAT: ip nat pool, pool rules with and without overload, pool exhaustion with a reason in the trace panel, the IOS "Dynamic mapping in use" refusal, show ip nat statistics. PAT keeps a host's own port when it is free, and pings carry an ICMP query ID.
- ACLs have real sequence numbers: insert with "15 permit ...", delete with "no 30", ip access-list resequence. show access-lists prints standard lists the IOS way.
- NTP (sync over the real UDP 123 path, stratum, held when the server goes quiet), show clock with the * for unsynchronised time, clock timezone, service timestamps log datetime msec, logging host and trap level, show logging with a log buffer, and a syslog viewer on the log server ("syslog" at its prompt). Link changes are now logged on the device at the far end of a link too, and leaving configuration mode logs %SYS-5-CONFIG_I.
- An administrative shutdown now logs %LINK-5-CHANGED (administratively down) instead of %LINK-3-UPDOWN, as IOS does.

Tests: tests/forwarding.cjs adds floating static failover, administrative distance against OSPF, longest match against distance, proxy ARP with and without, NAT pool exhaustion and overload, voice VLAN tagging, and the DR election rules.

Verification: labs.cjs passes 36 labs, 203 checks and 749 guide commands. forwarding.cjs, curriculum.cjs and ui.cjs pass (ui.cjs in Edge). Each new lab's guide was run through the real console in Edge and graded, with no rejected commands and no page errors; the maps were checked at 1440x1000 and the Mission window at 390x844. The phone's console tab first showed its CDP name (SEP...); it now shows PHONE1 and only CDP uses the SEP name. Not checked: the container, Firefox, Safari.

Simplified, and recorded in the handoff: equal-cost paths are not load-shared (one is used); an OSPF network-type mismatch stops the adjacency forming, where real IOS forms it but loses routes; the NTP clock stays synchronised as long as its server is configured; syslog messages are shown on the console of the device the command was typed on, and only logged on others.

## Lab library, phase 1: seven new labs on the existing engine

New labs, added after the incidents so saved progress is unaffected:

- **Native VLAN and allowed VLANs on trunks** (Switching): move the native VLAN to an unused VLAN on both ends and prune the trunk. Changing one end first shows the real CDP native VLAN mismatch message.
- **Switch management access** (Fundamentals): a management VLAN, an SVI and a default gateway, then SSH from another subnet. The ping fails until the gateway is set, which is the point of the lab.
- **Locking down device access** (Security): service password-encryption, an enable secret in place of the enable password, local accounts, exec-timeout, SSH only, an access-class that admits only the admin subnet, and saving the config.
- **OSPF router IDs and passive interfaces** (Routing): a rogue router on the user LAN is injecting a route. Fix the router IDs (they only take effect after clear ip ospf process), then passive-interface default with the uplink re-opened.
- **Per-VLAN root bridges** (Switching): DSW1 root for VLAN 10 and backup for 20, DSW2 the other way round, so the access switch blocks a different uplink in each VLAN.
- **Map an unknown network with CDP** (Switching): the map hides port names. Use CDP to label every link TO-neighbor-port, turn CDP off towards the ISP only, and use the detail view to find a management address.
- **Small office build** (IP services): a factory-fresh router to a working branch: addressing, default route, DHCP pool and PAT.

Engine changes behind them:

- service password-encryption now really hides line, enable and username passwords as Cisco type 7 in the config. The encoding is the real one, so the strings decode like on a router.
- exec-timeout is stored and shown in the config. access-class on the VTY lines is now enforced: a denied source gets "Connection refused".
- CDP: cdp run and cdp enable (and their no forms) are modelled, show cdp neighbors has the real header and totals, and show cdp neighbors detail and show cdp are new. A native VLAN mismatch between two trunk ends is logged the moment it appears.
- OSPF: passive-interface default with no passive-interface exceptions; the router ID is fixed when the process starts and a new one waits for clear ip ospf process, with the real warning; neighbors with the same router ID refuse to form; loopbacks are advertised as /32; adjacency changes are logged (%OSPF-5-ADJCHG); new show ip protocols and show ip ospf.
- spanning-tree vlan ... root primary now works like the real macro (24576, or 4096 below the current root if that is not enough) and accepts VLAN lists such as 10,20.
- no enable password is supported.
- Accuracy fixes found while building: host pings now show a real TTL (128 from a host, 255 from a router, minus one per router on the way back) instead of always 126, and show ip nat translations has the real five columns with the host's own inside port.
- Lab numbers in the Mission window and guide now count build labs only, so the first new lab is LAB 16. Incidents keep their INCIDENT number. Labs can hide port names on the map (used by the CDP lab).
- Every new command has a "why" explanation in the walkthrough and command guide.

Tests: tests/ui.cjs searches the library for a word unique to Single-area OSPF, since "OSPF" now matches two labs. tests/curriculum.cjs reports the real lab count.

Verification: labs.cjs passes 28 labs, 163 checks and 557 guide commands. forwarding.cjs, curriculum.cjs and ui.cjs pass (ui.cjs in Edge through Playwright). Each new lab's guide was also run through the real console in Edge and graded, with no rejected commands and no page errors; the maps were checked at 1440x1000 and the Mission window at 390x844 from screenshots. Two maps had host labels clipped at the bottom and were moved up. Not checked: the container itself, Firefox, Safari.

Not changed: the data path still ignores spanning-tree blocking (the tree is computed and shown, and the labs check it, but pings take any VLAN-valid path).

## Troubleshooting incidents, clues, CCNA study map and sandbox undo (ideas from ChatGPT's branch, rebuilt on main)

- Six troubleshooting incidents in a new Troubleshooting group. Each one starts from a working lab with one fault added: a PC in the wrong VLAN, a trunk missing a VLAN, a missing return route, the wrong 802.1Q tag on a subinterface, a bad DHCP relay address, and SSH blocked on the VTY lines. The four tasks are reproduce, inspect, repair and verify. Grading uses all of the original lab's checks, so a fix that breaks something else does not pass. Passing shows the root cause.
- Each incident has three clues (Direction, Evidence, Repair) that you reveal one at a time. Each clue costs 5 rank points. Starting the incident over hides them again so a retry can earn a clean rank.
- Ranks for incidents use the whole investigate-and-repair path as par, so show commands are not penalised. The results card lists clues used.
- Two new trophies: Detective (solve an incident with no clues, guide or walkthrough) and Fault Finder (solve all six incidents).
- Every lab shows the CCNA 200-301 v1.1 objectives it practises. The lab library search also matches objective numbers, for example "3.4" finds OSPF.
- New Study map button in the menu bar: the six exam domains with their exam weights, your progress in each, and a suggested next mission. It says plainly that it is a practice map, not a readiness score, and what is not simulated yet.
- Sandbox Undo: a button at the top of the Toolbox, and Ctrl+Z when the map has focus. It undoes the last device, cable, note, challenge or configuration change. Show, ping and mode commands fold into the step before them, so one press undoes one real change.
- Transfer progress now also carries which incident clues you have revealed.
- Not taken from ChatGPT's branch: the AI tutor (needs a server and an OpenAI key, and main is an offline static page), the Juniper switch and Junos commands (not CCNA), the Matrix design, and a separate sandbox ping-probe tool (pinging from a console already does this).
- Tests: tests/curriculum.cjs (ported from ChatGPT's branch) checks that every lab maps to real objectives, that each incident starts with a real failure and that its repair passes every original check. It now runs in GitHub Actions too. tests/ui.cjs reopens Static NAT for its trace checks, since the incidents now come after it in the lab list.

Verification: labs.cjs passes 21 labs, 119 checks and 358 guide commands. forwarding.cjs, curriculum.cjs and ui.cjs pass. The new features were driven in headless Chromium at 1440x1000 and on a 390x844 phone with reduced motion on (clues, an incident cleared through the console, results card, retry, study map, objective search, sandbox undo by button and by Ctrl+Z, trophies), with no page errors, and the screenshots were checked by eye. Not tested: the Lab4Net container itself, Firefox, Safari.

## Retro redesign and merge (Claude, on top of the chatgpt/improvements branch)

Kept from ChatGPT's branch, unchanged in behaviour: saved work per lab (command journal replay), progress export/import, the lab library, the command guide, the trace panel with failure reasons and replay, grade invalidation after new commands, the task checklist, console shortcuts and paste review, the Static NAT lab, the theory check, the subnetting prefix ranges, offline operation, and the three test files plus the CI workflow.

Changed:

- New visual direction: a remastered arcade game, in the spirit of a classic brought back with modern art and lighting. Neon night palette, a city skyline behind the workspace, dark panels with soft shadows and coloured glows, gradient title bars colour-coded per window (mission, map, console), and bold italic arcade lettering.
- The console stays a retro amber CRT with scanlines and glass shading, and the DOS-style path line and boot screen remain, so the old-machine roots still show.
- Fonts are embedded in the page (Barlow Condensed italic for display, VT323 for the console, IBM Plex Sans for reading text), so the look is identical offline. No external requests.
- Topology devices are redrawn as bold-outlined, shaded illustrations with ground shadows. The selected device gets a bobbing marker and a pulsing ring.
- Animations are smooth and punchy: glowing cables with moving light, a glowing packet with a light trail along the real forwarding path, comic hit-sparks on success and failure, a shake on the device where a packet dies, and a "LAB CLEAR!" banner. All of it is disabled under reduced motion.
- Added step-by-step instructions, NetSim style: under every task, the exact commands to type, each shown with the prompt you should be at. A switch above the checklist turns them on or off and the choice is remembered. Clicking a command places it in the right device's console without running it. tests/labs.cjs also follows the instructions for every lab and checks the result grades as a pass.
- Windows can be rearranged on desktop: drag any window by its title bar, resize from any edge or corner, and they snap to the screen margins and to each other (hold Alt to place freely). Dragging to the left or right screen edge snaps a window to that half; the top edge fills the screen. The arrangement is saved per browser, and "Reset layout" in the menu bar restores the default.
- The step-by-step guide can be popped out into its own window ("Pop out guide" beside the switch) and docked again.
- The mission is split into two windows: Mission (the brief and address plan) and Checklist (the guide switch, tasks, grading and walkthrough). Each can be moved and resized on its own.
- Rewards: each lab run is timed and scored into a stage rank (S to D) from time, command count, rejected commands and help used, shown on a results card with XP earned. XP feeds eight levels shown in the header, there are twelve trophies, a combo counter for consecutive valid commands, a study-day streak, and rank badges in the lab library. Sound effects are generated in the browser and can be switched off.
- Hovering a device on the map shows its interfaces, addresses and link state. The trace panel under the map is always present, so the map keeps its size.
- "Transfer progress" and "Reset layout" moved to the status line under the menu bar, next to the new sound switch.
- Sandbox mode (under "Free build" in the lab picker, and in the Lab library): place up to 20 routers, switches, PCs and servers on a larger canvas, drag them around, and configure them from the console. Nothing is graded. The cable tool lets you choose the port on each end, showing which ports are free or in use. Right-click a device for console, cabling, IP settings, rename and delete; click or right-click a cable to remove it. PCs and servers have an IP settings dialog that runs the matching ipconfig commands. Four starter kits load ready-cabled topologies, and a sandbox can be saved to and loaded from a file. The build and its configuration are saved in the browser.
- Sandbox additions: a five-port router and a 24-port switch; zoom (scroll, or the + and − buttons), pan (drag empty space) and Fit over a canvas four times the default view; text notes on the map; and four challenges that load a cabled topology and check goals against the live network after every command, with no instructions.
- Transfer progress now also carries ranks, XP, trophies, the window layout and the sandbox.
- Fixed: commands with no output no longer add a blank line to the console.
- Desktop is the primary target. The phone layout from ChatGPT's branch is kept and still passes its overflow checks.

Verification: tests/labs.cjs (15 labs, 85 checks), tests/forwarding.cjs and tests/ui.cjs all pass. The browser suite was run in headless Chromium at 1440x1000 and 390x844.

---


## Learning and interaction

- Reworked the dark cyan/violet interface into a calmer workspace with clearer hierarchy, readable panels, console mode labels and a quieter topology. Removed external font requests so the app works fully offline.
- Added a searchable mission library grouped by topic, showing ready/resume/passed status. Added a short onboarding guide and a next-unpassed-lab action after successful grading.
- Preserved all task explanations and command explanations. Added manual task tracking that is explicitly independent of real configuration grading.
- Added a searchable command guide sourced from the actual command table, filtered to the device and current mode. It inserts syntax for review without executing it.
- Added Ctrl+Z/Ctrl+L shortcuts, keyboard tab navigation and a review dialog for multiline command pastes. Console display clearing does not discard configuration history.
- Grade feedback is invalidated after further console commands so old results cannot masquerade as a current grade.

## Continuity

- Automatically save per-lab command journals and checklists. Replaying commands restores the network and real configuration-mode contexts, including interface references, instead of serializing broken object pointers.
- Added offline JSON export/import for moving lab passes, configurations, checklists, subnetting results and theory results between devices. Existing earned passes remain compatible.
- Import rebuilds and validates included journals before replacing saved work, merges earned lab passes, and reports invalid files without discarding the current configuration.
- Added a deliberate reset flow that explains what is removed and preserves earned passes.

## Packet learning

- The forwarding model records the switches it actually traverses. Animation no longer guesses a shortest physical path that might cross a VLAN-ineligible link.
- Added diagnostic reasons for missing routes, unreachable next hops, inbound/outbound ACL drops and hop-limit failures.
- Added persistent request/reply results with troubleshooting guidance and replay. Results are labeled as the last test; rerun the command after changing configuration.
- Disabled ambient spinning/flow effects. Packet movement remains available, while reduced-motion users get the same readable outcomes. Live preference changes cancel movement safely.

## Content

- Added **Static NAT: publish a server**, with an outside client, a routed public block, a permanent one-to-one mapping, explanations, a solution and five grading checks. The original 14 labs and their grading requirements remain.
- Added 16 explained theory questions covering wireless, AAA, NTP, syslog, SNMP, QoS, VPNs, IPv6 concepts, transport and automation. This is supplementary practice rather than a complete exam bank. Topic scope follows [Cisco's CCNA v1.1 outline](https://learningcontent.cisco.com/documents/marketing/exam-topics/200-301-CCNA-v1.1.pdf).
- Added prefix ranges to the subnetting drill, preserved first-attempt scoring and improved the block-method explanation. Strict answer comparison avoids silently turning malformed input into a correct answer.

## Accessibility and mobile

- Added a skip link, labeled dialogs, proper keyboard focus in device tabs, accessible task controls, explicit progress semantics and textual packet results.
- Added phone panel navigation between the mission and network console so a long checklist does not bury the console. Practice views hide the unrelated network workspace.
- Kept touch controls, bounded dialogs, responsive tables and reduced-motion styles. Fonts fall back to local system fonts with no network needed.

## Verification

- Added `tests/labs.cjs` **before changing the app**. Baseline: **14 labs / 80 checks passed**.
- Final solution test: **15 labs / 85 checks passed**, including a why explanation for every task.
- `tests/forwarding.cjs` passes outbound/return-route failures, inbound/outbound ACL diagnostics, static NAT publication, closed ports, a longer VLAN-valid path and link failure.
- `tests/ui.cjs` passes in local headless Microsoft Edge: all 15 labs through the UI execution path and Grade button, actual console entry, restoration inside interface mode, task restoration, backup round-trip, invalid import, library search, command guide, subnetting answers, theory feedback, phone navigation, viewport overflow and reduced motion. No page errors.
- Visually inspected desktop (1440×1000) and phone (390×844) captures.
- Added GitHub Actions for the two dependency-free simulator checks. Browser testing remains optional developer tooling; no runtime dependency was added.

## Deployment and deliberate limits

- The app remains one self-contained `index.html`. `install-lxc.sh` and the Dockerfile still deploy that same file, so no deployment restructuring was needed. README now includes branch-preview and Git update instructions.
- Automatic cloud sync was not added: offline backup transfer preserves the no-backend architecture.
- Full IPv6 forwarding, HSRP labs and interactive enable/console/remote password prompts were deferred. Those require broader engine and authentication work; IPv6 and gateway redundancy are introduced in theory practice instead.
- Existing timing, STP, EtherChannel, port-security and authentication models remain simplified; the regression suite protects supported exercises, not equivalence with real IOS hardware.
- Could not test the user's private Debian/nginx container, a Docker build, Safari/iOS or physical touch devices. The container is unreachable from this environment. Local file testing used desktop Edge with a phone-sized viewport, not a physical phone. CI execution on GitHub must be checked after publishing the branch.
