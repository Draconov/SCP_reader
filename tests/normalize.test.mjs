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

test('normalizer builds SCP search summaries from canonical record text and decodes numeric entities', () => {
  const html = `<!doctype html><html><head><title>SCP-055 - SCP Foundation</title></head><body><div id="page-content"><div class="page-rate-widget-box">rating: +4774 + &#8211; x</div><p>by qntm and CptBellman</p><img src="header.jpg"><p><strong>Item #:</strong> SCP-055</p><p><strong>Object Class:</strong> Keter</p><p><strong>Special Containment Procedures:</strong> Keep two &#8211; rooms isolated.</p></div><div id="page-tags"><a>keter</a><a>scp</a></div><div>page revision: 44</div></body></html>`;
  const doc = normalizeWikiPage({ slug: 'scp-055', url: 'https://scp-wiki.wikidot.com/scp-055', html, fetchedAt: '2026-09-04T00:00:00.000Z' });

  assert.match(doc.summary, /^Item #: SCP-055 Object Class: Keter Special Containment Procedures:/);
  assert.match(doc.summary, /two – rooms isolated\./);
  assert.doesNotMatch(doc.summary, /rating:/i);
  assert.doesNotMatch(doc.summary, /qntm|CptBellman/);
  assert.doesNotMatch(doc.summary, /MEDIA OMITTED|SPECIALIZED EMBED OMITTED/);
  assert.doesNotMatch(doc.summary, /&#\d+;/);
});

test('normalizer skips leading Wikidot controls when an SCP uses a title marker instead of Item #', () => {
  const html = `<!doctype html><html><head><title>SCP-3008 - SCP Foundation</title></head><body><div id="page-content"><h1>A Perfectly Normal, Regular Old IKEA</h1><div class="page-rate-widget-box">rating: +3807 + &#8211; x</div><div>close Info X</div><p><strong>SCP-3008:</strong> A Perfectly Normal, Regular Old IKEA</p><p><strong>Object Class:</strong> Euclid</p><img src="header.jpg"><p>The interior extends beyond the limits of the physical structure.</p></div><div id="page-tags"><a>euclid</a><a>scp</a></div></body></html>`;
  const doc = normalizeWikiPage({ slug: 'scp-3008', url: 'https://scp-wiki.wikidot.com/scp-3008', html, fetchedAt: '2026-09-04T00:00:00.000Z' });

  assert.match(doc.summary, /^SCP-3008: A Perfectly Normal, Regular Old IKEA Object Class: Euclid/);
  assert.doesNotMatch(doc.summary, /rating:|close Info|&#8211;|MEDIA OMITTED/i);
});
