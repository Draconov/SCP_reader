import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { FALLBACK_INDEX } from '../.test-build/archive/fallback.js';
import { searchArchive } from '../.test-build/archive/search.js';
import { normalizeWikiPage } from '../tools/archive-sync/normalize.mjs';
import { archiveEntries } from './fixtures.mjs';

test('fallback index exposes every Phase 1 seed before the first sync', () => {
  const seeds = JSON.parse(fs.readFileSync(new URL('../content/archive-seeds.json', import.meta.url), 'utf8'));
  const fallbackSlugs = new Set(FALLBACK_INDEX.map((entry) => entry.slug));
  assert.equal(FALLBACK_INDEX.length, seeds.length);
  for (const slug of seeds) assert.equal(fallbackSlugs.has(slug), true, `${slug} missing from fallback index`);
});

test('archive search finds record numbers, summary text, and tags', () => {
  assert.equal(searchArchive(archiveEntries, '049')[0]?.id, 'en:scp-049');
  assert.equal(searchArchive(archiveEntries, 'biological')[0]?.id, 'en:scp-049');
  assert.equal(searchArchive(archiveEntries, 'adaptive')[0]?.id, 'en:scp-682');
});

test('archive search returns every entry for an empty query', () => {
  assert.equal(searchArchive(archiveEntries, '').length, archiveEntries.length);
});

test('normalizer extracts canonical content, strips active/media markup, links records, and records licensing metadata', () => {
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

test('normalizer builds clean SCP summaries and decodes numeric entities', () => {
  const html = `<!doctype html><html><head><title>SCP-055 - SCP Foundation</title></head><body><div id="page-content"><div class="page-rate-widget-box">rating: +4774 + &#8211; x</div><p>by qntm and CptBellman</p><img src="header.jpg"><p><strong>Item #:</strong> SCP-055</p><p><strong>Object Class:</strong> Keter</p><p><strong>Special Containment Procedures:</strong> Keep two &#8211; rooms isolated.</p></div><div id="page-tags"><a>keter</a><a>scp</a></div><div>page revision: 44</div></body></html>`;
  const doc = normalizeWikiPage({ slug: 'scp-055', url: 'https://scp-wiki.wikidot.com/scp-055', html, fetchedAt: '2026-09-04T00:00:00.000Z' });
  assert.match(doc.summary, /^Item #: SCP-055 Object Class: Keter Special Containment Procedures:/);
  assert.match(doc.summary, /two – rooms isolated\./);
  assert.doesNotMatch(doc.summary, /rating:|qntm|CptBellman|MEDIA OMITTED|SPECIALIZED EMBED OMITTED|&#\d+;/i);
});

test('normalizer skips leading Wikidot controls for title-marker SCP layouts', () => {
  const html = `<!doctype html><html><head><title>SCP-3008 - SCP Foundation</title></head><body><div id="page-content"><h1>A Perfectly Normal, Regular Old IKEA</h1><div class="page-rate-widget-box">rating: +3807 + &#8211; x</div><div>close Info X</div><p><strong>SCP-3008:</strong> A Perfectly Normal, Regular Old IKEA</p><p><strong>Object Class:</strong> Euclid</p><img src="header.jpg"><p>The interior extends beyond the limits of the physical structure.</p></div><div id="page-tags"><a>euclid</a><a>scp</a></div></body></html>`;
  const doc = normalizeWikiPage({ slug: 'scp-3008', url: 'https://scp-wiki.wikidot.com/scp-3008', html, fetchedAt: '2026-09-04T00:00:00.000Z' });
  assert.match(doc.summary, /^SCP-3008: A Perfectly Normal, Regular Old IKEA Object Class: Euclid/);
  assert.doesNotMatch(doc.summary, /rating:|close Info|&#8211;|MEDIA OMITTED/i);
});
