/* SEASTRONG partner questionnaire: the single-page questionnaire (index.html). */
import { STEPS, ORGS, WELCOME, ABOUT, CONTACTS, QUESTIONS, SOCIAL_OPS, FINISH } from './data.js';
import * as M from './model.js';
import { CONFIG, MODE, STORAGE_KEY, SUBMITTED_KEY, store, esc, initChrome, submitResponse, download, withModes, fmtDateTime } from './common.js';
import { loadResults } from './results.js';

/* ---------------------------------------------------------------- setup */
let P = null;
const previewsReady = import('./previews.js').then(m => { P = m; return m; }).catch(() => null);

const DEVICE_TZ = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { return ''; } })();
const STEP_IDS = STEPS.map(s => s.id);
const stepIndex = id => STEP_IDS.indexOf(id);
const stepTitle = id => (STEPS.find(s => s.id === id) || {}).title || '';
const QSTEPS = ['A', 'B', 'C', 'D', 'S'];

const savedRaw = store.getJSON(STORAGE_KEY);
let state = M.reviveState(savedRaw, DEVICE_TZ);
let current = null;
let view = 'step';
let sending = false;
let lastActive = 0;
let saveTimer = null;
let lastPayload = null;
let pendingFix = null;

const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const els = {
  main: $('#main'),
  welcome: $('#view-welcome'),
  welcomeBody: $('#welcome-body'),
  step: $('#view-step'),
  announcer: $('#announcer'),
  snToggle: $('[data-sn-toggle]'),
  snPanel: $('#stepnav-panel'),
  snList: $('[data-sn-list]'),
  snCount: $('[data-sn-count]'),
  snTitle: $('[data-sn-title]'),
  snBar: $('[data-sn-bar]'),
  stepnav: $('[data-stepnav]')
};

/* ---------------------------------------------------------------- small helpers */
function getPath(path) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), state);
}
function setPath(path, value) {
  const keys = path.split('.');
  let o = state;
  for (let i = 0; i < keys.length - 1; i++) {
    if (o[keys[i]] == null || typeof o[keys[i]] !== 'object') o[keys[i]] = {};
    o = o[keys[i]];
  }
  o[keys[keys.length - 1]] = value;
}
const idFor = path => 'f-' + path.replace(/[^a-zA-Z0-9]+/g, '-');

let announceTimer = null;
function announce(msg) {
  const el = els.announcer;
  el.textContent = '';
  clearTimeout(announceTimer);
  announceTimer = setTimeout(() => { el.textContent = msg; }, 60);
}

const ICON = {
  check: '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false"><path d="M3.2 8.6l3 3 6.6-7.4" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  up: '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false"><path d="M8 13V3M3.5 7.5L8 3l4.5 4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  down: '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false"><path d="M8 3v10M3.5 8.5L8 13l4.5-4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  grip: '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false"><g fill="currentColor"><circle cx="5.5" cy="3.5" r="1.4"/><circle cx="10.5" cy="3.5" r="1.4"/><circle cx="5.5" cy="8" r="1.4"/><circle cx="10.5" cy="8" r="1.4"/><circle cx="5.5" cy="12.5" r="1.4"/><circle cx="10.5" cy="12.5" r="1.4"/></g></svg>',
  next: '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false"><path d="M6 3.5L10.5 8 6 12.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  back: '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false"><path d="M10 3.5L5.5 8 10 12.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  clock: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 7v5l3 2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  save: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false"><rect x="4" y="3.5" width="16" height="17" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M8 3.5v5h8v-5M8 20.5v-6h8v6" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>',
  chart: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false"><path d="M4 20h16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><rect x="5.5" y="11" width="3" height="7" rx="1" fill="currentColor"/><rect x="10.5" y="6" width="3" height="12" rx="1" fill="currentColor" opacity=".75"/><rect x="15.5" y="9" width="3" height="9" rx="1" fill="currentColor" opacity=".5"/></svg>',
  info: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9.2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 11v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="7.6" r="1.25" fill="currentColor"/></svg>',
  star: '<span class="star" aria-hidden="true">★</span>'
};

/* ---------------------------------------------------------------- saving */
function touch() {
  const now = Date.now();
  if (lastActive) state.active_ms = (state.active_ms || 0) + Math.min(now - lastActive, 60000);
  lastActive = now;
  if (!state.started_at) state.started_at = new Date().toISOString();
}

function setSaveStatus(text) {
  $$('[data-save-status]').forEach(el => { el.textContent = text; });
}

function saveSoon() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, 400);
}
function saveNow() {
  clearTimeout(saveTimer);
  if (view !== 'step') return;
  state.updated_at = new Date().toISOString();
  const ok = store.set(STORAGE_KEY, JSON.stringify(state));
  setSaveStatus(ok ? 'Saved on this device' : 'This browser can’t save drafts. Keep this page open until you submit.');
}
window.addEventListener('pagehide', () => { if (saveTimer) saveNow(); });

/* ---------------------------------------------------------------- form building blocks */
function hintAndError(id, hint) {
  return (hint ? '<p class="hint" id="' + id + '-hint">' + esc(hint) + '</p>' : '') +
    '<p class="field-error" id="' + id + '-err" hidden></p>';
}
const reqTag = required => (required ? ' <span class="req">Required</span>' : '');

function textField(o) {
  const id = o.id || idFor(o.path);
  const v = o.value != null ? o.value : (getPath(o.path) || '');
  const attrs = [
    'id="' + id + '"', 'data-bind="' + o.path + '"', 'type="' + (o.type || 'text') + '"',
    'value="' + esc(v) + '"', 'maxlength="' + (o.maxlength || 300) + '"',
    o.autocomplete ? 'autocomplete="' + o.autocomplete + '"' : 'autocomplete="off"',
    o.inputmode ? 'inputmode="' + o.inputmode + '"' : '',
    o.required ? 'aria-required="true"' : '',
    o.hint ? 'aria-describedby="' + id + '-hint"' : '',
    o.spellcheck === false ? 'spellcheck="false"' : '',
    o.extra || ''
  ].filter(Boolean).join(' ');
  return '<div class="field' + (o.cls ? ' ' + o.cls : '') + '" data-field="' + o.path + '"' + (o.showif ? ' data-showif="' + o.showif + '"' : '') + '>' +
    '<label class="label" for="' + id + '">' + esc(o.label) + reqTag(o.required) + '</label>' +
    hintAndError(id, o.hint) + '<input class="input" ' + attrs + '></div>';
}

function textArea(o) {
  const id = o.id || idFor(o.path);
  const v = getPath(o.path) || '';
  return '<div class="field' + (o.cls ? ' ' + o.cls : '') + '" data-field="' + o.path + '"' + (o.showif ? ' data-showif="' + o.showif + '"' : '') + '>' +
    '<label class="label" for="' + id + '">' + esc(o.label) + (o.labelExtra || '') + '</label>' + hintAndError(id, o.hint) +
    '<textarea class="input textarea" id="' + id + '" data-bind="' + o.path + '" rows="' + (o.rows || 3) + '" maxlength="' + (o.maxlength || M.MAX_TEXT) + '"' +
    (o.hint ? ' aria-describedby="' + id + '-hint"' : '') + '>' + esc(v) + '</textarea></div>';
}

/* Compact radio group bound to a state path (or to an answer id via ans). */
function radioGroup(o) {
  const id = o.id || idFor(o.path);
  const v = getPath(o.path);
  const bindAttr = o.ans ? 'data-ans="' + o.ans + '"' : 'data-bind="' + o.path + '"';
  const opts = o.options.map((op, i) => {
    const oid = id + '-' + op.id;
    return '<label class="choice" for="' + oid + '"><input type="radio" class="choice-input" id="' + oid + '" name="' + id + '" value="' + esc(op.id) + '" ' + bindAttr +
      (v === op.id ? ' checked' : '') + (o.required && i === 0 ? ' aria-required="true"' : '') + '>' +
      '<span class="choice-box"><span class="choice-mark" aria-hidden="true"></span><span class="choice-text"><span class="choice-label">' + esc(op.label) + '</span>' +
      (op.desc ? '<span class="choice-desc">' + esc(op.desc) + '</span>' : '') + '</span></span></label>';
  }).join('');
  return '<fieldset class="field fs' + (o.cls ? ' ' + o.cls : '') + '" data-field="' + o.path + '" id="' + id + '"' + (o.showif ? ' data-showif="' + o.showif + '"' : '') +
    (o.hint ? ' aria-describedby="' + id + '-hint"' : '') + '>' +
    '<legend class="label">' + esc(o.legend) + reqTag(o.required) + '</legend>' + hintAndError(id, o.hint) +
    '<div class="choices' + (o.layout ? ' choices-' + o.layout : '') + '">' + opts + '</div>' +
    (o.clearable ? '<button type="button" class="linkbtn clear-btn" data-clear-path="' + o.path + '"' + (v ? '' : ' hidden') + '>Clear choice<span class="sr-only">: ' + esc(o.legend) + '</span></button>' : '') +
    '</fieldset>';
}

/* Compact checkbox group bound to an array at a state path (or to an answer id). */
function checkGroup(o) {
  const id = o.id || idFor(o.path);
  const v = getPath(o.path) || [];
  const bindAttr = o.ans ? 'data-ans="' + o.ans + '"' : 'data-bindarr="' + o.path + '"';
  const opts = o.options.map(op => {
    const val = typeof op === 'string' ? op : op.id;
    const label = typeof op === 'string' ? op : op.label;
    const oid = id + '-' + val.replace(/[^a-zA-Z0-9]+/g, '-');
    return '<label class="choice choice-check' + (o.chips ? ' chip' : '') + '" for="' + oid + '"><input type="checkbox" class="choice-input" id="' + oid + '" value="' + esc(val) + '" ' + bindAttr + (v.includes(val) ? ' checked' : '') + '>' +
      '<span class="choice-box"><span class="choice-mark" aria-hidden="true"></span><span class="choice-text"><span class="choice-label">' + esc(label) + '</span>' +
      (op.desc ? '<span class="choice-desc">' + esc(op.desc) + '</span>' : '') + '</span></span></label>';
  }).join('');
  return '<fieldset class="field fs' + (o.cls ? ' ' + o.cls : '') + '" data-field="' + o.path + '" id="' + id + '"' + (o.showif ? ' data-showif="' + o.showif + '"' : '') +
    (o.hint ? ' aria-describedby="' + id + '-hint"' : '') + '>' +
    '<legend class="label">' + esc(o.legend) + '</legend>' + hintAndError(id, o.hint) +
    '<div class="choices' + (o.chips ? ' choices-chips' : (o.layout ? ' choices-' + o.layout : '')) + '">' + opts + '</div>' + (o.after || '') + '</fieldset>';
}

/* ---------------------------------------------------------------- time zones */
let TZ_OPTIONS = null;
function tzOptions() {
  if (TZ_OPTIONS) return TZ_OPTIONS;
  let zones = [];
  try { if (Intl.supportedValuesOf) zones = Intl.supportedValuesOf('timeZone'); } catch (e) { zones = []; }
  if (!zones.length) zones = ['America/Belize', 'America/Guadeloupe', 'Pacific/Fiji', 'Indian/Mahe', 'Europe/Berlin', 'Europe/Amsterdam', 'Europe/Paris', 'Europe/Rome', 'Europe/Madrid', 'Europe/London', 'America/New_York', 'UTC'];
  zones = zones.slice();
  if (DEVICE_TZ && !zones.includes(DEVICE_TZ)) zones.push(DEVICE_TZ);
  if (!zones.includes('UTC')) zones.push('UTC');
  const now = new Date();
  const offset = tz => {
    try {
      const part = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' }).formatToParts(now).find(p => p.type === 'timeZoneName');
      const s = part ? part.value.replace('GMT', 'UTC') : '';
      return s === 'UTC' ? 'UTC+0' : s;
    } catch (e) { return ''; }
  };
  TZ_OPTIONS = zones.sort().map(tz => ({ id: tz, label: tz.replace(/_/g, ' ') + (offset(tz) ? ' (' + offset(tz) + ')' : '') }));
  return TZ_OPTIONS;
}
function tzSelect(path, label, hint) {
  const id = idFor(path);
  const saved = getPath(path);
  const v = saved == null ? DEVICE_TZ : saved;
  return '<div class="field" data-field="' + path + '"><label class="label" for="' + id + '">' + esc(label) + '</label>' + hintAndError(id, hint) +
    '<select class="input select" id="' + id + '" data-bind="' + path + '"' + (hint ? ' aria-describedby="' + id + '-hint"' : '') + '>' +
    '<option value="">Not specified</option>' +
    tzOptions().map(o => '<option value="' + esc(o.id) + '"' + (o.id === v ? ' selected' : '') + '>' + esc(o.label) + '</option>').join('') + '</select></div>';
}

/* ---------------------------------------------------------------- person blocks */
const PF = Object.fromEntries(CONTACTS.personFields.map(f => [f.key, f]));

/* Name, role and email: hidden when the person is "Me" (taken from About you instead). */
function personIdentity(base, required) {
  return '<div class="grid-2">' +
    textField({ path: base + '.name', label: PF.name.label, required, autocomplete: 'off', maxlength: 200 }) +
    textField({ path: base + '.role', label: PF.role.label, maxlength: 300 }) + '</div>' +
    '<div class="grid-2">' +
    textField({ path: base + '.email', label: PF.email.label, required, type: 'email', inputmode: 'email', autocomplete: 'off', maxlength: 320, spellcheck: false, extra: 'data-email' }) +
    '<div></div></div>';
}
/* Phone, best way to reach them, time zone, languages, availability and notes. */
function personMore(base) {
  return '<div class="grid-2">' +
    textField({ path: base + '.phone', label: PF.phone.label, hint: PF.phone.hint, type: 'tel', inputmode: 'tel', autocomplete: 'off', maxlength: 60 }) +
    tzSelect(base + '.timezone', PF.timezone.label, PF.timezone.hint) + '</div>' +
    checkGroup({ path: base + '.preferred', legend: PF.preferred.label, options: PF.preferred.options, chips: true }) +
    checkGroup({
      path: base + '.languages', legend: PF.languages.label, options: PF.languages.options, chips: true,
      after: '<div class="other-lang">' + textField({ path: base + '.languages_other', label: 'Other languages', hint: 'Separate several with commas.', maxlength: 300 }) + '</div>'
    }) +
    textArea({ path: base + '.availability', label: PF.availability.label, hint: PF.availability.hint, rows: 2, maxlength: 1000, cls: 'field-wide' }) +
    textArea({ path: base + '.notes', label: PF.notes.label, rows: 2, maxlength: 1000, cls: 'field-wide' });
}

function meCard(base) {
  return '<div class="me-card" data-showif="' + base + '.who=me">' +
    '<p class="me-line"><span class="me-name" data-me="name"></span><span class="me-role" data-me="role"></span><span class="me-email" data-me="email"></span></p>' +
    '<p class="hint">Taken from <a href="#about">About you</a>. Any change there updates this too.</p></div>';
}

function personBlock(key) {
  const role = CONTACTS.roles[key];
  const base = 'contacts.' + key;
  const whoLegend = key === 'website_liaison' ? 'Who is your organization’s website liaison?' : 'Who is your organization’s communications liaison?';
  return '<section class="panel person" aria-labelledby="h-' + key + '">' +
    '<h2 class="panel-title" id="h-' + key + '">' + esc(role.label) + '</h2>' +
    '<p class="panel-desc">' + esc(role.desc) + '</p>' +
    radioGroup({ path: base + '.who', legend: whoLegend, options: role.who, required: true, layout: 'pills' }) +
    meCard(base) +
    '<div class="person-identity" data-showif="' + base + '.who=other">' + personIdentity(base, true) + '</div>' +
    '<div class="person-more" data-showif="' + base + '.who=me|other">' + personMore(base) + '</div>' +
    '</section>';
}

/* ---------------------------------------------------------------- question cards */
function teamTag(id) {
  return '<span class="team-tag" id="' + id + '">' + ICON.star + 'Team proposal</span>';
}

function commentBox(qid) {
  const path = 'comments.' + qid;
  const v = getPath(path) || '';
  const id = 'c-' + qid;
  return '<details class="comment"' + (v ? ' open' : '') + '><summary><span class="comment-summary">Add a comment</span></summary>' +
    '<div class="comment-body"><label class="label" for="' + id + '">Your comment<span class="sr-only"> on: ' + esc(M.Q[qid].title) + '</span></label>' +
    '<textarea class="input textarea" id="' + id + '" data-bind="' + path + '" rows="3" maxlength="' + M.MAX_TEXT + '">' + esc(v) + '</textarea></div></details>';
}

function optionCard(q, o, kind) {
  const id = 'o-' + q.id + '-' + o.id;
  const multi = q.type === 'multi';
  const a = state.answers[q.id];
  const checked = multi ? Array.isArray(a) && a.includes(o.id) : a === o.id;
  const isRec = multi ? o.rec === true : (q.rec && q.rec === o.id);
  let pv = '';
  if (kind === 'preview') {
    let inner = '';
    if (q.id === 'A6' && P) inner = P.menuPv(o.menu, o.id);
    else if (P && P.PV[q.id] && P.PV[q.id][o.id]) inner = P.PV[q.id][o.id];
    pv = '<span class="pv" aria-hidden="true">' + inner + '</span>';
  }
  const labelled = id + '-l' + (isRec ? ' ' + id + '-t' : '');
  return '<div class="opt opt-' + kind + (multi ? ' opt-multi' : '') + (checked ? ' is-checked' : '') + '">' +
    '<input class="opt-input" type="' + (multi ? 'checkbox' : 'radio') + '" id="' + id + '" name="ans-' + q.id + '" value="' + o.id + '" data-ans="' + q.id + '"' +
    (checked ? ' checked' : '') + ' aria-labelledby="' + labelled + '"' + (o.desc ? ' aria-describedby="' + id + '-d"' : '') + '>' +
    '<label class="opt-card" for="' + id + '">' + pv +
    '<span class="opt-body"><span class="opt-mark" aria-hidden="true">' + ICON.check + '</span>' +
    '<span class="opt-text">' + (isRec ? teamTag(id + '-t') : '') +
    '<span class="opt-label" id="' + id + '-l">' + esc(o.label) + '</span>' +
    (o.desc ? '<span class="opt-desc" id="' + id + '-d">' + esc(o.desc) + '</span>' : '') + '</span></span></label></div>';
}

function choiceQuestionBody(q, kind) {
  const n = q.options.length;
  const layout = kind === 'preview' ? 'opts-pv opts-n' + n : (kind === 'compact' ? 'opts-compact' : 'opts-text opts-n' + n);
  let body = '<div class="opts ' + layout + '">' + q.options.map(o => optionCard(q, o, kind)).join('') + '</div>';
  if (q.type === 'single') {
    body += '<button type="button" class="linkbtn clear-btn" data-clear="' + q.id + '"' + (state.answers[q.id] ? '' : ' hidden') + '>Clear choice<span class="sr-only">: ' + esc(q.title) + '</span></button>';
  }
  if (q.max) body += '<p class="max-note" data-max-note="' + q.id + '" aria-live="polite"></p>';
  return body;
}

function triBody(q) {
  const a = state.answers[q.id] || {};
  const rows = q.items.map(it => {
    const rid = 't-' + q.id + '-' + it.id;
    const segs = M.TRI_VALUES.map(v => {
      const oid = rid + '-' + v;
      return '<label class="seg seg-' + v + '" for="' + oid + '"><input type="radio" class="seg-input" id="' + oid + '" name="' + rid + '" value="' + v + '" data-tri="' + q.id + '" data-item="' + it.id + '"' + (a[it.id] === v ? ' checked' : '') + '>' +
        '<span class="seg-box"><span class="seg-check" aria-hidden="true">' + ICON.check + '</span><span class="sr-only">' + esc(it.label) + ': </span>' + M.TRI_LABELS[v] + '</span></label>';
    }).join('');
    return '<fieldset class="tri-row' + (a[it.id] ? ' is-rated' : '') + '" aria-describedby="' + rid + '-d ' + rid + '-p">' +
      '<legend class="tri-label">' + esc(it.label) + '</legend>' +
      '<span class="tri-ic" aria-hidden="true">' + esc(it.ic || '') + '</span>' +
      '<p class="tri-meta"><span id="' + rid + '-d">' + esc(it.desc) + '</span> <span class="tri-prop" id="' + rid + '-p">' + ICON.star + 'Team proposal: ' + M.TRI_LABELS[it.rec] + '</span></p>' +
      '<div class="segs">' + segs + '</div></fieldset>';
  }).join('');
  return '<div class="tri-tools"><button type="button" class="btn btn-secondary btn-sm" data-tri-fill="' + q.id + '">' + ICON.star + 'Start from the team’s proposals</button>' +
    '<button type="button" class="linkbtn" data-tri-clear="' + q.id + '"' + (Object.keys(a).length ? '' : ' hidden') + '>Clear all ratings<span class="sr-only">: ' + esc(q.title) + '</span></button></div>' +
    '<div class="tri">' + rows + '</div>';
}

function rankItems(q) {
  const order = state.rank[q.id] || q.rec;
  return order.map((itId, i) => {
    const it = q.items.find(x => x.id === itId);
    return '<li class="rank-item" data-id="' + it.id + '">' +
      '<span class="rank-handle" aria-hidden="true" title="Drag to reorder">' + ICON.grip + '</span>' +
      '<span class="rank-pos" aria-hidden="true">' + (i + 1) + '</span>' +
      '<span class="rank-text"><span class="rank-label">' + esc(it.label) + '</span><span class="rank-desc">' + esc(it.desc) + '</span></span>' +
      '<span class="rank-btns">' +
      '<button type="button" class="icon-btn" data-rank-move="-1" data-q="' + q.id + '" data-id="' + it.id + '" aria-label="Move ' + esc(it.label) + ' up"' + (i === 0 ? ' disabled' : '') + '>' + ICON.up + '</button>' +
      '<button type="button" class="icon-btn" data-rank-move="1" data-q="' + q.id + '" data-id="' + it.id + '" aria-label="Move ' + esc(it.label) + ' down"' + (i === order.length - 1 ? ' disabled' : '') + '>' + ICON.down + '</button>' +
      '</span></li>';
  }).join('');
}
function rankBody(q) {
  return '<p class="rank-note">' + ICON.star + '<span><strong>Team proposal:</strong> the list starts in the order the team proposed.</span></p>' +
    '<ol class="rank" role="list" data-rank="' + q.id + '" aria-labelledby="qt-' + q.id + '">' + rankItems(q) + '</ol>' +
    '<div class="rank-tools"><button type="button" class="btn btn-secondary btn-sm" data-rank-ok="' + q.id + '">This order works for me</button>' +
    '<p class="rank-status" data-rank-status="' + q.id + '"></p></div>';
}

function questionCard(q, opts) {
  const o = opts || {};
  const level = o.level || 2;
  const hasPv = q.type === 'single' && (q.newPreview === 'menu' || (P && P.PV[q.id]));
  const kind = o.kind || (hasPv ? 'preview' : 'text');
  const head = '<h' + level + ' class="q-title" id="qt-' + q.id + '">' + esc(q.title) + '</h' + level + '>';
  const why = q.why ? '<p class="q-why" id="qw-' + q.id + '">' + esc(q.why) + '</p>' : '';
  let demo = '';
  if (q.demo && P && P.DEMOS[q.demo]) demo = '<div class="q-demo">' + P.DEMOS[q.demo]('demo-' + q.id) + '</div>';
  let inner;
  if (q.type === 'rank') {
    inner = '<div class="q-head">' + head + why + '</div>' + rankBody(q);
    return '<section class="q" id="q-' + q.id + '" data-q="' + q.id + '" aria-labelledby="qt-' + q.id + '">' + inner + (o.noComment ? '' : commentBox(q.id)) + '</section>';
  }
  let body;
  if (q.type === 'tri') body = triBody(q);
  else body = choiceQuestionBody(q, kind);
  let follow = '';
  if (q.id === 'D5') {
    follow = '<div class="q-follow">' + checkGroup({ path: 'answers.D5_REVIEW', ans: 'D5_REVIEW', legend: M.D5_REVIEW.title + ' (optional)', options: M.D5_REVIEW.options, chips: true }) + '</div>';
  }
  return '<section class="q" id="q-' + q.id + '" data-q="' + q.id + '">' +
    '<fieldset class="q-fs"' + (why ? ' aria-describedby="qw-' + q.id + '"' : '') + '>' +
    '<legend class="q-legend">' + head + '</legend>' + why + demo + body + '</fieldset>' + follow +
    (o.noComment ? '' : commentBox(q.id)) + '</section>';
}

/* Operational questions: compact fieldsets inside panels. */
function opsSingle(q, extra) {
  return radioGroup(Object.assign({ path: 'answers.' + q.id, ans: q.id, id: 'ops-' + q.id, legend: q.title, options: q.options, layout: 'list', clearable: true }, extra || {}));
}
function opsMulti(q, extra) {
  return checkGroup(Object.assign({ path: 'answers.' + q.id, ans: q.id, id: 'ops-' + q.id, legend: q.title, options: q.options, layout: 'list' }, extra || {}));
}

/* ---------------------------------------------------------------- step pages */
function stepHead(id, title, intro, withCount) {
  const n = stepIndex(id) + 1;
  return '<header class="step-head">' +
    '<p class="step-kicker">Step ' + n + ' of ' + STEPS.length + '</p>' +
    '<h1 class="step-title" id="step-h" tabindex="-1">' + esc(title) + '</h1>' +
    (intro ? '<p class="step-intro">' + esc(intro) + '</p>' : '') +
    '<div class="step-meta">' + (withCount ? '<p class="step-count" data-step-count="' + id + '"></p>' : '') +
    '<p class="save-status" data-save-status></p></div>' +
    '</header>';
}

function stepActions(id) {
  const i = stepIndex(id);
  const prev = STEP_IDS[i - 1];
  const next = STEP_IDS[i + 1];
  const back = prev ? '<button type="button" class="btn btn-secondary" data-back>' + ICON.back + '<span>Back</span></button>' : '<span></span>';
  let fwd;
  if (id === 'finish') {
    fwd = '<button type="button" class="btn btn-primary btn-lg" data-submit>' + esc(FINISH.submit) + '</button>';
  } else {
    fwd = '<button type="button" class="btn btn-primary" data-next><span>Next<span class="next-to">: ' + esc(stepTitle(next)) + '</span></span>' + ICON.next + '</button>';
  }
  return '<div class="step-actions">' + back + '<p class="save-status" data-save-status></p>' + fwd + '</div>';
}

function renderAbout() {
  const f = ABOUT.fields;
  const partners = ORGS.filter(o => !o.group);
  const prospective = ORGS.filter(o => o.group === 'prospective');
  const other = ORGS.filter(o => o.group === 'other');
  const v = state.about.organisation;
  const opt = o => '<option value="' + o.code + '"' + (v === o.code ? ' selected' : '') + '>' + esc(o.name) + '</option>';
  const orgId = idFor('about.organisation');
  const select = '<div class="field" data-field="about.organisation"><label class="label" for="' + orgId + '">' + esc(f.organisation.label) + reqTag(true) + '</label>' +
    hintAndError(orgId) +
    '<select class="input select" id="' + orgId + '" data-bind="about.organisation" aria-required="true" autocomplete="organization">' +
    '<option value="">Choose your organization</option>' +
    '<optgroup label="SEASTRONG partners">' + partners.map(opt).join('') + '</optgroup>' +
    '<optgroup label="Prospective partner">' + prospective.map(opt).join('') + '</optgroup>' +
    '<optgroup label="Other">' + other.map(opt).join('') + '</optgroup></select></div>';
  return stepHead('about', ABOUT.title, ABOUT.intro) +
    '<div class="panel form-panel">' +
    select +
    textField({ path: 'about.organisation_other', label: f.organisation_other.label, required: true, maxlength: 300, autocomplete: 'organization', showif: 'about.organisation=Other' }) +
    '<div class="grid-2">' +
    textField({ path: 'about.respondent_name', label: f.respondent_name.label, required: true, autocomplete: 'name', maxlength: 200 }) +
    textField({ path: 'about.respondent_email', label: f.respondent_email.label, required: true, type: 'email', inputmode: 'email', autocomplete: 'email', maxlength: 320, spellcheck: false, extra: 'data-email' }) +
    '</div>' +
    textField({ path: 'about.respondent_role', label: f.respondent_role.label, hint: f.respondent_role.hint, autocomplete: 'organization-title', maxlength: 300, cls: 'field-wide' }) +
    radioGroup({ path: 'about.responding_for', legend: f.responding_for.label, options: f.responding_for.options, layout: 'cards', clearable: true }) +
    '</div>' + stepActions('about');
}

function renderContacts() {
  const p = CONTACTS.profile;
  return stepHead('contacts', CONTACTS.title, CONTACTS.intro) +
    '<p class="note note-info">' + ICON.info + '<span>' + esc(CONTACTS.thirdPartyNote) + '</span></p>' +
    personBlock('website_liaison') + personBlock('comms_liaison') +
    '<section class="panel" aria-labelledby="h-profile"><h2 class="panel-title" id="h-profile">' + esc(p.title) + '</h2>' +
    opsMulti(p.WEB_PROVIDE, { layout: 'cards' }) +
    textArea({ path: 'comments.named_people', label: p.named_people.label, hint: p.named_people.hint, rows: 3 }) +
    textField({ path: 'contacts.profile.website_url', label: p.website_url.label, type: 'url', inputmode: 'url', autocomplete: 'url', maxlength: 500, spellcheck: false, cls: 'field-wide', hint: 'For example: https://www.example.org' }) +
    opsSingle(p.WEB_HOST, { layout: 'pills' }) +
    radioGroup({ path: 'contacts.profile.brand_rules', legend: p.brand_rules.label, options: p.brand_rules.options, layout: 'pills', clearable: true }) +
    textArea({ path: 'comments.brand_rules_notes', label: p.brand_rules.followup.label, rows: 2, showif: 'contacts.profile.brand_rules=yes' }) +
    '</section>' + stepActions('contacts');
}

function renderQuestionStep(id) {
  const s = STEPS.find(x => x.id === id);
  const qs = QUESTIONS.filter(q => q.g === id);
  return stepHead(id, s.title, s.intro, true) + qs.map(q => questionCard(q)).join('') + stepActions(id);
}

function channelRow(ch, i) {
  const f = SOCIAL_OPS.channelFields;
  const n = i + 1;
  const pid = 'ch-' + i + '-platform', hid = 'ch-' + i + '-handle', fid = 'ch-' + i + '-followers', rid = 'ch-' + i + '-runby';
  const sr = '<span class="sr-only">, channel ' + n + '</span>';
  return '<li class="ch-row" data-ch="' + i + '">' +
    '<p class="ch-num" aria-hidden="true">Channel ' + n + '</p>' +
    '<div class="ch-cell"><label class="ch-label" for="' + pid + '">' + esc(f[0].label) + sr + '</label>' +
    '<select class="input select" id="' + pid + '" data-ch-field="platform" data-ch-i="' + i + '"><option value="">Choose a platform</option>' +
    SOCIAL_OPS.platforms.map(p => '<option' + (ch.platform === p ? ' selected' : '') + '>' + esc(p) + '</option>').join('') + '</select></div>' +
    '<div class="ch-cell"><label class="ch-label" for="' + hid + '">' + esc(f[1].label) + sr + '</label>' +
    '<input class="input" id="' + hid + '" data-ch-field="handle" data-ch-i="' + i + '" value="' + esc(ch.handle) + '" maxlength="300" autocomplete="off" spellcheck="false"></div>' +
    '<div class="ch-cell"><label class="ch-label" for="' + fid + '">' + esc(f[2].label) + sr + '</label>' +
    '<input class="input" id="' + fid + '" data-ch-field="followers" data-ch-i="' + i + '" value="' + esc(ch.followers) + '" inputmode="numeric" maxlength="16" autocomplete="off" aria-describedby="' + fid + '-err">' +
    '<p class="field-error" id="' + fid + '-err" hidden></p></div>' +
    '<div class="ch-cell"><label class="ch-label" for="' + rid + '">' + esc(f[3].label) + sr + '</label>' +
    '<select class="input select" id="' + rid + '" data-ch-field="run_by" data-ch-i="' + i + '"><option value="">Choose one</option>' +
    f[3].options.map(o => '<option value="' + o.id + '"' + (ch.run_by === o.id ? ' selected' : '') + '>' + esc(o.label) + '</option>').join('') + '</select></div>' +
    '<div class="ch-cell ch-remove"><button type="button" class="btn btn-ghost btn-sm" data-ch-remove="' + i + '">Remove<span class="sr-only"> channel ' + n + '</span></button></div>' +
    '</li>';
}
function channelsHTML() {
  const f = SOCIAL_OPS.channelFields;
  return '<div class="channels"><div class="ch-head" aria-hidden="true"><span>' + esc(f[0].label) + '</span><span>' + esc(f[1].label) + '</span><span>' + esc(f[2].label) + '</span><span>' + esc(f[3].label) + '</span><span></span></div>' +
    '<ol class="ch-list" role="list" data-ch-list>' + state.channels.map(channelRow).join('') + '</ol>' +
    '<button type="button" class="btn btn-secondary btn-sm" data-ch-add>Add another channel</button></div>';
}

function renderSocial() {
  const s = STEPS.find(x => x.id === 'S');
  const qs = QUESTIONS.filter(q => q.g === 'S');
  const O = SOCIAL_OPS;
  const sc = 'contacts.social_contact';
  return stepHead('S', s.title, s.intro, true) +
    '<h2 class="section-title">SEASTRONG’s channels</h2>' +
    qs.map(q => questionCard(q, { level: 3 })).join('') +
    '<h2 class="section-title" id="h-yours">Your organization’s channels</h2>' +
    '<section class="panel" aria-labelledby="h-ch"><h3 class="panel-title" id="h-ch">Your channels</h3>' +
    '<p class="panel-desc">' + esc(O.channelsIntro) + '</p>' + channelsHTML() +
    textArea({ path: 'comments.personal_channels', label: O.personalChannels.label, hint: O.personalChannels.hint, rows: 2 }) + '</section>' +
    '<section class="panel" aria-labelledby="h-together"><h3 class="panel-title" id="h-together">Working together</h3>' +
    opsSingle(O.SOC_FREQ, { layout: 'pills' }) + opsMulti(O.SOC_HELP, { layout: 'list' }) +
    radioGroup({ path: sc + '.who', legend: O.socialContact.label, options: O.socialContact.who, layout: 'pills', clearable: true }) +
    '<div class="sub-panel" data-showif="' + sc + '.who=other"><p class="sub-title">About this person</p>' +
    '<p class="note note-info note-sm">' + ICON.info + '<span>' + esc(CONTACTS.thirdPartyNote) + '</span></p>' +
    personIdentity(sc, false) + personMore(sc) + '</div></section>' +
    '<section class="panel" aria-labelledby="h-approval"><h3 class="panel-title" id="h-approval">Approvals</h3>' +
    opsSingle(O.SOC_CONTROL, { layout: 'list' }) +
    '<div class="branch" data-showif="answers.SOC_CONTROL=office|leadership|mixed">' +
    opsSingle(O.SOC_APPROVAL, { layout: 'list' }) +
    textArea({ path: 'comments.approval_tips', label: O.approvalTips.label, hint: O.approvalTips.hint, rows: 2 }) +
    '<fieldset class="field fs sub-panel" id="approver" aria-describedby="approver-hint"><legend class="label">' + esc(O.approver.label) + '</legend><p class="hint" id="approver-hint">' + esc(O.approver.hint) + '</p>' +
    '<div class="grid-2">' + textField({ path: 'contacts.approver.name', label: PF.name.label, maxlength: 200 }) + textField({ path: 'contacts.approver.role', label: PF.role.label, maxlength: 300 }) + '</div>' +
    '<div class="grid-2">' + textField({ path: 'contacts.approver.email', label: PF.email.label, type: 'email', inputmode: 'email', maxlength: 320, spellcheck: false, extra: 'data-email' }) +
    textField({ path: 'contacts.approver.phone', label: PF.phone.label, type: 'tel', inputmode: 'tel', maxlength: 60 }) + '</div>' +
    radioGroup({ path: 'contacts.approver.ok_to_contact', legend: O.approver.okToContact.label, options: O.approver.okToContact.options, layout: 'pills', clearable: true }) +
    '</fieldset></div></section>' +
    '<section class="panel" aria-labelledby="h-assets"><h3 class="panel-title" id="h-assets">Photos and video</h3>' +
    opsSingle(O.SOC_ASSETS, { layout: 'list' }) +
    textArea({ path: 'comments.image_rules', label: O.imageRules.label, rows: 2 }) + '</section>' +
    stepActions('S');
}

function stepStatus(id) {
  if (id === 'about') return M.validateAbout(state).length ? { done: false, text: 'Required details missing' } : { done: true, text: 'Complete' };
  if (id === 'contacts') {
    const e = M.validateContacts(state).length;
    const c = M.stepCounts('contacts', state);
    return e ? { done: false, text: 'Required details missing' } : { done: true, text: 'Complete' + (c.total ? ', ' + c.answered + ' of ' + c.total + ' profile questions answered' : '') };
  }
  if (QSTEPS.includes(id)) {
    const c = M.stepCounts(id, state);
    return { done: c.answered === c.total, partial: c.answered > 0, text: c.answered + ' of ' + c.total + ' answered' };
  }
  return { done: false, text: '' };
}

function renderFinish() {
  const rows = STEP_IDS.filter(id => id !== 'welcome' && id !== 'finish').map(id => {
    const st = stepStatus(id);
    return '<li class="sum-row' + (st.done ? ' is-done' : '') + '"><span class="sum-icon" aria-hidden="true">' + (st.done ? ICON.check : '') + '</span>' +
      '<span class="sum-name">' + esc(stepTitle(id)) + '</span><span class="sum-status">' + esc(st.text) + '</span>' +
      '<a class="sum-edit" href="#' + id + '">Edit<span class="sr-only"> ' + esc(stepTitle(id)) + '</span></a></li>';
  }).join('');
  const colleagues = M.listsColleagues(state);
  return stepHead('finish', FINISH.title, 'Add any last thoughts, check what you’ve answered, then send your answers to the SEASTRONG team.') +
    '<div class="error-summary" data-error-summary hidden tabindex="-1" role="group" aria-labelledby="es-h"><h2 id="es-h">Some required details are missing</h2><ul data-error-list></ul></div>' +
    '<section class="panel panel-overall" aria-label="Final comments">' +
    textArea({ path: 'comments.overall', label: FINISH.overall.label, rows: 5, cls: 'field-lead' }) + '</section>' +
    '<section class="panel" aria-labelledby="h-summary"><h2 class="panel-title" id="h-summary">Your answers so far</h2>' +
    '<p class="panel-desc">Only a few details are required. You can go back to any step before you submit.</p><ul class="sum-list" role="list">' + rows + '</ul></section>' +
    '<section class="panel" aria-labelledby="h-consent"><h2 class="panel-title" id="h-consent">Consent</h2>' +
    '<div class="field" data-field="consent_data"><p class="field-error" id="f-consent_data-err" hidden></p>' +
    '<label class="check-line" for="f-consent_data"><input type="checkbox" class="check-input" id="f-consent_data" data-bind="consent_data" aria-required="true"' + (state.consent_data ? ' checked' : '') + '>' +
    '<span class="check-box" aria-hidden="true">' + ICON.check + '</span><span class="check-text">' + esc(FINISH.consentData) + reqTag(true) + '</span></label></div>' +
    '<div class="field"><label class="check-line" for="f-consent_contact"><input type="checkbox" class="check-input" id="f-consent_contact" data-bind="consent_contact"' + (state.consent_contact ? ' checked' : '') + '>' +
    '<span class="check-box" aria-hidden="true">' + ICON.check + '</span><span class="check-text">' + esc(FINISH.consentContact) + ' <span class="opt-tag">Optional</span></span></label>' +
    (colleagues ? '<p class="hint hint-indent">' + esc(FINISH.colleaguesReminder) + '</p>' : '') + '</div>' +
    '<p class="privacy-link"><a href="' + withModes('privacy.html') + '" target="_blank" rel="noopener">Read the privacy notice<span class="sr-only"> (opens in a new tab)</span></a> <span class="muted" aria-hidden="true">(opens in a new tab)</span></p>' +
    '<div class="hp"><label for="f-website">Leave this empty</label><input type="text" id="f-website" name="website" tabindex="-1" autocomplete="off" data-bind="hp" value="' + esc(state.hp) + '"></div>' +
    '</section>' +
    '<div class="send-state" data-send-state aria-live="polite"></div>' +
    stepActions('finish');
}

/* ---------------------------------------------------------------- welcome */
function renderWelcome() {
  const W = WELCOME;
  const draft = M.hasProgress(store.getJSON(STORAGE_KEY));
  const submitted = store.getJSON(SUBMITTED_KEY);
  const icons = [ICON.clock, ICON.save, ICON.chart];
  const actions = draft
    ? '<button type="button" class="btn btn-primary btn-lg" data-resume>' + esc(W.resume) + ICON.next + '</button>' +
      '<button type="button" class="btn btn-secondary btn-lg" data-startover aria-expanded="false" aria-controls="confirm-over">' + esc(W.startOver) + '</button>'
    : '<button type="button" class="btn btn-primary btn-lg" data-start>' + esc(W.start) + ICON.next + '</button>';
  els.welcomeBody.innerHTML =
    '<div class="welcome-grid">' +
    '<div class="welcome-main">' +
    '<p class="kicker">' + esc(W.kicker) + '</p>' +
    '<h1 class="welcome-title" id="welcome-h" tabindex="-1">' + esc(W.title) + '</h1>' +
    '<p class="lead">' + esc(W.lead) + '</p>' +
    (CONFIG.deadline ? '<p class="deadline"><strong>Please respond by ' + esc(CONFIG.deadline) + '.</strong></p>' : '') +
    '<div class="welcome-actions">' + actions + '</div>' +
    '<div class="confirm" id="confirm-over" data-confirm hidden><p id="confirm-t" tabindex="-1"><strong>Start over?</strong> This clears the answers saved in this browser. It can’t be undone.</p>' +
    '<div class="confirm-actions"><button type="button" class="btn btn-danger" data-startover-confirm>Clear my answers and start over</button>' +
    '<button type="button" class="btn btn-secondary" data-startover-cancel>Keep my answers</button></div></div>' +
    (submitted && !draft && submitted.submitted_at ? '<p class="note note-done">' + ICON.check + '<span>Answers were sent from this browser on ' + esc(fmtDateTime(submitted.submitted_at)) + '. <a href="' + withModes('results.html') + '">See the results</a>.</span></p>' : '') +
    '</div>' +
    '<div class="welcome-side">' +
    '<h2 class="side-title">What we’ll ask about</h2><ul class="ticks" role="list">' + W.bullets.map(b => '<li>' + ICON.check + '<span>' + esc(b) + '</span></li>').join('') + '</ul>' +
    '<h2 class="side-title">Good to know</h2><ul class="practical" role="list">' + W.practical.map((p, i) => '<li>' + icons[i] + '<span>' + esc(p) + '</span></li>').join('') + '</ul>' +
    '</div></div>' +
    '<div class="welcome-notes">' +
    '<section class="wnote" aria-labelledby="wn-who"><h2 class="side-title" id="wn-who">Who should answer</h2><p>' + esc(W.who) + '</p></section>' +
    '<section class="wnote" aria-labelledby="wn-prop"><h2 class="side-title" id="wn-prop">' + ICON.star + ' About the team proposals</h2><p>' + esc(W.proposals) + '</p></section>' +
    '</div>';
}

/* ---------------------------------------------------------------- step navigation (header) */
function renderStepnav() {
  const idx = stepIndex(current);
  const inThanks = view === 'thanks';
  els.stepnav.hidden = inThanks;
  if (inThanks) return;
  els.snCount.textContent = 'Step ' + (idx + 1) + ' of ' + STEPS.length;
  els.snTitle.textContent = stepTitle(current);
  els.snBar.innerHTML = STEP_IDS.map((id, i) => {
    const st = stepStatus(id);
    return '<span class="' + (i === idx ? 'is-current' : (st.done ? 'is-done' : (i < idx || state.visited.includes(id) ? 'is-seen' : ''))) + '"></span>';
  }).join('');
  if (!els.snPanel.hidden && els.snPanel.contains(document.activeElement)) return;
  els.snList.innerHTML = STEP_IDS.map((id, i) => {
    const st = stepStatus(id);
    const cur = id === current;
    return '<li><a class="sn-link' + (cur ? ' is-current' : '') + (st.done ? ' is-done' : '') + '" href="#' + id + '"' + (cur ? ' aria-current="step"' : '') + '>' +
      '<span class="sn-icon" aria-hidden="true">' + (st.done ? ICON.check : (i + 1)) + '</span>' +
      '<span class="sn-name">' + esc(stepTitle(id)) + '</span>' +
      (st.text ? '<span class="sn-status">' + esc(st.text) + '</span>' : '') + '</a></li>';
  }).join('');
}

function openNav(open) {
  els.snPanel.hidden = !open;
  els.snToggle.setAttribute('aria-expanded', String(open));
  document.documentElement.classList.toggle('sn-open', open);
}
els.snToggle.addEventListener('click', () => openNav(els.snPanel.hidden));
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !els.snPanel.hidden) { openNav(false); els.snToggle.focus(); }
});
document.addEventListener('click', e => {
  if (!els.snPanel.hidden && !e.target.closest('[data-stepnav]')) openNav(false);
});
els.snPanel.addEventListener('click', e => { if (e.target.closest('a')) openNav(false); });
els.snPanel.addEventListener('focusout', e => {
  if (!els.snPanel.hidden && e.relatedTarget && !e.relatedTarget.closest('[data-stepnav]')) openNav(false);
});

/* ---------------------------------------------------------------- routing */
async function goTo(id, opts) {
  const o = opts || {};
  if (!STEP_IDS.includes(id)) id = 'welcome';
  if (QSTEPS.includes(id) && !P) await previewsReady;
  view = 'step';
  current = id;
  if (id !== 'welcome') state.step = id; // the welcome page never replaces the point to continue from
  if (!state.visited.includes(id)) state.visited.push(id);
  if (id !== 'welcome' && !state.started_at) state.started_at = new Date().toISOString();
  document.documentElement.classList.remove('is-thanks');

  if (id === 'welcome') {
    els.step.hidden = true;
    els.step.innerHTML = '';
    renderWelcome();
    els.welcome.hidden = false;
  } else {
    els.welcome.hidden = true;
    let html = '';
    if (id === 'about') html = renderAbout();
    else if (id === 'contacts') html = renderContacts();
    else if (id === 'S') html = renderSocial();
    else if (id === 'finish') html = renderFinish();
    else html = renderQuestionStep(id);
    els.step.innerHTML = html;
    els.step.hidden = false;
    if (P) P.wireDemos(els.step);
    $$('[data-rank]', els.step).forEach(wireRankDrag);
  }
  document.title = (id === 'welcome' ? 'SEASTRONG partner questionnaire' : stepTitle(id) + ' · SEASTRONG partner questionnaire');
  syncUI();
  if (hasProgressNow()) saveNow();
  else setSaveStatus('');
  window.scrollTo(0, 0);
  if (o.focus !== false) {
    const h = id === 'welcome' ? $('#welcome-h') : $('#step-h');
    if (h) h.focus({ preventScroll: true });
  }
  if (pendingFix === id) {
    pendingFix = null;
    const errs = id === 'about' ? M.validateAbout(state) : id === 'contacts' ? M.validateContacts(state) : [];
    if (errs.length) showErrors(errs);
  }
}
const hasProgressNow = () => M.hasProgress(state);

function navigate(id) {
  if ('#' + id === location.hash) goTo(id);
  else location.hash = id;
}
window.addEventListener('hashchange', () => {
  const id = location.hash.slice(1);
  if (!STEP_IDS.includes(id)) return;
  if (view === 'thanks') { history.replaceState(null, '', location.pathname + location.search); return; }
  openNav(false);
  goTo(id);
});

/* ---------------------------------------------------------------- UI sync after every change */
function showIfMatch(expr) {
  const neg = expr.includes('!=');
  const [path, vals] = expr.split(neg ? '!=' : '=');
  const v = getPath(path);
  const hit = vals.split('|').includes(v == null ? '' : String(v));
  return neg ? !hit : hit;
}

function syncUI() {
  const root = els.step;
  $$('[data-showif]', root).forEach(el => { el.hidden = !showIfMatch(el.dataset.showif); });
  $$('[data-clear]', root).forEach(b => { b.hidden = !state.answers[b.dataset.clear]; });
  $$('[data-clear-path]', root).forEach(b => { b.hidden = !getPath(b.dataset.clearPath); });
  $$('[data-tri-clear]', root).forEach(b => { const a = state.answers[b.dataset.triClear]; b.hidden = !a || !Object.keys(a).length; });
  $$('[data-step-count]', root).forEach(el => {
    const c = M.stepCounts(el.dataset.stepCount, state);
    el.textContent = c.answered + ' of ' + c.total + ' questions answered';
  });
  $$('.q[data-q]', root).forEach(card => card.classList.toggle('is-answered', M.isAnswered(card.dataset.q, state)));
  $$('.opt-input', root).forEach(inp => inp.closest('.opt').classList.toggle('is-checked', inp.checked));
  $$('.tri-row', root).forEach(row => row.classList.toggle('is-rated', !!row.querySelector('.seg-input:checked')));
  // S3 and any other multi with a maximum
  $$('[data-max-note]', root).forEach(note => {
    const q = M.Q[note.dataset.maxNote];
    const a = state.answers[q.id] || [];
    const full = a.length >= q.max;
    $$('input[data-ans="' + q.id + '"]', root).forEach(inp => {
      inp.disabled = full && !inp.checked;
      inp.closest('.opt').classList.toggle('is-disabled', inp.disabled);
    });
    const txt = full ? 'You’ve chosen five. To pick a different one, untick one first.' : '';
    if (note.textContent !== txt) note.textContent = txt;
  });
  // "Me" summaries
  const a = state.about;
  $$('[data-me="name"]', root).forEach(el => { el.textContent = M.clean(a.respondent_name) || 'Your name is not filled in yet'; });
  $$('[data-me="role"]', root).forEach(el => { el.textContent = M.clean(a.respondent_role); el.hidden = !M.clean(a.respondent_role); });
  $$('[data-me="email"]', root).forEach(el => { el.textContent = M.clean(a.respondent_email); el.hidden = !M.clean(a.respondent_email); });
  // rank status
  $$('[data-rank-status]', root).forEach(el => {
    const done = state.rankDone[el.dataset.rankStatus];
    el.innerHTML = done ? ICON.check + '<span>Your order is saved.</span>' : '<span>Not answered yet. Reorder the list, or confirm that this order works.</span>';
    el.classList.toggle('is-done', !!done);
  });
  renderStepnav();
}

/* ---------------------------------------------------------------- errors */
function fieldContainer(path) { return $('[data-field="' + path + '"]', els.step); }

function setError(path, msg) {
  const box = fieldContainer(path);
  if (!box) return null;
  const err = box.querySelector('.field-error');
  box.classList.add('has-error');
  if (err) { err.innerHTML = '<span class="sr-only">Error: </span>' + esc(msg); err.hidden = false; }
  const controls = box.matches('fieldset') ? $$('input', box) : $$('input, select, textarea', box).slice(0, 1);
  controls.forEach(c => {
    c.setAttribute('aria-invalid', 'true');
    const d = (c.getAttribute('aria-describedby') || '').split(' ').filter(Boolean);
    if (err && !d.includes(err.id)) d.unshift(err.id);
    c.setAttribute('aria-describedby', d.join(' '));
  });
  return controls[0] || null;
}
function clearError(path) {
  const box = fieldContainer(path);
  if (!box || !box.classList.contains('has-error')) return;
  box.classList.remove('has-error');
  const err = box.querySelector('.field-error');
  if (err) { err.hidden = true; err.textContent = ''; }
  $$('[aria-invalid]', box).forEach(c => {
    c.removeAttribute('aria-invalid');
    const d = (c.getAttribute('aria-describedby') || '').split(' ').filter(x => x && (!err || x !== err.id));
    if (d.length) c.setAttribute('aria-describedby', d.join(' ')); else c.removeAttribute('aria-describedby');
  });
}
function showErrors(errors) {
  let first = null;
  errors.forEach(e => { const c = setError(e.field, e.msg); if (!first && c) first = c; });
  if (first) {
    first.focus();
    first.scrollIntoView({ block: 'center' });
  }
  const n = errors.length;
  announce((n === 1 ? 'One thing needs your attention: ' : n + ' things need your attention: ') + errors.map(e => e.msg).join(' '));
}
function revalidateField(path) {
  const box = fieldContainer(path);
  if (!box || !box.classList.contains('has-error')) return;
  const all = M.validateAbout(state).concat(M.validateContacts(state), M.validateOptionalEmails(state), M.validateConsent(state));
  const e = all.find(x => x.field === path);
  if (!e) clearError(path);
  else setError(path, e.msg);
}

/* ---------------------------------------------------------------- change handling */
function changed(path) {
  touch();
  if (path) revalidateField(path);
  syncUI();
  saveSoon();
}

els.step.addEventListener('input', e => {
  const t = e.target;
  if (t.matches('input[type="text"], input[type="email"], input[type="tel"], input[type="url"], input:not([type]), textarea') && t.dataset.bind) {
    setPath(t.dataset.bind, t.value);
    changed(t.dataset.bind);
  } else if (t.dataset.chField) {
    state.channels[+t.dataset.chI][t.dataset.chField] = t.value;
    if (t.dataset.chField === 'followers') checkFollowers(t, false);
    changed();
  }
});

els.step.addEventListener('change', e => {
  const t = e.target;
  if (t.dataset.ans && t.type === 'radio') {
    state.answers[t.dataset.ans] = t.value;
    changed('answers.' + t.dataset.ans);
  } else if (t.dataset.ans && t.type === 'checkbox') {
    const id = t.dataset.ans;
    let arr = Array.isArray(state.answers[id]) ? state.answers[id].slice() : [];
    if (t.checked) { if (!arr.includes(t.value)) arr.push(t.value); } else arr = arr.filter(v => v !== t.value);
    if (id === 'WEB_PROVIDE' && t.checked) {
      // "None of these yet" excludes the other options, and the other way round
      const other = t.value === 'none' ? arr.filter(v => v !== 'none') : (arr.includes('none') ? ['none'] : []);
      other.forEach(v => { const box = $('input[data-ans="WEB_PROVIDE"][value="' + v + '"]', els.step); if (box) box.checked = false; });
      arr = t.value === 'none' ? ['none'] : arr.filter(v => v !== 'none');
    }
    const q = M.Q[id];
    if (q.max && arr.length > q.max) { t.checked = false; arr = arr.filter(v => v !== t.value); }
    const order = M.optionIds(q);
    arr.sort((x, y) => order.indexOf(x) - order.indexOf(y));
    if (arr.length) state.answers[id] = arr; else delete state.answers[id];
    if (q.max && arr.length === q.max) announce('You’ve chosen five. To pick a different one, untick one first.');
    changed();
  } else if (t.dataset.tri) {
    const qid = t.dataset.tri;
    state.answers[qid] = Object.assign({}, state.answers[qid] || {}, { [t.dataset.item]: t.value });
    changed();
  } else if (t.dataset.bindarr) {
    const path = t.dataset.bindarr;
    let arr = (getPath(path) || []).slice();
    if (t.checked) { if (!arr.includes(t.value)) arr.push(t.value); } else arr = arr.filter(v => v !== t.value);
    setPath(path, arr);
    changed();
  } else if (t.dataset.bind) {
    if (t.type === 'checkbox') setPath(t.dataset.bind, t.checked);
    else if (t.type === 'radio') { if (t.checked) setPath(t.dataset.bind, t.value); }
    else setPath(t.dataset.bind, t.value);
    changed(t.dataset.bind);
  } else if (t.dataset.chField) {
    state.channels[+t.dataset.chI][t.dataset.chField] = t.value;
    changed();
  }
});

els.step.addEventListener('focusout', e => {
  const t = e.target;
  if (t.matches('[data-email]') && t.dataset.bind) {
    const v = M.clean(t.value);
    if (v && !M.EMAIL_RE.test(v)) setError(t.dataset.bind, 'Enter an email address in the format name@example.org.');
    else if (!v) revalidateField(t.dataset.bind);
    else clearError(t.dataset.bind);
  }
  if (t.dataset.chField === 'followers') checkFollowers(t, true);
});

function checkFollowers(input, onBlur) {
  const err = $('#' + input.id + '-err');
  const raw = input.value.trim();
  const bad = raw && !M.followersDigits(raw);
  if (bad && onBlur) {
    err.textContent = 'Use digits only, for example 4200. Approximate numbers are fine.';
    err.hidden = false;
    input.setAttribute('aria-invalid', 'true');
  } else if (!bad) {
    err.hidden = true; err.textContent = '';
    input.removeAttribute('aria-invalid');
  }
}

/* ---------------------------------------------------------------- rank */
function rerenderRank(qid, focusId, dir) {
  const ol = $('[data-rank="' + qid + '"]', els.step);
  ol.innerHTML = rankItems(M.Q[qid]);
  if (focusId) {
    let b = $('[data-rank-move="' + dir + '"][data-id="' + focusId + '"]', ol);
    if (!b || b.disabled) b = $('[data-rank-move="' + (-dir) + '"][data-id="' + focusId + '"]', ol);
    if (b) b.focus();
  }
}
function moveRank(qid, itemId, delta) {
  const order = state.rank[qid];
  const i = order.indexOf(itemId), j = i + delta;
  if (i < 0 || j < 0 || j >= order.length) return;
  [order[i], order[j]] = [order[j], order[i]];
  state.rankDone[qid] = true;
  rerenderRank(qid, itemId, delta);
  const it = M.Q[qid].items.find(x => x.id === itemId);
  announce(it.label + ' moved to position ' + (j + 1) + ' of ' + order.length + '.');
  changed();
}
function wireRankDrag(ol) {
  const qid = ol.dataset.rank;
  ol.addEventListener('pointerdown', e => {
    const handle = e.target.closest('.rank-handle');
    if (!handle || e.button > 0) return;
    const li = handle.closest('li');
    e.preventDefault();
    try { handle.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    const grab = e.clientY - li.getBoundingClientRect().top;
    li.classList.add('is-dragging');
    ol.classList.add('is-sorting');
    const place = y => {
      li.style.transform = '';
      const natural = li.getBoundingClientRect().top;
      li.style.transform = 'translateY(' + (y - grab - natural) + 'px)';
      const center = y - grab + li.offsetHeight / 2;
      const prev = li.previousElementSibling, next = li.nextElementSibling;
      if (prev) { const r = prev.getBoundingClientRect(); if (center < r.top + r.height / 2) { ol.insertBefore(li, prev); return place(y); } }
      if (next) { const r = next.getBoundingClientRect(); if (center > r.top + r.height / 2) { ol.insertBefore(next, li); return place(y); } }
    };
    const move = ev => place(ev.clientY);
    const up = () => {
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', up);
      handle.removeEventListener('pointercancel', up);
      li.classList.remove('is-dragging');
      ol.classList.remove('is-sorting');
      li.style.transform = '';
      const order = $$('li', ol).map(x => x.dataset.id);
      const changedOrder = order.join() !== state.rank[qid].join();
      state.rank[qid] = order;
      if (changedOrder) {
        state.rankDone[qid] = true;
        const it = M.Q[qid].items.find(x => x.id === li.dataset.id);
        announce(it.label + ' moved to position ' + (order.indexOf(li.dataset.id) + 1) + ' of ' + order.length + '.');
      }
      rerenderRank(qid);
      changed();
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', up);
    handle.addEventListener('pointercancel', up);
  });
}

/* ---------------------------------------------------------------- clicks */
document.addEventListener('click', e => {
  const t = e.target.closest('button, a');
  if (!t) return;
  const d = t.dataset;

  if (d.start !== undefined) { touch(); navigate('about'); return; }
  if (d.resume !== undefined) {
    const to = state.step && state.step !== 'welcome' && STEP_IDS.includes(state.step) ? state.step : 'about';
    navigate(to); return;
  }
  if (d.startover !== undefined) {
    const box = $('[data-confirm]');
    box.hidden = false; t.setAttribute('aria-expanded', 'true');
    $('#confirm-t').focus();
    return;
  }
  if (d.startoverCancel !== undefined) {
    $('[data-confirm]').hidden = true;
    const b = $('[data-startover]'); if (b) { b.setAttribute('aria-expanded', 'false'); b.focus(); }
    return;
  }
  if (d.startoverConfirm !== undefined) {
    store.remove(STORAGE_KEY);
    state = M.freshState(DEVICE_TZ);
    lastActive = 0;
    touch();
    announce('Your saved answers were cleared.');
    navigate('about');
    return;
  }
  if (!els.step.contains(t)) return;

  if (d.fix) { pendingFix = d.fix; return; } // the hash change shows the step, then its errors
  if (d.next !== undefined) { onNext(); return; }
  if (d.back !== undefined) { const i = stepIndex(current); if (i > 0) navigate(STEP_IDS[i - 1]); return; }
  if (d.submit !== undefined) { onSubmit(); return; }
  if (d.download !== undefined) { downloadAnswers(); return; }
  if (d.retry !== undefined) { onSubmit(); return; }

  if (d.clear) {
    delete state.answers[d.clear];
    $$('input[data-ans="' + d.clear + '"]', els.step).forEach(i => { i.checked = false; });
    const first = $('input[data-ans="' + d.clear + '"]', els.step);
    changed();
    if (first) first.focus();
    announce('Choice cleared.');
    return;
  }
  if (d.clearPath) {
    const path = d.clearPath;
    if (path.startsWith('answers.')) delete state.answers[path.slice(8)]; else setPath(path, '');
    const box = fieldContainer(path);
    if (box) $$('input[type="radio"]', box).forEach(i => { i.checked = false; });
    changed();
    const first = box && box.querySelector('input[type="radio"]');
    if (first) first.focus();
    announce('Choice cleared.');
    return;
  }
  if (d.triFill) {
    const q = M.Q[d.triFill];
    const a = Object.assign({}, state.answers[q.id] || {});
    let n = 0;
    q.items.forEach(it => { if (!a[it.id]) { a[it.id] = it.rec; n++; const r = $('#t-' + q.id + '-' + it.id + '-' + it.rec); if (r) r.checked = true; } });
    state.answers[q.id] = a;
    changed();
    announce(n ? n + (n === 1 ? ' row now shows' : ' rows now show') + ' the team’s proposal. Change any you like.' : 'Every row already has a rating, so nothing was changed.');
    return;
  }
  if (d.triClear) {
    delete state.answers[d.triClear];
    $$('input[data-tri="' + d.triClear + '"]', els.step).forEach(i => { i.checked = false; });
    changed();
    const b = $('[data-tri-fill="' + d.triClear + '"]', els.step);
    if (b) b.focus();
    announce('All ratings cleared.');
    return;
  }
  if (d.rankMove) { moveRank(d.q, d.id, +d.rankMove); return; }
  if (d.rankOk) {
    state.rankDone[d.rankOk] = true;
    changed();
    announce('Your order is saved.');
    return;
  }
  if (d.chAdd !== undefined) {
    state.channels.push(M.emptyChannel());
    const list = $('[data-ch-list]', els.step);
    list.insertAdjacentHTML('beforeend', channelRow(state.channels[state.channels.length - 1], state.channels.length - 1));
    $('#ch-' + (state.channels.length - 1) + '-platform').focus();
    changed();
    return;
  }
  if (d.chRemove !== undefined) {
    const i = +d.chRemove;
    if (state.channels.length > 1) state.channels.splice(i, 1); else state.channels[0] = M.emptyChannel();
    $('[data-ch-list]', els.step).innerHTML = state.channels.map(channelRow).join('');
    const next = $('#ch-' + Math.min(i, state.channels.length - 1) + '-platform', els.step);
    if (next) next.focus();
    announce('Channel removed.');
    changed();
    return;
  }
});

/* ---------------------------------------------------------------- next and submit */
function onNext() {
  // Only About you blocks Next. Required contact details are checked again at Finish.
  const errors = current === 'about' ? M.validateAbout(state) : [];
  if (errors.length) { showErrors(errors); return; }
  saveNow();
  navigate(STEP_IDS[stepIndex(current) + 1]);
}

function payloadNow() {
  return M.buildPayload(state, { surveyVersion: CONFIG.surveyVersion, test: MODE.test, tz: DEVICE_TZ });
}

function downloadAnswers() {
  const p = lastPayload || payloadNow();
  const day = new Date().toISOString().slice(0, 10);
  download('seastrong-questionnaire-answers-' + day + '.json', JSON.stringify(p, null, 2));
}

function renderErrorSummary(problems) {
  const box = $('[data-error-summary]', els.step);
  const list = $('[data-error-list]', els.step);
  if (!problems.length) { box.hidden = true; list.innerHTML = ''; return; }
  list.innerHTML = problems.map(p => '<li><a href="#' + p.step + '" data-fix="' + p.step + '">' + esc(stepTitle(p.step)) + ': ' + esc(p.msg) + '</a></li>').join('');
  box.hidden = false;
}

async function onSubmit() {
  if (sending) return;
  touch();
  const problems = M.validateAbout(state).map(e => Object.assign({ step: 'about' }, e))
    .concat(M.validateContacts(state).map(e => Object.assign({ step: 'contacts' }, e)));
  const consent = M.validateConsent(state);
  renderErrorSummary(problems);
  clearError('consent_data');
  if (problems.length || consent.length) {
    if (consent.length) setError('consent_data', consent[0].msg);
    if (problems.length) {
      const box = $('[data-error-summary]', els.step);
      box.scrollIntoView({ block: 'start' });
      box.focus({ preventScroll: true });
    } else {
      const c = $('#f-consent_data'); c.focus(); c.scrollIntoView({ block: 'center' });
    }
    const all = problems.concat(consent);
    announce((all.length === 1 ? 'One thing needs your attention before you submit: ' : all.length + ' things need your attention before you submit: ') + all.map(e => e.msg).join(' '));
    return;
  }
  const payload = payloadNow();
  lastPayload = payload;
  window.__lastPayload = payload; // inspected by the automated tests
  const btn = $('[data-submit]', els.step);
  const out = $('[data-send-state]', els.step);
  if (M.clean(state.hp)) { store.remove(STORAGE_KEY); showThanks(payload); return; } // honeypot: pretend success, send nothing
  sending = true;
  btn.disabled = true;
  btn.setAttribute('aria-disabled', 'true');
  out.innerHTML = '<p class="sending"><span class="spinner" aria-hidden="true"></span>' + esc(FINISH.submitting) + '</p>';
  const res = await submitResponse(payload);
  sending = false;
  window.__lastSubmit = res;
  if (res.ok) {
    store.set(SUBMITTED_KEY, JSON.stringify({ submitted_at: new Date().toISOString(), organisation: payload.organisation, organisation_other: payload.organisation_other, answers: payload.answers }));
    store.remove(STORAGE_KEY);
    showThanks(payload);
    return;
  }
  btn.disabled = false;
  btn.removeAttribute('aria-disabled');
  out.innerHTML = '<div class="alert" role="alert"><h2 class="alert-title">' + esc(FINISH.failTitle) + '</h2><p>' + esc(FINISH.failBody) + '</p>' +
    '<div class="alert-actions"><button type="button" class="btn btn-primary" data-retry>Try again</button>' +
    '<button type="button" class="btn btn-secondary" data-download>Download a copy of my answers</button>' +
    (CONFIG.contactEmail ? '<a class="btn btn-ghost" href="mailto:' + esc(CONFIG.contactEmail) + '?subject=' + encodeURIComponent('SEASTRONG questionnaire answers') + '">Email ' + esc(CONFIG.contactEmail) + '</a>' : '') +
    '</div>' + (res.status ? '<p class="muted small">Technical detail for the team: status ' + res.status + '.</p>' : '') + '</div>';
}

function showThanks(payload) {
  const colleagues = M.listsColleagues(state);
  view = 'thanks';
  current = 'finish';
  state = M.freshState(DEVICE_TZ);
  history.replaceState(null, '', location.pathname + location.search);
  document.documentElement.classList.add('is-thanks');
  els.welcome.hidden = true;
  els.step.hidden = false;
  els.step.innerHTML = '<div class="thanks"><header class="step-head thanks-head">' +
    '<p class="thanks-mark" aria-hidden="true">' + ICON.check + '</p>' +
    '<h1 class="step-title" id="step-h" tabindex="-1">' + esc(FINISH.thanksTitle) + '</h1>' +
    '<p class="step-intro">' + esc(FINISH.thanksBody) + '</p>' +
    (colleagues ? '<p class="note note-info">' + ICON.info + '<span>' + esc(FINISH.colleaguesReminder) + '</span></p>' : '') +
    '<div class="thanks-actions"><button type="button" class="btn btn-secondary" data-download>Download a copy of my answers</button>' +
    '<a class="btn btn-ghost" href="' + withModes('results.html') + '">Open the results page</a></div>' +
    (CONFIG.contactEmail ? '<p class="muted small">Need to change something? Email <a href="mailto:' + esc(CONFIG.contactEmail) + '">' + esc(CONFIG.contactEmail) + '</a>.</p>' : '') +
    '</header><div class="results-wrap" id="thanks-results"></div></div>';
  setSaveStatus('');
  renderStepnav();
  document.title = 'Thank you · SEASTRONG partner questionnaire';
  window.scrollTo(0, 0);
  $('#step-h').focus({ preventScroll: true });
  lastPayload = payload;
  loadResults($('#thanks-results'), { level: 2 });
}

/* ---------------------------------------------------------------- boot */
initChrome();
document.addEventListener('keydown', () => { if (view === 'step' && current !== 'welcome') touch(); }, { passive: true, capture: true });
const startId = location.hash.slice(1);
goTo(STEP_IDS.includes(startId) ? startId : 'welcome', { focus: false });
