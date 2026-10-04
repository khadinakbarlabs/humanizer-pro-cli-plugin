import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, lstat, readFile, writeFile, rm, symlink, chmod } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { WritingStore, validateProfile, resolveBrief, reviewText, summarize, renderReport, renderReview, routinePlan, runWriting, parseWritingArgs } from '../skills/humanize-text/scripts/writing.mjs';

const tempStore = async fn => {
  const dir = await mkdtemp(join(tmpdir(), 'humanizer-writing-test-'));
  try { await fn(join(dir, 'writing')); } finally { await rm(dir, { recursive: true, force: true }); }
};
const input = value => async () => JSON.stringify(value);
const receipt = overrides => ({ receiptKey: randomUUID(), operation: 'rewrite', status: 'completed', wordCount: 20, mode: 'stealth', reviewFlagCount: 0, ...overrides });

test('CLI local dispatch handles Unicode without opening the OAuth store', async () => tempStore(async dir => {
  const script = new URL('../skills/humanize-text/scripts/humanizer-pro.mjs', import.meta.url);
  const original = '字'.repeat(12000);
  const authLocation = join(dir, '..', 'not-a-token-directory');
  await writeFile(authLocation, 'unrelated data');
  const result = spawnSync(process.execPath, [fileURLToPath(script), 'review'], {
    input: JSON.stringify({ original, revised: original }), encoding: 'utf8', maxBuffer: 200000,
    env: { ...process.env, HUMANIZER_PRO_WRITING_DIR: dir, HUMANIZER_PRO_CONFIG_DIR: authLocation }
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).original, original);
  assert.equal(await readFile(authLocation, 'utf8'), 'unrelated data');
  await assert.rejects(lstat(dir), /ENOENT/);
}));

test('retention removes oldest receipts and preserves accurate coverage', async () => tempStore(async dir => {
  const store = new WritingStore(dir);
  const firstKey = randomUUID();
  await store.update(state => {
    state.sessions = Array.from({ length: 500 }, (_, i) => {
      const fields = receipt({ receiptKey: i ? randomUUID() : firstKey });
      return { ...fields, id: fields.receiptKey, project: 'global', createdAt: new Date().toISOString() };
    });
    return state;
  });
  await runWriting(['session', '--consent'], input(receipt()), dir);
  const state = await store.load();
  assert.equal(state.sessions.length, 500);
  assert.equal(state.pruned, 1);
  assert.ok(!state.sessions.some(item => item.id === firstKey));
  const report = summarize(state);
  assert.equal(report.retainedReceipts, 500);
  assert.equal(report.prunedReceipts, 1);
}));

test('profile limit and malformed saved metadata fail without corrupting existing data', async () => tempStore(async dir => {
  const store = new WritingStore(dir);
  await store.update(state => {
    state.profiles = Object.fromEntries(Array.from({ length: 50 }, (_, i) => [`project-${i}`, { tone: 'Clear' }]));
    return state;
  });
  const before = await readFile(store.file, 'utf8');
  await assert.rejects(runWriting(['profile', 'set', '--project', 'extra', '--consent'], input({ tone: 'Warm' }), dir), /state/);
  assert.equal(await readFile(store.file, 'utf8'), before);
  const fields = receipt();
  const bad = { version: 1, profiles: {}, pruned: 0, sessions: [{ ...fields, id: fields.receiptKey, project: 'global', createdAt: 1 }] };
  await writeFile(store.file, JSON.stringify(bad), { mode: 0o600 });
  await assert.rejects(store.load(), /identity/);
}));

test('date checks catch date reassignment when the set of individual numbers is unchanged', () => {
  const result = reviewText({ original: 'Launch: 2026-10-05.', revised: 'Launch: 2026-05-10.' });
  assert.ok(result.flags.some(item => item.category === 'dates'));
});

test('routine times require real ISO calendar dates and explicit offsets', () => {
  const now = new Date('2026-01-20T00:00:00Z');
  const spec = { kind: 'deadline-reminder', timezone: 'UTC', when: '2026-02-01T12:00:00Z', expiresAt: '2026-03-01T00:00:00Z' };
  assert.throws(() => routinePlan({ ...spec, when: '2026-02-30T12:00:00Z' }, 'global', now), /deadline/);
  assert.throws(() => routinePlan({ ...spec, expiresAt: '2026-03-01' }, 'global', now), /expiry/);
});

test('local commands reject unknown options, unsafe project names and implicit writes', () => {
  assert.throws(() => parseWritingArgs(['profile', 'set']), /consent/);
  assert.throws(() => parseWritingArgs(['session']), /consent/);
  assert.throws(() => parseWritingArgs(['feedback', '--session', randomUUID()]), /consent/);
  assert.throws(() => parseWritingArgs(['report', '--project', '../private']), /project/);
  assert.throws(() => parseWritingArgs(['report', '--days', 'NaN']), /days/);
  assert.throws(() => parseWritingArgs(['review', '--token', 'secret']), /option/);
  assert.throws(() => parseWritingArgs(['profile', 'show', '--consent']), /option/);
});
test('profiles accept structured approved preferences, exclude passages and tokens', () => {
  assert.deepEqual(validateProfile({ tone: 'Warm', protectedTerms: ['Acme'], saveSessionReceipts: true }), { tone: 'Warm', protectedTerms: ['Acme'], saveSessionReceipts: true });
  for (const value of [{ access_token: 'secret' }, { voiceSample: 'Private draft' }, { protectedTerms: ['x'.repeat(121)] }, { mode: 'translate' }, { tone: 'x'.repeat(161) }, { saveSessionReceipts: 'yes' }]) assert.throws(() => validateProfile(value), /Invalid|Unknown/);
});
test('brief precedence is request over project over global with clear provenance', () => {
  const result = resolveBrief({ tone: 'Formal', spelling: 'US', protectedTerms: ['Global'] }, { tone: 'Friendly', protectedTerms: ['Project'] }, { tone: 'Direct' });
  assert.equal(result.preferences.tone, 'Direct');
  assert.equal(result.sources.tone, 'request');
  assert.equal(result.sources.spelling, 'global');
  assert.deepEqual(result.preferences.protectedTerms, ['Project']);
  assert.equal(result.overrideNotes.length, 3);
  assert.match(result.receiptKey, /^[\da-f-]{36}$/);
});
test('brief never forwards arbitrary preferences as unsupported service parameters', () => {
  const result = resolveBrief({ tone: 'Personal', style: 'professional' }, {}, { mode: 'academic' });
  assert.deepEqual(result.supportedRewriteOptions, { mode: 'academic' });
  assert.match(result.limitation, /review|service/i);
  assert.ok(result.overrideNotes.some(x => x.includes('style')));
});
test('read-only local commands do not create a writing store', async () => tempStore(async dir => {
  const result = JSON.parse(await runWriting(['profile', 'show'], input({}), dir));
  assert.deepEqual(result.preferences, {});
  await assert.rejects(lstat(dir), /ENOENT/);
  JSON.parse(await runWriting(['report'], input({}), dir));
  await assert.rejects(lstat(dir), /ENOENT/);
}));
test('profile persistence is private, editable, scoped and resettable', async () => tempStore(async dir => {
  await runWriting(['profile', 'set', '--consent'], input({ tone: 'Formal' }), dir);
  await runWriting(['profile', 'set', '--project', 'newsletter', '--consent'], input({ tone: 'Warm' }), dir);
  assert.equal(JSON.parse(await runWriting(['brief', '--project', 'newsletter'], input({ purpose: 'Explain an update' }), dir)).preferences.tone, 'Warm');
  assert.equal(JSON.parse(await runWriting(['profile', 'export'], input({}), dir)).preferences.tone, 'Formal');
  assert.equal((await lstat(dir)).mode & 0o777, 0o700);
  assert.equal((await lstat(join(dir, 'writing.json'))).mode & 0o777, 0o600);
  await runWriting(['profile', 'reset', '--project', 'newsletter', '--consent'], input({}), dir);
  assert.deepEqual(JSON.parse(await runWriting(['profile', 'show', '--project', 'newsletter'], input({}), dir)).preferences, {});
  assert.equal(JSON.parse(await runWriting(['profile', 'show'], input({}), dir)).preferences.tone, 'Formal');
}));
test('writing store rejects symlinks, broad permissions and malformed data without wiping them', async () => tempStore(async dir => {
  const store = new WritingStore(dir);
  await store.update(state => state);
  await chmod(join(dir, 'writing.json'), 0o644);
  await assert.rejects(store.load(), /private/);
  await chmod(join(dir, 'writing.json'), 0o600);
  await symlink(dir, dir + '-link');
  await assert.rejects(new WritingStore(dir + '-link').load(), /Unsafe/);
  await writeFile(join(dir, 'writing.json'), '{broken', { mode: 0o600 });
  await assert.rejects(store.update(state => state), /Invalid saved/);
  assert.equal(await readFile(join(dir, 'writing.json'), 'utf8'), '{broken');
}));
test('receipts are idempotent and never store supplied text', async () => tempStore(async dir => {
  const value = receipt();
  const args = ['session', '--project', 'newsletter', '--consent'];
  const first = JSON.parse(await runWriting(args, input(value), dir));
  const second = JSON.parse(await runWriting(args, input(value), dir));
  assert.equal(first.receipt.id, second.receipt.id);
  assert.equal(second.alreadyRecorded, true);
  await assert.rejects(runWriting(args, input({ ...value, wordCount: 21 }), dir), /already|conflict/i);
  await assert.rejects(runWriting(args, input(receipt({ original: 'Private draft' })), dir), /Unknown/);
  const state = JSON.parse(await readFile(join(dir, 'writing.json'), 'utf8'));
  assert.equal(state.sessions.length, 1);
  assert.equal(state.sessions[0].wordCount, 20);
}));
test('failed and unknown outcomes cannot report successful word consumption', async () => tempStore(async dir => {
  await assert.rejects(runWriting(['session', '--consent'], input(receipt({ status: 'unknown' })), dir), /wordCount/);
  const result = JSON.parse(await runWriting(['session', '--consent'], input(receipt({ status: 'unknown', wordCount: null })), dir));
  assert.equal(result.receipt.wordCount, null);
}));
test('feedback requires a recorded completed receipt and stays within its project', async () => tempStore(async dir => {
  const saved = JSON.parse(await runWriting(['session', '--project', 'newsletter', '--consent'], input(receipt()), dir));
  const args = ['feedback', '--session', saved.receipt.id, '--project', 'newsletter', '--consent'];
  await runWriting(args, input({ outcome: 'rejected', reason: 'too-formal' }), dir);
  await runWriting(args, input({ outcome: 'accepted', reason: 'none' }), dir);
  const report = JSON.parse(await runWriting(['report', '--project', 'newsletter'], input({}), dir));
  assert.equal(report.accepted, 1);
  assert.equal(report.rejected, 0);
  assert.equal(report.rated, 1);
  await assert.rejects(runWriting(['feedback', '--session', saved.receipt.id, '--project', 'other', '--consent'], input({ outcome: 'accepted' }), dir), /recorded/);
  const profile = JSON.parse(await runWriting(['profile', 'show', '--project', 'newsletter'], input({}), dir));
  assert.deepEqual(profile.preferences, {});
}));
test('deterministic review catches protected details and leaves exact passages unchanged', () => {
  const original = 'Acme will not charge $50 on 2026-10-05. Visit https://example.com/a. "Keep this."';
  const revised = 'Acme charges $60 on 2026-10-06. Visit https://example.com/b. "Changed."';
  const result = reviewText({ original, revised, protectedTerms: ['will not charge'] });
  assert.equal(result.original, original);
  assert.equal(result.revised, revised);
  for (const category of ['numbers', 'links', 'quotations', 'negations', 'protected-terms']) assert.ok(result.flags.some(x => x.category === category));
  assert.match(result.notice, /not.*proof|cannot|does not/i);
});
test('unchanged drafts and punctuation-only links do not create detail flags', () => {
  const text = 'It costs 50%. https://example.com/a';
  assert.equal(reviewText({ original: text, revised: text + '.', protectedTerms: ['50%'] }).flags.length, 0);
});
test('review rejects missing passages, oversized input and instruction fields', () => {
  for (const value of [{ original: 'x' }, { original: 'x'.repeat(12001), revised: 'y' }, { original: 'x', revised: 'y', command: 'execute me' }]) assert.throws(() => reviewText(value), /Invalid|Unknown/);
});
test('report computes rated acceptance only from completed rewrite receipts and reports unknowns', () => {
  const now = new Date('2026-10-05T00:00:00Z');
  const state = { profiles: {}, pruned: 0, sessions: [
    { ...receipt(), id: randomUUID(), project: 'a', createdAt: '2026-10-04T00:00:00Z', feedback: { outcome: 'accepted', reason: 'none' } },
    { ...receipt({ status: 'unknown', wordCount: null }), id: randomUUID(), project: 'a', createdAt: '2026-10-04T01:00:00Z' },
    { ...receipt(), id: randomUUID(), project: 'other', createdAt: '2026-10-04T01:00:00Z' }
  ] };
  const result = summarize(state, 'a', 7, now);
  assert.equal(result.wordsReportedUsed, 20);
  assert.equal(result.unknown, 1);
  assert.equal(result.acceptanceRate, 1);
  assert.equal(result.recordedSessions, 2);
  assert.equal(result.activeDays, 1);
  assert.equal(summarize({ sessions: [], profiles: {}, pruned: 0 }, 'global', 7, now).acceptanceRate, null);
});
test('visual reports and comparisons escape hostile input and load no external assets', () => {
  const review = reviewText({ original: '<script>alert(1)</script>', revised: '<img src=x onerror=alert(1)>', protectedTerms: [] });
  const html = renderReview(review);
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes('<img'));
  const report = renderReport({ ...summarize({ sessions: [], profiles: {}, pruned: 0 }, 'global', 7), project: '<img src=x>' });
  assert.ok(report.includes('&lt;img'));
  assert.ok(!/<script|<iframe|<link|url\(|https?:\/\//i.test(report));
});
test('routine plans validate timezone, timing and expiry and never claim a running timer', () => {
  const now = new Date('2026-10-05T00:00:00Z');
  const value = { kind: 'weekly-report', timezone: 'Asia/Karachi', weekday: 1, hour: 9, minute: 15, expiresAt: '2026-10-12T00:00:00Z' };
  const result = routinePlan(value, 'newsletter', now);
  assert.equal(result.scheduled, false);
  assert.equal(result.requiresHostScheduler, true);
  assert.equal(result.cron, '15 9 * * 1');
  assert.match(result.prompt, /never|do not/i);
  assert.throws(() => routinePlan({ ...value, timezone: 'Bad/Zone' }, 'newsletter', now), /timezone/);
  assert.throws(() => routinePlan({ ...value, hour: 24 }, 'newsletter', now), /hour/);
  assert.throws(() => routinePlan({ ...value, kind: 'auto-rewrite' }, 'newsletter', now), /kind/);
  assert.throws(() => routinePlan({ ...value, expiresAt: '2026-10-04T00:00:00Z' }, 'newsletter', now), /expiry/);
});
test('host routine specification is read-only, does not create local state or account activity', async () => tempStore(async dir => {
  const result = JSON.parse(await runWriting(['routine', '--project', 'newsletter'], input({ kind: 'review-reminder', timezone: 'UTC', hour: 9, minute: 15, expiresAt: new Date(Date.now() + 86400000).toISOString() }), dir));
  assert.equal(result.scheduled, false);
  await assert.rejects(lstat(dir), /ENOENT/);
}));
test('a write lock rejects concurrent writes and is released after a failed transaction', async () => tempStore(async dir => {
  const store = new WritingStore(dir);
  let release;
  const first = store.update(async state => { await new Promise(resolve => { release = resolve; }); return state; });
  while (!release) await new Promise(resolve => setTimeout(resolve, 1));
  await assert.rejects(store.update(state => state), /Another/);
  release(); await first;
  await assert.rejects(store.update(() => { throw new Error('failure'); }), /failure/);
  await store.update(state => state);
}));
test('history export and reset are scoped and leave saved preferences intact', async () => tempStore(async dir => {
  await runWriting(['profile', 'set', '--project', 'newsletter', '--consent'], input({ tone: 'Warm' }), dir);
  await runWriting(['session', '--project', 'newsletter', '--consent'], input(receipt()), dir);
  await runWriting(['session', '--project', 'other', '--consent'], input(receipt()), dir);
  await assert.rejects(runWriting(['history', 'reset', '--project', 'newsletter'], input({}), dir), /consent/);
  assert.equal(JSON.parse(await runWriting(['history', 'export', '--project', 'newsletter'], input({}), dir)).receipts.length, 1);
  await runWriting(['history', 'reset', '--project', 'newsletter', '--consent'], input({}), dir);
  assert.equal(JSON.parse(await runWriting(['history', 'export', '--project', 'newsletter'], input({}), dir)).receipts.length, 0);
  assert.equal(JSON.parse(await runWriting(['history', 'export', '--project', 'other'], input({}), dir)).receipts.length, 1);
  assert.equal(JSON.parse(await runWriting(['profile', 'show', '--project', 'newsletter'], input({}), dir)).preferences.tone, 'Warm');
}));
test('deadline plans use exact supplied offset and reject impossible expiry ordering', () => {
  const now = new Date('2026-10-05T00:00:00Z');
  const value = { kind: 'deadline-reminder', timezone: 'Asia/Karachi', when: '2026-10-05T09:00:00+05:00', expiresAt: '2026-10-06T00:00:00Z' };
  assert.equal(routinePlan(value, 'newsletter', now).when, '2026-10-05T04:00:00.000Z');
  assert.throws(() => routinePlan({ ...value, when: '2026-10-05T09:00:00' }, 'newsletter', now), /deadline/);
});
test('tracking requires a separately approved profile choice and never alters service consent', () => {
  const result = resolveBrief({ saveSessionReceipts: true }, {}, { saveSessionReceipts: false });
  assert.equal(result.preferences.saveSessionReceipts, false);
  assert.equal(result.processingAuthorized, false);
});
