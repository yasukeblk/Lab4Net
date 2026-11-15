# Lab4Net fixes plan

Ten fixes from a senior review of Lab4Net after the redesign (November 2026). Phases 1 to 5 fix how changes are shipped and tested, and the bugs users see most. Phases 6 to 10 fix the bigger design and structure problems.

Work through the phases in order. Each phase lists what is wrong today, what to build, and an acceptance list. A phase is done only when every item in its acceptance list is true and every test passes.

---

## 1. Rules

These apply to every phase.

1. **Read first.** Read this whole plan, then `README.md`, `docs/DEVELOPING.md` and `CHANGES.md` (the top three entries).
2. **Never read or print the base64 font lines** in `index.html` (lines 23 to 27 today). Skip them with line ranges or grep.
3. **Do not change the engine.** Nothing in `src/engine/` changes, and `tests/fixtures/engine.sha256` stays the same. No phase in this plan needs an engine change. If you truly believe one is needed, stop and explain why before making it.
4. **Never edit the 14 engine Node tests or weaken any check.** You may make a check stricter. You may change a test that this plan names, in the way the plan says.
5. **Slugs are frozen.** Never change or remove an existing lab or lesson slug in `tests/fixtures/slugs.json`. Lab and lesson titles feed the slugs, so never change the title strings in `src/engine/` or the keys of `LESSONS`.
6. **Storage keys are frozen.** `lab4net:v2` and the keys under it keep their shape. New fields may be added; old ones are never renamed or deleted. Old saved data must keep loading (run `tests/migrate.cjs` and `tests/validate.cjs`).
7. **Rebuild and commit `index.html` with every change** (`node tools/build.cjs`). Run `node tools/build-site.cjs` too whenever lessons or the site pages change.
8. **Add a plain-language `CHANGES.md` entry for every phase.** Say what changed for a learner first, then what changed for a developer.
9. **Where this plan and the repo disagree on a fact, the repo wins.** Note the difference in `CHANGES.md` and carry on.
10. **Look at anything visual in a real browser** at 1366×768 in both themes, and at 390×844 on a phone, before calling the phase done.
11. **Size budgets** in `tools/build.cjs` may only be raised where this plan says so.
12. **Branches and merging.** Phase 1 goes on the branch `fix/01-safe-deploys`. Phases 2 to 10 go on the branch `fixes`, made from `main` after Phase 1 is merged. Open a draft pull request for `fixes` as soon as it has its first commit, so CI runs every test on every push. Push after every phase. **Never push to `main` and never merge.** The owner merges.
13. **Commit this file** (`FIXES-PLAN.md`) as the first commit on `fix/01-safe-deploys`.
14. **Report after each phase** in plain language and bullets: what was built, the test results, anything that differed from the plan, and screenshots of the screens that changed. Then carry on with the next phase without waiting.
15. **Stop and wait for the owner in only three cases:**
    - when Phase 1 is finished, because the owner has to change two GitHub settings and merge it;
    - if any test fails on `main` before you start;
    - when Phase 10 is finished.

### Before you start

Run the build check and every Node test on `main`:

```bash
node tools/build.cjs --check
```

Then run each test listed in `.github/workflows/lab-tests.yml`, and the browser tests:

```bash
npx playwright test
```

If anything fails, stop and tell the owner before changing anything. One Firefox test, `console.spec.js` "fast pace finishes on its own; another command finishes it at once", is known to be flaky under load (Phase 2 fixes it). If it fails in the full run, rerun it on its own; if it then passes, carry on.

---

## 2. What is true today

Facts the phases rely on. Check them; the repo wins.

- The live site is GitHub Pages, "deploy from a branch" (`main`, folder `/`). A push to `main` goes live at once. CI (`lab-tests.yml`) runs at the same time as the deploy, not before it. `main` has no branch protection.
- `.github/workflows/lab-tests.yml` runs the build check and the Node tests on every push, and the browser tests on pushes to `main` and on pull requests.
- `.github/workflows/visual-baselines.yml` makes Linux screenshot baselines when started by hand.
- `playwright.config.js` compares screenshots with `maxDiffPixelRatio: 0.01`. Changing "56 lessons" to "66 lessons" on almost every screen did not fail a single one of the 102 screenshots.
- `index.html` is 1,590 KB (519 KB gzipped). The budgets are 1,900 KB total and 700 KB gzipped. App code is 297.8 KB of its 300 KB budget. `src/data/lessons.js` alone is 496 KB.
- Lessons are long HTML strings inside JavaScript in `src/data/lessons.js`. `tests/lessons.cjs` checks them. It blocks `<a ` tags, but a Markdown link `[text](https://...)` gets through.
- Every lesson has a key title (for example "Binary and the powers of two") and a `name` (for example "How to turn masks into numbers fast"). The app shows only the `name`. The web page shows the title as the heading and the `name` under it. The slug comes from the key title.
- Lessons appear in the order they were added to `LESSONS`. New lessons land at the end of their group.
- Each lab has a `tasks` list (what the learner reads) and a `checks` list (what the grader tests). The two are separate lists, with no link from a task to its checks. Task checkboxes tick only when the learner clicks them. Grading never ticks them.
- `src/app/core/sim.js` `catalogue()` makes the display data for labs: `idText` (LAB-01, INC-01, CAP-01, numbered in `LABS` order, not Path order) and `short` (an incident's title with "Incident NN: " removed). `idText` is display-only, and nothing stores it. 34 of the 37 incident titles continue in lowercase after the prefix, so the app shows titles such as "one branch fell off the map".
- The quiz already has an "Only missed or unanswered" switch (`src/app/screens/practice.js`).
- Exam topic 6, Automation and programmability (10% of the exam), has 0 labs. The Progress page shows "0/0 labs".
- The landing page's numbers are filled in at run time from `data-w` attributes (`src/app/screens/landing.js`). The meta description, the share tags and `tools/og.html` have the numbers typed in by hand.
- Committed generated files: `index.html` (also the single-file download), `lessons/*.html`, `lessons/index.html`, `sitemap.xml` and `og.png`.

---

## 3. Decisions already made

The owner has approved these defaults. Do not ask about them.

| Question | Decision |
|---|---|
| How does the site deploy? | A GitHub Actions workflow that runs every test first and deploys only if they pass. |
| What stays committed? | `index.html` stays committed, because it is the single-file download. `lessons/`, `sitemap.xml` and `og.png` stay committed too, and CI fails if any of them is out of date. |
| How do tasks get ticked? | When a grade passes every check, all of that lab's tasks are ticked and saved. The learner can still tick tasks by hand. After a grade, the header shows checks passed ("6 of 6 checks"), not ticks. |
| Lab numbers | Renumber LAB, INC and CAP in Path order. |
| Lesson headings | The same in the app and on the web: the key title is the heading, and the `name` is the line under it. Lists show the key title. |
| Automation (exam topic 6) | An automation drill in Practice, not console labs. No engine change. |
| Lesson file format | One Markdown file per lesson with a small header. Section bodies keep their current HTML exactly, so no lesson text changes. |
| The landing page picture | A small static drawing of the real workspace (map, real console text and a ping result), inside the markup budget, instead of grey bars. |
| Hosted site and the single file | Two build outputs: the single file (everything inline, works from `file://`) and the hosted site (lesson bodies loaded when a lesson opens). |

---

## 4. The phases

### Phase 1: safe deploys

**Why:** a push to `main` is live before any test runs, and nothing stops a broken build from going out.

**Build:**

1. A workflow `.github/workflows/deploy.yml`:
   - It runs on push to `main` and by hand (`workflow_dispatch`).
   - Job `test`: the build check (`node tools/build.cjs --check`), every Node test, `node tools/build-site.cjs` followed by a check that it changed nothing (`git diff --exit-code`), and the full Playwright suite.
   - Job `deploy` needs `test`. It copies only the files the site serves into a folder and publishes it with `actions/upload-pages-artifact` and `actions/deploy-pages`.
   - It uses `permissions: pages: write, id-token: write` and the `github-pages` environment.
2. Work out exactly which files the site serves today. That means everything in `sitemap.xml`, `og.png`, and every file that `index.html` and `lessons/*.html` link to. The deploy must publish all of them at the same paths, so no live address breaks.
3. Change `lab-tests.yml` so pushes to `main` no longer run the browser job (`deploy.yml` now does that). Pull requests still run it.
4. Write the two GitHub settings changes as commands for the owner to run, and put them in `CHANGES.md`:
   - **Pages source to GitHub Actions:**
     ```bash
     gh api -X PUT repos/yasukeblk/Lab4Net/pages -f build_type=workflow
     ```
   - **Branch protection on `main`:** require a pull request, and require the checks "labs" and "browser" to pass. Give the exact `gh api` call. No force pushes.
5. Update `docs/DEVELOPING.md`: how a change reaches the live site, and how to roll back (revert in a pull request; the deploy runs the tests again).

**Acceptance:**

- [ ] `deploy.yml` passes `actionlint`, or a careful read if actionlint isn't available.
- [ ] On the branch, a `workflow_dispatch` run of the test job passes. Run it with `gh workflow run deploy.yml --ref fix/01-safe-deploys` after pushing, if GitHub allows it before the file is on `main`. If it doesn't, say so.
- [ ] The list of served files is written out in `CHANGES.md`, and the deploy step copies exactly that list.
- [ ] Nothing about the app changed. `index.html` is byte for byte the same as on `main`.
- [ ] **Stop.** Open a pull request from `fix/01-safe-deploys` and give the owner the two settings commands. Once the owner has merged it and run the commands, check that the next deploy run passed and that the live site, a `?lab=` link, a lesson page and `sitemap.xml` all load. Then carry on.

### Phase 2: tests that catch real changes

**Why:** the screenshot tolerance hid a text change on every screen, the lesson checker let a Markdown link through, and one test is flaky.

**Build:**

1. **Screenshots.** In `tests/browser/visual.spec.js`, use the `mask` option to cover the parts of a screen that change on purpose: times, dates, random addresses in the subnetting drill, and anything with a clock. Then set `maxDiffPixels` small enough that one changed digit fails. Start from `maxDiffPixels: 40` and tune it so the suite is stable across three CI runs. Run the "Update screenshot baselines" workflow once with the new settings.
2. **Counts as text.** Add `tests/browser/counts.spec.js`. It reads the real counts from `L4N.data` in the page (labs, lessons, quiz questions). Then it checks that every place showing them agrees: the sidebar, Home, Progress, Practice, the landing page and the Lessons list. No literal numbers in this file.
3. **Lesson checker.** In `tests/lessons.cjs`, reject Markdown that will show as raw text: `](`, a `[` immediately followed by text and `](http`, `**`, and backticks. Add a self-test: a small bad lesson must fail, and must name the field and the reason.
4. **The flaky test.** Find out why `console.spec.js:131` sometimes fails under load in Firefox, and fix the cause. Don't add retries, longer timeouts alone, or `test.slow()`. If the cause is in the app (not the test), fix the app. Prove it with `--repeat-each=30` in Firefox while the rest of the suite runs in parallel.

**Acceptance:**

- [ ] Changing one lesson count by hand (in a scratch copy of the page, not in a commit) makes `counts.spec.js` fail and at least one screenshot fail.
- [ ] The DNS lesson as it was first pasted (with `[www.example.com](https://www.example.com)`) fails `tests/lessons.cjs` with a clear message.
- [ ] The flaky test passes 30 of 30 in the stress run.
- [ ] The browser tests pass three times in a row in CI.

### Phase 3: polish bugs

**Why:** small things that make the app look unfinished.

**Build:**

1. **Incident titles.** In `catalogue()` in `src/app/core/sim.js`, capitalise the first letter of `short` after removing "Incident NN: ". Display only. Check every place that shows an incident title: lists, workspace header, palette, Home, Progress, exam history, toasts, the popped-out window, and the lesson web pages if they mention incidents.
2. **Lab numbers in Path order.** Number LAB, INC and CAP in the order the Labs list shows with "Group: Path": stages in `CAMPAIGN` order (`src/data/campaign.js`), then the labs inside each stage as that list orders them. Labs that aren't in any stage go after, in `LABS` order. Search by number (palette, Labs filter) uses the new numbers.
3. **Landing picture.** Replace the grey-bar drawing on the landing page with a static drawing of the real workspace: the Static routing map with real device names, a few real console lines (`R1#show ip route` and a ping with `!!!!!`) and the map's ping result line. Keep it inside the 30 KB markup budget. It must look right in both themes and on a phone.
4. **Lessons side panel.** The summary in the Lessons detail pane cuts off mid-sentence. Show complete sentences: end at the last full sentence that fits, or fade the last line and keep the "Read" button visible.
5. **Empty sandbox.** Show the empty-state message on the map ("Add a device from the Build panel", with an arrow or pointer to it), not in the console area. The console area says "Select a device to open its console".

**Acceptance:**

- [ ] No incident title anywhere in the app starts with a lowercase letter. Add a browser test that walks every incident's workspace header and its row in the Labs list.
- [ ] In Path grouping, the Labs list reads LAB-01, LAB-02, LAB-03 … from the top, with no gaps.
- [ ] The landing page passes axe in both themes, and the markup budget still passes.
- [ ] Screenshots of all five changes, in both themes, are in the report.

### Phase 4: one kind of progress

**Why:** a lab graded S says "0 of 5 done" in its header, on Home and in the Labs list, and still shows "Read the lesson first".

**Build:**

1. When a grade passes every check, tick every task for that lab and save it in the lab's work (`lab4net:v2:work`). If a grade passes only some checks, change nothing.
2. In the workspace header, show "*n* of *m* checks" once the lab has been graded, and "*n* of *m* tasks" before that.
3. In the Labs list and on Home ("Continue"), a done lab shows its grade and "Done", never "0 of *m*".
4. Hide the "Read the lesson first" banner when the lab is done or the lesson is read. Hide the step-by-step tip once it has been dismissed or step-by-step has been used once (keep the existing `ui.hints` flags).
5. Saved data from before this phase: a lab that is `done` with no ticked tasks shows as done everywhere. Don't rewrite old data on load. Work it out when showing it.

**Acceptance:**

- [ ] A browser test grades Static routing with the solution and checks that all 5 tasks are ticked, the header says "6 of 6 checks", the Labs row shows S and "Done", Home's Continue shows Done with no "0 of", and the lesson banner is gone.
- [ ] A browser test loads a profile from before this phase (a `done` lab, no work) and checks the same screens.
- [ ] `tests/migrate.cjs` and `tests/validate.cjs` pass unchanged.

### Phase 5: lab screen layout

**Why:** at 1366×768 the first task starts at the bottom edge of the Tasks panel, the map takes about 40% of the space for a small network, and "Why" is squeezed into a strip under the console.

**Build:**

1. **Tasks first.** In the Tasks panel the order is: the scenario, the task list, then the address plan. The address plan becomes a collapsed "Addresses" section, open by default only in capstones. The lesson banner and the step-by-step tip become one line each with a close button.
2. **Map height follows the network.** Work out the map's height from the topology's bounding box (`pos` of the devices): short for a line of devices, taller for a mesh. Keep a minimum and a maximum. The learner can still drag the divider, and their size is remembered as now.
3. **"Why" gets room.** The "Why" explanation for the last command opens in a panel the learner can expand, at normal body text size, not the small strip.

**Acceptance:**

- [ ] For every build lab and every incident, at 1366×768 with default settings, the first task's text is fully visible in the Tasks panel without scrolling. Add a browser test that walks all of them.
- [ ] For Static routing, the console shows at least 18 lines at 1366×768.
- [ ] Phone: on the Tasks tab, task 1 is visible without scrolling at 390×844.
- [ ] The keyboard tests in `a11y.spec.js` still pass, and the divider still works with the arrow keys.

### Phase 6: Home, Progress and Practice

**Why:** Home and Progress repeat each other, "20%" next to a bar reads as "20% done", Practice is three cards and empty space, and the quiz counter is a position, not a score.

**Build:**

1. **Home:**
   - one clear next step at the top (Continue, or Start here);
   - then "Recently" (the last three labs or lessons with grades);
   - then a one-line summary that links to Progress.
   - Move the full exam-topic table to Progress only.
2. **Exam weight label.** Wherever a topic's exam weight is shown, write it as "20% of the exam" in muted text, away from the progress bar.
3. **Practice:**
   - each card gets a Start button and the last result (the last exam with its grade and date, quiz correct and "*n* to review", the subnetting score);
   - below the cards, the last five exam results.
4. **Quiz:**
   - label the counter "Question 1 of 110";
   - the Practice card's "Review *n*" button opens the quiz with "Only missed or unanswered" switched on;
   - after each answer, show "*n* left to review" when that switch is on.

**Acceptance:**

- [ ] The new-visitor and returning-user Home screens are in the report, in both themes.
- [ ] No bar on any screen has a percentage next to it that isn't the bar's own value.
- [ ] The Review button opens the quiz filtered to missed or unanswered, and the count matches.
- [ ] `counts.spec.js` from Phase 2 still passes.

### Phase 7: lessons and the automation drill

**Why:** new lessons land at the end of their group (the OSI model is 18th of 20 in Network fundamentals), each lesson has two names in two places, and exam topic 6 has no practice.

**Build:**

1. **Lesson order.** Add `src/data/lesson-order.js`: for each exam topic group, the lesson slugs in teaching order. The Lessons list, Previous and Next in the reader, the web pages' Previous and Next, and `lessons/index.html` all use it.
   - Network fundamentals starts with "The OSI and TCP/IP models", then "Binary and the powers of two", then the addressing and subnetting lessons, then the rest.
   - Put the other groups in a sensible teaching order, and explain the order in `CHANGES.md`.
   - Add a test: every lesson is listed exactly once, and every listed slug exists.
2. **One heading everywhere.** In the app reader, the heading is the lesson's key title, and the line under it is its `name`, as on the web pages. Lists (Lessons, palette, Progress, the lab's "Read the lesson" link) show the key title. Search matches both.
3. **Automation drill** (exam topic 6, mainly 6.5 REST APIs, 6.6 configuration management and 6.7 JSON), in Practice next to Subnetting, built like the subnetting drill:
   - Three kinds of question, each made from a small data file in `src/data/automation.js` (not random text):
     - read a JSON document (from a device or a controller) and answer what a key holds, or whether it is valid JSON;
     - read a REST request and response (verb, URI, status code, body) and answer what it does or what the status means;
     - match a configuration-management task to Ansible, Terraform, Puppet or Chef ideas (agent or agentless, push or pull, declarative).
   - At least 40 items, each with a short "why".
   - Its score is stored under a new field in `lab4net:v2` (an addition, with validation in `src/app/core/validate.js` and a test).
   - Progress counts it for topic 6, so the topic no longer shows "0/0".

**Acceptance:**

- [ ] `tests/lessons.cjs`, `tests/sitepages.cjs` and `tests/slugs.cjs` pass. Slugs are unchanged, and every lesson web page is still at the same address.
- [ ] The lesson order test passes, and the Lessons list in the report shows the new order.
- [ ] A browser test answers one item of each kind of automation question, right and wrong, and checks the score and the Progress page.
- [ ] Old saved data without the new field loads (`tests/validate.cjs` gets a new case for it).

### Phase 8: counts and generated files

**Why:** "56 lessons" was typed by hand in about ten places, and the generated files can go stale without anyone noticing.

**Build:**

1. **Counts from the data:**
   - In `src/index.template.html` and `tools/og.html`, replace the typed numbers with tokens such as `{{LESSONS}}`, `{{LABS}}`, `{{BUILD_LABS}}`, `{{INCIDENTS}}`, `{{CAPSTONES}}` and `{{QUIZ}}`.
   - `tools/build.cjs` and `tools/build-og.cjs` fill them in from the engine and data, the same way the tests count them.
   - The landing page's run-time fill stays as a second safety.
2. **Docs check.** Add `tests/counts.cjs`. It counts from the data and checks that every number in `README.md`, `docs/DEVELOPING.md` and `docs/LESSON-WRITING.md` that says how many labs, lessons, quiz questions, builds, incidents or capstones there are matches. Write the patterns so they can't match unrelated numbers.
3. **Browser tests without typed counts.** In `firstrun.spec.js`, `lessons.spec.js` and `quiz.spec.js`, read the counts from `L4N.data` instead of typing 66, 77 or 110.
4. **Stale files fail CI.** `lab-tests.yml` and `deploy.yml` run `node tools/build-site.cjs` and fail if `git diff --exit-code` shows any change in `lessons/` or `sitemap.xml`. Add `tools/build-og.cjs --check`, which rebuilds `og.png` and fails if the counts in `tools/og.html` would change it. Compare the filled-in HTML, not the PNG pixels.

**Acceptance:**

- [ ] Adding a fake 67th lesson in a scratch commit (not pushed to `fixes`) changes every count with no other edit, and every test still passes. Delete the scratch commit afterwards.
- [ ] Changing "66 lessons" by hand in `README.md` makes `tests/counts.cjs` fail.
- [ ] Editing a lesson without running `build-site.cjs` makes CI fail.

### Phase 9: lessons as files

**Why:** lessons are long HTML strings inside JavaScript, which are hard to edit, review and contribute to.

**Build:**

1. **One file per lesson:** `src/lessons/<slug>.md`. The format:

   ~~~text
   ---
   title: Binary and the powers of two
   name: How to turn masks into numbers fast
   topic: true
   ccna: 1.6
   mins: 8
   ---

   ## Why you need this
   <p>Every subnetting question on the exam ...</p>

   ## @terms
   - Bit: A single binary digit, 0 or 1.

   ## @exam
   - 1.6: configure and verify IPv4 addressing and subnetting. ...

   ## @mistakes
   - Forgetting to subtract 2 for hosts. ...

   ## @quiz
   ### What is the subnet mask for a /21 prefix?
   - 255.255.240.0
   - [x] 255.255.248.0
   - 255.255.252.0
   - 255.255.255.248
   > Two full octets use 16 bits, leaving 5. ...

   ## @story
   ```json
   [ ...the story steps exactly as today... ]
   ```
   ~~~

   - A heading without `@` is a section, and its body is the section's HTML, unchanged.
   - `@terms`, `@exam`, `@mistakes`, `@quiz` and `@story` are the other fields.
   - `ccna` is comma-separated.
   - Write the format up in `docs/LESSON-WRITING.md`.
2. **Converter.** `tools/build.cjs` reads `src/lessons/*.md` and builds the same `LESSONS` object, in the order given by `src/data/lesson-order.js` from Phase 7, but with keys in today's `LESSONS` insertion order so slugs and saved progress are untouched. Use plain Node; add no npm dependencies to the build.
3. **One-time conversion script.** `tools/lessons-to-md.cjs` writes the 66 files from today's `src/data/lessons.js`.
4. **Round trip.** Add a test proving that converting the files back gives an object deep-equal to today's `LESSONS`: same keys in the same order, same strings. Only then delete the lesson data from `src/data/lessons.js` (keep the `LESSONS-DATA` markers, which other code finds by name).
5. **Checking a draft.** `node tests/lessons.cjs path/to/new-lesson.md` checks a new lesson before it is added, as it does today for `.js` drafts. Keep `.js` support too.

**Acceptance:**

- [ ] The round-trip test passes for all 66 lessons.
- [ ] The built `index.html` is byte for byte the same as before this phase, apart from build comments if any. If it can't be byte for byte, prove the `LESSONS` object is deep-equal and say why.
- [ ] `tests/lessons.cjs`, `tests/slugs.cjs`, `tests/sitepages.cjs` and the full browser suite pass.
- [ ] `docs/LESSON-WRITING.md` explains the format with one complete example.

### Phase 10: a lighter hosted site

**Why:** every visitor downloads all 66 lesson bodies (about 500 KB raw) before seeing anything, and the size grows with every lesson batch.

**Build:**

1. **Two outputs from one build:**
   - `index.html`, the single file, exactly as now: everything inline, works from `file://` and offline. This is the download.
   - `site/`, for the hosted site. It's the same app, but lesson bodies are separate files (`site/lesson-data/<slug>.js`, or `.json`) loaded when a lesson is opened. The lesson index (titles, names, minutes, CCNA ids, order) stays inline, so lists, search and progress work at once.
2. **The deploy** (`deploy.yml` from Phase 1) publishes `site/` plus the lesson web pages, `sitemap.xml` and `og.png`, at the same addresses as today.
3. **When a lesson body can't load** (offline on the hosted site): show "This lesson needs a connection. The single-file version works fully offline." with a link to the download. Don't break the rest of the app.
4. **Budgets.** Add a budget for the hosted first load (everything except lesson bodies), set at today's size minus the lesson bodies, plus 10%. Add a budget per lesson body file (25 KB). Keep the single-file budgets.
5. Update `README.md` ("Run it yourself") and `docs/DEVELOPING.md` (the build, the two outputs).

**Acceptance:**

- [ ] The hosted site's first load (the HTML plus anything loaded before the first screen shows) is at least 350 KB smaller (raw) than `index.html`. Measure it and report.
- [ ] The full browser suite passes against the single file and against `site/`. Add a Playwright project for `site/`.
- [ ] Opening a lesson on the hosted build fetches only that lesson's file. Check this in a test with request counting.
- [ ] `index.html` opened from `file://` works with no network, as today.
- [ ] **Stop.** Report on all ten phases, tell the owner how to preview the branch locally, and wait. Don't merge.

---

## 5. Out of scope

- Any change to the engine, its lab data, or its 14 tests.
- New console labs. Topic 6 is covered by the drill in Phase 7.
- Accounts, servers or syncing progress between devices.
- Renaming slugs, storage keys or lesson web addresses.
