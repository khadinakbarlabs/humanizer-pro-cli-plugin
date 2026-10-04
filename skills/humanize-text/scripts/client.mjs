import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import { createServer } from 'node:http';
import { constants } from 'node:fs';
import { mkdir, lstat, chmod, open, rename, unlink } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

export const ORIGIN = 'https://texthumanizer.pro';
export const VERSION = '0.2.0';
export const REDIRECT = 'http://127.0.0.1:6274/callback';
const SCOPES = ['humanize', 'scan', 'balance'];
const MODES = ['stealth', 'academic', 'seo'];
const STYLES = ['creative', 'journalistic', 'professional'];
const MAX_RESPONSE = 2_000_000;

export function parseArgs(args) {
  const first = args.shift() || 'help';
  const command = { '--help': 'help', '-h': 'help', '--version': 'version', '-v': 'version' }[first] || first;
  if (!['help', 'version', 'login', 'logout', 'status', 'balance', 'rewrite', 'analyze'].includes(command)) throw new Error('Unknown command. Run help.');
  const options = { command };
  const allowed = { login: ['scope'], rewrite: ['mode', 'style', 'consent'], analyze: ['consent'] }[command] || [];
  while (args.length) {
    const name = args.shift();
    const key = name?.slice(2);
    if (!name?.startsWith('--') || !allowed.includes(key) || options[key] !== undefined) throw new Error('Unknown or duplicate option. Run help.');
    if (key === 'consent') options[key] = true;
    else {
      const value = args.shift();
      if (!value || value.startsWith('--')) throw new Error(`Missing value for --${key}.`);
      options[key] = value;
    }
  }
  if (options.mode && !MODES.includes(options.mode)) throw new Error('Invalid mode: stealth, academic or seo.');
  if (options.style && !STYLES.includes(options.style)) throw new Error('Invalid style: creative, journalistic or professional.');
  if (options.scope && options.scope.split(',').some(x => !SCOPES.includes(x))) throw new Error('Invalid scope: humanize, scan or balance.');
  return options;
}

export function buildOperation(options, text) {
  if (options.command === 'balance') return { name: 'check_word_balance', arguments: {} };
  if (!['rewrite', 'analyze'].includes(options.command)) throw new Error('No text operation selected.');
  if (!options.consent) throw new Error('Explicit --consent is required: selected text is sent to the processing provider; rewrites deduct words and save private history.');
  if (typeof text !== 'string' || !text.trim()) throw new Error('Text cannot be blank.');
  if (text.length > 12000) throw new Error('Text exceeds 12,000 characters. Select a shorter passage; no automatic splitting.');
  if (options.command === 'analyze') return { name: 'scan_ai_detection', arguments: { text } };
  const mode = options.mode || 'stealth';
  if (options.style && mode !== 'stealth') throw new Error('Style is supported only in Stealth mode.');
  return { name: 'humanize_text', arguments: { text, mode, ...(options.style ? { style: options.style } : {}) } };
}

export function validateCallback(target, method, state, redirect = REDIRECT) {
  const url = new URL(target, redirect);
  if (method !== 'GET' || url.origin !== new URL(redirect).origin || url.pathname !== '/callback' || url.searchParams.getAll('state').length !== 1 || url.searchParams.getAll('code').length > 1) throw new Error('Invalid sign-in callback.');
  const actual = Buffer.from(url.searchParams.get('state') || '');
  const expected = Buffer.from(state);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new Error('Invalid sign-in state.');
  if (url.searchParams.has('error')) throw new Error('Sign-in declined. Run login again when ready.');
  const code = url.searchParams.get('code');
  if (!code || code.length > 4096) throw new Error('Invalid sign-in callback.');
  return code;
}

export function validateTokens(tokens, grantedScopes) {
  if (!tokens || typeof tokens.access_token !== 'string' || !tokens.access_token || tokens.access_token.length > 16384 || typeof tokens.refresh_token !== 'string' || !tokens.refresh_token || tokens.refresh_token.length > 16384 || String(tokens.token_type).toLowerCase() !== 'bearer' || !Number.isFinite(tokens.expires_in) || tokens.expires_in <= 0 || tokens.expires_in > 86400) throw new Error('Invalid sign-in response.');
  const scopes = typeof tokens.scope === 'string' ? tokens.scope.trim().split(/\s+/) : grantedScopes;
  if (scopes.some(scope => !grantedScopes.includes(scope))) throw new Error('Unexpected permission in sign-in response.');
  return { ...tokens, scope: scopes.join(' ') };
}

export class Store {
  constructor(dir = process.env.HUMANIZER_PRO_CONFIG_DIR || join(homedir(), '.humanizer-pro-cli')) {
    this.dir = dir;
    this.file = join(dir, 'connection.json');
    this.lockFile = join(dir, 'command.lock');
  }
  async verify(path, directory = false) {
    const stat = await lstat(path);
    if (stat.isSymbolicLink() || (directory ? !stat.isDirectory() : !stat.isFile()) || (process.getuid && stat.uid !== process.getuid())) throw new Error('Unsafe credential location. Use a private directory owned by your account.');
    return stat;
  }
  async prepare() {
    await mkdir(this.dir, { recursive: true, mode: 0o700 });
    await this.verify(this.dir, true);
    await chmod(this.dir, 0o700);
  }
  async load() {
    await this.prepare();
    try {
      const stat = await this.verify(this.file);
      if ((stat.mode & 0o077) || stat.size > 64000) throw new Error('Credential file is not private or is invalid. Reconnect after correcting its permissions.');
      const handle = await open(this.file, constants.O_RDONLY | constants.O_NOFOLLOW);
      try { return JSON.parse(await handle.readFile('utf8')); }
      finally { await handle.close(); }
    } catch (error) {
      if (error.code === 'ENOENT') return null;
      if (error instanceof SyntaxError) throw new Error('Invalid saved connection. Run logout, then login.');
      throw error;
    }
  }
  async save(value) {
    await this.prepare();
    const temp = join(this.dir, `.connection-${randomBytes(12).toString('hex')}`);
    const handle = await open(temp, 'wx', 0o600);
    try {
      await handle.writeFile(JSON.stringify(value));
      await handle.sync();
    } finally { await handle.close(); }
    try { await rename(temp, this.file); }
    finally { await unlink(temp).catch(error => { if (error.code !== 'ENOENT') throw error; }); }
  }
  async clear() {
    try { await this.verify(this.file); await unlink(this.file); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  async lock() {
    await this.prepare();
    let handle;
    try { handle = await open(this.lockFile, 'wx', 0o600); }
    catch (error) {
      if (error.code === 'EEXIST') throw new Error('Another CLI command is active. If a process crashed, verify it has stopped before deleting command.lock in the private configuration directory.');
      throw error;
    }
    await handle.writeFile(String(process.pid));
    return async () => { await handle.close(); await unlink(this.lockFile); };
  }
}

async function boundedBody(response) {
  if (!response.body) return '';
  const reader = response.body.getReader();
  const chunks = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_RESPONSE) throw new Error('Service response exceeds the size limit. No automatic retry.');
      chunks.push(Buffer.from(value));
    }
    return Buffer.concat(chunks).toString('utf8');
  } finally { await reader.cancel().catch(() => {}); }
}

async function request(path, options = {}, fetchImpl = fetch) {
  if (!path.startsWith('/') || path.startsWith('//')) throw new Error('Invalid service endpoint.');
  let response;
  try {
    response = await fetchImpl(`${ORIGIN}${path}`, { ...options, redirect: 'error', signal: AbortSignal.timeout(60000) });
    if (!response.ok) {
      await response.body?.cancel();
      throw new Error(`Service request failed (HTTP ${response.status}). ${response.status === 401 ? 'Reconnect with login.' : 'No automatic retry; check account status before retrying a rewrite.'}`);
    }
    const body = await boundedBody(response);
    return { body, type: response.headers.get('content-type') || '', status: response.status };
  } catch (error) {
    if (/^Service |^Invalid |^No matching/.test(error.message)) throw error;
    throw new Error('Service connection failed or timed out. A rewrite outcome may be unknown; check account history and balance before deciding whether to retry.');
  }
}

function parseJson(body) {
  try { return JSON.parse(body); }
  catch { throw new Error('Invalid service response.'); }
}

async function tokenRequest(params, fetchImpl = fetch) {
  return parseJson((await request('/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(params) }, fetchImpl)).body);
}

export async function login(store, scopes = SCOPES, emit = console.log, signal, fetchImpl = fetch) {
  const state = randomBytes(32).toString('base64url');
  const verifier = randomBytes(32).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  let resolveCode, rejectCode;
  const codePromise = new Promise((resolve, reject) => { resolveCode = resolve; rejectCode = reject; });
  codePromise.catch(() => {});
  const server = createServer((req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Security-Policy', "default-src 'none'");
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Referrer-Policy', 'no-referrer');
    if (req.headers.host !== '127.0.0.1:6274') { res.writeHead(400); res.end('Invalid callback.'); return; }
    try {
      const code = validateCallback(req.url, req.method, state);
      res.end('Humanizer PRO sign-in received. Return to your terminal to verify completion. You may close this tab.');
      resolveCode(code);
    } catch (error) {
      res.writeHead(400); res.end('Sign-in callback rejected. Return to your terminal.');
      if (error.message.startsWith('Sign-in declined')) rejectCode(error);
    }
  });
  const abort = () => rejectCode(new Error('Sign-in cancelled.'));
  signal?.addEventListener('abort', abort, { once: true });
  let timer;
  try {
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(6274, '127.0.0.1', resolve); });
    const registration = parseJson((await request('/register', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ client_name: 'Humanizer PRO CLI', client_uri: ORIGIN, redirect_uris: [REDIRECT], token_endpoint_auth_method: 'none', grant_types: ['authorization_code', 'refresh_token'], response_types: ['code'], scope: scopes.join(' ') }),
    }, fetchImpl)).body);
    if (typeof registration.client_id !== 'string' || !registration.client_id || registration.client_id.length > 512 || registration.client_secret) throw new Error('Invalid public-client registration response.');
    const url = new URL('/authorize', ORIGIN);
    for (const [key, value] of Object.entries({ response_type: 'code', client_id: registration.client_id, redirect_uri: REDIRECT, scope: scopes.join(' '), state, code_challenge: challenge, code_challenge_method: 'S256', resource: `${ORIGIN}/mcp` })) url.searchParams.set(key, value);
    emit(`Open this Humanizer PRO sign-in link in your browser:\n${url.href}\nApprove only the requested permissions. Do not paste passwords or tokens into chat. Waiting up to 5 minutes.`);
    timer = setTimeout(() => rejectCode(new Error('Sign-in timed out. Run login again.')), 300000);
    const code = await codePromise;
    const tokens = validateTokens(await tokenRequest({ grant_type: 'authorization_code', code, redirect_uri: REDIRECT, client_id: registration.client_id, code_verifier: verifier, resource: `${ORIGIN}/mcp` }, fetchImpl), scopes);
    await store.save({ client_id: registration.client_id, access_token: tokens.access_token, refresh_token: tokens.refresh_token, scope: tokens.scope, expires_at: Date.now() + tokens.expires_in * 1000 });
    emit('Humanizer PRO connected. Tokens saved in your private local configuration directory.');
  } catch (error) {
    if (error.code === 'EADDRINUSE') throw new Error('Sign-in port 6274 is in use. Stop the other local sign-in process and retry.');
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
    const closing = new Promise(resolve => server.close(() => resolve()));
    server.closeAllConnections();
    await closing;
  }
}

export async function accessToken(store, requiredScope) {
  const saved = await store.load();
  if (!saved || typeof saved.client_id !== 'string' || typeof saved.access_token !== 'string' || typeof saved.refresh_token !== 'string' || !Number.isFinite(saved.expires_at) || typeof saved.scope !== 'string') throw new Error('Not connected. Run login.');
  const granted = saved.scope.split(/\s+/);
  if (granted.some(x => !SCOPES.includes(x))) throw new Error('Invalid saved connection. Run logout, then login.');
  if (!granted.includes(requiredScope)) throw new Error(`This connection lacks ${requiredScope} permission. Run login and authorize that operation.`);
  if (saved.expires_at > Date.now() + 30000) return saved.access_token;
  const next = validateTokens(await tokenRequest({ grant_type: 'refresh_token', refresh_token: saved.refresh_token, client_id: saved.client_id, resource: `${ORIGIN}/mcp` }), granted);
  await store.save({ client_id: saved.client_id, access_token: next.access_token, refresh_token: next.refresh_token, scope: next.scope, expires_at: Date.now() + next.expires_in * 1000 });
  if (!next.scope.split(/\s+/).includes(requiredScope)) throw new Error('Connection permission was reduced. Reconnect to authorize this operation.');
  return next.access_token;
}

export function parseRpc(body, id, type) {
  let messages;
  if (type.includes('text/event-stream')) {
    messages = body.replace(/\r\n/g, '\n').split('\n\n').map(event => event.split('\n').filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n')).filter(Boolean).map(parseJson);
  } else messages = [parseJson(body)];
  const message = messages.find(value => value?.jsonrpc === '2.0' && value.id === id);
  if (!message) throw new Error('No matching service response. No automatic retry.');
  if (message.error || !Object.hasOwn(message, 'result')) throw new Error('Service operation failed. No automatic retry; check account status before retrying.');
  return message.result;
}

export function validateResult(name, value) {
  const count = number => Number.isSafeInteger(number) && number >= 0;
  const text = item => typeof item === 'string' && item.trim().length > 0;
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid operation result. No automatic retry.');
  let valid = false;
  if (name === 'scan_ai_detection') {
    valid = count(value.aiScore) && value.aiScore <= 100 && count(value.humanScore) && value.humanScore <= 100 && text(value.verdict) && ['DETECTED', 'CAUTION', 'CLEAR'].includes(value.indicator) && count(value.wordCount);
  } else if (name === 'humanize_text') {
    valid = value.isAuthenticated === true && text(value.humanizedText) && text(value.reviewNotice) && count(value.wordCount) && MODES.includes(value.mode) && (value.wordsRemaining === undefined || count(value.wordsRemaining));
  } else if (name === 'check_word_balance') {
    valid = value.isAuthenticated === true && text(value.planType) && ['planLimit', 'subscriptionRemaining', 'purchasedCredits', 'totalAvailable'].every(key => count(value[key]));
  }
  if (!valid) throw new Error('Invalid operation result. No automatic retry.');
  return name === 'scan_ai_detection' ? { ...value, uncertaintyNotice: 'Automated detection is uncertain and can be wrong. This estimate does not prove who wrote the text.' } : value;
}

export async function callTool(token, operation, fetchImpl = fetch) {
  const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json', accept: 'application/json, text/event-stream' };
  const initial = await request('/mcp', { method: 'POST', headers, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'humanizer-pro-cli', version: VERSION } } }) }, fetchImpl);
  const handshake = parseRpc(initial.body, 1, initial.type);
  if (!['2025-03-26', '2025-06-18', '2025-11-25'].includes(handshake.protocolVersion)) throw new Error('Unsupported service protocol. Update the CLI.');
  headers['mcp-protocol-version'] = handshake.protocolVersion;
  await request('/mcp', { method: 'POST', headers, body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) }, fetchImpl);
  const response = await request('/mcp', { method: 'POST', headers, body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: operation }) }, fetchImpl);
  const result = parseRpc(response.body, 2, response.type);
  if (result?.isError) throw new Error('Humanizer PRO could not complete this operation. Check sign-in, permissions and account allowance. No automatic retry.');
  return validateResult(operation.name, result?.structuredContent);
}

export async function readInput(path, input = process.stdin) {
  if (path) throw new Error('File inputs are unsupported. Supply only the selected passage through standard input.');
  if (input.isTTY) throw new Error('Pipe only the selected passage through standard input.');
  let count = 0;
  const chunks = [];
  for await (const chunk of input) {
    count += Buffer.byteLength(chunk);
    if (count > 48000) throw new Error('Input exceeds the text size limit.');
    chunks.push(Buffer.from(chunk));
  }
  try { return new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks)); }
  catch { throw new Error('Input must contain valid UTF-8 text.'); }
}

export const HELP = `Humanizer PRO CLI ${VERSION} (Node.js 20.11+)
Usage: humanizer-pro <command> [options]
  login [--scope humanize,scan,balance]  Connect in your browser; no passwords in CLI
  status                               Show local connection status without secrets
  logout                               Remove this machine's saved connection
  balance                              Check existing account allowance
  rewrite --consent [--mode stealth|academic|seo] [--style creative|journalistic|professional]
  analyze --consent                     Analyze writing-style signals on request
  help | --help | version | --version
Text comes only from stdin, never a file or command-line argument. --consent permits
sending it to the disclosed processing provider. Rewrites deduct existing words
and save private source/output history; analysis is uncertain, with no deduction
or history entry. Review facts and meaning. No checkout, recharge, or auto-retries.
Sign-in requires a browser on the same computer (loopback port 6274).
Configuration: ~/.humanizer-pro-cli, or HUMANIZER_PRO_CONFIG_DIR (private).
Logout deletes local tokens; it does not claim to revoke other service sessions.
Privacy and terms: https://texthumanizer.pro/privacy and /terms.`;

export async function main(args = process.argv.slice(2)) {
  const options = parseArgs([...args]);
  if (options.command === 'help') { console.log(HELP); return; }
  if (options.command === 'version') { console.log(VERSION); return; }
  const store = new Store();
  const unlock = await store.lock();
  const abort = new AbortController();
  const interrupt = () => abort.abort();
  process.once('SIGINT', interrupt);
  process.once('SIGTERM', interrupt);
  try {
    if (options.command === 'login') return await login(store, [...new Set(options.scope?.split(',') || SCOPES)], console.log, abort.signal);
    if (options.command === 'logout') { await store.clear(); console.log('Local connection removed. Other sessions are unchanged; revoke remote connections through account settings where available.'); return; }
    if (options.command === 'status') {
      const value = await store.load();
      console.log(JSON.stringify({ connectedLocally: !!value, scopes: value?.scope?.split(/\s+/) || [], accessTokenExpired: value ? value.expires_at <= Date.now() : null }));
      return;
    }
    const operation = buildOperation(options, ['rewrite', 'analyze'].includes(options.command) ? await readInput(options.file) : '');
    const scope = { check_word_balance: 'balance', humanize_text: 'humanize', scan_ai_detection: 'scan' }[operation.name];
    const token = await accessToken(store, scope);
    console.log(JSON.stringify(await callTool(token, operation), null, 2));
  } finally {
    process.removeListener('SIGINT', interrupt);
    process.removeListener('SIGTERM', interrupt);
    await unlock();
  }
}
