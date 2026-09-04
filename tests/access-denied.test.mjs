import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('access denied panel stays in-universe without simulation disclaimer text', () => {
  const source = fs.readFileSync(new URL('../src/app/App.ts', import.meta.url), 'utf8');
  assert.match(source, /CURRENT CREDENTIAL: LEVEL/);
  assert.doesNotMatch(source, /This simulated clearance requirement is generated/i);
  assert.doesNotMatch(source, /not canonical SCP Wiki metadata/i);
});
