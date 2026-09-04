# Changelog

## 0.1.3 — Archive Snapshot Workflow Fix

- fixed Archive Sync failing after successful SCP synchronization because `git switch --orphan` was run in the dirty main checkout
- publish generated archive snapshots from an isolated temporary Git worktree instead
- preserve the synchronized main checkout while force-updating only the generated `archive-snapshot` branch
- added an end-to-end regression test covering the exact dirty-worktree failure state

## 0.1.2 — Phase 1 Complete

- completed immersion-aware credential authentication for Low, Standard, and Full immersion modes
- added a dedicated bookmark browser
- added `SOURCE` and `RELATED` terminal commands
- added keyboard-first global workstation shortcuts
- added live online/offline local-archive status
- added local archive cache clearing and local personnel-ID deletion controls
- made the mobile Field Terminal navigation complete and horizontally scrollable
- exposed all 10 Phase-1 seed records before the first archive sync
- made the first `main` publish automatically synchronize the Phase-1 seed archive
- advanced the service-worker cache revision for reliable deployment updates
- retained the new Physical CRT interface mode from 0.1.1

## 0.1.1 — Physical CRT

- added the optional Physical CRT interface style with bezel, curved-glass, scanline, vignette, and phosphor treatment

## 0.1.0 — Foundation Terminal MVP

- initial local-first Foundation workstation, profile, archive, notes/bookmarks, assignment, terminal, PWA, and GitHub Pages toolchain
