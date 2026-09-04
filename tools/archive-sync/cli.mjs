#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { normalizeWikiPage } from './normalize.mjs';

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'public', 'archive');
const DOC_DIR = path.join(OUT_DIR, 'documents');

function parseArgs(argv) {
  const args = { seeds: 'content/archive-seeds.json', slugs: [] };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--seeds' && argv[i + 1]) args.seeds = argv[++i];
    else if (argv[i] === '--slug' && argv[i + 1]) args.slugs.push(argv[++i]);
  }
  return args;
}

async function fetchWithRetry(url, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, { headers: { 'User-Agent': 'SCP_reader archive sync (+https://github.com/)', 'Accept': 'text/html' } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.text();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, attempt * 1200));
    }
  }
  throw lastError;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  await fs.mkdir(DOC_DIR, { recursive: true });
  let slugs = args.slugs;
  if (!slugs.length) slugs = JSON.parse(await fs.readFile(path.resolve(ROOT, args.seeds), 'utf8'));
  const docs = [];
  const failures = [];
  for (const raw of slugs) {
    const slug = String(raw).trim().replace(/^https?:\/\/scp-wiki\.wikidot\.com\//, '').replace(/^\//, '');
    if (!slug) continue;
    const url = `https://scp-wiki.wikidot.com/${slug}`;
    process.stdout.write(`SYNC ${slug} ... `);
    try {
      const html = await fetchWithRetry(url);
      const doc = normalizeWikiPage({ slug, url, html, fetchedAt: new Date().toISOString() });
      await fs.writeFile(path.join(DOC_DIR, `${slug}.json`), JSON.stringify(doc, null, 2));
      docs.push(doc);
      console.log(`OK r${doc.attribution.revision ?? '?'}`);
    } catch (error) {
      failures.push({ slug, error: error instanceof Error ? error.message : String(error) });
      console.log(`FAILED: ${failures.at(-1).error}`);
    }
  }

  const filenames = (await fs.readdir(DOC_DIR)).filter((name) => name.endsWith('.json'));
  const allDocs = [];
  for (const filename of filenames) {
    try { allDocs.push(JSON.parse(await fs.readFile(path.join(DOC_DIR, filename), 'utf8'))); } catch { /* skip broken stale doc */ }
  }
  const index = allDocs.map(({ html, links, attribution, synchronized, ...entry }) => entry).sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true }));
  if (index.length) await fs.writeFile(path.join(OUT_DIR, 'index.json'), JSON.stringify(index, null, 2));
  await fs.writeFile(path.join(OUT_DIR, 'revisions.json'), JSON.stringify(Object.fromEntries(allDocs.map((doc) => [doc.slug, doc.attribution.revision ?? null])), null, 2));
  await fs.writeFile(path.join(OUT_DIR, 'sync-report.json'), JSON.stringify({ syncedAt: new Date().toISOString(), requested: slugs.length, available: allDocs.length, failures }, null, 2));
  console.log(`Archive available: ${allDocs.length}; failures this run: ${failures.length}`);
  if (!docs.length && slugs.length) process.exitCode = 1;
}

await main();
