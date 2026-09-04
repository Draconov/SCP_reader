import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('archive sync runs automatically when main is published', () => {
  const workflow = fs.readFileSync(new URL('../.github/workflows/archive-sync.yml', import.meta.url), 'utf8');
  assert.match(workflow, /push:\s*\n\s*branches:\s*\[main\]/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /schedule:/);
});

test('Pages deploy reruns after archive synchronization completes', () => {
  const workflow = fs.readFileSync(new URL('../.github/workflows/deploy.yml', import.meta.url), 'utf8');
  assert.match(workflow, /workflow_run:/);
  assert.match(workflow, /workflows:\s*\["Archive Sync"\]/);
});
