# Lab4Net redesign plan

This is the build plan for a full redesign of Lab4Net. Claude Code builds from it on the `redesign` branch.

- Written against `main` at commit `3f158d6`.
- The simulator and the lesson content stay. Everything you see and touch is rebuilt.
- When this plan and the repo disagree, the repo wins for facts and this plan wins for design. Note the difference in `CHANGES.md`.

**Facts checked in the repo that change the brief a little:**

- `index.html` is 1,435,341 bytes (about 519 KB gzipped). It is **not** mostly fonts:

  | Part | Size |
  | --- | --- |
  | Engine (`//ENGINE-START` to `//ENGINE-END`) | 566 KB |
  | Lessons data | 430 KB |
  | Interface JavaScript | 215 KB |
  | Fonts (base64) | 150 KB |
  | Stylesheet without fonts | 62 KB |
  | Markup and head | 11 KB |

- The base64 font lines are lines 23 to 27 of `index.html` today. Never print them. After Phase 0 they no longer exist in any source file.
- Completed labs are stored under the key `ccna-bench-v2`. That key is missing from the list in `DEVELOPING.md`. The migration must read it.
- Every Node test loads the engine by splitting `index.html` on `//ENGINE-START` and `//ENGINE-END`. Some also look for `const QUIZ=[`, `const CAMPAIGN=[`, `//LESSONS-DATA-START` and one exact `const slug=` line. The built file must keep all of these.
- The engine has no DOM or storage calls. It needs no changes for this plan.

---

## 1. Product summary and principles

Lab4Net is a free CCNA 200-301 lab simulator in one HTML file. You configure routers, switches and PCs from IOS-style consoles, watch packets cross a network map, and get graded on whether the network works. It has 77 labs, 56 lessons and 110 theory questions.

Principles for the redesign:

1. **The lab is the product.** Map, console and tasks get the space. Navigation and chrome stay quiet.
2. **Calm and dense.** Small type, tight rows, hairline borders, one accent colour. Nothing glows, bounces or shouts.
3. **Keyboard first.** `Ctrl/Cmd+K` reaches everything. Shortcut hints are visible next to the things they trigger.
4. **A colour means one thing everywhere.** Accent is "current or clickable". Green is "works". Red is "failed". Amber is "warning".
5. **Quiet progress.** Counts, thin bars and a letter grade. No XP, levels, trophies, combos or sound.
6. **Fast.** Chrome motion is 150 ms or less. Only packets on the map take longer, because that movement is the lesson.
7. **Trust nothing from outside.** Console input, imports, storage and messages are text until checked.
8. **Still one file, still offline.** The source is split for sanity. The shipped app is one `index.html`.

---

## 2. Feature decisions

| Feature today | Decision | What it becomes | Reason |
| --- | --- | --- | --- |
| Labs (77), tasks, checks, "why" | Keep | The Labs list and the lab workspace | This is the product. |
| Step-by-step guide switch | Keep | A toggle in the Tasks panel; steps are clickable rows | Beginners need it; it is optional. |
| Walkthrough (full solution) | Keep | "Show walkthrough" in the lab menu | Still lowers the grade, as today. |
| Incident clues (3 per incident) | Keep | "Reveal clue" in the Tasks panel | Core to troubleshooting practice. |
| Command guide dialog | Merge | A "Commands" tab in the Tasks panel | Stays next to the console instead of covering it. |
| Lessons (56) | Keep | A Lessons list and a reader | Teaches the concept before the commands. |
| Campaign with bosses | Merge | "Path": the default grouping of the Labs list, eight stages. Each stage ends with a "stage check" | The order is useful. The story mode and boss fights are arcade. |
| XP, levels, combos, trophies | Cut | Nothing | Arcade rewards. Counts and grades say the same thing quietly. |
| Ranks (S to D) | Simplify | A small "grade" chip per lab. Same scoring rules | People earned them, and results-only grading is a good rule. |
| Sound effects | Cut | Nothing | Arcade feedback. |
| Daily challenge | Merge | "Today's exam", one preset in the exam setup | Same seeded exam, no streaks. |
| Exam simulator | Keep | Practice › Exam | Timed fault-finding is real exam prep. |
| Subnetting drill | Keep | Practice › Subnetting | Small and useful. |
| Theory check (110 questions) | Keep | Practice › Quiz, with a filter by topic and a "missed" filter | Covers topics that have no lab. |
| Sandbox | Keep, simplify | Its own screen using the same map and console | Free build is valued. It is built last. |
| Pop-out guide in a second window | Keep | "Pop out" on the Tasks panel | Good on two monitors. |
| Movable, snapping windows | Cut | Fixed panes with draggable dividers and collapse | Predictable, keyboard friendly, far less code. |
| Study map | Merge | Progress › Exam topics, and "Group by exam topic" in Labs and Lessons | Same information, in the place people look for it. |
| Transfer progress | Keep | Settings › Data: export and import | People move between devices. |
| Title screen | Simplify | A plain landing section for first visits | Search engines and new visitors still need it. |
| Boot screen, DOS path line, clock | Cut | Nothing | Decoration from the old look. |
| Device hover card | Keep | Map tooltip | Useful, and the hover bug gets fixed by design. |
| Packet trace box | Keep | A one-line trace strip under the map, with details | Explains why a ping failed. |
| Result card, "LAB CLEAR!" | Simplify | Results appear in the Tasks panel plus one toast | No overlay, no celebration. |

**Grade rules (unchanged, copy them exactly):**

- A lab is done when every check passes.
- Score starts at 100. Minus 25 for the walkthrough, 15 for the guide, 5 per clue, and 2 per rejected command after the first two (at most 10).
- A run with no check command of your own tops out at A.
- S is 95 or more, A is 85, B is 70, C is 55, D is anything lower. The best grade is kept.
- Time and command count are never scored.

---

## 3. Information architecture

### 3.1 Routes

Routing uses the URL hash, so it works from a local file.

| Route | Screen |
| --- | --- |
| `#/` | Home |
| `#/labs` | Labs list |
| `#/labs/<slug>` | Lab workspace |
| `#/lessons` | Lessons list |
| `#/lessons/<slug>` | Lesson reader |
| `#/practice` | Practice hub |
| `#/practice/exam` | Exam setup, history and a running exam |
| `#/practice/quiz` | Quiz |
| `#/practice/subnetting` | Subnetting drill |
| `#/sandbox` | Sandbox |
| `#/progress` | Progress |
| `#/settings` | Settings: Appearance, Console, Data, About |
| `#/dev/components` | Component gallery. Not linked. Used by the screenshot tests |

Old links keep working:

- `?lab=<slug>` goes to `#/labs/<slug>`. `?lesson=<slug>` goes to `#/lessons/<slug>`. Both skip the landing section. The query is removed with `history.replaceState`.
- An unknown slug goes to the list screen and shows a toast: "That link is out of date."
- `?welcome` always shows the landing section.
- `?panel=tasks` is the pop-out window (section 5.4). It replaces `?guide`.

The slug function does not change. This exact line stays in the app source, because `tests/sitepages.cjs` looks for it:

```js
const slug=s=>String(s).toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
```

### 3.2 App shell

- **Sidebar** on the left, 232 px wide. It collapses to a 48 px icon rail with `[`.
- **Top bar**, 44 px tall, inside the main area. It holds the breadcrumb, a status chip and the screen's actions.
- **Main area** fills the rest.
- Inside a lab workspace the sidebar starts collapsed when the window is narrower than 1600 px. The user's choice is remembered after that.

Sidebar content, top to bottom:

1. Logo mark and "Lab4Net". Clicking it goes Home.
2. A search button: "Search or jump to…" with a `Ctrl K` hint. It opens the command palette.
3. Home
4. Labs, with a count such as `23/77`
5. Lessons, with a count such as `12/56`
6. Practice
7. Sandbox
8. Progress
9. A divider, then "Continue": the last three labs you touched.
10. At the bottom: Settings, a theme button, and "Support Lab4Net" (the Buy Me a Coffee link, opened in a new tab).

The sidebar is dimmer than the content. Inactive items use the secondary text colour. The current item has a slightly lighter row and primary text. Nothing else.

### 3.3 Command palette

`Ctrl+K` or `Cmd+K` opens it from anywhere, including the console. It is a centred dialog, 560 px wide, with one input and a list of results.

- Typing filters by fuzzy match on the title and keywords.
- `↑` and `↓` move. `Enter` runs. `Esc` closes.
- Each row shows an icon, a title, a quiet subtitle and its shortcut if it has one.
- All text goes in with `textContent`.

Commands:

| Group | Commands |
| --- | --- |
| Go to | Home, Labs, Lessons, Practice, Sandbox, Progress, Settings |
| Labs | "Open lab: `<title>`" for all 77. Search also matches the group, the objective number (for example `3.4`) and the objective name |
| Lessons | "Open lesson: `<title>`" for all 56 |
| In a lab | Grade lab · Toggle step-by-step · Reveal next clue · Show walkthrough · Reset lab · Open this lab's lesson · Focus console · Focus map · Focus tasks · Switch to device `<name>` (one per device) · Replay last packet · Clear console · Pop out tasks · Collapse or expand each panel · Reset panel sizes |
| Practice | Start exam… · Today's exam · Resume exam · Start quiz · Subnetting drill |
| Appearance | Theme: dark · Theme: light · Theme: system · Toggle sidebar · Console: match theme · Console: always dark |
| Data | Export backup · Import backup |
| Help | Keyboard shortcuts · About Lab4Net · Free lessons on the web · Source on GitHub · Support Lab4Net |

Commands that do not apply are hidden. For example "Grade lab" only shows in a lab, and help commands are hidden during an exam.

### 3.4 Keyboard shortcuts

Single keys only fire when focus is **not** in an input. In a lab the console input usually has focus, so every lab shortcut also has a modifier form.

| Keys | Action | Where |
| --- | --- | --- |
| `Ctrl/Cmd+K` | Command palette | Everywhere |
| `?` | Shortcut list | Outside inputs. In the console `?` is IOS help |
| `G` then `H` | Home | Outside inputs |
| `G` then `L` | Labs | Outside inputs |
| `G` then `E` | Lessons | Outside inputs |
| `G` then `P` | Practice | Outside inputs |
| `G` then `B` | Sandbox ("build") | Outside inputs |
| `G` then `R` | Progress | Outside inputs |
| `G` then `,` | Settings | Outside inputs |
| `[` | Collapse or expand the sidebar | Outside inputs |
| `/` | Focus the list filter | List screens |
| `J` / `K` or `↓` / `↑` | Next / previous row | Lists |
| `Enter` | Open the selected row | Lists |
| `Esc` | Close a dialog, menu or tooltip. In the console: move focus out of the input | Everywhere |
| `Ctrl+Enter` | Grade the lab | Lab |
| `Alt+1` / `Alt+2` / `Alt+3` | Focus Tasks / Map / Console | Lab |
| `Alt+.` / `Alt+,` | Next / previous device console | Lab |
| `Alt+S` | Toggle step-by-step | Lab |
| `F6` / `Shift+F6` | Move focus to the next / previous pane | Lab |
| `N` / `P` | Next / previous lesson section | Lesson reader |
| `1` to `4` | Pick an answer | Quiz |
| `Enter` | Check, then next | Quiz and subnetting |

Console keys are listed in section 5.6.

Hints are shown in three places: next to palette rows, in tooltips on buttons (a small key chip), and in the `?` shortcut list.

Code must check every `Alt` shortcut in Chromium, Firefox and Safari. If one clashes with the browser, drop it and leave the palette command.

---

## 4. Design system

All values are CSS custom properties in `src/styles/tokens.css`. Components never use raw colours or sizes.

Linear's public write-ups describe a few ideas this system borrows: a small set of theme inputs, perceptually even neutrals, navigation that recedes so content leads, and structure that is "felt, not seen". The tokens below are Lab4Net's own. No Linear CSS, icons or assets are used.

### 4.1 Colour tokens

Dark is the default. Light is a full theme, not an inverted one. The theme is set with `data-theme="dark"` or `data-theme="light"` on `<html>`.

```css
:root, [data-theme="dark"] {
  /* surfaces, darkest to lightest */
  --bg-app:      #0D0E10;  /* sidebar, page edge */
  --bg-surface:  #131416;  /* main content */
  --bg-raised:   #191A1D;  /* cards, panels headers */
  --bg-overlay:  #1F2024;  /* menus, dialogs, tooltips, toasts */
  --bg-hover:    #1C1D21;  /* row and button hover */
  --bg-active:   #24262B;  /* selected row, pressed */
  --bg-console:  #0A0B0C;

  /* lines */
  --border-subtle:  #1E1F23;  /* dividers inside a surface */
  --border:         #2A2C31;  /* panel and card edges */
  --border-control: #6A6D76;  /* inputs, checkboxes, outlined buttons */

  /* text */
  --text:    #EDEEF0;
  --text-2:  #A3A6AD;   /* secondary */
  --text-3:  #858891;   /* hints, placeholders, meta */
  --text-console:     #D9DBDF;
  --text-console-dim: #8B8E97;

  /* the one accent */
  --accent:        #6C9BFF;  /* links, focus ring, selected marks, icons */
  --accent-solid:  #2F6BEB;  /* primary button fill */
  --accent-on:     #FFFFFF;  /* text on accent-solid */
  --accent-soft:   #16223D;  /* tinted background for the current item */

  /* meaning */
  --ok:    #45C08A;
  --bad:   #F2707A;
  --warn:  #E3AC45;

  --scrim: rgba(0, 0, 0, 0.5);
  color-scheme: dark;
}

[data-theme="light"] {
  --bg-app:      #F3F3F1;
  --bg-surface:  #FFFFFF;
  --bg-raised:   #FFFFFF;
  --bg-overlay:  #FFFFFF;
  --bg-hover:    #EEEEEB;
  --bg-active:   #E5E5E1;
  --bg-console:  #FAFAF8;

  --border-subtle:  #ECECE9;
  --border:         #DEDEDA;
  --border-control: #85878E;

  --text:    #1A1B1E;
  --text-2:  #54565D;
  --text-3:  #696B73;
  --text-console:     #1A1B1E;
  --text-console-dim: #62646C;

  --accent:        #1F56D0;
  --accent-solid:  #1F56D0;
  --accent-on:     #FFFFFF;
  --accent-soft:   #E6EDFC;

  --ok:    #17784A;
  --bad:   #C22E3D;
  --warn:  #8F5B00;

  --scrim: rgba(20, 20, 22, 0.35);
  color-scheme: light;
}

/* "Console: always dark" re-applies the dark console tokens on the console only */
[data-console="dark"] .console {
  --bg-console: #0A0B0C; --text-console: #D9DBDF; --text-console-dim: #8B8E97;
  --ok: #45C08A; --bad: #F2707A; --warn: #E3AC45; --accent: #6C9BFF;
}
```

**Contrast figures** (WCAG 2.x ratio, calculated from the hex values above). Text needs 4.5. Control edges and focus rings need 3.

| Pair | Dark | Light |
| --- | --- | --- |
| `--text` on `--bg-surface` | 15.9 | 17.2 |
| `--text` on `--bg-app` | 16.6 | 15.5 |
| `--text` on `--bg-overlay` | 14.0 | 17.2 |
| `--text` on `--bg-active` | 13.0 | 13.6 |
| `--text-2` on `--bg-surface` | 7.6 | 7.3 |
| `--text-2` on `--bg-app` | 7.9 | 6.6 |
| `--text-2` on `--bg-hover` | 6.9 | 6.3 |
| `--text-2` on `--bg-overlay` | 6.7 | 7.3 |
| `--text-3` on `--bg-surface` | 5.2 | 5.3 |
| `--text-3` on `--bg-app` | 5.5 | 4.8 |
| `--text-3` on `--bg-overlay` | 4.6 | 5.3 |
| `--text-3` on `--bg-active` | 4.3 (not allowed) | 4.2 (not allowed) |
| `--accent` on `--bg-surface` | 6.8 | 6.4 |
| `--accent` on `--bg-app` | 7.2 | 5.7 |
| `--accent` on `--bg-active` | 5.6 | 5.0 |
| `--accent` on `--accent-soft` | 5.8 | 5.4 |
| `--accent-on` on `--accent-solid` | 4.8 | 6.4 |
| `--ok` on `--bg-surface` | 8.0 | 5.5 |
| `--bad` on `--bg-surface` | 6.5 | 5.6 |
| `--warn` on `--bg-surface` | 9.0 | 5.7 |
| `--ok` / `--bad` / `--warn` on `--bg-app` | 8.4 / 6.8 / 9.4 | 5.0 / 5.0 / 5.2 |
| `--text-console` on `--bg-console` | 14.2 | 16.5 |
| `--text-console-dim` on `--bg-console` | 6.0 | 5.7 |
| `--ok` / `--bad` / `--warn` on `--bg-console` | 8.6 / 6.9 / 9.6 | 5.3 / 5.4 / 5.5 |
| `--border-control` on `--bg-surface` (edge) | 3.6 | 3.6 |
| `--border-control` on `--bg-overlay` (edge) | 3.2 | 3.6 |
| `--accent-solid` on `--bg-surface` (button edge) | 3.9 | 6.4 |

Rules that follow from the table:

- `--text-3` is never used on a selected row. Selected rows use `--text` and `--text-2`.
- `--border` and `--border-subtle` are decoration only. Anything you must see to use a control uses `--border-control`.
- State is never shown by colour alone. Every state also has an icon, a shape or a word.

### 4.2 Type

- UI and reading text: **Inter**, embedded.
- Console and code: **JetBrains Mono** Regular, embedded. Both are SIL OFL 1.1.
- Fallbacks only if a font fails to load: `system-ui, sans-serif` and `ui-monospace, Consolas, Menlo, monospace`.

```css
:root {
  --font-ui:   "Inter", system-ui, -apple-system, "Segoe UI", sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, Consolas, Menlo, monospace;

  --fs-11: 11px;  --lh-11: 16px;   /* key chips, port labels */
  --fs-12: 12px;  --lh-12: 16px;   /* meta, chips, table headers */
  --fs-13: 13px;  --lh-13: 20px;   /* base UI text */
  --fs-14: 14px;  --lh-14: 22px;   /* task text, dialog body */
  --fs-16: 16px;  --lh-16: 26px;   /* lesson reading text */
  --fs-18: 18px;  --lh-18: 26px;   /* panel and section titles */
  --fs-22: 22px;  --lh-22: 30px;   /* screen titles */
  --fs-28: 28px;  --lh-28: 36px;   /* landing headline, lesson title */

  --fw-regular: 400;
  --fw-medium:  500;   /* labels, buttons, current nav item */
  --fw-semi:    600;   /* headings */

  --track-tight: -0.012em;  /* 18px and larger */
  --track-caps:  0.04em;    /* the few uppercase 11px labels */

  --fs-console: 13px;  --lh-console: 20px;
}
```

- Body text is 13 px. Lessons read at 16 px with a 68-character line.
- Numbers in tables, counts and timers use `font-variant-numeric: tabular-nums`.
- No italics for emphasis in the UI. No uppercase except 11 px section labels.

### 4.3 Spacing, radii, borders, elevation, motion

```css
:root {
  --space-1: 4px;  --space-2: 8px;   --space-3: 12px; --space-4: 16px;
  --space-5: 20px; --space-6: 24px;  --space-8: 32px; --space-10: 40px; --space-12: 48px;

  --row-h:     32px;   /* list rows, nav items, menu items */
  --control-h: 28px;   /* buttons, inputs, selects */
  --control-h-lg: 36px;/* primary action on a page, phone controls */
  --topbar-h:  44px;
  --sidebar-w: 232px;  --sidebar-w-rail: 48px;

  --radius-1: 4px;     /* chips, key chips, checkboxes */
  --radius-2: 6px;     /* buttons, inputs, rows */
  --radius-3: 8px;     /* cards, panels, menus */
  --radius-4: 12px;    /* dialogs, the palette */
  --radius-full: 999px;

  --hairline: 1px;
  --focus-ring: 0 0 0 2px var(--bg-surface), 0 0 0 4px var(--accent);

  --shadow-1: 0 1px 2px rgba(0,0,0,.20);                              /* cards, if any */
  --shadow-2: 0 4px 16px rgba(0,0,0,.28), 0 0 0 1px var(--border);    /* menus, tooltips, toasts */
  --shadow-3: 0 16px 48px rgba(0,0,0,.40), 0 0 0 1px var(--border);   /* dialogs, palette */

  --dur-1: 80ms;    /* hover, press */
  --dur-2: 120ms;   /* menus, tooltips, tabs */
  --dur-3: 150ms;   /* dialogs, panel collapse, toasts */
  --ease: cubic-bezier(.2, 0, 0, 1);

  --pkt-speed: 0.42;   /* map packet: px per ms. Content, not chrome */
}
[data-theme="light"] {
  --shadow-1: 0 1px 2px rgba(20,20,22,.06);
  --shadow-2: 0 4px 16px rgba(20,20,22,.10), 0 0 0 1px var(--border);
  --shadow-3: 0 16px 48px rgba(20,20,22,.16), 0 0 0 1px var(--border);
}
@media (prefers-reduced-motion: reduce) {
  :root { --dur-1: 0ms; --dur-2: 0ms; --dur-3: 0ms; }
}
```

- Borders are 1 px. Panels are separated by one hairline, not by boxes inside boxes.
- In dark mode, depth comes from a lighter surface plus a hairline. Shadows are only for things that float.
- Motion is opacity and a 4 px slide at most. No scale bounce, no glow, no skew.
- Reduced motion is honoured two ways: the durations above drop to 0, and JavaScript animation (packets, console pacing) checks the same media query. Settings also has a "Reduce motion" switch that forces it.
- The smallest click target is 24 by 24 px. On phones, rows and buttons are 40 px tall.

### 4.4 Icons

One inline SVG sprite, drawn for Lab4Net. No icon library.

- 16 by 16 grid, 1.5 px stroke, round caps and joins, `stroke="currentColor"`, no fills.
- Corners and curves snap to half pixels so 1.5 px strokes stay crisp.
- Used like this (same-document references work from a local file):

```html
<svg class="icon" aria-hidden="true"><use href="#i-check"/></svg>
```

- Icon-only buttons always have an `aria-label` and a tooltip.

UI icons to draw (about 50):

- Navigation: `home`, `labs` (a console window with a prompt), `lessons` (open book), `practice` (target), `sandbox` (dotted square with a plus), `progress` (three bars), `settings` (two sliders), `search`.
- Status: `circle` (to do), `circle-half` (in progress), `check-circle` (done), `x-circle` (failed), `alert` (triangle), `info`, `clock`, `lock`.
- Actions: `check`, `x`, `plus`, `minus`, `play`, `replay`, `reset`, `undo`, `redo`, `copy`, `download`, `upload`, `trash`, `filter`, `more` (three dots), `external`, `pop-out`, `eye`, `bulb` (clue), `list-checks`, `route` (trace), `cable`, `note`, `keyboard`, `heart`.
- Layout: `sidebar`, `panel-left`, `panel-bottom`, `maximize`, `minimize`, `chevron-right`, `chevron-down`, `chevron-left`, `chevron-up`, `grip` (divider).
- Theme: `sun`, `moon`, `monitor`.

Device icons for the map are a second set (40 by 40 grid, 1.5 px stroke at map scale, `--bg-raised` fill so links do not show through):

| Device | Drawing |
| --- | --- |
| Router | A circle with four short arrows pointing out: up, right, down, left |
| Switch | A wide rounded rectangle with two arrows, one pointing left and one right |
| Layer 3 switch | The switch, with a small circle badge at the top right holding a "3" |
| PC | A monitor with a short stand |
| Server | Two stacked slabs, each with a small dot |
| IP phone | A desk phone outline: a tilted rectangle with a small keypad square |
| Access point | A short rounded bar with two arcs above it |

These are plain geometric drawings made for Lab4Net. Do not copy any vendor's icon artwork.

### 4.5 Logo

- **Mark:** a rounded square tile in `--accent-solid`. Inside, in white: a dot at the top left, a line going down and then right to a second dot at the bottom right. The line is a cable between two devices, and it also reads as an "L". A smaller dot sits halfway along the bottom run: a packet.
- **Wordmark:** "Lab4Net" in Inter Semibold with tight tracking, in `--text`. No effects.
- **Favicon:** the mark as an inline SVG data URI. It must read at 16 px.
- **Share image (`og.png`, 1200 by 630):** dark background, mark and wordmark, the line "Learn the CCNA by doing it.", and a cropped screenshot of the lab workspace. Made by `tools/build-og.cjs` with Playwright from `tools/og.html`. The PNG is committed.

Illustrative sketch of the mark (Code refines the geometry):

```html
<svg viewBox="0 0 32 32" aria-hidden="true">
  <rect width="32" height="32" rx="7" fill="var(--accent-solid)"/>
  <path d="M10 9v11a3 3 0 0 0 3 3h9" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>
  <circle cx="10" cy="9" r="2.5" fill="#fff"/><circle cx="23" cy="23" r="2.5" fill="#fff"/>
  <circle cx="16.5" cy="23" r="1.4" fill="var(--accent-solid)"/>
</svg>
```

### 4.6 Components

Every component is built once in Phase 1 and shown on `#/dev/components` in both themes.

**Buttons**

- Height `--control-h`, padding `0 var(--space-3)`, radius `--radius-2`, 13 px medium text. An icon is 16 px with an 8 px gap.
- Primary: `--accent-solid` fill, `--accent-on` text. One per screen at most.
- Secondary: transparent fill, `--border-control` edge, `--text`.
- Ghost: no edge, `--text-2`. Hover gives `--bg-hover` and `--text`.
- Danger: secondary with `--bad` text. Used for reset and delete only.
- Icon button: 28 px square, ghost style.
- States: hover lightens with `--bg-hover`; pressed uses `--bg-active`; disabled is 50% opacity with `aria-disabled`; focus shows `--focus-ring`.
- A shortcut hint can sit at the right of a button as a key chip.

**Inputs**

- Text input and select: height `--control-h`, `--bg-surface` fill, `--border-control` edge, radius `--radius-2`. Focus changes the edge to `--accent` and adds the focus ring.
- Placeholder uses `--text-3`.
- Checkbox: 16 px, `--radius-1`. Checked is `--accent-solid` with a white check. It sits in a 24 px click area.
- Switch: 28 by 16 px track. On is `--accent-solid`. It always has a visible text label.
- Segmented control: a row of ghost buttons in one hairline frame. The selected one has `--bg-active`. Uses `role="radiogroup"`.
- Errors: `--bad` edge, an `alert` icon and a text message linked with `aria-describedby`.

**Chips**

- Height 20 px, padding `0 var(--space-2)`, radius `--radius-1`, 12 px text, hairline edge, transparent fill.
- Status chip: a 6 px dot or 12 px icon plus a word. "To do" (empty circle, `--text-3`), "In progress" (half circle, `--warn`), "Done" (check, `--ok`), "Failed" (x, `--bad`).
- Objective chip: `CCNA 3.4` in mono 11 px, `--text-2`. The tooltip gives the objective name.
- Grade chip: one letter in mono. S uses `--accent`. A to D use `--text-2`.
- Key chip: 11 px mono in a 18 px tall box with a hairline, for shortcut hints.
- Type chip: "Build", "Incident", "Capstone", "Topic".

**Tabs**

- Text tabs in a row, 32 px tall. The current tab has `--text` and a 2 px `--accent` underline. Others use `--text-2`.
- `role="tablist"`. Arrow keys move, `Home` and `End` jump.
- Device tabs in the console add a device icon and a status dot.

**Lists**

- Rows are `--row-h` tall with `--space-3` side padding. No row borders. Groups have an 11 px uppercase label with a count.
- Hover is `--bg-hover`. Selected is `--bg-active` plus a 2 px accent bar at the left edge.
- A row reads left to right: status icon, ID in mono `--text-3`, title, then right-aligned meta (chips, counts).
- Keyboard: `J`/`K` or arrows move, `Enter` opens. Uses roving `tabindex`.

**Tables**

- Used for the address plan, exam history and exam topics.
- 12 px header in `--text-2`, 13 px cells, 32 px rows, a hairline under the header only, tabular numbers.
- Wide tables scroll inside their own box. The page never scrolls sideways.

**Dialogs**

- The native `<dialog>` element with `showModal()`. Width 480 px (560 px for the palette), radius `--radius-4`, `--bg-overlay`, `--shadow-3`, `--scrim` behind.
- Title 18 px semibold, body 14 px, actions right-aligned with the primary last.
- `Esc` and a click on the scrim close it. Focus returns to the button that opened it.
- A dialog opens only when the user asks for it. Nothing opens one on load or after an action. Confirmations for reset and import use a dialog; everything else is inline.

**Toasts**

- Bottom right, 320 px wide, `--bg-overlay`, `--shadow-2`. An icon, one line of text and an optional action.
- They leave after 5 seconds, pause on hover or focus, and can be closed. At most three show at once.
- The container is `role="status"`. Errors use `role="alert"`.

**Tooltips**

- 12 px text on `--bg-overlay`, radius `--radius-1`, `--shadow-2`, at most 240 px wide.
- 400 ms delay on hover, none on keyboard focus. `Esc` hides.
- `pointer-events: none`, so a tooltip can never sit under the cursor and cause flicker.
- A tooltip never holds the only copy of important information.

**Menus**

- `--bg-overlay`, radius `--radius-3`, `--shadow-2`, 4 px padding, rows `--row-h` tall with an icon, a label and a right-aligned key chip.
- `role="menu"`. Arrow keys move, type-ahead works, `Esc` closes and returns focus.

**Empty states**

- Centred in the pane: a 24 px icon in `--text-3`, one line saying what is empty, one line saying what to do, and one button.
- Example: "No labs match. Clear the filters." with a "Clear filters" button.

**Other pieces**

- Progress bar: 4 px tall, `--border` track, `--accent` fill, with the number written next to it.
- Divider handle: a 1 px line that grows a 3 px accent line on hover and focus. Section 5.4 covers behaviour.
- Callout: a block with a hairline, a 2 px left bar in `--accent`, `--warn` or `--bad`, an icon and text. Used for lesson notes and "common mistake".
- Code: inline code is mono 12 px on `--bg-hover` with `--radius-1`. Command rows are mono 13 px, full width, and clickable where the guide allows.
- Skeletons and spinners are not needed. Everything is local and instant.

---

## 5. Screen-by-screen specs

Sizes are for a 1366 by 768 window unless stated. Every screen must also work at 1920 by 1080 and at 390 by 844.

### 5.1 Landing and first run

**Landing section**

- Static HTML at the top of `<body>`, so search engines and link previews can read it.
- Shown only on a first visit with no deep link, or with `?welcome`. A tiny inline script hides it before paint for everyone else.
- Content, in one calm column, 720 px wide:
  - The mark and "Lab4Net".
  - Headline: "Learn the CCNA by doing it."
  - One paragraph on what it is.
  - Primary button "Start", plus text links: "Free CCNA lessons" and "Source on GitHub".
  - A still picture of the lab workspace, drawn as inline SVG.
  - Five short facts in a row: Free · No sign-up · No ads · Works offline · Open source.
  - Three short feature blocks: the labs (with live counts filled in from `LABS` and `LESSONS`), the console, the map.
  - The footer: where progress is stored, the counter sentence (only on the public site), the Cisco trademark notice, and the licence.
- "Start" stores that the landing was seen and goes Home. `Esc` does the same.
- Settings › About has "Show the landing page again".

**First run inside the app**

- No tour and no modal.
- Home shows a "Start here" card until the first lab is done: the first lab, a "Start lab" button, and three lines: "Read the tasks.", "Type commands in the console.", "Press Grade when the network works."
- The first time a lab opens, the Tasks panel shows one callout: "New here? Turn on step-by-step to see the commands for each task." It has a "Got it" button and never returns.
- A build lab that has a lesson shows a one-line banner the first time: "Read the lesson first (8 min)" with "Open lesson" and "Skip". It does not block the lab.
- If old progress was imported (section 6.3), one toast says so: "Your progress was carried over: 23 labs and 12 lessons."

### 5.2 Home

One column, 880 px wide, centred. Top to bottom:

1. **Continue.** The lab you touched last: title, group, task progress such as "4 of 9 tasks", and a "Resume" button. If an exam is running, this card is the exam with its clock and "Resume exam".
2. **Next up.** The next three labs on the Path that are not done, as list rows.
3. **Progress.** Three numbers with thin bars: Labs `23/77`, Lessons `12/56`, Quiz `40/110`.
4. **Exam topics.** The six CCNA domains with their exam weight and a bar for coverage. Each row links to Progress.
5. **Practice.** Three ghost buttons: "Today's exam", "Quiz", "Subnetting".

Empty state for a new user: the "Start here" card replaces Continue, and the bars show zero.

### 5.3 Labs list

A list on the left and a detail pane on the right.

**Top bar:** "Labs", a filter input (`/`), and three controls:

- Group by: **Path** (default) · Type · Exam topic.
- Status: All · To do · In progress · Done.
- Type: All · Build · Incident · Capstone.

**Path grouping:** the eight stages from `CAMPAIGN`, in order, each a group header with its title, a count such as `3/7`, and a thin bar. The stage's `story` text is the first paragraph of the stage's detail pane. The `outro` shows there once the stage is complete. At the end of each stage's rows is one more row, "Stage check", if the stage has a `boss`:

- `mode: 'sabotage'`: a fault-find exam limited to that stage's labs, with `boss.minutes` on the clock.
- `mode: 'incident'`: the named incident. The stage check is passed when that incident is done.
- `mode: 'boss'`: a fault-find exam with three hidden faults and `boss.minutes` on the clock.

A stage with `need` shows "Finish N labs to unlock the stage check". The Path grouping is the eight lab groups in `CAMPAIGN` order, so every lab appears once.

**Row:** status icon · ID · title · objective chips (two at most, then `+2`) · grade chip · task count.

- IDs are for display only: `LAB-01` to `LAB-38` for build labs in order, `INC-01` to `INC-37` for incidents, `CAP-01` and `CAP-02` for capstones.
- An incident's title drops its "Incident 07: " prefix in the row, because the ID already says it.

**Detail pane** (420 px, shown when the window is 1280 px or wider): title, type and status chips, the brief, objectives with names, "9 tasks · 5 devices", a small still map of the topology, the grade, a link to the lesson, and buttons "Open lab" (primary, `Enter`) and "Reset" (if there is saved work).

- Below 1280 px there is no detail pane. A row opens the lab directly.
- The filter matches the title, brief, group, objective number and objective name.
- Empty state: "No labs match." with "Clear filters".

### 5.4 Lab workspace

This is the heart of the product.

**Layout at 1366 by 768** (sidebar collapsed to 48 px, so 1318 px remain):

```
┌──────────────────────────────────────────────────────────────────────────┐
│ top bar: Labs › Switching › VLANs and access ports   [In progress]  Grade│
├───────────────────┬──────────────────────────────────────────────────────┤
│ Tasks panel       │ Map                                                  │
│ 340 px            │ about 290 px tall                                    │
│                   ├──────────────────────────────────────────────────────┤
│ Tasks | Commands  │ trace strip (one line, 32 px)                        │
│                   ├──────────────────────────────────────────────────────┤
│                   │ Console                                              │
│                   │ device tabs · output · prompt                        │
│                   │ about 400 px tall, at least 80 columns wide          │
└───────────────────┴──────────────────────────────────────────────────────┘
```

- At 1600 px and wider the user can switch to "side by side": Tasks, Map and Console as three columns. The default stays stacked. The choice is saved.
- The console must fit 80 mono characters without wrapping at every desktop size. If the Tasks panel is dragged too wide for that, the drag stops.

**Top bar**

- Breadcrumb: `Labs › <group> › <title>`. Each part is a link.
- Status chip: To do, In progress, Done, plus the grade chip when there is one.
- Right side: "Lesson" (ghost, if the lab has one), "Grade" (primary, with a `Ctrl ↵` key chip), and a `more` menu: Show walkthrough · Reset lab · Pop out tasks · Layout: stacked or side by side · Reset panel sizes.

**Resize**

- Two dividers: between Tasks and the right side, and between Map and Console.
- Drag with the pointer. Double-click resets to the default.
- Each divider is `role="separator"` with `aria-orientation`, `aria-valuenow`, and a `tabindex`. Arrow keys move it 16 px. `Home` and `End` go to the limits.
- Limits: Tasks 280 to 520 px. Map at least 160 px tall. Console at least 200 px tall.
- Sizes are saved as fractions, per layout.

**Collapse**

- Tasks collapses to a 36 px strip at the left with its icon and a count such as `4/9`. Clicking the strip or `Alt+1` opens it.
- Map collapses to its 32 px header. The trace strip stays visible, so ping results are never lost.
- Console has "Maximise", which collapses the Map. Pressing it again restores.
- Collapse state is saved.

**Pop out**

- Only the Tasks panel pops out. It opens `index.html?panel=tasks` in a new window, sized 420 by 760.
- While it is out, the workspace shows the Tasks strip with "Open in the other window" and a "Dock" button. The Map and Console take the space.
- The pop-out shows tasks, steps, clues, the address plan and the grade results. Clicking a step sends `{device, command}` to the main window, which puts it in the console input. It does not run it.
- The two windows talk over a `BroadcastChannel`. The main window owns all state and all storage. The pop-out stores nothing and only draws what it is sent.
- Every message is checked: same origin, known type, and the right shape. Text goes in with `textContent`. The pop-out receives data, never HTML.
- If the pop-out closes or goes quiet for 9 seconds, the panel docks itself.
- From a local file (`file://`) the pop-out is not offered. The menu item is hidden.
- During an exam the pop-out is closed and not offered.

**Tasks panel**

Two tabs: **Tasks** and **Commands**.

Tasks tab, top to bottom:

1. The brief: one or two lines, with objective chips.
2. For incidents, a callout: "This network worked until something changed. Find it, make the smallest repair, keep everything else working."
3. **Address plan**: a collapsible table (Device, Interface, Address). Open by default.
4. A row with the **Step-by-step** switch (`Alt+S`) and the count "4 of 9 done".
5. **The task list.** Each task has:
   - a checkbox (yours to tick; grading ignores it),
   - the task text (trusted lab content with `<code>`),
   - "Why" as a disclosure with the task's reason,
   - with step-by-step on: the steps as command rows grouped by device. A click selects that device's console and puts the command in the input. A step that starts with `#` is a note, shown as text.
6. **Clues** (incidents only): "Reveal clue 1 of 3", with a note that each clue costs 5 points.
7. **Results**, after Grade: a summary line ("7 of 9 checks pass" or "Lab complete · Grade A"), then every check with a pass or fail icon. For a finished incident, the root cause. Then "Next lab".
8. **Walkthrough**, if opened: every device's commands with the reason for each.

After any new command, the results show "Commands run since grading. Grade again." and the old marks dim.

Commands tab: a search input, an "All modes" switch, and the commands the selected device supports in its current mode, each with its reason from `WHYC`. A click puts the pattern in the console input.

Capstones open with step-by-step off, and the choice is remembered per capstone, as today.

**Exam mode in the workspace**

- The top bar shows the exam name and a clock chip. Under two minutes the clock turns `--warn` and gains a clock icon.
- Hidden: step-by-step, why, walkthrough, clues, the Commands tab, the lesson link, and the "why" line under the console.
- Grade shows "2 of 5 checks pass" and no per-check list until the exam ends.
- Other labs, lessons, practice and the sandbox are locked while an exam runs. The lock is a toast with "Resume exam" and "Give up", not a dialog.

**Phone (390 px wide)**

- The sidebar becomes a drawer opened from a menu button in the top bar.
- One pane shows at a time. A bottom bar switches between Tasks, Map and Console.
- The console input sits above a row of helper keys: `Tab`, `?`, `↑`, `↓`, `Ctrl+C`, `Ctrl+Z`.
- Running a ping from the console shows a one-line result bar above the input, with "View on map".
- Nothing scrolls sideways. Console output wraps on phones only.

### 5.5 Network map

**Structure**

- One SVG. The lab's `pos` coordinates are used as they are (a 600 by 245 space). `viewBox` is fitted to the devices plus padding, with `preserveAspectRatio="xMidYMid meet"`.
- Layers, bottom to top: links, port labels, devices, effects (packets and markers).
- The tooltip is an HTML element outside the SVG.
- **The map is never rebuilt with `innerHTML` after a lab opens.** Each device and link element is created once and kept by key. Updates only change attributes and classes. This is what removes hover flicker and lost focus.

**Devices**

- Each device is one group:

```html
<g class="node" data-dev="R1" tabindex="0" role="button"
   aria-label="R1, router, 2 of 3 interfaces up. Open console.">
  <rect class="hit" .../>   <!-- transparent, covers icon AND label, plus 6 px -->
  <use href="#d-router" .../>
  <text class="label">R1</text>
</g>
```

- Icon 36 px. Label below it: the hostname, 12 px, `--text-2`.
- The selected device has `--text` for its label and a 1.5 px `--accent` ring around the icon. It also has `aria-pressed="true"`.
- Click, `Enter` or `Space` opens that device's console and moves focus to the input.
- Arrow keys move focus between devices by position.
- Hover and focus give the icon a `--bg-hover` fill. No movement.

**Hover tooltips**

- The hover target is the whole group: the icon, the label and the padding between them, through the one `hit` rectangle.
- Use `pointerenter` and `pointerleave` on the group. They do not fire when the pointer moves between the icon and the label. Do not use `mouseover` or `mouseout`.
- Show after 120 ms. Hide 80 ms after leaving. Moving to another device swaps the content with no gap.
- The tooltip has `pointer-events: none`. It is placed above the device and flips below when there is no room. It never covers the device it describes.
- Keyboard focus shows the same tooltip. `Esc` hides it.
- Content: hostname and kind · each interface with a state dot, its name and its address · one extra line by kind (router: number of routes; switch: number of VLANs; host: default gateway).
- All values go in with `textContent`. A hostname is user input.

**Links**

- A 1.5 px line in `--text-3` when up.
- When down: dashed and `--bad` at 70% opacity.
- Each end has a 5 px state mark: a filled `--ok` dot when up, a hollow `--bad` ring when down. Shape and colour both change.
- An err-disabled port shows a small `alert` glyph at that end.
- Port names (`G0/1`) are 10 px mono in `--text-3` beside each end, unless the lab sets `hidePorts`.
- Parallel links between the same two devices are drawn 12 px apart.
- When a link changes state, it flashes once to `--text` over 150 ms. No flash under reduced motion.
- A link blocked by spanning tree shows a short bar across the blocked end, with the tooltip "Blocked by spanning tree".

**Packet animation**

- Runs for anything that produces a trace: ping, traceroute, Telnet and SSH.
- Request: a 5 px `--accent` dot travels the real path at `--pkt-speed`, at least 180 ms per hop. Each link it crosses gains a 2 px `--accent` highlight.
- Reply: the same in the other direction, with a hollow dot, so the two are different without colour.
- ARP broadcasts and unknown-unicast floods: small dots fan out along every edge in the event. A blocked edge shows the dot stopping at a short bar.
- Highlights fade 1.5 s after the run ends. Markers stay.
- A new command cancels the running animation at once.
- **Reduced motion:** no moving dots. The path is highlighted in one step and the marker appears.

**Failure and success markers**

- Success: a small `check-circle` badge in `--ok` at the top right of the source device, and the trace strip says "Reply received".
- Failure: an `x-circle` badge in `--bad` on the device where the packet stopped, plus a label chip beside it with the reason in words: "Blocked by ACL", "No route from here", "Reply has no route back", "Port closed".
- Markers stay until the next command. They do not fade on a timer.
- The label chip is placed so it stays inside the map and off other devices.

**Trace strip**

- One line under the map: a result icon and words, the path (`PC1 → SW1 → R1 → PC3`, and "stopped at R1" for a failure), then "Details" and "Replay".
- "Details" opens a block with the request path, the reply path, a plain explanation, and the Switching section (one line per switch, with a `show mac address-table` tip after a flood).
- The strip is `aria-live="polite"`, so the result is read out.

**Screen-reader support**

- The SVG is `role="group"` with a label such as "Network map: 5 devices, 4 links".
- A visually hidden list next to it describes every link: "R1 G0/0 to SW1 G0/1, up." It updates when a link changes.
- Devices are buttons with full labels, as shown above.
- Effects are `aria-hidden`. The trace strip carries the result.

### 5.6 Console

**Parts, top to bottom**

1. **Device tabs**: one per device, with its icon, hostname and a state dot. `role="tablist"`.
2. **Tool row**: a mode chip ("Privileged EXEC", "Interface configuration", "Host console", or "Answer" during a question), "Clear", and "Maximise".
3. **Output**: mono 13 px, 20 px lines, on `--bg-console`. It keeps the last 2,000 lines per device.
4. **Prompt row**: the prompt text and the input on the same line, as on a real terminal.
5. **Why line**: after an accepted command, "Why: …" from the engine's explanations. Otherwise key hints: `? help · Tab complete · ↑↓ history · Ctrl+Z end`.

**Prompt**

- The prompt comes from the engine (`promptOf`, following remote sessions with `effSess`, `effPair` and `effPrompt`).
- While output is playing, the prompt is hidden and the placeholder says "Running… Ctrl+C to stop".
- For a masked question (a password), the input becomes `type="password"`, the echo shows nothing, and the answer stays out of history.

**Output**

- Each line is a `<span>` filled with `textContent`. Nothing typed is ever parsed as HTML.
- Line styles: the echoed command in `--text-console`; normal output in `--text-console`; `%` errors and the `^` marker in `--bad`; warnings and partial results in `--warn`; success lines in `--ok`; log messages in `--text-console-dim`. Reuse the old `lineClass` rules for which line is which.
- Clicking the output focuses the input, unless text is selected. Copying works normally.
- The view sticks to the bottom unless the user has scrolled up. Then a small "Jump to latest" button appears.

**Output pacing**

- The engine attaches timing to ping and traceroute output (`s.pace`). The console plays it by character or line.
- Speed is a setting: **Real time** (1.0), **Fast** (0.4, the default, same as today) and **Instant**.
- Reduced motion forces Instant.
- Running another command finishes the current output at once, so nothing is lost or reordered.
- `Ctrl+C` or `Ctrl+Shift+6` stops a run and prints the engine's abort summary.
- Only one output plays at a time. Debug messages for other devices land in their own tabs.

**`?` help**

- Typing `?` acts at once, without Enter, as on IOS. The console prints the prompt and the line so far with `?`, then the choices in two columns: keyword and description (`KWHELP`).
- The line stays in the input without the `?`.
- No match prints `% Unrecognized command`.
- During a question, `?` is a normal character.

**Tab completion**

- `Tab` completes the current word when exactly one keyword fits, and adds a space.
- With several matches or none, nothing changes, as on IOS.
- `Tab` never leaves the input. To move focus out, press `Esc`, then `Tab` works as normal. The key hints say so, and this is announced once to screen readers.

**History and editing keys**

| Keys | Action |
| --- | --- |
| `↑` / `↓`, or `Ctrl+P` / `Ctrl+N` | Previous / next command, per device session |
| `Ctrl+A` / `Ctrl+E` | Start / end of line |
| `Ctrl+U` | Clear the line |
| `Ctrl+L` | Clear the screen |
| `Ctrl+Z` | IOS `end` |
| `Ctrl+C`, `Ctrl+Shift+6` | Stop the running output |
| `Enter` | Run. An empty line gives a fresh prompt, or answers a question |
| `Esc` | Move focus out of the input |

- Pasting several lines runs them one at a time, in order, up to 200 lines. This is how you paste a config.
- A line is limited to 512 characters. A lab is limited to 5,000 saved commands. Both limits exist today and stay.

**Screen-reader support**

- The input is labelled "Console for R1, privileged EXEC".
- The visible output is not a live region, because character-by-character playback would be noise.
- A hidden `role="log"` region receives each command's finished output as one message, cut to 20 lines with "and 14 more lines".
- The tab panel is labelled by its device tab.

**Errors**

- Every engine call goes through `safeExec`. If a handler throws, that one command prints `% Lab4Net internal error: …` and the lab carries on.

### 5.7 Lessons list

- The same list-and-detail layout as Labs.
- Group by: **Exam topic** (default, the six domains) · Type (Lab lessons, Topic lessons).
- Row: read state icon · title · minutes · objective chips · quick-check score such as `3/4`.
- Detail pane: title, minutes, objectives, the first section's opening lines, "Read" (primary) and "Open the lab" when there is one.
- The top bar has a text link: "These lessons are also on the web", pointing at the public `lessons/` pages.

### 5.8 Lesson reader

- A reading column 680 px wide, 16 px text, with a section list ("On this page") at the right from 1280 px up.
- Top bar: `Lessons › <title>`, minutes, a read chip, and "Practise in the lab" (primary) for lab lessons.
- Order of content:
  1. Title and objective chips.
  2. The sections (`sections`: heading and trusted lesson HTML).
  3. **See it happen** (lab lessons): the lab's map, drawn by the same map component, with the story steps. "Previous" and "Next" step through; each step highlights its path and shows its label, with pass or fail styling. Under reduced motion each step is a still picture.
  4. Key terms, as a definition list.
  5. Exam notes and Common mistakes, as callouts.
  6. Quick check: the questions with four options each, in the fixed shuffled order the data defines. Picking one shows right or wrong and the explanation.
  7. Previous and next lesson links.
- A lesson is marked read when the reader reaches the end of the sections, or presses "Mark as read".
- Lesson HTML is trusted repo content checked by `tests/lessons.cjs`. Nothing else is ever inserted as HTML.

### 5.9 Practice hub

Three cards on one page, each with a short line and its own stats:

- **Exam** · "Timed fault-finding with no help." · last result and count of exams passed.
- **Quiz** · "110 theory questions." · `40/110` correct.
- **Subnetting** · "Find the network, broadcast and host range." · fields right on first try.

**Exam** (`#/practice/exam`)

- Setup, on the page (not a dialog):
  - Mode: **Fault-find** (a finished lab with one or two hidden faults) · **Build** (a random build lab from scratch) · **Incident** (a random incident) · **Today's** (fault-find, seeded by the date, the same for everyone that day).
  - Time: 10, 20 or 30 minutes.
  - "Start exam".
- Stage checks start from the Labs list (section 5.3) and use the stage's own `boss` settings.
- A running exam opens the lab workspace in exam mode (section 5.4). Only one exam runs at a time. The page shows "Resume" and "Give up" while one runs.
- The clock is the wall clock. An exam whose time ran out while you were away is graded from its saved commands on the next load.
- An exam never changes a lab's own progress or grade.
- The end shows, in the Tasks panel: passed or not, the grade, time used, every check, and the faults that were hidden.
- History: a table of the last 40 exams (date, mode, lab, result, grade, time).

**Quiz** (`#/practice/quiz`)

- Filters: topic (the eight quiz domains) and "Only missed or unanswered".
- One question at a time: the question, four options (`1` to `4`), "Check", then the explanation and "Next".
- A thin bar shows position in the current set. The score per topic is listed at the side.
- Answers are saved by question index, as today. New questions are only ever added at the end of `QUIZ`.

**Subnetting** (`#/practice/subnetting`)

- Range: Mixed /8 to /30 · Warm-up /24 to /26 · Small networks /27 to /30.
- A large address and prefix, then six fields: network address, broadcast address, first host, last host, subnet mask, usable hosts.
- "Check" marks each field with an icon and shows the right answer for wrong ones, then the worked reason (the block method).
- Only the first check of each question counts toward the score.

### 5.10 Progress

One column, 880 px wide.

1. **Summary.** Labs done, lessons read, quiz correct, exams passed. Numbers with thin bars.
2. **Exam topics** (this replaces the Study map). A table of the six domains: weight, labs done, lessons read, a coverage bar. Each row expands to its objectives. Each objective lists its labs and lessons with their status, as links.
3. **Path.** The eight stages with a bar each and the stage-check result.
4. **Grades.** A count of labs at each grade, S to D, as five small numbers. No chart.
5. **Exam history.** The same table as on the Exam page.
6. **Recently finished.** The last ten labs and lessons with dates.

No streaks, no points, no badges.

### 5.11 Settings and About

One page with four sections, each a simple list of rows (label on the left, control on the right).

- **Appearance:** Theme (Dark, Light, System) · Reduce motion (switch) · Sidebar starts collapsed in labs (switch).
- **Console:** Console colours (Match theme, Always dark) · Output speed (Real time, Fast, Instant) · Start labs with step-by-step on (switch).
- **Data:**
  - "Export backup" downloads `lab4net-backup.json`.
  - "Import backup" reads a version 2 file or an old version 1 file. It says what it will add before it does it. It merges: finished labs and the better grade are kept, and saved work is replaced only for labs in the file.
  - After an import the page shows a "Reload now" button. It never reloads by itself.
  - "Reset everything" (danger, with a confirm dialog).
  - One line: "Your progress is stored only in this browser."
- **About:** version and build date · what Lab4Net is · the Cisco trademark notice · the privacy note (the counter sentence shows only on the public site; otherwise "This copy makes no network requests.") · font credits (Inter and JetBrains Mono, SIL OFL 1.1) · links: lessons on the web, GitHub, licence, "Support Lab4Net" · "Keyboard shortcuts" · "Show the landing page again".

### 5.12 Sandbox

- The lab workspace layout, with the left panel replaced by a **Build** panel.
- Build panel: device buttons (Router, Router with 5 ports, Switch, Switch with 24 ports, Layer 3 switch, PC, Server) · tools (Select, Cable, Note, Delete) · Undo and Redo · starter kits · the four goals (the old "challenges") with a check when met · Save to file and Load from file.
- Map: a larger canvas (1600 by 660) with zoom (`+`, `-`, Fit) and pan (drag the background, or arrow keys with the map focused).
- Devices can be dragged. Cabling asks which port on each end, in a small menu. At most 20 devices, as today.
- Undo keeps 80 steps. `Ctrl+Z` is undo only when focus is outside the console.
- The console is the same component.
- A loaded file is checked field by field (names, types, ports, limits) before use. It carries data only.
- Meeting a goal shows a check and a toast. Nothing else.

### 5.13 Lesson web pages

These are the public pages in `lessons/`, written by `tools/build-site.cjs`.

- Same file names and URLs as today. Nothing is renamed.
- Plain HTML and one stylesheet, `lessons/site.css`, generated from the same token file as the app.
- The theme follows the visitor's system setting with `prefers-color-scheme`. There is no theme button, because the only script allowed on these pages is the visit counter.
- Fonts are files in `lessons/fonts/` (Inter and JetBrains Mono). The old font files are deleted.
- Page layout: a slim header (mark, "Lab4Net", "Lessons", "Open the app"), a 680 px reading column, the lab's map as a static SVG in the new icon style, sections, the story steps as a numbered list, key terms, exam notes, mistakes, the quick check with answers behind `<details>`, a "Practise it" button (`../?lab=<slug>` or `../?lesson=<slug>`), previous and next links, and the footer with the trademark notice.
- The index page groups lessons by CCNA domain as list rows.
- Each page keeps its title, description, canonical link, share tags and JSON-LD. `tests/sitepages.cjs` checks them.

---

## 6. Architecture

### 6.1 File layout

```
index.html                 built, committed, the whole app
og.png                     built, committed
sitemap.xml                built by tools/build-site.cjs, committed
lessons/                   built by tools/build-site.cjs, committed
package.json               scripts and test-only dev dependencies
src/
  index.template.html      head, landing section, app root, include markers
  manifest.json            the ordered list of CSS and JS files to inline
  fonts/                   Inter and JetBrains Mono .woff2 (latin subset)
  icons/ui.svg             UI icon symbols
  icons/devices.svg        map device symbols
  styles/
    tokens.css             section 4
    base.css               reset, type, focus, scrollbars
    components.css         buttons, inputs, chips, tabs, lists, tables, dialogs, toasts, tooltips, menus
    shell.css              sidebar, top bar, palette
    workspace.css          panes, tasks panel
    map.css  console.css  lessons.css  practice.css  screens.css  landing.css  phone.css
  engine/                  the simulator, split at its existing section comments, order kept
    00-core.js  10-v2.js  20-v3.js  30-labs.js  40-steps.js  50-curriculum.js
    60-library.js  70-ping.js  75-console.js  80-switching.js  82-source.js
    84-prompts.js  86-exam.js  88-duplex.js  90-ipv6-live.js
  data/
    quiz.js                const QUIZ=[ … ];
    campaign.js            const CAMPAIGN=[ … ];
    lessons.js             the LESSONS data block, with its two markers
    objectives.js          the extra CCNA_OBJECTIVES names that sit beside the lessons today
  app/
    core/                  no DOM in here; testable in Node
      slug.js  store.js  migrate.js  validate.js  sim.js  grade.js  exam.js  router.js  search.js
    ui/
      dom.js               el(), text(), icon(): the only way elements are made
      components/          button, menu, dialog, toast, tooltip, tabs, list, palette
      shell.js  shortcuts.js  theme.js
    screens/
      home.js  labs.js  workspace.js  tasks.js  map.js  console.js  trace.js  popout.js
      lessons.js  reader.js  practice.js  exam.js  quiz.js  subnet.js
      sandbox.js  progress.js  settings.js  landing.js
    site.js                SITE settings, the counter, the donate link
    main.js                boot
tools/
  build.cjs                builds index.html
  build-site.cjs           builds lessons/ and sitemap.xml
  build-og.cjs             builds og.png (needs Playwright)
tests/
  *.cjs                    the Node tests (unchanged) plus new ones
  browser/                 Playwright tests
  fixtures/                frozen slugs, old-storage samples, old backups
```

Module style:

- Plain scripts, not ES modules. They are joined into one `<script>` in manifest order.
- The engine files keep their top-level `const` and `function` declarations, exactly as today. The data files do too.
- Every `app/` file is wrapped in a function and adds itself to one object, `L4N`:

```js
(function (L4N) {
  'use strict';
  L4N.grade = { score, letter };
  function score(run) { /* … */ }
})(window.L4N = window.L4N || {});
```

- No framework. A framework would add a build chain and a runtime to a one-file offline app, and the UI is a few screens over a state store. A 40-line `el()` helper and a small store are enough.
- The old habit of wrapping functions by reassigning their names stops in the interface. Screens subscribe to the store instead.

### 6.2 Build script

`node tools/build.cjs` writes `index.html`. `node tools/build.cjs --check` exits 1 if the committed file differs.

- Node only. No packages.
- It reads `src/index.template.html` and fills the markers:
  - `/*@fonts*/`: one `@font-face` per font file, as base64.
  - `/*@css*/`: the stylesheets in manifest order.
  - `<!--@icons-->`: both SVG sprites, hidden.
  - `//@js`: the script, in this order:
    1. `//ENGINE-START`, the engine files, `//ENGINE-END`
    2. the data files
    3. the app files
- The output is the same for the same input: no timestamps and no random values. The version and date come from `package.json`.
- It does not minify. The file stays readable, and gzip does the real work.
- It prints a size table and fails if a budget is broken.

**Size budget**

| Part | Budget | Today |
| --- | --- | --- |
| Engine and data | no budget, about 1,000 KB | 996 KB |
| App JavaScript | 300 KB | 215 KB |
| CSS without fonts | 70 KB | 62 KB |
| Fonts as base64 | 170 KB | 150 KB |
| Icons, markup, landing | 30 KB | 11 KB |
| **`index.html` total** | **1,550 KB** | 1,435 KB |
| **gzipped** | **570 KB** | 519 KB |

Fonts:

- Take the latin-subset `.woff2` files from the `@fontsource-variable/inter` and `@fontsource/jetbrains-mono` npm packages once, and commit them to `src/fonts/`. They are not a runtime or build dependency after that.
- Inter: the variable weight file if it is 90 KB or less. Otherwise three static files: 400, 500 and 600.
- JetBrains Mono: 400 only.
- Check that tabular numbers survive the subset.

**What must stay true in the built file** (the Node tests depend on it):

- `//ENGINE-START` and `//ENGINE-END` each appear once, and everything between them runs on its own in a Node `vm`.
- `const QUIZ=[` begins the quiz and the first `\n];` after it ends it.
- `const CAMPAIGN=[` begins the stages and the first `\n];` after it ends it.
- `//LESSONS-DATA-START` and `//LESSONS-DATA-END` surround the lessons, which are `Object.assign(LESSONS,{…})` blocks. `const LESSONS={};` is declared just before the first marker.
- The exact `const slug=` line from section 3.1 appears in the app.
- `const SITE={host:'yasukeblk.github.io',donate:'https://buymeacoffee.com/yasukeblk',counter:'lab4net'};` keeps that exact shape, because `tools/build-site.cjs` reads it.

**Engine changes**

- None are planned. The new design calls the same functions the old interface called.
- Phase 0 records a SHA-256 of the engine block from `main`. `tests/build.cjs` checks the built engine block against it.
- If a later phase truly needs an engine hook, it must be additive (a new function or a new field), must not change any existing output, and must be written up in `CHANGES.md` with the reason. The hash is then updated in the same commit.

**Install scripts**

- `install-lxc.sh` and the `Dockerfile` already copy only `index.html`. They keep working with no change, because the built file is committed.
- Fix the old name in `install-lxc.sh` and `docker-compose.yml` ("CCNA Lab Bench") to "Lab4Net" while there.
- CI adds `node tools/build.cjs --check`.

### 6.3 State and storage

**In memory**

- One store: `L4N.store`. It holds settings, progress, the open lab's state and UI state.
- `store.get()`, `store.set(patch)`, `store.subscribe(fn)`. Screens draw from it and never read `localStorage` themselves.
- The open lab: `{lab, net, sess, journal, sel, tasks, graded, run, trace}`. `net` and `sess` are engine objects and are never saved. Saved work is the command journal, replayed onto a fresh `build()`, as today.

**New keys**

| Key | Holds |
| --- | --- |
| `lab4net:v2` | `{v: 2, settings, labs, lessons, quiz, subnet, exam, ui, migrated}` |
| `lab4net:v2:work` | `{[labSlug]: {journal: [{device, line, t}], tasks: [bool]}}` |
| `lab4net:v2:sandbox` | The sandbox build |
| `lab4net:v2:pending` | A checked backup waiting for "Reload now" |

Shapes inside `lab4net:v2`:

```js
{
  v: 2,
  settings: { theme: 'dark', motion: 'auto', consoleTheme: 'match', pace: 'fast',
              guideDefault: false, sidebarInLabs: 'auto' },
  labs:    { 'static-routing': { done: true, grade: 'A', doneAt: 1731600000000,
                                 clues: 0, guide: false, run: { errs: 1, checks: 3, help: false, walk: false } } },
  lessons: { 'static-routing': { read: true, quiz: { 0: true, 1: false } } },
  quiz:    { rev: 2, answers: { 0: true, 5: false } },
  subnet:  { right: 42, total: 60 },
  exam:    { current: null, history: [ /* at most 40 */ ] },
  ui:      { sidebar: 'open', layout: 'stacked', panes: { tasks: 0.26, map: 0.42 },
             collapsed: {}, lastLab: 'static-routing', landingSeen: true, hints: {} },
  migrated: { from: 'v1', at: 1731600000000, labs: 23, lessons: 12 }
}
```

- Labs and lessons are keyed by slug. Slugs are unique and frozen (a test checks both).
- Work is in its own key so a full disk can never cost someone their finished labs.
- Every write is wrapped in `try`. If storage fails, the top bar shows "Not saved. Export a backup to keep your work."
- **Everything read from storage is checked before use** (`core/validate.js`): types, allowed values, known slugs, lengths. Anything odd is dropped, not shown.

**One-time import from the old keys**

Runs on boot when `lab4net:v2` does not exist. It is one pure function, `L4N.migrate.fromV1(readKey)`, so it can be tested in Node.

| Old key | What is imported |
| --- | --- |
| `ccna-bench-v2` | `title: true` becomes `labs[slug].done`. `quiz` becomes `quiz.answers`. If `quizRev` is below 2, answers 29, 69, 70, 90, 97, 98, 99, 101 and 104 are dropped first, because those questions were rewritten. `drill {r, t}` becomes `subnet` |
| `lab4net-fun-v1` | `ranks[title]` becomes `labs[slug].grade` (only `S`, `A`, `B`, `C`, `D`). `cleared[title]` also counts as done |
| `lab4net-lessons-v1` | `{read, q}` per lesson becomes `lessons[slug]` |
| `lab4net-workspace-v1` | `drafts[title]` becomes saved work, only if it replays cleanly on the lab. `lastLab` becomes `ui.lastLab` |
| `lab4net-incident-hints` | Clues already revealed per incident |
| `lab4net-capstone-guide` | The guide choice per capstone |
| `lab4net-welcomed` | `ui.landingSeen` |

Rules:

- Only titles that exist in `LABS` and `LESSONS` are imported. `Exam · …` titles are skipped.
- Old data is untrusted. It goes through the same checks as a backup file.
- **The old keys are not deleted.** If the release has to be rolled back, the old app still finds its data.
- Not imported, so they reset: XP, trophies, combos, sound, window layout, campaign stage, exam history, the running exam, the sandbox build and sandbox goals.
- The import runs once. `migrated` records it.

**Backups**

- Export: `{format: 'lab4net', version: 2, exported: <ms>, data: {…}}` with the contents of the `v2`, `work` and `sandbox` keys.
- Import accepts version 2, and version 1 files from the old app (through `fromV1`).
- Limits: 5 MB, 5,000 commands per lab, 512 characters per command, no line breaks in a command. Saved work is kept only if it replays.
- A backup carries data only. As a second line of defence, `<` and `>` are stripped from every imported string that is not a console command. Console commands are only ever shown with `textContent`.

### 6.4 Routing

- `core/router.js` parses `location.hash` into `{screen, slug}` and calls the screen's `mount(root, params)` and `unmount()`.
- Leaving a lab saves its work first.
- An unknown route goes Home.
- The route is data. A slug from the URL is looked up in a table and never written into the page as HTML.
- The document title follows the screen: "Static routing · Lab4Net".
- On each screen change, focus moves to the screen's heading, and a hidden live region announces the screen name.
- `?panel=tasks` boots only the pop-out: it mounts the tasks view, opens the channel and never touches storage.

### 6.5 How the UI calls the engine

All engine calls live in `core/sim.js`. Screens never call engine globals directly.

| `L4N.sim` function | Engine pieces used |
| --- | --- |
| `open(lab, saved)` → `{net, sess, journal}` | `lab.build()`, replay through `execLine`, `SIM_NOW`, `promptOf`, `effPrompt` |
| `exec(state, device, line)` → `{lines, pace, trace, why, masked}` | `execLine` inside `safeExec`, `s.pace`, `TRACE`, `s.last` with `WHYC` |
| `prompt(state, device)` → `{text, masked, mode}` | `promptOf`, `effSess`, `effPair`, `effPrompt` |
| `help(state, device, line)` → rows | `candidates`, `KWHELP` |
| `complete(state, device, line)` → string or null | `candidates` |
| `grade(state)` → `[[text, passed]]` | `lab.checks` |
| `links(state)` → link states | `net.links`, `ifUp`, `stpBlocked` |
| `describe(state, device)` → tooltip data | `net.devs`, `ifUp`, `routes` |
| `drain(state)` → messages per device | `d.conq` |
| `steps(lab)` and `why(cmd)` | `lab.steps`, `whyOf` |
| `commands(state, device)` | `CMDS`, `WHYC` |
| `exam.make(mode, seed, pool)` | `examFault`, `examLab`, `solvedNet`, `labPasses`, `failingChecks`, `seedRng` |
| `sandbox.*` | `mkNet`, `mkRouter`, `mkSwitch`, `mkL3Switch`, `mkPC`, `link` |
| `subnet.*` | `ip2n`, `n2ip`, `netOf`, `lenMask` |

- Time: the engine clock is `simNow()`. Replay sets `SIM_NOW` to each saved command's time, as today.
- A trace is read right after the command that made it, then `TRACE` is cleared.
- Engine output is plain text lines. Lab task text, lesson HTML and "why" text are repo content and may contain `<code>` and similar. They are the only strings inserted as HTML, and only through one helper, `dom.trusted()`, which is easy to search for in review.

### 6.6 Network use

- One place makes requests: `site.js`.
- The counter sends one cookieless page view only when `location.hostname === SITE.host` and Do Not Track is off. It sends a `start` event when "Start" is pressed on the landing section.
- The Buy Me a Coffee link is a normal link, opened in a new tab with `rel="noopener noreferrer"`.
- Nothing else: no CDN, no external fonts, no images from other hosts. A test proves it (section 8).

---

## 7. Build phases

Rules for every phase:

- Work on the `redesign` branch. Never push to `main`. `main` is the live site.
- A phase is done only when its acceptance list passes and all Node tests pass.
- Run `node tools/build.cjs` and commit the built `index.html` with every change.
- Look at the result in a real browser at 1366 by 768, in both themes, before calling a phase done.
- Add a plain-language entry to `CHANGES.md` per phase.
- New CSS class names must not be `router`, `switch`, `pc` or `srv` on their own. Use prefixes such as `node--router`.

### Phase 0: Prep

Goal: split the source and add the build, with no change to the app.

- Create the branch. Tag `main` as `v1-arcade` first.
- Run every Node test on `main` and record the result as the baseline.
- Move the engine into `src/engine/`, cut at the existing `// ----------` section comments, order kept.
- Move `QUIZ`, `CAMPAIGN`, the lessons block and the extra objective names into `src/data/`.
- Move the old interface, stylesheet, fonts and markup into `src/legacy/` for now.
- Write `tools/build.cjs` with `--check`, and `package.json` with scripts.
- Record the engine block's SHA-256 in `tests/fixtures/engine.sha256`.
- Record every lab and lesson slug in `tests/fixtures/slugs.json`.
- Add `tests/build.cjs` and `tests/slugs.cjs`, and add both plus the build check to GitHub Actions.

Acceptance:

- The built `index.html` is byte-for-byte the same as `main`'s.
- All 15 Node tests in the workflow pass, untouched.
- `tests/build.cjs`: the build is up to date and the engine hash matches.
- `tests/slugs.cjs`: slugs are unique and match the frozen list.

### Phase 1: Design system and app shell

Goal: the new look exists, and you can move around an empty app.

- Delete `src/legacy/`. From here the branch is the new app.
- Tokens, base styles, fonts (Inter, JetBrains Mono), both icon sprites, the logo and favicon.
- Every component from section 4.6, shown on `#/dev/components`.
- The shell: sidebar, top bar, router, command palette (navigation and appearance commands), shortcuts, shortcut list, theme switch, toasts.
- The store, `lab4net:v2` with settings only, and the Settings screen (Appearance and About).
- Placeholder screens with proper empty states for every route.
- Update `THIRD-PARTY-NOTICES.md`: remove Barlow Condensed, VT323 and IBM Plex Sans; add Inter and JetBrains Mono with their copyright lines and Reserved Font Names from the font packages.
- Make the smallest change to `tools/build-site.cjs` so it reads fonts from `src/fonts/` and colours from `src/styles/tokens.css`, then regenerate `lessons/`. This keeps `tests/sitepages.cjs` passing until the pages are redesigned in Phase 6.
- Start the Playwright setup.

Acceptance:

- Every route loads from a local file and from a local server with no console errors.
- The whole shell works with the keyboard only. Focus is always visible.
- `Ctrl+K` opens the palette from any screen, and `Esc` returns focus to where it was.
- Theme changes at once, is remembered, and "System" follows the OS.
- Contrast: an automated check passes on the gallery in both themes.
- With reduced motion on, no transition or animation runs.
- No old font, colour or class name remains (`grep` for `VT323`, `Barlow`, `Plex`, `--yel`, `--mag`, `skewX`).
- Tests: `shell.spec`, `a11y.spec` (gallery and shell), `visual.spec` for the gallery and shell at three sizes and two themes.

### Phase 2: Lab workspace, part 1: console and engine bridge

Goal: open a lab by URL and finish it from the console.

- `core/sim.js`, `core/grade.js`, and saved work in `lab4net:v2:work` with replay.
- The workspace frame with fixed default pane sizes.
- The full console from section 5.6.
- A minimal Tasks panel: brief, address plan, task list with checkboxes and "why", and Grade with results.
- A plain placeholder in the Map pane that lists devices as buttons, so devices can be selected.
- The test hook `L4N.test` (section 8.3).

Acceptance:

- `#/labs/<slug>` opens each of the 77 labs.
- Every lab passes Grade after its solution is run through the UI (`labs-all.spec`).
- Reloading restores the console state from saved commands. A corrupt saved lab opens fresh with a toast.
- `console.spec` passes: prompts per mode, the `^` error, `% Incomplete` and `% Ambiguous`, `?` help, Tab, history, a masked password, Telnet into another device and back, `reload`, live ping pacing, `Ctrl+C`, pasting several lines, reduced motion gives instant output.
- An engine error in one command prints the internal error line and the lab carries on.
- Markup typed into the console shows as text (`security.spec`, console part).

### Phase 3: Lab workspace, part 2: map and panes

Goal: the map is real, and panes resize and collapse.

- The map from section 5.5: devices, links, port labels, selection, tooltips, packet animation, floods, markers, the trace strip, screen-reader text.
- Pane dividers, collapse, maximise, the side-by-side layout, saved sizes.
- The phone layout for the workspace.

Acceptance:

- `map.spec` passes:
  - Clicking or pressing `Enter` on a device opens its console.
  - **Hover:** moving the pointer from a device's icon to its label and back, in 2 px steps, shows the tooltip once and never hides it. The tooltip element is never under the pointer.
  - The map's device elements are the same DOM nodes before and after 20 commands.
  - A working ping ends with the success marker and "Reply received". A blocked ping ends with the failure marker on the right device and the reason in words.
  - A link taken down with `shutdown` changes to the down style at both ends.
  - With reduced motion on, no dot moves and the result still shows.
- Dividers work with the pointer and the keyboard, respect their limits, and survive a reload.
- The console keeps 80 columns at 1366 by 768 in the default layout.
- `phone.spec` (workspace part): no sideways scroll at 390 wide; the bottom bar switches panes; the helper keys work.
- `visual.spec` for the workspace: default, a failed ping, Tasks collapsed, phone.

### Phase 4: Lab workspace, part 3: guide, clues, grades, pop-out

Goal: the workspace is complete.

- Step-by-step with clickable steps, the walkthrough, the Commands tab, incident clues.
- Grade scoring exactly as in section 2, stored per lab. Reset lab.
- The capstone default (step-by-step starts off, remembered per capstone).
- The pop-out Tasks window.
- First-run callouts in the workspace.

Acceptance:

- For five sample labs (one per kind, including an incident and a capstone), following the step-by-step rows through real clicks and `Enter` ends in a passing Grade.
- Grade letters match a table of scripted runs: clean run with a check command gives S; no check command gives A; guide on, walkthrough opened, clues used, and many typos each lower the score as specified.
- Extra `show` and `ping` commands never lower a grade.
- `popout.spec`: open, step to console, change lab, reload the main window and reconnect, close the pop-out and see it dock, Dock button.
- `security.spec`, message part: a hostile page that opens the app or the pop-out and posts messages cannot inject markup, type into the console, or be taken for the pop-out.

### Phase 5: Home, Labs list, progress storage, migration, first run

Goal: a returning user lands in the new app with their history.

- Home and the Labs list, with grouping, filters and the detail pane.
- Lab palette commands and "Open lab" search.
- `core/migrate.js` and `core/validate.js`. The one-time import. Settings › Data: export, import (version 1 and 2), reset.
- Deep links (`?lab=`, `?lesson=`), the landing section, first-run cards.
- `site.js`: the counter and the donate link.

Acceptance:

- `tests/migrate.cjs` (Node): fixtures of old storage become the expected new state; bad values are dropped; `Exam · …` titles are skipped; old keys are left alone.
- `deeplinks.spec`: `?lab=static-routing` opens that lab and cleans the URL; an unknown slug lands on the list with a toast; `?welcome` shows the landing section; a first visit shows it and a second does not.
- `firstrun.spec`: a browser seeded with the old keys shows the same finished labs, grades and read lessons, plus the one-time toast. The old keys still exist afterwards.
- `security.spec`, backup part: a doctored version 1 backup and a doctored version 2 backup, with markup in every string and key, import without running anything; so does doctored storage on load.
- `offline.spec`: opened from `file://`, the app makes no network request at all. On the public host name it sends exactly one count; with Do Not Track on it sends none.
- Labs list keyboard: `/`, `J`, `K`, `Enter` work; filters combine; the empty state shows.

### Phase 6: Lessons and the lesson web pages

Goal: lessons read well in the app and on the web.

- The Lessons list and the reader, including "See it happen" on the shared map component and the quick check.
- Lesson progress in the store. The lesson banner in labs.
- Rewrite `tools/build-site.cjs` for the new design. Regenerate `lessons/` and `sitemap.xml`. Delete the old font files.
- `tools/build-og.cjs` and the new `og.png`. Update the share tags and `theme-color`.

Acceptance:

- `node tests/lessons.cjs` and `node tests/sitepages.cjs` pass. `sitepages.cjs` may need small edits only if a check is about the old look; list each edit in `CHANGES.md`.
- The set of file names in `lessons/` is the same as on `main` (checked against `tests/fixtures/slugs.json`).
- `lessonpages.spec`: every page renders with one `h1`, no script except the counter, working links back into the app, no sideways scroll at 390 wide, and correct colours in both `prefers-color-scheme` settings.
- All 56 lessons open in the reader. Reading one marks it read. Quick-check answers are saved.
- `?lesson=<slug>` opens the reader.

### Phase 7: Practice and Progress

Goal: exam, quiz, subnetting and the Progress screen.

- `core/exam.js`: start, clock, settle when away, give up, history, the lock while an exam runs.
- Exam mode in the workspace. Stage checks in the Labs list.
- Quiz with filters. Subnetting drill.
- The Progress screen, including Exam topics.

Acceptance:

- `exam.spec`: start each mode; the same seed gives the same faults; fixing the faults passes; time running out grades and records; a reload resumes; a second exam cannot start; other labs are locked with the toast; an exam leaves the base lab's progress untouched; "Today's" is the same on two fresh profiles on the same date.
- Help is truly absent in exam mode: no steps, why, walkthrough, clues, Commands tab or lesson link in the DOM.
- `quiz.spec` and `subnet.spec`: answers are saved by index; filters work; the first check counts once.
- Progress numbers equal the store's contents for a seeded profile.
- `node tests/exam.cjs`, `node tests/quiz.cjs` and `node tests/campaign.cjs` pass, untouched.

### Phase 8: Sandbox

Goal: free build in the new workspace.

- The Build panel, device placing and dragging, cabling with a port chooser, notes, delete, zoom and pan, undo and redo, starter kits, the four goals, save and load.

Acceptance:

- `sandbox.spec`: build two PCs and a switch, address them, ping across, and see the packet on the map; undo and redo each step; save, reset, load and get the same network; a doctored file is refused or cleaned and runs nothing; each of the four goals can be met.
- `Ctrl+Z` in the console is IOS `end`; outside it, undo.
- At most 20 devices; the limit is explained in words when reached.

### Phase 9: Polish and release

Goal: ready for the owner's preview, then merge.

- Phone pass on every screen. Accessibility pass on every screen.
- Final screenshots and baselines. Size budget check.
- Rewrite `README.md` (features, screenshots, font credits, test commands) and `docs/DEVELOPING.md` (file layout, build, storage, rules). Keep `docs/LESSON-WRITING.md` correct.
- Record a new `docs/demo.gif` from the new app.
- Remove `docs/REVIEW-FIXES.md` references that no longer apply.
- Owner preview: open the built `index.html` from the branch, or serve the folder.
- After approval: merge to `main`. Check the live site, a `?lab=` link, a lesson page and the counter.

Acceptance:

- Every test in section 8 passes in CI.
- No sideways scroll at 390 wide on any route.
- The keyboard-only run passes: open the app, find a lab with the palette, finish it, grade it, read a lesson, answer a quiz question, change the theme.
- `index.html` is within the size budget.
- The owner has approved the preview.
- Rollback plan written in `CHANGES.md`: revert the merge commit; old storage keys were never deleted.

---

## 8. Test plan

### 8.1 Node tests that stay untouched

These read the built `index.html` exactly as they do today. Do not edit them.

`labs.cjs` · `forwarding.cjs` · `curriculum.cjs` · `lessons.cjs` · `ping.cjs` · `console.cjs` · `switching.cjs` · `prompts.cjs` · `exam.cjs` · `quiz.cjs` · `duplex.cjs` · `ping6.cjs` · `campaign.cjs` · `ospfarea.cjs`

`sitepages.cjs` also stays. It checks the generated pages, so it keeps its checks on tags, links, the sitemap, the counter rule and the slug line.

### 8.2 New Node tests

| File | Checks |
| --- | --- |
| `tests/build.cjs` | `build.cjs --check` passes; every marker from section 6.2 is present once; the engine hash matches; the size budget holds |
| `tests/slugs.cjs` | Lab and lesson slugs are unique and equal to the frozen list |
| `tests/migrate.cjs` | Old storage and old backups become the right new state; hostile values are dropped |
| `tests/grade.cjs` | The score and letter for a table of runs |
| `tests/validate.cjs` | Every stored shape: good input passes, each kind of bad input is dropped |

All run in GitHub Actions with the existing ones.

### 8.3 Browser tests (Playwright)

The old browser tests (`ui.cjs`, `guidewin.cjs`, `pageflows.cjs`, `landing.cjs`, `security.cjs`) are deleted and rewritten under `tests/browser/` with `@playwright/test`. The Playwright version is pinned in `package.json`.

Tests drive the app the way a person does, by role and label. One small hook exists for speed, `window.L4N.test`:

- `openLab(slug)`, `exec(device, line)` (the same code path as pressing `Enter`), `grade()`, `state()`.

| File | Scenarios |
| --- | --- |
| `shell.spec` | Every route; sidebar collapse; palette open, filter, run; every shortcut in section 3.4; focus return; document titles |
| `labs-all.spec` | **Every one of the 77 labs: open it, run its solution through `L4N.test.exec`, press the real Grade button, and see every check pass and the lab marked done.** Then reload and see it still done |
| `guide.spec` | Five labs finished by clicking step rows and pressing `Enter` |
| `console.spec` | Console realism: the list in Phase 2 |
| `map.spec` | Map interactions: the list in Phase 3, including the hover test |
| `popout.spec` | The pop-out window: the list in Phase 4 |
| `deeplinks.spec` | `?lab=`, `?lesson=`, unknown slugs, hash routes, `?welcome` |
| `firstrun.spec` | New visitor flow; returning visitor with old keys; the import toast; callouts shown once |
| `lessons.spec` | List, reader, story steps, quick check, mark as read |
| `lessonpages.spec` | The generated `lessons/` pages: the list in Phase 6 |
| `exam.spec`, `quiz.spec`, `subnet.spec` | The lists in Phase 7 |
| `sandbox.spec` | The list in Phase 8 |
| `security.spec` | See below |
| `phone.spec` | 390 by 844 on every route: `scrollWidth` equals `clientWidth`; the drawer; the workspace pane bar; console helper keys; 40 px targets |
| `themes.spec` | Dark, light and system on every route; "Console: always dark"; no unstyled flash on load |
| `motion.spec` | With reduced motion: no running CSS animation or transition; console output is instant; no packet movement; results still shown |
| `a11y.spec` | An automated accessibility scan (axe) on every route in both themes with zero violations; the keyboard-only run from Phase 9; divider, tab, menu and dialog keyboard patterns; live regions announce the screen, the ping result and the command output |
| `offline.spec` | **Opened from `file://`: zero requests that are not `file:`.** Served from a local server: zero requests to other hosts. Counter rules on the public host name, with and without Do Not Track |
| `visual.spec` | Screenshots, see 8.4 |

**Security scenarios.** Each scenario in the old `tests/security.cjs` has an equivalent, and there are new ones:

| Old scenario | New test |
| --- | --- |
| A hostile site opens `?guide` and posts HTML | A hostile site opens `?panel=tasks` and posts messages. Nothing renders, nothing runs |
| A hostile site opens the app and posts guide messages | The same against the app. It cannot type into the console or be taken for the pop-out |
| Markup typed into consoles (hostname, banner, description, `ip host`, username, raw commands, ping targets, on a router and a PC) | The same list, then every place that shows those values: console, tabs, map labels, tooltips, trace strip, results |
| A doctored backup with markup in every stored string and key, including exam history | The same for a version 1 backup and a version 2 backup, then visiting every screen |
| New | Doctored `lab4net:v2` storage on load, then every screen |
| New | Markup in the hash route, in `?lab=` and `?lesson=`, and in the palette input |
| New | A doctored sandbox file |
| New | Messages on the channel with wrong types, huge strings and extra fields |

Every case uses the same probe: `<img src=x onerror=window.__pwn=1>`. The test passes when `window.__pwn` is never set and no page error was thrown.

Code review rule that backs the tests: `innerHTML` appears only inside `dom.trusted()`, and every `message` listener compares `event.origin` with `location.origin` on its first line.

### 8.4 Screenshot checks

- Sizes: 1366 by 768, 1920 by 1080 and 390 by 844. Themes: dark and light. So six pictures per state.
- States:
  1. Landing
  2. Home, new user
  3. Home, seeded progress
  4. Labs list with the detail pane
  5. Lab workspace, default
  6. Lab workspace after a failed ping (marker, trace details open)
  7. Lab workspace with results after Grade
  8. Command palette open
  9. Lesson reader
  10. Practice hub
  11. Quiz, answered
  12. Exam running
  13. Progress, seeded
  14. Settings
  15. Sandbox with a small network
  16. Component gallery
  17. A lesson web page (dark and light by colour scheme)
- Animations are disabled and the clock is fixed, so pictures are stable.
- Allowed difference: 1% of pixels.
- Baselines are made and compared on Linux in CI only, because text rendering differs between systems. A manual workflow updates them. On other systems the test saves pictures for a person to look at and does not compare.

### 8.5 CI

- Job 1 (every push): all Node tests and the two build checks. Fast, no browser.
- Job 2 (every push to `redesign` and every pull request): Playwright with Chromium. Firefox and WebKit run the shell, console and map specs.

---

## 9. Risks and open questions

Each has a default. Code proceeds on the default unless the owner says otherwise.

| # | Question or risk | Default |
| --- | --- | --- |
| 1 | **Accent colour.** The plan uses one blue (`#6C9BFF` dark, `#1F56D0` light). | Use the blue. Changing it later means editing four tokens and re-running the contrast check. |
| 2 | **Default theme.** | Dark on first visit. Settings offers Dark, Light and System. |
| 3 | **A second font for the console.** Inter has no monospace. | Embed JetBrains Mono Regular. If the font budget breaks, use the system monospace stack instead. |
| 4 | **Grades.** XP and trophies go, but should the S to D letters stay? | Keep them as a small chip. They are imported, and they reward results, not speed. |
| 5 | **Stage story text.** The eight stages have a short story about a fictional company. | Show it as one quiet paragraph in the stage's detail pane. Cut the words "boss" and "campaign" everywhere. |
| 6 | **What is imported.** The brief requires finished labs, grades and lesson progress. | Also import quiz answers, the subnetting score, in-progress lab work, revealed clues and the capstone guide choice. Reset the rest. |
| 7 | **Old sandbox builds** are not imported. | Leave the old key in place. Add an importer later only if someone asks. |
| 8 | **Exam history** resets. | Accept. It was a log, not progress. |
| 9 | **Pop-out from a local file.** Pages opened from `file://` cannot prove they are the same app to each other. | Hide the pop-out on `file://`. It works on the public site and on self-hosted copies. |
| 10 | **Sound.** | Cut it fully. No setting. |
| 11 | **Size.** The file may grow to about 1.5 MB. | Accept up to 1,550 KB. The engine and lessons are two thirds of it and are not changing. |
| 12 | **No minification.** | Keep the file readable. Revisit only if the budget fails. |
| 13 | **Test-only dev dependencies** (`@playwright/test`, `@axe-core/playwright`). | Allowed. They never ship and are not needed to build or run the app. |
| 14 | **Shortcut clashes** with browsers, mostly the `Alt` keys. | Test in three browsers in Phase 1. Drop any that clash; the palette covers the action. |
| 15 | **`Tab` in the console** completes commands, so it does not move focus. That is a keyboard trap unless there is a way out. | `Esc` leaves the input. This is shown in the key hints and announced once. |
| 16 | **Screenshot flakiness** across systems. | Compare only on Linux in CI. |
| 17 | **Search ranking of lesson pages.** Every page's HTML changes at once. | URLs, titles, descriptions and text stay the same. Only the design changes. `lastmod` in the sitemap updates. |
| 18 | **The live site switches in one step** when the branch merges. | Tag `v1-arcade` first. Old storage keys are kept, so a revert loses nobody's data. |
| 19 | **Hidden behaviour in the old interface.** The old UI wraps functions many times, and small rules live in those wrappers (for example, exams never write lab progress; a masked answer stays out of history). | Before each phase, read the matching old block in `src/legacy/` history (tag `v1-arcade`) and list its rules in the pull request. The rules named in this plan are the ones found so far. |
| 20 | **Engine hooks.** None are planned. | If one is needed, it must be additive, explained in `CHANGES.md`, and the engine hash updated in the same commit. |
| 21 | **Old link `?guide`.** Nobody links to it; it was only opened by the app. | Drop it. `?panel=tasks` replaces it. |
| 22 | **Phone scope.** | Everything works at 390 wide with no sideways scroll. The sandbox is usable but not tuned for touch. |
| 23 | **This plan was written from the source and docs.** The tests and the app were not run while writing it. | Phase 0 starts by running every test on `main`. If any fails there, stop and report before changing anything. |

---

## Who builds each phase

| Phase | Builder | Why |
| --- | --- | --- |
| 0 Prep | Claude Code | It must run the build and every test, and prove the output is byte-identical. |
| 1 Design system and shell | Claude Code | Tokens, fonts and focus states have to be looked at in a real browser. |
| 2 Console and engine bridge | Claude Code | Pacing, key handling and 77 labs need a real page to verify. |
| 3 Map and panes | Claude Code | Hover, animation and resizing can only be judged by rendering them. |
| 4 Guide, grades, pop-out | Claude Code | The pop-out needs two real windows talking to each other. |
| 5 Home, Labs, migration | Claude Code | The import must be tested against real browser storage. |
| 6 Lessons and web pages | Claude Code | It generates 57 pages and must view them in both colour schemes. |
| 7 Practice and Progress | Claude Code | Exam clocks and resume-after-reload need a live page. |
| 8 Sandbox | Claude Code | Drag, cabling and zoom are pointer work on a rendered map. |
| 9 Polish and release | Claude Code | Screenshots, the phone pass and the final preview all need a browser. |

Every phase goes to **Claude Code**. This is a visual rebuild, and each step is only proven by real rendering in a real browser.
