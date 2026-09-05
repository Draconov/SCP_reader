<div align="center">
  <img src="public/logo.png" width="220" alt="SCP_reader terminal logo" />

# SCP_reader

### SCP Foundation Research Terminal

An immersive SCP archive reader built to feel like using real Foundation workstation.

[**Open SCP_reader**](https://draconov.github.io/SCP_reader/) · [**GitHub Repository**](https://github.com/Draconov/SCP_reader)

</div>

---

## What is SCP_reader?

SCP_reader wraps real SCP Wiki records in a Foundation-style research terminal. It combines canonical archive content with a clearly separated local researcher simulation: personnel IDs, clearance presentation, assignments, notes, bookmarks, mail, terminal commands, offline access, and configurable interface effects.

The project is static and privacy-friendly. There is no user-account backend: researcher state stays in the browser and can be exported as a human-readable `.scp-id` file.

## Current experience

### Foundation workstation

- **INSERT ID** startup and local personnel profiles
- desktop Research Network interface and responsive mobile Field Terminal
- Archive Browser with number, text, tag, type, and clearance search
- synchronized SCP Wiki records with source/attribution metadata
- bookmarks, research notes, access history, assignments, mail, and personnel dossier
- keyboard-first navigation plus a dedicated **Help** view
- command terminal with `HELP`, `OPEN`, `FIND`, `SOURCE`, `RELATED`, `LIST`, `PROFILE`, `CLEARANCE`, `HISTORY`, `NOTES`, `BOOKMARKS`, and `LOGOUT`

### Two interface styles

**Normal** is the clean Foundation terminal interface.

**Simulated** turns the workstation into a configurable physical CRT presentation with:

- phosphor glow
- fine scanlines
- CRT curvature
- edge vignette
- glass reflection
- physical bezel
- static/noise
- subtle random flicker
- an occasional running scanline that travels behind the UI
- adjustable effect intensity, speed, event frequency, and terminal density

Each style keeps its own effect preset. The palette system is independent from interface style, so the same palette can be used by Normal, Simulated, and future styles.

Available palettes:

- Green
- Amber
- Cold
- Blue
- High Contrast

Accessibility options such as **Reduce Motion** override conflicting visual effects.

## Quick start

Requirements: **Node.js 22+**.

```bash
npm ci
npm run typecheck
npm test
npm run build
npm run dev
```

The development server uses `http://127.0.0.1:5173` by default.

The runtime intentionally avoids third-party browser dependencies. TypeScript is the main build-time dependency.

## Archive synchronization

The repository includes a small fallback index so the terminal remains usable before synchronization. Canonical article text is synchronized from the English SCP Wiki rather than being manually copied into the application source.

Synchronize the Phase-1 seed records:

```bash
npm run archive:sync:seed
```

Synchronize one record:

```bash
node tools/archive-sync/cli.mjs --slug scp-049
```

Generated archive data is written to:

```text
public/archive/index.json
public/archive/documents/<slug>.json
public/archive/revisions.json
public/archive/sync-report.json
```

The normalizer removes active/unsafe markup, omits remote media unless redistribution has been handled safely, preserves source links and licensing metadata, and marks presentation-heavy pages for future Specialized Archive Modules.

## Offline behavior

SCP_reader is installable as a PWA and maintains a local cache for the application shell and viewed archive material. Previously accessed records remain available when the network is unavailable.

The System view can clear the local document cache without deleting the current researcher profile.

## Researcher profiles

A local researcher profile contains:

- personnel identity
- rank and clearance
- progression data
- assignments
- bookmarks and notes
- access history
- mail state
- discoveries and collections state
- interface, palette, immersion, and accessibility settings

Profiles can be exported and imported as `.scp-id` JSON files.

## Canonical content vs simulation

SCP_reader keeps these layers separate:

| Layer | Purpose |
| --- | --- |
| **Canonical archive content** | Text synchronized from the SCP Wiki |
| **Presentation metadata** | How a record is displayed inside the terminal |
| **Simulation metadata** | Local clearance behavior, assignments, mail, progression, events |
| **Researcher state** | Local browser / `.scp-id` information |

Simulation-generated clearance requirements, assignments, and interface messages are not presented as canonical SCP Wiki metadata.

## GitHub Pages deployment

The repository uses GitHub Actions for archive synchronization, verification, and Pages deployment.

Normal publishing flow:

```text
push to main
    ↓
Archive Sync
    ↓
archive-snapshot
    ↓
one Pages build
    ↓
one deployment
```

If a main-branch archive refresh temporarily fails, deployment can use the last successful archive snapshot rather than blocking an otherwise valid application update.

## Project layout

```text
.github/workflows/        CI, archive sync, Pages deployment
content/                  Simulation content and archive seed manifest
docs/superpowers/         Design and implementation documents
public/                   Static/PWA assets, logo files, archive data
src/app/                  Application shell and workstation views
src/archive/              Archive loading, search, fallback data
src/assignments/          Assignment runtime
src/researcher/           Profile model, storage, import/export
src/settings/             Interface and effect settings
src/shared/               Shared types and constants
src/terminal/             Command parser and execution
tests/                    Consolidated domain test suite
tools/archive-sync/       SCP Wiki synchronization tooling
tools/                    Build and local development scripts
```

## Branding assets

The repository includes the supplied SCP_reader logo in several sizes:

```text
public/logo-source.png
public/logo.png            1024×1024 README/web image
public/icon-512.png        PWA icon
public/icon-192.png        PWA icon
public/favicon-32.png      Browser tab icon
```

## Licensing and attribution

SCP Wiki text is generally distributed under **Creative Commons Attribution-ShareAlike 3.0 (CC BY-SA 3.0)**. Synchronized records retain source and licensing metadata, exposed through **SOURCE / ATTRIBUTION** in the reader.

Official references:

- https://scp-wiki.wikidot.com/licensing-guide
- https://creativecommons.org/licenses/by-sa/3.0/

Media requires separate care because individual images, audio, and files may have their own licensing requirements. SCP_reader therefore does not blindly mirror remote media assets.

This is an unofficial fan project and is not affiliated with SCP Wiki staff, Wikidot, or any real organization called the SCP Foundation.

---

<div align="center">
  <strong>SECURE TERMINAL READY.</strong><br />
  <sub>Insert Foundation credentials to begin archive access.</sub>
</div>
