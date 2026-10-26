/* SEASTRONG questionnaire: state shape, question registry, validation and the payload sent to Supabase.
   Pure module (no DOM), so it can also be imported by the test scripts. */
import { QUESTIONS, ORGS, CONTACTS, SOCIAL_OPS } from './data.js';

export const MAX_TEXT = 4000;
export const TRI_VALUES = ['must', 'nice', 'later', 'skip'];
export const TRI_LABELS = { must: 'Must', nice: 'Nice', later: 'Later', skip: 'Skip' };
export const APPROVAL_TRIGGERS = ['office', 'leadership', 'mixed'];
export const EMAIL_RE = /^[^\s@<>()[\],;:"]+@[^\s@<>()[\],;:"]+\.[^\s@<>()[\],;:"]{2,}$/;
const LIMIT = { short: 200, role: 300, email: 320, phone: 60, url: 500, note: 1000, lang: 80, hp: 200 };

/* ---------- question registry ---------- */
const D5 = QUESTIONS.find(q => q.id === 'D5');
export const D5_REVIEW = {
  id: 'D5_REVIEW', g: 'D', type: 'multi', title: D5.followup.title, optional: true,
  options: D5.options.filter(o => o.id !== 'en').map(o => ({ id: o.id, label: o.label }))
};
export const OPS_IDS = ['WEB_PROVIDE', 'WEB_HOST', 'SOC_FREQ', 'SOC_HELP', 'SOC_CONTROL', 'SOC_APPROVAL', 'SOC_ASSETS'];
export const Q = {};
QUESTIONS.forEach(q => { Q[q.id] = q; });
Q.D5_REVIEW = D5_REVIEW;
Q.WEB_PROVIDE = CONTACTS.profile.WEB_PROVIDE;
Q.WEB_HOST = CONTACTS.profile.WEB_HOST;
['SOC_FREQ', 'SOC_HELP', 'SOC_CONTROL', 'SOC_APPROVAL', 'SOC_ASSETS'].forEach(id => { Q[id] = SOCIAL_OPS[id]; });

/* Every id that may appear in payload.answers, in display order. */
export const AGG_IDS = QUESTIONS.map(q => q.id).concat(['D5_REVIEW'], OPS_IDS);

export const STEP_Q = {
  contacts: ['WEB_PROVIDE', 'WEB_HOST'],
  A: QUESTIONS.filter(q => q.g === 'A').map(q => q.id),
  B: QUESTIONS.filter(q => q.g === 'B').map(q => q.id),
  C: QUESTIONS.filter(q => q.g === 'C').map(q => q.id),
  D: QUESTIONS.filter(q => q.g === 'D').map(q => q.id),
  S: QUESTIONS.filter(q => q.g === 'S').map(q => q.id).concat(['SOC_FREQ', 'SOC_HELP', 'SOC_CONTROL', 'SOC_APPROVAL', 'SOC_ASSETS'])
};

export const optionIds = q => (q.options || []).map(o => o.id);
export const itemIds = q => (q.items || []).map(i => i.id);
export const approvalShown = state => APPROVAL_TRIGGERS.includes(state.answers.SOC_CONTROL);

export function stepQuestionIds(stepId, state) {
  return (STEP_Q[stepId] || []).filter(id => id !== 'SOC_APPROVAL' || approvalShown(state));
}

export function isAnswered(id, state) {
  const q = Q[id];
  const a = state.answers[id];
  if (!q) return false;
  if (q.type === 'rank') return !!(state.rankDone && state.rankDone[id]);
  if (q.type === 'single') return typeof a === 'string' && optionIds(q).includes(a);
  if (q.type === 'multi') return Array.isArray(a) && a.length > 0;
  if (q.type === 'tri') return !!a && typeof a === 'object' && Object.keys(a).length > 0;
  return false;
}

export function stepCounts(stepId, state) {
  const ids = stepQuestionIds(stepId, state);
  return { answered: ids.filter(id => isAnswered(id, state)).length, total: ids.length };
}

/* ---------- state ---------- */
export function emptyPerson(tz) {
  return { who: '', name: '', role: '', email: '', phone: '', preferred: [], timezone: tz || '', languages: [], languages_other: '', availability: '', notes: '' };
}
export function emptyChannel() { return { platform: '', handle: '', followers: '', run_by: '' }; }

export function freshState(tz) {
  const A2 = Q.A2;
  return {
    v: 1,
    step: 'welcome',
    visited: [],
    started_at: null,
    active_ms: 0,
    updated_at: null,
    about: { organisation: '', organisation_other: '', respondent_name: '', respondent_role: '', respondent_email: '', responding_for: '' },
    contacts: {
      website_liaison: emptyPerson(tz),
      comms_liaison: emptyPerson(tz),
      social_contact: emptyPerson(tz),
      approver: { name: '', role: '', email: '', phone: '', ok_to_contact: '' },
      profile: { website_url: '', brand_rules: '' }
    },
    answers: {},
    rank: { A2: A2.rec.slice() },
    rankDone: {},
    comments: {},
    channels: [emptyChannel(), emptyChannel(), emptyChannel()],
    consent_data: false,
    consent_contact: false,
    hp: ''
  };
}

/* Merge a saved draft over a fresh state, so drafts from older builds still load safely. */
export function reviveState(saved, tz) {
  const s = freshState(tz);
  if (!saved || typeof saved !== 'object') return s;
  const obj = (v, d) => (v && typeof v === 'object' && !Array.isArray(v)) ? v : d;
  Object.assign(s.about, obj(saved.about, {}));
  const c = obj(saved.contacts, {});
  ['website_liaison', 'comms_liaison', 'social_contact'].forEach(k => Object.assign(s.contacts[k], obj(c[k], {})));
  Object.assign(s.contacts.approver, obj(c.approver, {}));
  Object.assign(s.contacts.profile, obj(c.profile, {}));
  s.answers = obj(saved.answers, {});
  s.comments = obj(saved.comments, {});
  s.rankDone = obj(saved.rankDone, {});
  const r = obj(saved.rank, {});
  // Restore each saved ranking. Items added to a question after the draft was saved go at the end,
  // and that ranking must be confirmed again so the new item is placed on purpose.
  Object.keys(s.rank).forEach(qid => {
    const saved_order = r[qid];
    if (!Array.isArray(saved_order)) return;
    const valid = s.rank[qid];
    const kept = saved_order.filter((id, i) => valid.includes(id) && saved_order.indexOf(id) === i);
    if (!kept.length) return;
    const added = valid.filter(id => !kept.includes(id));
    s.rank[qid] = kept.concat(added);
    if (added.length) delete s.rankDone[qid];
  });
  if (Array.isArray(saved.channels) && saved.channels.length) s.channels = saved.channels.map(ch => Object.assign(emptyChannel(), obj(ch, {})));
  ['step', 'started_at', 'updated_at', 'hp'].forEach(k => { if (typeof saved[k] === 'string') s[k] = saved[k]; });
  if (Array.isArray(saved.visited)) s.visited = saved.visited.filter(x => typeof x === 'string');
  if (typeof saved.active_ms === 'number') s.active_ms = saved.active_ms;
  s.consent_data = saved.consent_data === true;
  s.consent_contact = saved.consent_contact === true;
  return s;
}

/* True when the draft holds anything worth offering to continue. */
export function hasProgress(state) {
  if (!state) return false;
  const a = state.about || {};
  return !!(a.organisation || a.respondent_name || a.respondent_email ||
    Object.keys(state.answers || {}).length || Object.keys(state.comments || {}).length ||
    (state.visited || []).some(s => s !== 'welcome'));
}

/* ---------- validation ---------- */
export const orgByCode = code => ORGS.find(o => o.code === code) || null;

export function validateAbout(state) {
  const a = state.about, e = [];
  if (!orgByCode(a.organisation)) e.push({ field: 'about.organisation', msg: 'Choose your organization.' });
  else if (a.organisation === 'Other' && !clean(a.organisation_other)) e.push({ field: 'about.organisation_other', msg: 'Enter the name of your organization.' });
  if (!clean(a.respondent_name)) e.push({ field: 'about.respondent_name', msg: 'Enter your name.' });
  const em = clean(a.respondent_email);
  if (!em) e.push({ field: 'about.respondent_email', msg: 'Enter your work email.' });
  else if (!EMAIL_RE.test(em)) e.push({ field: 'about.respondent_email', msg: 'Enter an email address in the format name@example.org.' });
  return e;
}

export function validateContacts(state) {
  const e = [];
  const check = (key, label) => {
    const p = state.contacts[key];
    const base = 'contacts.' + key;
    if (!p.who) { e.push({ field: base + '.who', msg: 'Choose who the ' + label + ' is.' }); return; }
    if (p.who !== 'other') return;
    if (!clean(p.name)) e.push({ field: base + '.name', msg: 'Enter the ' + label + '’s full name.' });
    const em = clean(p.email);
    if (!em) e.push({ field: base + '.email', msg: 'Enter the ' + label + '’s work email.' });
    else if (!EMAIL_RE.test(em)) e.push({ field: base + '.email', msg: 'Enter an email address in the format name@example.org.' });
  };
  check('website_liaison', 'website liaison');
  check('comms_liaison', 'communications liaison');
  return e;
}

/* Optional email fields: only the format is checked, and only when something was typed. */
export function validateOptionalEmails(state) {
  const e = [];
  const opt = (path, v) => { const s = clean(v); if (s && !EMAIL_RE.test(s)) e.push({ field: path, msg: 'Enter an email address in the format name@example.org.' }); };
  if (state.contacts.social_contact.who === 'other') opt('contacts.social_contact.email', state.contacts.social_contact.email);
  if (approvalShown(state)) opt('contacts.approver.email', state.contacts.approver.email);
  return e;
}

export function validateConsent(state) {
  return state.consent_data ? [] : [{ field: 'consent_data', msg: 'Tick this box to agree before you submit. We can only store your answers with your consent.' }];
}

/* ---------- payload ---------- */
export function clean(v, max) {
  if (v == null) return '';
  let s = String(v).replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
  const m = max || MAX_TEXT;
  if (s.length > m) s = s.slice(0, m).trim();
  return s;
}
const orNull = s => (s ? s : null);

/* "4,200", "4 200", "~4200" -> "4200". Anything else (for example "4.2k") -> "" (dropped). */
export function followersDigits(v) {
  const s = String(v == null ? '' : v).replace(/[\s,.'’_~+  ]/g, '');
  if (!/^\d{1,10}$/.test(s)) return '';
  return String(parseInt(s, 10));
}

function cleanList(list, allowed, max) {
  const out = [];
  (Array.isArray(list) ? list : []).forEach(v => {
    const s = clean(v, LIMIT.lang);
    if (s && (!allowed || allowed.includes(s)) && !out.includes(s)) out.push(s);
  });
  return out.slice(0, max || 30);
}

const PERSON_FIELDS = CONTACTS.personFields;
const PREFERRED = PERSON_FIELDS.find(f => f.key === 'preferred').options;
const LANGS = PERSON_FIELDS.find(f => f.key === 'languages').options;

function personOut(p, about, whoAllowed) {
  const who = whoAllowed.includes(p.who) ? p.who : '';
  const me = who === 'me';
  const otherLangs = clean(p.languages_other, 300).split(/[,;/\n]+/).map(x => x.trim()).filter(Boolean);
  return {
    who,
    name: clean(me ? about.respondent_name : p.name, LIMIT.short),
    role: clean(me ? about.respondent_role : p.role, LIMIT.role),
    email: clean(me ? about.respondent_email : p.email, LIMIT.email),
    phone: clean(p.phone, LIMIT.phone),
    preferred: cleanList(p.preferred, PREFERRED),
    timezone: clean(p.timezone, 64),
    languages: cleanList(cleanList(p.languages, LANGS).concat(otherLangs)),
    availability: clean(p.availability, LIMIT.note),
    notes: clean(p.notes, LIMIT.note)
  };
}

function answersOut(state) {
  const out = {};
  for (const id of AGG_IDS) {
    const q = Q[id];
    const a = state.answers[id];
    if (id === 'SOC_APPROVAL' && !approvalShown(state)) continue;
    if (q.type === 'single') {
      if (typeof a === 'string' && optionIds(q).includes(a)) out[id] = a;
    } else if (q.type === 'multi') {
      if (!Array.isArray(a)) continue;
      let v = optionIds(q).filter(o => a.includes(o));
      if (id === 'WEB_PROVIDE' && v.length > 1) v = v.filter(o => o !== 'none');
      if (q.max) v = v.slice(0, q.max);
      if (v.length) out[id] = v;
    } else if (q.type === 'tri') {
      if (!a || typeof a !== 'object') continue;
      const v = {};
      itemIds(q).forEach(it => { if (TRI_VALUES.includes(a[it])) v[it] = a[it]; });
      if (Object.keys(v).length) out[id] = v;
    } else if (q.type === 'rank') {
      if (!(state.rankDone && state.rankDone[id])) continue;
      const order = (state.rank && state.rank[id]) || q.rec;
      const v = {};
      order.forEach((it, i) => { v[it] = i + 1; });
      out[id] = v;
    }
  }
  return out;
}

const COMMENT_KEYS = ['overall', 'named_people', 'brand_rules_notes', 'approval_tips', 'image_rules', 'personal_channels'];

function commentsOut(state) {
  const out = {};
  const c = state.comments || {};
  AGG_IDS.forEach(id => { const s = clean(c[id]); if (s) out[id] = s; });
  COMMENT_KEYS.forEach(k => {
    if (k === 'brand_rules_notes' && state.contacts.profile.brand_rules !== 'yes') return;
    if (k === 'approval_tips' && !approvalShown(state)) return;
    const s = clean(c[k]);
    if (s) out[k] = s;
  });
  return out;
}

function channelsOut(state) {
  const runBy = SOCIAL_OPS.channelFields.find(f => f.key === 'run_by').options.map(o => o.id);
  const out = [];
  (state.channels || []).forEach(ch => {
    const platform = SOCIAL_OPS.platforms.includes(ch.platform) ? ch.platform : '';
    const handle = clean(ch.handle, 300);
    const followers = followersDigits(ch.followers);
    if (!platform && !handle && !followers) return;
    const row = { platform, handle, run_by: runBy.includes(ch.run_by) ? ch.run_by : '' };
    if (followers) row.followers = followers;
    out.push(row);
  });
  return out.slice(0, 25);
}

/* opts: { surveyVersion, test, tz, now } */
export function buildPayload(state, opts) {
  const o = opts || {};
  const about = state.about;
  const org = orgByCode(about.organisation);
  const isOther = !!org && org.code === 'Other';
  const c = state.contacts;

  const contacts = {
    website_liaison: personOut(c.website_liaison, about, ['me', 'other']),
    comms_liaison: c.comms_liaison.who === 'same' ? { who: 'same' } : personOut(c.comms_liaison, about, ['me', 'other']),
    profile: { website_url: clean(c.profile.website_url, LIMIT.url), brand_rules: ['yes', 'no', 'unsure'].includes(c.profile.brand_rules) ? c.profile.brand_rules : '' }
  };
  const sc = c.social_contact;
  if (['comms', 'web', 'me'].includes(sc.who)) contacts.social_contact = { who: sc.who };
  else if (sc.who === 'other') contacts.social_contact = personOut(sc, about, ['other']);
  if (approvalShown(state)) {
    const ap = c.approver;
    const apOut = {
      name: clean(ap.name, LIMIT.short), role: clean(ap.role, LIMIT.role), email: clean(ap.email, LIMIT.email),
      phone: clean(ap.phone, LIMIT.phone), ok_to_contact: ['yes', 'via'].includes(ap.ok_to_contact) ? ap.ok_to_contact : ''
    };
    if (Object.values(apOut).some(Boolean)) contacts.approver = apOut;
  }

  const started = state.started_at || (o.now || new Date()).toISOString();
  return {
    survey_version: o.surveyVersion || 'v1',
    organisation: org ? org.code : '',
    organisation_other: isOther ? orNull(clean(about.organisation_other, 300)) : null,
    country: org && org.country ? org.country : null,
    respondent_name: clean(about.respondent_name, LIMIT.short),
    respondent_role: orNull(clean(about.respondent_role, LIMIT.role)),
    respondent_email: clean(about.respondent_email, LIMIT.email),
    responding_for: ['org', 'team', 'personal'].includes(about.responding_for) ? about.responding_for : null,
    contacts,
    answers: answersOut(state),
    social: { channels: channelsOut(state) },
    comments: commentsOut(state),
    consent_data: state.consent_data === true,
    consent_contact: state.consent_contact === true,
    client_meta: {
      hp: clean(state.hp, LIMIT.hp),
      test: !!o.test,
      started_at: started,
      duration_s: Math.max(0, Math.round((state.active_ms || 0) / 1000)),
      tz: clean(o.tz || '', 64)
    }
  };
}

/* Did the respondent list anyone other than themselves? (used for the reminder to tell them) */
export function listsColleagues(state) {
  const c = state.contacts;
  return c.website_liaison.who === 'other' || c.comms_liaison.who === 'other' || c.social_contact.who === 'other' ||
    (approvalShown(state) && !!(clean(c.approver.name) || clean(c.approver.email)));
}
