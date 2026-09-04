import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

const ROOT = process.cwd();
const DIST = path.join(ROOT, 'dist');

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: ROOT, stdio: 'inherit' });
    child.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`${command} exited with ${code}`)));
  });
}

async function copyDirectory(source, target) {
  await fs.mkdir(target, { recursive: true });
  for (const entry of await fs.readdir(source, { withFileTypes: true })) {
    const src = path.join(source, entry.name);
    const dst = path.join(target, entry.name);
    if (entry.isDirectory()) await copyDirectory(src, dst); else await fs.copyFile(src, dst);
  }
}

async function sizeOf(directory) {
  let total = 0;
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const value = path.join(directory, entry.name);
    if (entry.isDirectory()) total += await sizeOf(value); else total += (await fs.stat(value)).size;
  }
  return total;
}

await fs.rm(DIST, { recursive: true, force: true });
await run('tsc', ['-p', 'tsconfig.build.json', '--pretty', 'false']);
await fs.copyFile(path.join(ROOT, 'index.html'), path.join(DIST, 'index.html'));
await copyDirectory(path.join(ROOT, 'public'), DIST);
await fs.mkdir(path.join(DIST, 'content', 'assignments'), { recursive: true });
await fs.copyFile(path.join(ROOT, 'content', 'assignments', 'orientation.json'), path.join(DIST, 'content', 'assignments', 'orientation.json'));
const bytes = await sizeOf(DIST);
const mb = bytes / 1024 / 1024;
console.log(`Built dist: ${mb.toFixed(2)} MB`);
if (mb > 850) throw new Error('Build exceeds 850 MB GitHub Pages safety limit.');
if (mb > 700) console.warn('WARNING: build exceeds 700 MB target budget.');
