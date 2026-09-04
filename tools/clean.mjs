import fs from 'node:fs/promises';
import path from 'node:path';

for (const target of process.argv.slice(2)) {
  const resolved = path.resolve(process.cwd(), target);
  if (resolved === process.cwd()) throw new Error('Refusing to delete repository root.');
  await fs.rm(resolved, { recursive: true, force: true });
}
