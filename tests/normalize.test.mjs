import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeWikiPage } from '../tools/archive-sync/normalize.mjs';

test('normalizer extracts page content, strips scripts/media, links records, and records licensing metadata', () => {
  const html = `<!doctype html><html><head><title>SCP-999 - SCP Foundation</title></head><body><div id="page-content"><p><strong>Item #:</strong> SCP-999</p><p><strong>Object Class:</strong> Safe</p><p><strong>Special Containment Procedures:</strong> Test procedure.</p><script>alert(1)</script><img src="x.jpg"><audio src="x.mp3"></audio><a href="/scp-001">related</a></div><div id="page-tags"><a>safe</a><a>scp</a></div><div>Cite this page as: &quot;SCP-999&quot; by ProfSnider. page revision: 44, last edited: now</div></body></html>`;
  const doc = normalizeWikiPage({ slug: 'scp-999', url: 'https://scp-wiki.wikidot.com/scp-999', html, fetchedAt: '2026-09-04T00:00:00.000Z' });
  assert.equal(doc.title, 'SCP-999');
  assert.equal(doc.objectClass, 'Safe');
  assert.ok(doc.html.includes('Item #'));
  assert.ok(!doc.html.includes('<script'));
  assert.ok(!doc.html.includes('<img'));
  assert.ok(!doc.html.includes('<audio'));
  assert.ok(doc.html.includes('MEDIA OMITTED'));
  assert.deepEqual(doc.links, ['scp-001']);
  assert.ok(doc.tags.includes('safe'));
  assert.equal(doc.attribution.license, 'CC BY-SA 3.0');
  assert.equal(doc.attribution.revision, 44);
});
