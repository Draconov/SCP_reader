# SCP_reader — SCP Foundation Research Terminal

An immersive, local-first SCP Foundation archive reader that makes the site feel like a classified Foundation research workstation instead of a normal wiki browser.

This repository is intended to be published as **`SCP_reader`** on GitHub and deployed with **GitHub Pages**. It has no user-account backend: researcher careers live in the browser and can be exported as human-readable `.scp-id` files.

## Current release: 0.1.3 — Archive Snapshot Workflow Fix

Phase 1 is now complete. The included implementation provides:

- secure-looking **INSERT FOUNDATION ID** startup flow
- multiple local researcher profiles using IndexedDB, with localStorage fallback
- `.scp-id` JSON import/export
- desktop Foundation workstation and dedicated responsive Field Terminal layout
- Archive Browser with text/tag/type/clearance search syntax
- real SCP Wiki archive synchronization tooling
- sanitized document viewer with canonical content separated from simulation metadata
- attribution/source panel for every synchronized record
- automatic media omission unless redistribution has been explicitly handled
- bookmarks with a dedicated saved-record browser, private research notes, and access history
- Orientation R-0001 assignment
- Foundation Mail starter simulation
- immersion-aware credential authentication with instant / standard / full sequences and a skip control
- command terminal (`HELP`, `OPEN`, `FIND`, `SOURCE`, `RELATED`, `LIST`, `PROFILE`, `CLEARANCE`, `HISTORY`, `NOTES`, `BOOKMARKS`, `LOGOUT`)
- Modern / Foundation Hybrid / Physical CRT / Legacy Terminal / Archive Terminal interface modes
- green / amber / cold-white / blue / high-contrast palettes
- configurable scanlines, glow, curvature, flicker, reduce-motion, font scale, and sound preference
- opt-in **Physical CRT** mode with a dark hardware bezel, curved glass treatment, vignette, denser terminal layout, and localized phosphor scanlines
- service-worker cache so previously opened files remain available offline, with live online/local-archive status and cache clearing
- GitHub Actions for CI, periodic archive synchronization, and Pages deployment
- keyboard-first workstation navigation and complete scrollable Field Terminal navigation on mobile
- dependency-free runtime/build pipeline: TypeScript + browser APIs + Node 22 tooling

The full approved long-term design and 12-phase roadmap are in [`docs/superpowers/specs/2026-09-04-scp-research-terminal-design.md`](docs/superpowers/specs/2026-09-04-scp-research-terminal-design.md).

## Phase 1 completion status

Phase 1 remains complete and is patched at **0.1.3**, ready for Phase 2 development. Its acceptance path is:

```text
OPEN WEBSITE → INSERT / ISSUE ID → AUTHENTICATE → SEARCH ARCHIVE → OPEN RECORD
→ BOOKMARK / NOTE → LOG OUT → RETURN WITH SAME ID → USE CACHED RECORDS OFFLINE
```

Phase 2 starts with full-Wiki discovery, incremental revision synchronization, richer page classification, relationship indexing, and the Specialized Archive Module pipeline.

## Quick start

Requirements: **Node.js 22+** and **TypeScript (`tsc`) available on PATH**.

```bash
npm ci
npm run typecheck
npm test
npm run build
npm run dev
```

The local server opens at `http://127.0.0.1:5173` by default.

There are intentionally no third-party runtime dependencies in Phase 1. GitHub's Node runner already provides npm, while CI installs TypeScript globally before typechecking/building if your runner does not have it available. If your local machine does not have TypeScript:

```bash
npm install --global typescript
```

## Synchronize real SCP Wiki records

The repository ships with a small **index-only fallback** so the interface works before the first network sync. Canonical SCP article text is not hand-copied into source files.

Synchronize the seed manifest:

```bash
npm run archive:sync:seed
```

Synchronize one record:

```bash
node tools/archive-sync/cli.mjs --slug scp-049
```

Generated files are written to:

```text
public/archive/index.json
public/archive/documents/<slug>.json
public/archive/revisions.json
public/archive/sync-report.json
```

The normalizer:

- extracts the rendered `#page-content`
- removes scripts, forms, embedded objects, inline event handlers, and unsafe URLs
- omits images/media by default instead of assuming redistribution rights
- converts internal links to safe original-source URLs
- extracts page tags where available
- records revision and licensing/citation metadata when present
- detects presentation-heavy pages and marks them for the future Specialized Archive Module layer

`content/archive-seeds.json` contains the 10-record representative Phase-1 starter set, and every seed is visible in the fallback archive before the first sync. The full-Wiki discovery/incremental mirror is a Phase-2 feature; the current CLI already supports arbitrary individual page slugs and is the base for that expansion.

## GitHub Pages publishing

1. Create a GitHub repository named **`SCP_reader`**.
2. Push this repository to `main`.
3. In **Settings → Pages**, set **Source** to **GitHub Actions**.
4. The first push to `main` automatically runs **Archive Sync** for the Phase-1 seed manifest.
5. **Deploy GitHub Pages** first publishes the app shell, then refreshes again when the generated archive snapshot is ready.

You can still run **Archive Sync** manually for a single slug or the seed manifest. The scheduled archive job also runs twice weekly and force-refreshes a generated `archive-snapshot` branch from an isolated temporary Git worktree, so generated SCP JSON never requires switching branches in the dirty main checkout and normal source history does not fill with generated archive churn.

## Researcher profiles

Researcher state is never sent to a project server. A profile includes:

- personnel identity
- rank and clearance
- hidden progression fields
- assignments
- notes and bookmarks
- access history
- mail state
- discoveries/collections placeholders
- interface/immersion settings

Exporting a profile creates a plain JSON `.scp-id` file. There is intentionally **no anti-cheat**: this is a single-player reader/simulation.

## Canon vs simulation

The project maintains a hard boundary:

- **Canonical content**: synchronized from the SCP Wiki.
- **Presentation metadata**: how this reader renders a record.
- **Simulation metadata**: local clearance, assignments, mail, events, and progression.
- **Researcher state**: local browser / `.scp-id` data.

Clearance labels and assignments generated by SCP_reader are **not claims about canonical SCP Wiki security metadata**. The document viewer labels simulation-only content accordingly.

## Licensing and attribution

SCP Wiki text is generally licensed under **Creative Commons Attribution-ShareAlike 3.0 (CC BY-SA 3.0)**. Every synchronized archive document carries its source URL, source site, extracted citation/authorship when available, license, revision metadata, and synchronization timestamp. The reader exposes this information through **SOURCE / ATTRIBUTION**.

See the official SCP Wiki licensing guide before redistribution:

- https://scp-wiki.wikidot.com/licensing-guide
- https://creativecommons.org/licenses/by-sa/3.0/

**Media needs separate care.** Images/audio/files can have their own attribution or licensing requirements. Phase 1 therefore omits remote media from mirrored articles by default and directs the user to the original source record. Do not blindly mirror `wdfiles` assets.

This project is an unofficial fan project and is not affiliated with the SCP Wiki staff, Wikidot, or an actual organization called the SCP Foundation.

## Repository layout

```text
.github/workflows/       CI, archive sync, Pages deployment
content/                 Simulation content + archive seed manifest
docs/superpowers/        Approved design + implementation plan
public/                   PWA files and generated/fallback archive
src/app/                  Application controller + DOM helpers
src/archive/              Archive loading/search/fallback
src/assignments/          Data-driven assignment runtime
src/researcher/           Profile model, persistence, import/export
src/settings/             Interface/immersion settings
src/terminal/             Parser + command execution
src/shared/               Cross-domain contracts/constants
src/styles/               Compile-time source marker (CSS is public/style.css)
tests/                    Dependency-free Node tests
tools/archive-sync/       SCP Wiki fetch/normalize/generate tooling
tools/build.mjs           Static TypeScript build
tools/dev-server.mjs      Local static server
```

## Search examples

```text
049
biological
tag:euclid
type:scp clearance:<=1
```

Terminal examples:

```text
OPEN scp-049
FIND biological euclid
LIST ASSIGNMENTS
PROFILE
CLEARANCE
```

## Development principles

- canonical SCP text is never silently rewritten by gameplay code
- no runtime backend for researcher data
- no fake waiting is required for progress
- accessibility settings override immersion effects
- no daily rewards, streaks, leaderboards, or FOMO systems
- maintain small modules with explicit data boundaries

## Roadmap

The approved roadmap proceeds from the reader/archive foundation into clearance, investigations, promotions, intranet simulation, advanced research tools, rare events/ARG content, Specialized Archive Modules, and eventually international branches. See the design spec for the full breakdown.
