import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { FALLBACK_INDEX } from '../.test-build/archive/fallback.js';

test('fallback index exposes every Phase 1 seed before the first sync', () => {
  const seeds = JSON.parse(fs.readFileSync(new URL('../content/archive-seeds.json', import.meta.url), 'utf8'));
  const fallbackSlugs = new Set(FALLBACK_INDEX.map((entry) => entry.slug));
  assert.equal(FALLBACK_INDEX.length, seeds.length);
  for (const slug of seeds) assert.equal(fallbackSlugs.has(slug), true, `${slug} missing from fallback index`);
});
