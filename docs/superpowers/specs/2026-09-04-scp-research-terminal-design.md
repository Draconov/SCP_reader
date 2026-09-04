# SCP Foundation Research Terminal — Design Specification

**Status:** Approved design draft
**Date:** 2026-09-04
**Target:** Static GitHub-hosted web application / PWA
**Primary content source:** English SCP Wiki, with architecture ready for international branches

## 1. Product Definition

SCP Foundation Research Terminal is an immersive SCP reader and lightweight research-career simulation built around real SCP Wiki material. The product presents the archive as a secure Foundation workstation rather than a conventional website.

The user plays a fixed role: a Foundation researcher. They create or insert a local personnel ID, browse the archive, read canonical SCP material, take notes, pin evidence, complete research assignments, pass evaluations, gain rank and clearance, receive internal messages, and occasionally encounter rare security or ARG-style events.

The application must preserve a strict boundary between canonical SCP Wiki content and the simulation layer. Canonical article text is never silently rewritten by the application. Gameplay systems may alter presentation, gate access, add system chrome, deliver assignments, or create clearly separated simulated records around the canonical material.

## 2. Core Design Principles

1. **Real archive first.** The reader must be genuinely useful for reading SCP content even without the simulation systems.
2. **Canon and simulation remain separate.** Imported SCP content, presentation metadata, simulation metadata, and researcher state are distinct data domains.
3. **Retro aesthetics, modern usability.** Old-terminal presentation must never justify poor readability, inaccessible controls, or forced waiting.
4. **No mandatory account or backend.** Researcher state remains local in the browser and is portable through `.scp-id` files.
5. **Static deployment.** The application is published through GitHub Pages. GitHub Actions perform archive synchronization and build-time generation.
6. **Progression structures reading; it does not replace reading.** Assignments and promotions provide direction, but the archive remains broadly explorable.
7. **No fake canon.** Invented events, messages, tasks, and special records are clearly identified as simulation content.
8. **No anti-cheat.** `.scp-id` is human-readable JSON. Profile validation protects integrity, not competitive fairness.

## 3. User Identity and Profiles

### 3.1 Startup Flow

The website opens directly into a Foundation access terminal rather than a conventional landing page.

Primary actions:

- **INSERT ID** — load a known local researcher profile.
- **LOAD ID FILE** — import a `.scp-id` profile.
- **ISSUE NEW PERSONNEL ID** — create a new local researcher profile.

The first-time flow issues a personnel ID, accepts a researcher display name or codename, and begins orientation with low-level clearance.

### 3.2 Local Persistence

Profiles are stored in IndexedDB. Lightweight startup preferences may use local storage, but career state does not.

Researcher state includes:

- personnel identity
- rank
- clearance level
- hidden progression metrics
- assignments and evaluation state
- temporary access grants
- notes
- evidence pins
- bookmarks
- reading/access history
- mail
- discoveries and event state
- personal research collections
- interface settings
- remembered desktop layout
- profile format version

### 3.3 `.scp-id` Format

`.scp-id` is a simple human-readable JSON file. It is used for backup and portability, not ordinary saving.

The format is versioned from the first release and imported through a validation/migration layer.

Import flow:

1. Parse and validate file.
2. Migrate older format versions if required.
3. Show personnel preview.
4. Require explicit insertion/import confirmation.
5. Save into IndexedDB.

Invalid or unknown fields are repaired or rejected safely. There is no anti-cheat mechanism.

## 4. Researcher Career Model

### 4.1 Fixed Role

All players begin in Foundation Research. The product does not use selectable classes or departments in the initial design.

### 4.2 Rank

Recommended progression:

1. Research Assistant
2. Junior Researcher
3. Researcher
4. Senior Researcher
5. Lead Researcher
6. Principal Researcher

### 4.3 Clearance

Security clearance is separate from rank:

- Level 0
- Level 1
- Level 2
- Level 3
- Level 4
- Level 5

A researcher may hold a higher rank without an immediate clearance increase, or may receive temporary compartment access for an assignment beyond their normal clearance.

### 4.4 Hidden Progression

The application tracks hidden metrics such as:

- research competence
- investigation quality
- reliability
- security compliance
- evidence quality
- promotion readiness

No visible XP bar is shown.

Promotion becomes available through Foundation-style personnel notices, evaluations, and performance reviews.

## 5. Assignment and Investigation System

### 5.1 Assignment Types

The product uses a hybrid model:

- **Investigation assignments** are the main form of progression.
- **Reading-comprehension/training assignments** support onboarding and evaluations.
- **Systems/puzzle assignments** are rare and reserved for special events.

### 5.2 Assignment Lifecycle

Each assignment follows a structured loop:

1. **Briefing** — delivered through Assignment Control or internal mail.
2. **Research** — review required and optional archive records.
3. **Evidence** — pin relevant sections, dates, links, or records.
4. **Conclusion** — submit structured findings.
5. **Review** — receive qualitative performance feedback.

### 5.3 Evidence Pinning

The document reader supports **Add to Case Evidence** actions. Evidence can reference:

- a document
- a section
- a canonical excerpt reference
- a metadata relationship
- a date or classification

Evidence appears on an assignment evidence board.

### 5.4 Grading

Version 1 grading is deterministic. It evaluates:

- correct documents
- correct evidence locations
- structured answers
- relationship matches
- chronology reconstruction
- classification choices
- optional discoveries
- hints used
- security compliance

Free-text personal notes are not automatically judged.

### 5.5 Failure and Retry

Incorrect submissions do not permanently punish the player. The system provides supervisor-style guidance and allows revision or alternate follow-up assignments.

### 5.6 Procedural Routine Assignments

Later phases may generate low-stakes routine research from archive metadata, for example comparing tagged records or tracing relationships. Procedural assignments do not control important promotions.

Promotion-critical cases remain handcrafted.

## 6. Clearance and Access Gating

### 6.1 Mixed Gating

Most SCP records remain discoverable and at least partially readable. Higher-sensitivity sections or a smaller number of entire records may require higher clearance.

Potential gated elements include:

- addenda
- interviews
- incident logs
- cross-links
- supplemental test logs
- whole records where appropriate

### 6.2 Access Presentation

Locked material remains visible as a lead, showing its existence and required clearance without revealing canonical content.

Denied access generates an in-universe response and an audit log entry.

### 6.3 Clearance Metadata

Clearance rules are external simulation metadata. They never modify imported canonical article content.

The visibility equation is conceptually:

`canonical article + presentation metadata + clearance map + researcher permissions = visible document`

### 6.4 Automatic Classification + Overrides

The archive pipeline generates default clearance from document type, tags, structure, relationships, and other metadata. Important or unusual records use a human-readable override database.

The system may compute a confidence value so low-confidence classifications can be reviewed manually.

## 7. Archive Scope

The long-term target is almost the entire English SCP Wiki where it can reasonably be represented:

- numbered SCPs
- SCP-001 proposals
- Tales
- GOI formats
- Canons
- Personnel pages
- Sites/facilities and reference pages
- Essays and guides
- Hubs and indexes
- Joke SCPs
- Explained SCPs
- presentation-heavy works via specialized modules

The architecture treats English as branch `EN` rather than hard-coding it as the only possible archive.

Future branches may include UA, JP, FR, PL, DE, and others.

## 8. Canonical Content Boundary

### 8.1 Presentation-Only Adaptation

Canonical text and meaning are preserved. The application may transform presentation by:

- converting Wikidot formatting into Foundation document components
- presenting document headers and security stamps
- visually rendering existing redactions
- gating canonical sections according to simulation clearance
- adding clearly separated system messages and researcher tools

### 8.2 Simulation Material

Assignments, internal mail, personnel reviews, access warnings, fake system events, and ARG fragments are simulation content. They must never be visually or structurally confused with canonical SCP Wiki content.

### 8.3 No Arbitrary Remote Code

The application does not execute arbitrary JavaScript or untrusted page code from the SCP Wiki in the main application context.

## 9. Archive Synchronization Architecture

The system is static at runtime.

Pipeline:

`SCP Wiki → GitHub Actions sync → normalized archive snapshot → Vite build → GitHub Pages`

### 9.1 Incremental Sync

A revision manifest records the currently imported revision of each source page. Scheduled and manual workflows detect new, changed, and removed records.

Supported maintenance operations should include:

- full rebuild
- single-page rebuild
- document-family/category rebuild
- search-index-only rebuild
- attribution/license database rebuild

### 9.2 Normalization

Each source page is converted into a structured document containing:

- branch
- canonical ID and slug
- title
- source URL
- revision metadata
- authorship/attribution metadata
- tags
- document type
- semantic sections
- canonical links
- media metadata
- relationships
- renderer classification

### 9.3 Document Families

Imported content is classified into presentation families such as:

- Containment File
- Narrative / Incident Record
- External / Intercepted File
- Personnel Record
- Archive Collection
- Archive Index
- Reference / Training Material
- Special Archive

These labels describe the reader presentation; they do not rename the original article.

## 10. Specialized Archive Modules

Presentation-heavy SCP Wiki pages use a hybrid renderer.

### 10.1 Default Renderer

Ordinary pages are transformed into the Foundation document renderer.

### 10.2 Specialized Renderer

Pages whose layout is materially part of the work open within a **Specialized Archive Module** contained inside the workstation shell.

The outer shell still provides:

- navigation
- notes
- evidence actions
- attribution
- clearance status
- source access
- bookmarks

### 10.3 Compatibility Layer

Specialized modules support a controlled subset of HTML, CSS, media, and known interaction patterns. Unsupported behaviors are flagged during build validation.

Generic adapters are preferred. Per-page overrides are an escape hatch, not the default.

## 11. Relationships and Search

### 11.1 Relationship Graph

Relationships are first-class generated metadata:

- direct references
- incoming references
- shared tags
- canon membership
- GOI associations
- assignment relevance
- linked supplemental records

Locked related records remain visible as investigative leads.

### 11.2 Search

The Archive Browser supports normal text search and advanced filters.

Potential filters include:

- type
- tag
- object class
- clearance
- read/unread
- cached/not cached
- branch

The terminal exposes equivalent commands.

### 11.3 Static Search Indexes

Search metadata is generated at build time and sharded into manageable index files. Complete documents load only when opened.

## 12. Offline Behavior

The application uses a service worker.

### 12.1 Automatic Cache

Previously opened records are cached automatically. There is no manual archive-download manager in the initial design.

### 12.2 Offline Mode

When the network is unavailable:

- the workstation still starts
- local profiles remain available
- notes and assignments remain available
- previously cached records remain readable
- cached search indexes remain usable
- unavailable uncached records show a clear local-archive limitation

Researcher profiles are never stored by the service worker.

## 13. Revision Handling

Every archive record stores source revision metadata and synchronization time.

If a record changes after a researcher previously read it, the application may mark it as **updated since last review** without resetting its read state.

Research progression is keyed to stable document IDs, not revision numbers.

## 14. Attribution, Licensing, and Media

Attribution metadata is a required part of each imported record, not a footer added later.

Every document exposes a Source / Attribution view including, where available:

- original title
- author attribution
- source link
- source revision information
- applicable license information

The project repository must include a clear licensing and attribution explanation for reused SCP content and derivative material.

Media is handled more conservatively than text. The archive pipeline tracks media redistribution state such as:

- verified compatible
- attribution required
- external only
- blocked
- unknown

Media without sufficient redistribution confidence is not bundled into the static archive.

## 15. Desktop Workstation UX

The desktop interface is a Foundation workstation with a windowed internal UI.

Primary applications:

- Archive Browser
- SCP Document Viewer
- Assignments
- Research Notes
- Internal Mail
- Personnel Record
- Access History
- Terminal
- Settings

Windows can be moved, resized, maximized, minimized, snapped, focused, and restored. Per-profile layouts may be remembered.

The system should limit uncontrolled window clutter and preserve responsive performance.

## 16. Mobile Field Terminal UX

Mobile uses a dedicated Field Terminal shell rather than shrinking the desktop UI.

Primary mobile functions:

- archive search
- document reading
- active assignments
- internal mail
- notes
- bookmarks
- researcher ID
- emergency notices
- recent files

Mobile uses one primary active view with compact navigation rather than floating windows.

## 17. Interface Styles

Visual style and immersion level are independent settings.

### 17.1 Interface Styles

1. **Modern** — contemporary secure workstation, crisp and minimal.
2. **Foundation Hybrid** — default; modern usability with retro Foundation DNA.
3. **Physical CRT** — opt-in hardware-framed monitor presentation with subtle convex glass, dark bezel, phosphor bloom, vignette, fine scanlines, and denser terminal layout inspired by real vintage CRT workstations.
4. **Legacy Terminal** — strong late-80s/90s terminal aesthetic.
5. **Archive Terminal** — older, degraded subsystem presentation used for legacy material and special events.

### 17.2 Immersion Levels

1. **Low** — instant navigation, almost no fake delays.
2. **Standard** — brief authentication, loading, and access effects.
3. **Full** — longer boot/authentication sequences, terminal printing, simulated decryption, stronger audiovisual presentation.

Full immersion always provides skip/fast-forward behavior.

## 18. CRT and Visual Effects

Optional controls may include:

- scanline intensity
- phosphor glow
- bloom
- flicker
- curvature
- vignette
- chromatic separation
- noise
- refresh roll
- persistence/ghosting
- phosphor tint

Defaults remain subtle.

Visual presets may include:

- Clean
- Foundation Hybrid
- Green Phosphor
- Amber Terminal
- Cold White CRT
- Damaged Archive Monitor

## 19. Audio

Audio is subtle and optional.

Potential sound categories:

- terminal key ticks
- disk/relay sounds
- CRT ambience
- incoming mail beep
- access-denied tone
- warning klaxon
- printer/teletype effects

Settings include separate master, interface, ambience, and alert controls plus full mute.

## 20. Accessibility

Accessibility takes priority over immersion effects.

Required options include:

- disable flicker
- disable screen shake
- disable typewriter effects
- reduce motion
- remove scanlines
- remove curvature
- high contrast
- larger UI/document text
- adjustable line spacing and document width
- high-legibility / dyslexia-friendly font option
- screen-reader-friendly document mode
- captions/text equivalents for sound-only events
- keyboard-only navigation

## 21. Keyboard and Terminal Interaction

The GUI and terminal must call the same underlying application actions.

Representative shortcuts:

- `Ctrl+K` — archive search
- `Ctrl+Shift+P` — terminal
- `Ctrl+M` — mail
- `Ctrl+A` — assignments
- `Ctrl+R` — recent records
- `Ctrl+N` — notes
- `Ctrl+,` — settings
- `Alt+Left` / `Alt+Right` — navigation history
- `F1` — help

Representative terminal commands:

- `HELP`
- `OPEN <record>`
- `FIND <query>`
- `LIST ASSIGNMENTS`
- `LIST MAIL`
- `PROFILE`
- `CLEARANCE`
- `HISTORY`
- `NOTES`
- `BOOKMARKS`
- `RELATED <record>`
- `SOURCE <record>`
- `LOGOUT`

Advanced query syntax can be added later.

## 22. Internal Mail and Foundation Simulation

The inbox is a primary progression-delivery mechanism.

Potential senders include:

- Research Administration
- RAISA
- Site Administration
- Security
- assigned supervisors
- automated archive systems

Mail may deliver:

- assignments
- temporary access
- evaluation eligibility
- promotion notices
- maintenance notices
- revision alerts
- security warnings
- rare event hooks

There are no real-time external multiplayer messages.

## 23. Events and ARG Layer

### 23.1 Event Frequency

Events are intentionally rare.

Categories:

- routine: maintenance, mail, revision notices
- uncommon: archive faults, security reviews, unusual access logs
- rare: ARG chains, corrupted fragments, hidden indexes, terminal anomalies

### 23.2 Safety of User Data

Simulation events never actually delete notes, corrupt profiles, or create genuine data loss.

### 23.3 Deterministic State

Event progression is derived from local profile state, completed assignments, discoveries, and a stable event seed so exported profiles preserve event state.

### 23.4 Canon Boundary

Rare events happen around canonical documents rather than inserting invented lines into real SCP articles.

## 24. Research Collections

Researchers can create personal projects/collections containing:

- SCPs
- Tales
- GOI records
- Personnel files
- notes
- custom tags
- evidence
- saved searches

Collections are useful independent of progression.

## 25. Technology Stack

Recommended stack:

- TypeScript
- React
- Vite
- custom CSS/component system
- IndexedDB
- Service Worker / PWA capabilities
- Vitest for unit tests
- Playwright for browser/end-to-end tests

The runtime production build contains only static web assets and generated archive content. No application backend or account database is required.

## 26. Repository Structure

Recommended top-level shape:

```text
scp-research-terminal/
├── .github/workflows/
├── src/
│   ├── app/
│   ├── workstation/
│   ├── archive/
│   ├── researcher/
│   ├── assignments/
│   ├── simulation/
│   ├── terminal/
│   ├── settings/
│   ├── audio/
│   ├── accessibility/
│   ├── offline/
│   └── shared/
├── content/
│   ├── assignments/
│   ├── mail/
│   ├── events/
│   ├── evaluations/
│   └── overrides/
├── tools/archive-sync/
├── tests/
│   ├── unit/
│   ├── importer/
│   └── e2e/
├── public/
├── docs/
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## 27. Archive Snapshot Strategy

Application source and hand-authored simulation content live on `main`.

Generated archive content should not create unbounded churn in the normal source history. A dedicated snapshot/deployment strategy stores only the latest generated archive state needed for deployment and incremental revision comparison.

The exact Git strategy may be refined during implementation, but the source code and generated archive must remain separable.

## 28. GitHub Pages Size Discipline

The build must enforce a conservative size budget well below GitHub Pages limits.

Text and structured JSON are prioritized. Raw source HTML and unverified bulk media are not mirrored indiscriminately.

CI should warn before the deployment approaches its configured safe budget and fail at a higher hard threshold.

## 29. GitHub Actions Workflows

### 29.1 CI

On push and pull request:

- install dependencies
- typecheck
- lint
- unit tests
- content validation
- archive fixture validation
- production build

### 29.2 Archive Sync

Scheduled and manual:

- load prior revision manifest
- discover changed/new/removed pages
- fetch
- normalize
- validate
- classify
- generate attribution metadata
- generate relationships
- generate clearance maps
- generate search indexes
- enforce size budget
- update current archive snapshot

### 29.3 Deploy

- build application
- combine current archive snapshot
- run final validators
- upload GitHub Pages artifact
- deploy

## 30. Testing Strategy

### 30.1 Unit Tests

High-value deterministic units:

- profile serialization/migration
- clearance evaluation
- assignment grading
- terminal command parsing
- event conditions
- search query parsing
- archive normalization
- relationship extraction
- clearance inference

### 30.2 Importer Fixtures

Maintain representative source fixtures for:

- simple SCP
- long SCP
- nested collapsibles
- tables
- footnotes
- image-heavy page
- Tale
- GOI format
- hub
- custom CSS page
- specialized module

### 30.3 End-to-End Tests

Critical workflows include:

1. create ID → log in → open record → note/bookmark → log out → restore state
2. export `.scp-id` → remove local profile → import → restore career
3. open record online → simulate offline → reload → cached record remains readable
4. clearance-gated section → earn temporary/permanent access → section becomes visible
5. desktop and mobile shells preserve the same profile state

### 30.4 Accessibility Tests

Automated and manual coverage for:

- keyboard navigation
- focus states
- semantic document structure
- reduced motion
- flicker disablement
- contrast
- screen-reader behavior

## 31. Developer Mode

A developer/testing mode may expose:

- profile state inspector
- clearance debugger
- assignment state
- event triggers
- archive metadata
- cache inspector
- specialized-renderer diagnostics

Developer-only overrides never become part of a normal exported profile.

## 32. Product Roadmap

### Phase 1 — Foundation Terminal MVP

- workstation shell
- mobile Field Terminal shell
- local IDs
- `.scp-id` import/export
- IndexedDB persistence
- representative archive set
- reader
- search
- notes
- bookmarks
- history
- attribution view
- basic terminal
- automatic offline cache
- interface modes and basic CRT settings

**MVP success criterion:**

A user can issue/insert an ID, search for and open a real SCP record, read it, add notes/bookmarks, return later with state intact, and reopen previously accessed content offline.

### Phase 2 — Full Archive Pipeline

- automated discovery
- revision tracking
- incremental sync
- normalization
- document classification
- relationship extraction
- attribution generation
- media license handling
- full search indexes
- Specialized Archive Module detection
- broad English archive ingestion

### Phase 3 — Clearance Simulation

- levels 0–5
- researcher ranks
- inferred clearance maps
- manual overrides
- section/full-file restrictions
- temporary access
- audit log
- hidden progression

### Phase 4 — Research Assignments

- orientation
- assignment runtime
- evidence pinning
- evidence board
- deterministic grading
- supervisor guidance
- case reviews
- temporary assignment access

### Phase 5 — Promotions and Career

- rank reviews
- clearance evaluations
- performance reports
- promotion messages
- eligibility rules

### Phase 6 — Foundation Intranet

- internal mail expansion
- personnel/reference systems
- RAISA/security/site notices
- maintenance and revision notices

### Phase 7 — Advanced Research Tools

- collections
- cross-document notes
- saved searches
- relationship graph
- chronology tools
- comparison workflows

### Phase 8 — Procedural Routine Work

- metadata-driven optional assignments
- updated-record review tasks
- relationship-tracing tasks

### Phase 9 — Rare Security Events

- archive faults
- security reviews
- integrity warnings
- corrupted fragments
- unusual terminal behavior

### Phase 10 — ARG / Secret Archive

- hidden commands
- secret indexes
- encoded messages
- long-form event chains
- special assignments

### Phase 11 — Specialized Archive Expansion

- additional compatibility adapters based on real archive needs
- presentation-heavy page support

### Phase 12 — International Branches

- branch selector
- branch-specific sync
- localized search
- collision-safe IDs
- cross-branch relationships

## 33. Versioning Direction

Suggested milestone mapping:

- `0.1.0` — Terminal MVP
- `0.2.0` — Archive Sync
- `0.3.0` — Clearance
- `0.4.0` — Assignments
- `0.5.0` — Career
- `0.6.0` — Intranet
- `0.7.0` — Research Tools
- `0.8.0` — Events
- `0.9.0` — Full Archive Beta
- `1.0.0` — Foundation Research Terminal

## 34. Explicit Non-Goals for Initial Releases

The initial product does not include:

- multiplayer
- mandatory user accounts
- cloud sync
- researcher chat
- leaderboards
- daily rewards/streaks
- microtransactions
- mandatory AI supervisors
- AI-generated canonical SCP content
- realtime backend events
- every international branch
- native desktop/mobile store builds

## 35. First Vertical Implementation Slice

The first implementation slice should prove the complete architectural boundary:

`researcher ID + workstation shell + one real archive record + document reader + notes + local persistence`

Only after that slice is stable should the project add multi-record search, offline caching, the real archive importer, clearance, assignments, and progression.

## 36. Final System Boundary

The complete product is intentionally divided into four independently replaceable layers:

```text
SCP WIKI
   ↓
ARCHIVE BUILDER (GitHub Actions)
   ↓
STATIC FOUNDATION READER (GitHub Pages)
   ↓
LOCAL RESEARCHER STATE (IndexedDB / .scp-id)
```

The workstation UI may be redesigned without re-importing the archive. The archive pipeline may evolve without invalidating researcher careers. Researcher profiles remain local and independent of GitHub deployment state.

## 37. Definition of Success

The project succeeds when it simultaneously works as:

1. a faithful, searchable SCP reader;
2. an immersive Foundation workstation;
3. a persistent local researcher-career simulation;
4. a static GitHub Pages application with no required backend;
5. a maintainable system where archive ingestion, canonical content, gameplay metadata, and user state remain clearly separated.
