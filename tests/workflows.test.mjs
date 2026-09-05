import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('archive sync runs automatically when main is published', () => {
  const workflow = fs.readFileSync(new URL('../.github/workflows/archive-sync.yml', import.meta.url), 'utf8');
  assert.match(workflow, /push:\s*\n\s*branches:\s*\[main\]/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /schedule:/);
  assert.match(workflow, /publish-snapshot\.sh/);
});

test('snapshot publisher preserves dirty main worktree and pushes generated archive from isolation', async () => {
  const { mkdtemp, mkdir, writeFile, readFile, access } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { spawnSync } = await import('node:child_process');
  const root = await mkdtemp(join(tmpdir(), 'scp-snapshot-test-'));
  const repo = join(root, 'repo');
  const remote = join(root, 'remote.git');
  const runnerTemp = join(root, 'runner');
  await mkdir(join(repo, 'public', 'archive'), { recursive: true });
  await mkdir(runnerTemp, { recursive: true });
  await writeFile(join(repo, 'public', 'archive', 'index.json'), '{"version":"old"}\n');
  await writeFile(join(repo, 'LICENSE.md'), 'license\n');
  await writeFile(join(repo, 'keep.txt'), 'main-only\n');

  const run = (cwd, ...args) => {
    const result = spawnSync(args[0], args.slice(1), { cwd, encoding: 'utf8' });
    assert.equal(result.status, 0, `${args.join(' ')} failed:\n${result.stdout}\n${result.stderr}`);
    return result.stdout.trim();
  };

  run(root, 'git', 'init', '--bare', remote);
  run(repo, 'git', 'init', '-b', 'main');
  run(repo, 'git', 'config', 'user.name', 'Test User');
  run(repo, 'git', 'config', 'user.email', 'test@example.com');
  run(repo, 'git', 'add', '.');
  run(repo, 'git', 'commit', '-m', 'base');
  run(repo, 'git', 'remote', 'add', 'origin', remote);
  run(repo, 'git', 'push', '-u', 'origin', 'main');

  // This is the exact state produced by the sync step before snapshot publishing.
  await writeFile(join(repo, 'public', 'archive', 'index.json'), '{"version":"new"}\n');

  const script = new URL('../tools/archive-sync/publish-snapshot.sh', import.meta.url);
  const publish = spawnSync('bash', [script.pathname], {
    cwd: repo,
    env: { ...process.env, GITHUB_WORKSPACE: repo, RUNNER_TEMP: runnerTemp, GITHUB_RUN_ID: '12345' },
    encoding: 'utf8'
  });
  assert.equal(publish.status, 0, `publisher failed:\n${publish.stdout}\n${publish.stderr}`);

  assert.equal(run(repo, 'git', 'branch', '--show-current'), 'main');
  assert.match(run(repo, 'git', 'status', '--short'), /public\/archive\/index\.json/);
  assert.equal(await readFile(join(repo, 'public', 'archive', 'index.json'), 'utf8'), '{"version":"new"}\n');

  const snapshot = run(repo, 'git', '--git-dir', remote, 'show', 'archive-snapshot:public/archive/index.json');
  assert.equal(snapshot, '{"version":"new"}');
  assert.equal(run(repo, 'git', '--git-dir', remote, 'show', 'archive-snapshot:LICENSE.md'), 'license');

  const missingMainOnly = spawnSync('git', ['--git-dir', remote, 'cat-file', '-e', 'archive-snapshot:keep.txt'], { encoding: 'utf8' });
  assert.notEqual(missingMainOnly.status, 0);
});

test('Pages deploy waits for Archive Sync instead of also starting directly on main push', () => {
  const workflow = fs.readFileSync(new URL('../.github/workflows/deploy.yml', import.meta.url), 'utf8');
  const onBlock = workflow.match(/^on:\n([\s\S]*?)\npermissions:/m)?.[1] ?? '';
  assert.doesNotMatch(onBlock, /^\s*push:/m);
  assert.match(onBlock, /workflow_run:/);
  assert.match(onBlock, /workflows:\s*\["Archive Sync"\]/);
});

test('Pages fallback deploy is limited to a failed Archive Sync caused by a main push', () => {
  const workflow = fs.readFileSync(new URL('../.github/workflows/deploy.yml', import.meta.url), 'utf8');
  assert.match(workflow, /workflow_run\.conclusion == 'success'/);
  assert.match(workflow, /workflow_run\.conclusion == 'failure'/);
  assert.match(workflow, /workflow_run\.event == 'push'/);
  assert.match(workflow, /workflow_run\.head_branch == 'main'/);
});
