import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, lstat, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseArgs, buildOperation, validateCallback, validateTokens, parseRpc, validateResult, Store, callTool, login, readInput } from '../skills/humanize-text/scripts/client.mjs';

test('validate each operation contract without requiring an absent scan authentication field', () => {
  const scan = { aiScore: 20, humanScore: 80, verdict: 'Mostly human-like estimate', indicator: 'CLEAR', wordCount: 20 };
  assert.deepEqual(validateResult('scan_ai_detection', scan), { ...scan, uncertaintyNotice: 'Automated detection is uncertain and can be wrong. This estimate does not prove who wrote the text.' });
  assert.throws(() => validateResult('scan_ai_detection', { ...scan, aiScore: 101 }), /Invalid/);
  assert.throws(() => validateResult('scan_ai_detection', { ...scan, wordCount: -1 }), /Invalid/);
  assert.throws(() => validateResult('humanize_text', { isAuthenticated: true }), /Invalid/);
  assert.throws(() => validateResult('check_word_balance', { isAuthenticated: false, totalAvailable: 10 }), /Invalid/);
  const balance = { isAuthenticated: true, planLimit: 0, planType: 'FREE', subscriptionRemaining: 0, purchasedCredits: 0, totalAvailable: 0 };
  assert.deepEqual(validateResult('check_word_balance', balance), balance);
});

test('rewrite and analysis require explicit processing consent; no implicit operation', () => {
  assert.throws(() => buildOperation(parseArgs(['rewrite']), 'A draft.'), /consent/);
  assert.throws(() => buildOperation(parseArgs(['analyze']), 'A draft.'), /consent/);
  assert.deepEqual(buildOperation(parseArgs(['balance']), ''), { name: 'check_word_balance', arguments: {} });
  assert.throws(() => parseArgs(['purchase']), /Unknown/);
  assert.throws(() => parseArgs(['rewrite', '--token', 'secret']), /Unknown/);
});
test('bounded text, modes and styles; exact text preserved', () => {
  const text = '  Our team meets tomorrow.\n';
  assert.deepEqual(buildOperation(parseArgs(['rewrite', '--consent', '--mode', 'academic']), text), { name: 'humanize_text', arguments: { text, mode: 'academic' } });
  assert.throws(() => buildOperation(parseArgs(['rewrite', '--consent', '--mode', 'academic', '--style', 'creative']), text), /Stealth/);
  assert.throws(() => buildOperation(parseArgs(['rewrite', '--consent']), ' '.repeat(20)), /blank/);
  assert.throws(() => buildOperation(parseArgs(['analyze', '--consent']), 'x'.repeat(12001)), /12,000/);
  assert.throws(() => parseArgs(['rewrite', '--consent', '--mode', 'translate']), /mode/);
});
test('OAuth callback requires exact path, method and unpredictable matching state', () => {
  const redirect = 'http://127.0.0.1:6274/callback';
  assert.equal(validateCallback('/callback?state=expected&code=good', 'GET', 'expected', redirect), 'good');
  assert.throws(() => validateCallback('/callback?state=wrong&code=good', 'GET', 'expected', redirect), /state/);
  assert.throws(() => validateCallback('/other?state=expected&code=good', 'GET', 'expected', redirect), /callback/);
  assert.throws(() => validateCallback('/callback?state=expected&code=good', 'POST', 'expected', redirect), /callback/);
  assert.throws(() => validateCallback('/callback?state=expected&error=access_denied', 'GET', 'expected', redirect), /declined/);
  assert.throws(() => validateCallback('/callback?state=expected&state=expected&code=good', 'GET', 'expected', redirect), /callback/);
});
test('token response must be complete and may not expand consented scopes', () => {
  const tokens = { access_token: 'test-access', refresh_token: 'test-refresh', token_type: 'Bearer', expires_in: 3600, scope: 'balance' };
  assert.equal(validateTokens(tokens, ['balance']).access_token, 'test-access');
  assert.throws(() => validateTokens({ ...tokens, scope: 'balance email' }, ['balance']), /permission/);
  assert.throws(() => validateTokens({ ...tokens, expires_in: -1 }, ['balance']), /Invalid/);
  assert.throws(() => validateTokens({ ...tokens, access_token: '' }, ['balance']), /Invalid/);
});
test('RPC supports JSON and SSE, matches id and propagates errors', () => {
  assert.deepEqual(parseRpc('{"jsonrpc":"2.0","id":2,"result":{"ok":true}}', 2, 'application/json'), { ok: true });
  assert.deepEqual(parseRpc('event: message\ndata: {"jsonrpc":"2.0","id":2,"result":{"ok":true}}\n\n', 2, 'text/event-stream'), { ok: true });
  assert.throws(() => parseRpc('{"jsonrpc":"2.0","id":3,"result":{}}', 2, 'application/json'), /matching/);
  assert.throws(() => parseRpc('{"jsonrpc":"2.0","id":2,"error":{"message":"private-secret"}}', 2, 'application/json'), e => !e.message.includes('private-secret'));
});
test('credential store is private, atomic and serializes commands', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'humanizer-cli-test-'));
  try {
    const store = new Store(join(dir, 'private'));
    await store.prepare();
    await store.save({ test: true });
    assert.deepEqual(await store.load(), { test: true });
    assert.equal((await lstat(store.file)).mode & 0o777, 0o600);
    assert.equal((await lstat(store.dir)).mode & 0o777, 0o700);
    const unlock = await store.lock();
    await assert.rejects(store.lock(), /Another/);
    await unlock();
    await store.clear();
    await assert.rejects(readFile(store.file), /ENOENT/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
test('no retries after rejected charged call; no tokens or server body in error', async () => {
  let calls = 0;
  const fakeFetch = async () => {
    calls++;
    if (calls === 1) return new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result: { protocolVersion: '2025-06-18' } }), { headers: { 'content-type': 'application/json' } });
    if (calls === 2) return new Response(null, { status: 202 });
    return new Response('private-secret', { status: 500 });
  };
  await assert.rejects(callTool('private-token', { name: 'humanize_text', arguments: { text: 'A draft.', mode: 'stealth' } }, fakeFetch), e => /500/.test(e.message) && !e.message.includes('private-'));
  assert.equal(calls, 3);
});

test('reject invalid UTF-8 instead of silently replacing draft characters', async () => {
  async function* invalid() { yield Buffer.from([0xff]); }
  await assert.rejects(readInput(undefined, invalid()), /UTF-8/);
});

test('successful browser callback completes token exchange and closes server', { timeout: 5000 }, async () => {
  const dir = await mkdtemp(join(tmpdir(), 'humanizer-cli-oauth-test-'));
  let callbackPromise;
  const fakeFetch = async (url, options) => {
    assert.equal(new URL(url).origin, 'https://texthumanizer.pro');
    if (url.endsWith('/register')) {
      const body = JSON.parse(options.body);
      assert.equal(body.token_endpoint_auth_method, 'none');
      assert.deepEqual(body.redirect_uris, ['http://127.0.0.1:6274/callback']);
      return new Response(JSON.stringify({ client_id: 'test-client' }));
    }
    assert.ok(url.endsWith('/token'));
    assert.equal(options.body.get('client_id'), 'test-client');
    assert.equal(options.body.get('code'), 'test-code');
    assert.ok(options.body.get('code_verifier').length >= 43);
    return new Response(JSON.stringify({ access_token: 'test-access', refresh_token: 'test-refresh', token_type: 'Bearer', expires_in: 3600, scope: 'balance' }));
  };
  try {
    const store = new Store(join(dir, 'private'));
    await login(store, ['balance'], message => {
      if (!message.startsWith('Open this')) return;
      const authorize = new URL(message.split('\n')[1]);
      assert.equal(authorize.searchParams.get('code_challenge_method'), 'S256');
      const callback = new URL('http://127.0.0.1:6274/callback');
      callback.searchParams.set('state', authorize.searchParams.get('state'));
      callback.searchParams.set('code', 'test-code');
      callbackPromise = fetch(callback).then(r => r.text());
    }, undefined, fakeFetch);
    assert.match(await callbackPromise, /sign-in received/);
    assert.equal((await store.load()).scope, 'balance');
  } finally { await rm(dir, { recursive: true, force: true }); }
});
