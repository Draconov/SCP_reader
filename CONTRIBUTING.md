# Contributing

## Before changing behavior

Keep the four data domains separate: canonical archive content, presentation metadata, simulation metadata, and local researcher state.

Do not paste or rewrite canonical SCP article text into assignment or UI source files. Add/adjust archive sync behavior instead.

## Verification

Run before submitting a change:

```bash
npm run typecheck
npm test
npm run build
```

For archive-normalizer changes, add a small synthetic HTML fixture test under `tests/` that proves the intended transformation without reproducing a full SCP article.

## Simulation content

Assignments, mail, progression, and events must be clearly simulation-layer material. Do not phrase invented facts as though they are canonical SCP Wiki claims.

## Media

Do not add SCP Wiki images/audio simply because they appear on a page. Record and verify media-specific license/attribution before redistribution.
