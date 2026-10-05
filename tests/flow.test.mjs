import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, symlink, rm, lstat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const cli = new URL('../skills/humanize-text/scripts/humanizer-pro.mjs', import.meta.url);
const payload = { original: 'Acme does not charge $20 on 2026-10-05.', revised: 'Acme charges $25 on 2026-05-10.', protectedTerms: ['Acme'] };
const run = (args, dir) => spawnSync(process.execPath, [fileURLToPath(cli), ...args], { encoding: 'utf8', env: { ...process.env, HUMANIZER_PRO_CONFIG_DIR: join(dir, 'oauth'), HUMANIZER_PRO_WRITING_DIR: join(dir, 'writing') } });

async function temporary(fn) {
  const dir = await mkdtemp(join(tmpdir(), 'humanizer-flow-'));
  try { await fn(dir); } finally { await rm(dir, { recursive: true, force: true }); }
}

test('local review accepts only an explicitly chosen private JSON file and creates no stores', async () => temporary(async dir => {
  const file = join(dir, 'selected.json');
  await writeFile(file, JSON.stringify(payload), { mode: 0o600 });
  const result = run(['review', '--input', file], dir);
  assert.equal(result.status, 0, result.stderr);
  const review = JSON.parse(result.stdout);
  assert.equal(review.original, payload.original);
  assert.equal(review.revised, payload.revised);
  assert.ok(review.flags.length >= 2);
  for (const name of ['oauth', 'writing']) await assert.rejects(lstat(join(dir, name)), { code: 'ENOENT' });
}));

test('input file errors reject symlinks, shared files, oversized and malformed data without echoing content', async () => temporary(async dir => {
  const file = join(dir, 'selected.json');
  await writeFile(file, JSON.stringify(payload), { mode: 0o600 });
  const link = join(dir, 'linked.json');
  await symlink(file, link);
  assert.notEqual(run(['review', '--input', link], dir).status, 0);
  for (const [name, value, mode, error] of [['shared.json', '{}', 0o644, /private regular/], ['large.json', 'x'.repeat(120001), 0o600, /120,000/], ['invalid.json', 'private-sentinel', 0o600, /Invalid JSON/], ['token.json', '{"access_token":"private-sentinel"}', 0o600, /Unknown input/]]) {
    const path = join(dir, name);
    await writeFile(path, value, { mode });
    const result = run(['review', '--input', path], dir);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, error);
    assert.ok(!result.stdout.includes('private-sentinel') && !result.stderr.includes('private-sentinel'));
  }
}));

test('file inputs never enable account operations or local mutations', async () => temporary(async dir => {
  for (const command of ['rewrite', 'analyze', 'session', 'brief', 'routine']) {
    const result = run([command, '--input', join(dir, 'not-read.json')], dir);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Unknown/);
  }
  await assert.rejects(lstat(join(dir, 'oauth')), { code: 'ENOENT' });
}));

test('doctor returns actionable local prerequisites without loading credentials or personal writing state', async () => temporary(async dir => {
  const result = run(['doctor'], dir);
  assert.equal(result.status, 0, result.stderr);
  const value = JSON.parse(result.stdout);
  assert.equal(value.serviceCalled, false);
  assert.equal(value.connectionChecked, false);
  assert.equal(value.localOperationsRequireLogin, false);
  assert.equal(value.accountOperationsRequireLogin, true);
  for (const name of ['oauth', 'writing']) await assert.rejects(lstat(join(dir, name)), { code: 'ENOENT' });
}));
