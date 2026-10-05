import { randomUUID, randomBytes } from 'node:crypto';
import { constants } from 'node:fs';
import { mkdir, lstat, chmod, open, rename, unlink } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

export const WRITING_COMMANDS = new Set(['profile', 'brief', 'review', 'session', 'feedback', 'report', 'routine', 'history']);
const MODES = ['stealth', 'academic', 'seo'];
const STYLES = ['creative', 'journalistic', 'professional'];
const PROFILE_FIELDS = ['purpose', 'audience', 'tone', 'spelling', 'mode', 'style', 'protectedTerms', 'avoidPhrases', 'saveSessionReceipts'];
const OUTCOMES = ['accepted', 'edited', 'rejected'];
const REASONS = ['none', 'too-formal', 'too-casual', 'meaning-changed', 'too-generic', 'voice-mismatch', 'other'];
const MAX_SESSIONS = 500;
const uuid = value => typeof value === 'string' && /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(value);
const integer = (value, max = 1_000_000) => Number.isSafeInteger(value) && value >= 0 && value <= max;
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const projectName = value => typeof value === 'string' && /^[a-z][a-z\d-]{0,63}$/.test(value);
function instant(value) {
  if (typeof value !== 'string') return false;
  const parts = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.exec(value);
  if (!parts || !Number.isFinite(Date.parse(value))) return false;
  const [, year, month, day, hour, minute, second] = parts.map(Number);
  const calendar = new Date(0);
  calendar.setUTCFullYear(year, month - 1, day);
  return calendar.getUTCFullYear() === year && calendar.getUTCMonth() === month - 1 && calendar.getUTCDate() === day && hour < 24 && minute < 60 && second < 60;
}
const timestamp = value => instant(value) && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value);
const emptyState = () => ({ version: 1, profiles: {}, sessions: [], pruned: 0 });

function keys(value, allowed) {
  if (!object(value)) throw new Error('Invalid input: expected a JSON object.');
  if (Object.keys(value).some(key => !allowed.includes(key))) throw new Error('Unknown input field. Supply only documented writing metadata, never credentials or private passages.');
}
function shortText(value, max = 160) {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= max && !/[\u0000-\u001f\u007f]/.test(value);
}
function terms(value) {
  return Array.isArray(value) && value.length <= 20 && value.every(item => shortText(item, 120));
}
function decode(text) {
  if (typeof text !== 'string' || Buffer.byteLength(text) > 120000) throw new Error('Invalid writing input size.');
  try { return JSON.parse(text); } catch { throw new Error('Invalid JSON writing input.'); }
}

export function validateProfile(value) {
  keys(value, PROFILE_FIELDS);
  for (const [key, item] of Object.entries(value)) {
    const valid = ['purpose', 'audience', 'tone'].includes(key) ? shortText(item)
      : key === 'spelling' ? ['US', 'UK', 'AU', 'keep-original'].includes(item)
      : key === 'mode' ? MODES.includes(item)
      : key === 'style' ? STYLES.includes(item)
      : key === 'saveSessionReceipts' ? typeof item === 'boolean' : terms(item);
    if (!valid) throw new Error(`Invalid writing preference: ${key}.`);
  }
  return structuredClone(value);
}

export function parseWritingArgs(args) {
  const values = [...args];
  const command = values.shift();
  if (!WRITING_COMMANDS.has(command)) throw new Error('Unknown local writing command.');
  const action = ['profile', 'history'].includes(command) && values[0] && !values[0].startsWith('--') ? values.shift() : 'show';
  if (command === 'profile' && !['show', 'set', 'reset', 'export'].includes(action)) throw new Error('Invalid profile action.');
  if (command === 'history' && !['show', 'reset', 'export'].includes(action)) throw new Error('Invalid history action.');
  const writable = ['session', 'feedback'].includes(command) || (command === 'profile' && ['set', 'reset'].includes(action)) || (command === 'history' && action === 'reset');
  const allowed = ['project', ...(writable ? ['consent'] : []), ...(['review', 'report'].includes(command) ? ['format'] : []), ...(command === 'review' ? ['input'] : []), ...(command === 'report' ? ['days'] : []), ...(command === 'feedback' ? ['session'] : [])];
  const options = { command, action, project: 'global', format: 'json', days: 7 };
  const seen = new Set();
  while (values.length) {
    const flag = values.shift();
    const key = flag?.slice(2);
    if (!flag?.startsWith('--') || !allowed.includes(key) || seen.has(key)) throw new Error('Unknown or duplicate writing option.');
    seen.add(key);
    if (key === 'consent') options.consent = true;
    else {
      const value = values.shift();
      if (!value || value.startsWith('--')) throw new Error(`Missing writing option: ${key}.`);
      options[key] = key === 'days' ? Number(value) : value;
    }
  }
  if (!projectName(options.project)) throw new Error('Invalid project: use a lowercase name with letters, digits and hyphens.');
  if (!['json', 'html'].includes(options.format)) throw new Error('Invalid report format.');
  if (!Number.isSafeInteger(options.days) || options.days < 1 || options.days > 90) throw new Error('Invalid report days: choose 1 to 90.');
  if (writable && !options.consent) throw new Error('Explicit --consent is required to save or delete local writing preferences or session metadata.');
  if (command === 'feedback' && !uuid(options.session)) throw new Error('Invalid recorded session identifier.');
  return options;
}

function validateReceipt(value) {
  keys(value, ['receiptKey', 'operation', 'status', 'wordCount', 'mode', 'reviewFlagCount']);
  if (!uuid(value.receiptKey) || !['rewrite', 'review', 'kept-original'].includes(value.operation) || !['completed', 'failed', 'unknown'].includes(value.status)) throw new Error('Invalid session receipt.');
  const chargedSuccess = value.operation === 'rewrite' && value.status === 'completed';
  if (chargedSuccess ? value.wordCount !== null && !integer(value.wordCount) : value.wordCount !== null) throw new Error('Invalid wordCount: only completed rewrites may have reported usage; otherwise use null.');
  if (value.mode !== undefined && !MODES.includes(value.mode)) throw new Error('Invalid receipt mode.');
  if (value.reviewFlagCount !== undefined && value.reviewFlagCount !== null && !integer(value.reviewFlagCount, 100)) throw new Error('Invalid review flag count.');
  return { receiptKey: value.receiptKey, operation: value.operation, status: value.status, wordCount: value.wordCount, ...(value.mode ? { mode: value.mode } : {}), reviewFlagCount: value.reviewFlagCount ?? null };
}
function validateFeedback(value) {
  keys(value, ['outcome', 'reason']);
  if (!OUTCOMES.includes(value.outcome) || !REASONS.includes(value.reason ?? 'none')) throw new Error('Invalid feedback: use a documented outcome and reason.');
  return { outcome: value.outcome, reason: value.reason ?? 'none' };
}
function validateState(state) {
  keys(state, ['version', 'profiles', 'sessions', 'pruned']);
  if (state.version !== 1 || !object(state.profiles) || Object.keys(state.profiles).length > 50 || !Array.isArray(state.sessions) || state.sessions.length > MAX_SESSIONS || !integer(state.pruned)) throw new Error('Invalid saved writing state.');
  for (const [project, profile] of Object.entries(state.profiles)) {
    if (!projectName(project)) throw new Error('Invalid saved project.');
    validateProfile(profile);
  }
  const ids = new Set();
  for (const item of state.sessions) {
    keys(item, ['id', 'project', 'createdAt', 'receiptKey', 'operation', 'status', 'wordCount', 'mode', 'reviewFlagCount', 'feedback', 'feedbackAt']);
    if (!uuid(item.id) || ids.has(item.id) || item.receiptKey !== item.id || !projectName(item.project) || !timestamp(item.createdAt)) throw new Error('Invalid saved receipt identity.');
    ids.add(item.id);
    const { id, project, createdAt, feedback, feedbackAt, ...fields } = item;
    validateReceipt(fields);
    if (feedback) {
      validateFeedback(feedback);
      if (item.status !== 'completed' || item.operation !== 'rewrite' || !timestamp(feedbackAt)) throw new Error('Invalid saved feedback.');
    } else if (feedbackAt !== undefined) throw new Error('Invalid saved feedback date.');
  }
  return state;
}

export class WritingStore {
  constructor(dir = process.env.HUMANIZER_PRO_WRITING_DIR || join(homedir(), '.humanizer-pro-writing')) {
    this.dir = dir;
    this.file = join(dir, 'writing.json');
    this.lockFile = join(dir, 'writing.lock');
  }
  async verify(path, directory = false) {
    const stat = await lstat(path);
    if (stat.isSymbolicLink() || (directory ? !stat.isDirectory() : !stat.isFile()) || (process.getuid && stat.uid !== process.getuid())) throw new Error('Unsafe writing location. Use a private directory owned by your account.');
    if (stat.mode & 0o077) throw new Error('Writing location is not private. Restrict its permissions before retrying.');
    return stat;
  }
  async load() {
    let handle;
    try {
      await this.verify(this.dir, true);
      const stat = await this.verify(this.file);
      if (stat.size > 500000) throw new Error('Saved writing state exceeds the size limit.');
      handle = await open(this.file, constants.O_RDONLY | constants.O_NOFOLLOW);
      const opened = await handle.stat();
      if (!opened.isFile() || opened.mode & 0o077 || (process.getuid && opened.uid !== process.getuid()) || opened.size > 500000) throw new Error('Unsafe saved writing state.');
      let state;
      try { state = JSON.parse(await handle.readFile('utf8')); } catch { throw new Error('Invalid saved writing JSON; do not overwrite it.'); }
      return validateState(state);
    } catch (error) { if (error.code === 'ENOENT') return emptyState(); throw error; }
    finally { await handle?.close(); }
  }
  async update(fn) {
    await mkdir(this.dir, { recursive: true, mode: 0o700 });
    await this.verify(this.dir, true);
    await chmod(this.dir, 0o700);
    let lock;
    try { lock = await open(this.lockFile, 'wx', 0o600); }
    catch (error) { if (error.code === 'EEXIST') throw new Error('Another writing command is active. Retry after it finishes; never remove an active lock.'); throw error; }
    const temp = join(this.dir, `.writing-${randomBytes(12).toString('hex')}`);
    try {
      const state = validateState(await fn(await this.load()));
      const encoded = JSON.stringify(state);
      if (Buffer.byteLength(encoded) > 500000) throw new Error('Saved writing state exceeds the size limit.');
      const handle = await open(temp, 'wx', 0o600);
      try { await handle.writeFile(encoded); await handle.sync(); } finally { await handle.close(); }
      await rename(temp, this.file);
    } finally {
      try { try { await unlink(temp); } catch (error) { if (error.code !== 'ENOENT') throw error; } }
      finally { try { await lock.close(); } finally { await unlink(this.lockFile); } }
    }
  }
}

export function resolveBrief(global, project, request) {
  const preferences = {};
  const sources = {};
  const overrideNotes = [];
  for (const [source, value] of [['global', global], ['project', project], ['request', request]]) {
    for (const [key, item] of Object.entries(validateProfile(value))) {
      if (Object.hasOwn(preferences, key) && JSON.stringify(preferences[key]) !== JSON.stringify(item)) overrideNotes.push(`${key}: ${source} replaces ${sources[key]}.`);
      preferences[key] = item; sources[key] = source;
    }
  }
  const mode = preferences.mode ?? 'stealth';
  const supportedRewriteOptions = { mode };
  if (preferences.style && mode === 'stealth') supportedRewriteOptions.style = preferences.style;
  else if (preferences.style) overrideNotes.push(`style is not supported in ${mode} mode; it will guide review only.`);
  return { preferences, sources, overrideNotes, supportedRewriteOptions, receiptKey: randomUUID(), limitation: 'Only supported mode/style options can reach the current rewriting service. Other approved preferences guide the assistant editing plan and review; personalized voice adherence is not guaranteed.', processingAuthorized: false };
}

const unique = values => [...new Set(values)];
const matches = (text, pattern) => unique([...text.matchAll(pattern)].map(match => match[0]));
export function reviewText(value) {
  keys(value, ['original', 'revised', 'protectedTerms']);
  for (const name of ['original', 'revised']) if (typeof value[name] !== 'string' || !value[name].trim() || value[name].length > 12000) throw new Error(`Invalid ${name}: supply a passage of at most 12,000 characters.`);
  if (!terms(value.protectedTerms ?? [])) throw new Error('Invalid protected terms.');
  const { original, revised } = value;
  const flags = [];
  const compare = (category, before, after) => {
    const removed = before.filter(item => !after.includes(item));
    const added = after.filter(item => !before.includes(item));
    if (removed.length || added.length) flags.push({ category, removed, added });
  };
  compare('numbers', matches(original, /(?<![\p{L}\p{N}])[-+]?\d+(?:[.,]\d+)*%?/gu), matches(revised, /(?<![\p{L}\p{N}])[-+]?\d+(?:[.,]\d+)*%?/gu));
  const dates = text => matches(text, /\b\d{4}-\d{2}-\d{2}\b|\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:,?\s+\d{4})?/gi);
  compare('dates', dates(original), dates(revised));
  const links = text => unique(matches(text, /https?:\/\/[^\s<>"'`]+/gi).map(item => item.replace(/[),.;!?]+$/, '')));
  compare('links', links(original), links(revised));
  const quotations = text => matches(text, /"[^"\n]+"|“[^”\n]+”|‘[^’\n]+’/gu);
  compare('quotations', quotations(original), quotations(revised));
  const negations = text => [...text.toLowerCase().matchAll(/\b(?:not|no|never|without|neither|cannot|can't|isn't|won't|don't|doesn't|didn't)\b/g)].map(match => match[0]);
  const before = negations(original); const after = negations(revised);
  if (JSON.stringify([...before].sort()) !== JSON.stringify([...after].sort())) flags.push({ category: 'negations', removed: before, added: after });
  const lost = unique(value.protectedTerms ?? []).filter(term => original.includes(term) && !revised.includes(term));
  if (lost.length) flags.push({ category: 'protected-terms', removed: lost, added: [] });
  return { original, revised, flags, changed: original !== revised, notice: 'These exact-detail checks are not proof of factual accuracy or preserved meaning. Review context, names, dates, quantities, qualifiers and claims; additional changes may be missed.' };
}

export function summarize(state, project = 'global', days = 7, now = new Date()) {
  const end = now.getTime();
  const start = end - days * 86400000;
  const sessions = state.sessions.filter(item => item.project === project && Date.parse(item.createdAt) >= start && Date.parse(item.createdAt) <= end);
  const completedRewrites = sessions.filter(item => item.operation === 'rewrite' && item.status === 'completed');
  const rated = completedRewrites.filter(item => item.feedback);
  const accepted = rated.filter(item => item.feedback.outcome === 'accepted').length;
  const timeline = {};
  for (const item of sessions) { const date = item.createdAt.slice(0, 10); timeline[date] = (timeline[date] ?? 0) + 1; }
  const feedbackReasons = {};
  for (const item of rated) if (item.feedback.reason !== 'none') feedbackReasons[item.feedback.reason] = (feedbackReasons[item.feedback.reason] ?? 0) + 1;
  return { project, days, generatedAt: now.toISOString(), recordedSessions: sessions.length, completedRewrites: completedRewrites.length, keptOriginal: sessions.filter(item => item.operation === 'kept-original' && item.status === 'completed').length, localReviews: sessions.filter(item => item.operation === 'review' && item.status === 'completed').length, failed: sessions.filter(item => item.status === 'failed').length, unknown: sessions.filter(item => item.status === 'unknown').length, wordsReportedUsed: completedRewrites.reduce((sum, item) => sum + (item.wordCount ?? 0), 0), rewritesWithUnknownUsage: completedRewrites.filter(item => item.wordCount === null).length, rated: rated.length, accepted, edited: rated.filter(item => item.feedback.outcome === 'edited').length, rejected: rated.filter(item => item.feedback.outcome === 'rejected').length, awaitingFeedback: completedRewrites.length - rated.length, acceptanceRate: rated.length ? accepted / rated.length : null, activeDays: Object.keys(timeline).length, timeline, feedbackReasons, retainedReceipts: state.sessions.length, prunedReceipts: state.pruned ?? 0, notice: 'Local, explicitly saved receipts only; not a complete account audit. Word usage is reported from supplied service results; host costs and time saved are not measured. Active-day buckets use UTC. No writing passages are stored in this report.' };
}

const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const shell = (title, subtitle, body) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>${escape(title)} — Humanizer PRO</title><style>*{box-sizing:border-box}body{margin:0;background:#f5f6fa;color:#172338;font:16px/1.6 system-ui,sans-serif}main{max-width:1080px;margin:auto;padding:48px 24px}.brand{color:#504098;font-weight:700;font-size:13px;letter-spacing:1.2px;text-transform:uppercase}h1{font-size:40px;line-height:1.15;letter-spacing:-1.2px;margin:12px 0}h2{font-size:22px;margin:0 0 12px}p{margin:10px 0}.muted{color:#5d687a}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;margin:28px 0}.card,section{background:white;border:1px solid #dbe1ed;border-radius:18px;padding:24px;min-width:0}.value{font-size:38px;font-weight:650;color:#504098}section{margin:20px 0}.row{display:flex;justify-content:space-between;gap:16px;border-bottom:1px solid #edf0f5;padding:12px 0;overflow-wrap:anywhere}.note{background:#fff7e6;border-radius:12px;padding:18px;font-size:14px}.passages{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}.text{white-space:pre-wrap;overflow-wrap:anywhere}.pill{display:inline-block;background:#e9e5ff;color:#504098;border-radius:20px;padding:4px 10px;font-size:12px}.bar{height:7px;background:#e9e5ff;border-radius:4px;overflow:hidden;margin-top:8px}.bar span{display:block;height:100%;background:#7563df}@media(max-width:700px){main{padding:24px 16px}h1{font-size:30px}.grid{grid-template-columns:1fr 1fr}.passages{grid-template-columns:1fr}.card,section{padding:18px}.value{font-size:30px}}@media(max-width:380px){.grid{grid-template-columns:1fr}}</style></head><body><main><div class="brand">Humanizer PRO · local writing workspace</div><h1>${escape(title)}</h1><p class="muted">${escape(subtitle)}</p>${body}<p class="muted">Private local output · no scripts, external assets or telemetry</p></main></body></html>`;
export function renderReport(value) {
  const cards = [['Recorded sessions', value.recordedSessions], ['Words reported used', value.wordsReportedUsed], ['Accepted / rated', `${value.accepted} / ${value.rated}`], ['Awaiting feedback', value.awaitingFeedback], ['Active days', value.activeDays], ['Unknown outcomes', value.unknown]].map(([label, number]) => `<div class="card"><div class="muted">${escape(label)}</div><div class="value">${escape(number)}</div></div>`).join('');
  const peak = Math.max(1, ...Object.values(value.timeline));
  const timeline = Object.entries(value.timeline).sort().map(([date, count]) => `<div><div class="row"><span>${escape(date)}</span><strong>${escape(count)} recorded</strong></div><div class="bar" aria-hidden="true"><span style="width:${Math.round(count / peak * 100)}%"></span></div></div>`).join('') || '<p class="muted">No saved sessions in this period. Recording is optional.</p>';
  const reasons = Object.entries(value.feedbackReasons).map(([reason, count]) => `<div class="row"><span>${escape(reason.replaceAll('-', ' '))}</span><strong>${escape(count)}</strong></div>`).join('') || '<p class="muted">No feedback reasons recorded. Feedback never silently changes a profile.</p>';
  const coverage = [['Accepted', value.accepted], ['Edited', value.edited], ['Rejected', value.rejected], ['Completed rewrites', value.completedRewrites], ['Rewrites with unknown word usage', value.rewritesWithUnknownUsage], ['Failed operations', value.failed], ['Original drafts kept', value.keptOriginal], ['Local reviews', value.localReviews]].map(([label, count]) => `<div class="row"><span>${escape(label)}</span><strong>${escape(count)}</strong></div>`).join('');
  return shell('Your writing report', `${value.project} · past ${value.days} days · ${value.generatedAt}`, `<div class="grid">${cards}</div><section><h2>Writing activity</h2>${timeline}</section><section><h2>Outcome and usage coverage</h2>${coverage}<p class="muted">Accepted/rated includes only completed rewrites with feedback. Missing feedback and unknown usage stay separate.</p></section><section><h2>What your feedback says</h2>${reasons}</section><div class="note">${escape(value.notice)} ${escape(value.prunedReceipts)} older receipts were removed by the 500-receipt retention cap.</div>`);
}
export function renderReview(value) {
  const flags = value.flags.map(flag => `<div class="row"><div><strong>${escape(flag.category.replaceAll('-', ' '))}</strong><div class="muted">Removed or changed: ${escape(flag.removed.join(' · ') || 'none')}<br>Added: ${escape(flag.added.join(' · ') || 'none')}</div></div><span class="pill">Check</span></div>`).join('') || '<p class="muted">No protected-detail differences found by these limited checks. Read both passages before accepting.</p>';
  return shell('Review your revision', 'Exact passages · deterministic detail checks · no service call', `<div class="passages"><section><h2>Original</h2><div class="text">${escape(value.original)}</div></section><section><h2>Revised</h2><div class="text">${escape(value.revised)}</div></section></div><section><h2>Details to check</h2>${flags}</section><div class="note">${escape(value.notice)}</div>`);
}

export function routinePlan(value, project = 'global', now = new Date()) {
  keys(value, ['kind', 'timezone', 'weekday', 'hour', 'minute', 'when', 'expiresAt']);
  if (!['weekly-report', 'review-reminder', 'deadline-reminder'].includes(value.kind)) throw new Error('Invalid routine kind: no background processing routines.');
  if (!shortText(value.timezone, 80)) throw new Error('Invalid routine timezone.');
  try { new Intl.DateTimeFormat('en', { timeZone: value.timezone }).format(now); } catch { throw new Error('Invalid routine timezone.'); }
  const expiry = Date.parse(value.expiresAt);
  if (!instant(value.expiresAt) || expiry <= now.getTime() || expiry > now.getTime() + 90 * 86400000) throw new Error('Invalid routine expiry: choose a future ISO date with timezone offset within 90 days.');
  let cron = null;
  let when = null;
  if (value.kind === 'deadline-reminder') {
    if (!instant(value.when) || Date.parse(value.when) <= now.getTime() || Date.parse(value.when) > expiry) throw new Error('Invalid deadline: supply a future ISO date with timezone offset, before expiry.');
    if (['weekday', 'hour', 'minute'].some(key => value[key] !== undefined)) throw new Error('Invalid deadline scheduling fields.');
    when = new Date(value.when).toISOString();
  } else {
    if (!integer(value.hour, 23)) throw new Error('Invalid routine hour.');
    if (!integer(value.minute, 59)) throw new Error('Invalid routine minute.');
    if (value.when !== undefined || (value.kind === 'review-reminder' && value.weekday !== undefined)) throw new Error('Invalid recurring scheduling fields.');
    if (value.kind === 'weekly-report' && !integer(value.weekday, 6)) throw new Error('Invalid routine weekday.');
    cron = `${value.minute} ${value.hour} * * ${value.kind === 'weekly-report' ? value.weekday : '*'}`;
  }
  const prompt = value.kind === 'weekly-report'
    ? `Use Humanizer PRO's bundled local report command for project ${project}. Summarize only explicitly saved metadata receipts. If there are no sessions in the period, stay quiet. Never rewrite, analyze, check account balance, send messages or process new text. Respect expiry ${new Date(expiry).toISOString()}; stop/delete this routine at expiry.`
    : `Remind me about ${value.kind === 'deadline-reminder' ? 'my writing deadline' : 'my unfinished writing review'} for project ${project}. Use only approved local context; do not inspect arbitrary files or chat history. Never rewrite, analyze, check account balance or send external messages. Respect expiry ${new Date(expiry).toISOString()}; stop/delete this routine at expiry.`;
  return { kind: value.kind, project, timezone: value.timezone, cron, when, expiresAt: new Date(expiry).toISOString(), prompt, scheduled: false, requiresHostScheduler: true, instructions: 'This is a specification, not a running timer. Create only after the user approves the displayed timing and scope. Prefer a supported local host scheduler; report its actual task identifier. If only session scheduling is available, disclose its lifetime, local timezone and runtime requirements. Confirm timezone matches before using this cron expression. No credential export or cloud fallback. Pause/delete through the host.' };
}

export async function runWriting(args, readInput, directory) {
  const options = parseWritingArgs(args);
  const store = new WritingStore(directory);
  const respond = value => JSON.stringify(value, null, 2);
  if (options.command === 'review') {
    const result = reviewText(decode(await readInput()));
    return options.format === 'html' ? renderReview(result) : respond(result);
  }
  if (options.command === 'routine') return respond(routinePlan(decode(await readInput()), options.project));
  if (options.command === 'report') {
    const result = summarize(await store.load(), options.project, options.days);
    return options.format === 'html' ? renderReport(result) : respond(result);
  }
  if (options.command === 'brief') {
    const state = await store.load();
    const own = project => Object.hasOwn(state.profiles, project) ? state.profiles[project] : {};
    return respond(resolveBrief(own('global'), options.project === 'global' ? {} : own(options.project), decode(await readInput())));
  }
  if (options.command === 'profile' && ['show', 'export'].includes(options.action)) {
    const state = await store.load();
    return respond({ project: options.project, preferences: Object.hasOwn(state.profiles, options.project) ? state.profiles[options.project] : {}, notice: 'Approved local preferences only. Export excludes authentication and draft text. Profile set replaces this scope; current requests override saved defaults.' });
  }
  if (options.command === 'history' && ['show', 'export'].includes(options.action)) {
    const state = await store.load();
    return respond({ project: options.project, receipts: state.sessions.filter(item => item.project === options.project), notice: 'Local metadata only. No draft text or authentication included.' });
  }
  const value = ['profile', 'history'].includes(options.command) && options.action === 'reset' ? {} : decode(await readInput());
  let result;
  await store.update(state => {
    if (options.command === 'profile') {
      if (options.action === 'reset') { delete state.profiles[options.project]; result = { project: options.project, removed: true }; }
      else { state.profiles[options.project] = validateProfile(value); result = { project: options.project, preferences: state.profiles[options.project], saved: true }; }
    } else if (options.command === 'history') {
      const before = state.sessions.length;
      state.sessions = state.sessions.filter(item => item.project !== options.project);
      result = { project: options.project, removedReceipts: before - state.sessions.length, profileChanged: false };
    } else if (options.command === 'session') {
      const fields = validateReceipt(value);
      const existing = state.sessions.find(item => item.id === fields.receiptKey);
      if (existing) {
        if (existing.project !== options.project || Object.entries(fields).some(([key, item]) => existing[key] !== item)) throw new Error('Receipt identifier already recorded with conflicting metadata.');
        result = { receipt: existing, alreadyRecorded: true };
      } else {
        const saved = { ...fields, id: fields.receiptKey, project: options.project, createdAt: new Date().toISOString() };
        state.sessions.push(saved);
        while (state.sessions.length > MAX_SESSIONS) { state.sessions.shift(); state.pruned++; }
        result = { receipt: saved, alreadyRecorded: false };
      }
    } else {
      const feedback = validateFeedback(value);
      const saved = state.sessions.find(item => item.id === options.session && item.project === options.project && item.operation === 'rewrite' && item.status === 'completed');
      if (!saved) throw new Error('No completed rewrite recorded for this session and project.');
      saved.feedback = feedback; saved.feedbackAt = new Date().toISOString();
      result = { receipt: saved, saved: true, profileChanged: false };
    }
    return state;
  });
  return respond(result);
}
