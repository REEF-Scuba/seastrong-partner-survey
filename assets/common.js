/* Shared helpers for every page: settings, modes, storage, network calls and page chrome. */

const DEFAULTS = {
  supabaseUrl: '', supabaseKey: '', supabaseLegacyAnonKey: '', surveyVersion: 'v1',
  contactName: '', contactRole: '', contactEmail: '', deadline: '', preview: false
};
export const CONFIG = Object.assign({}, DEFAULTS, window.SURVEY_CONFIG || {});

const params = new URLSearchParams(location.search);
export const MODE = {
  mock: params.get('mock') === '1',
  test: params.get('test') === '1'
};

/* Mock mode keeps its own draft so trying the questionnaire never mixes with a real response. */
export const STORAGE_KEY = 'seastrong-survey-v1' + (MODE.mock ? '-mock' : '');
export const SUBMITTED_KEY = STORAGE_KEY + '-submitted';
export const MOTION_KEY = 'seastrong-survey-motion';

export const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------- storage that never throws ---------- */
const memory = {};
let storageOk = false;
try {
  const k = '__ss_probe__';
  window.localStorage.setItem(k, '1');
  window.localStorage.removeItem(k);
  storageOk = true;
} catch (e) { storageOk = false; }

export const store = {
  get available() { return storageOk; },
  get(key) {
    try { return storageOk ? window.localStorage.getItem(key) : (key in memory ? memory[key] : null); } catch (e) { return key in memory ? memory[key] : null; }
  },
  set(key, value) {
    memory[key] = value;
    if (!storageOk) return false;
    try { window.localStorage.setItem(key, value); return true; } catch (e) { return false; }
  },
  remove(key) {
    delete memory[key];
    try { if (storageOk) window.localStorage.removeItem(key); } catch (e) { /* ignore */ }
  },
  getJSON(key) {
    const raw = this.get(key);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (e) { return null; }
  }
};

/* Keep ?mock=1 and ?test=1 on links between the questionnaire, results and privacy pages. */
export function withModes(href) {
  const keep = new URLSearchParams();
  if (MODE.mock) keep.set('mock', '1');
  if (MODE.test) keep.set('test', '1');
  const q = keep.toString();
  if (!q) return href;
  const [path, hash] = href.split('#');
  return path + (path.includes('?') ? '&' : '?') + q + (hash !== undefined ? '#' + hash : '');
}

/* ---------- formatting ---------- */
const nf = new Intl.NumberFormat('en-US');
export const fmtInt = n => nf.format(Math.round(Number(n) || 0));
export function fmtDateTime(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return '';
  try {
    return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }).format(d);
  } catch (e) { return d.toLocaleString('en-US'); }
}
export const plural = (n, one, many) => fmtInt(n) + ' ' + (Number(n) === 1 ? one : many);

/* ---------- network ---------- */
const wait = ms => new Promise(r => setTimeout(r, ms));

async function post(path, body, key, bearer) {
  const ctrl = 'AbortController' in window ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), 25000) : null;
  const headers = { 'apikey': key, 'Content-Type': 'application/json' };
  if (bearer) headers['Authorization'] = 'Bearer ' + bearer;
  if (path.indexOf('/rpc/') < 0) headers['Prefer'] = 'return=minimal';
  try {
    return await fetch(CONFIG.supabaseUrl.replace(/\/$/, '') + path, {
      method: 'POST', headers, body: JSON.stringify(body), signal: ctrl ? ctrl.signal : undefined,
      credentials: 'omit', cache: 'no-store', referrerPolicy: 'strict-origin-when-cross-origin'
    });
  } finally { if (timer) clearTimeout(timer); }
}

async function postWithFallback(path, body) {
  let res = await post(path, body, CONFIG.supabaseKey);
  if (res.status === 401 && CONFIG.supabaseLegacyAnonKey) {
    res = await post(path, body, CONFIG.supabaseLegacyAnonKey, CONFIG.supabaseLegacyAnonKey);
  }
  return res;
}

/* Resolves to { ok, status, message }. Never throws. */
export async function submitResponse(payload) {
  if (MODE.mock) { await wait(600); return { ok: true, status: 201, message: 'mock' }; }
  try {
    const res = await postWithFallback('/rest/v1/survey_responses', payload);
    let message = '';
    if (!res.ok) { try { message = (await res.text()).slice(0, 500); } catch (e) { /* ignore */ } }
    return { ok: res.status === 201 || res.status === 200 || res.status === 204, status: res.status, message };
  } catch (e) {
    return { ok: false, status: 0, message: String(e && e.name || e) };
  }
}

/* Resolves to the aggregate results object, or throws. */
export async function fetchResults() {
  if (MODE.mock) {
    const res = await fetch('assets/mock-results.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('mock results ' + res.status);
    return res.json();
  }
  const res = await postWithFallback('/rest/v1/rpc/survey_results', {});
  if (!res.ok) throw new Error('results ' + res.status);
  return res.json();
}

/* ---------- page chrome shared by every page ---------- */
export function initChrome() {
  const root = document.documentElement;
  // settings-driven text, such as the contact email in the footer
  document.querySelectorAll('[data-config]').forEach(el => {
    const v = CONFIG[el.dataset.config];
    if (v) el.textContent = v;
  });
  document.querySelectorAll('[data-config-mailto]').forEach(el => {
    if (CONFIG.contactEmail) el.setAttribute('href', 'mailto:' + CONFIG.contactEmail);
  });
  // keep test or mock mode on internal links
  document.querySelectorAll('a[data-keep-modes]').forEach(a => a.setAttribute('href', withModes(a.getAttribute('href'))));

  if (CONFIG.preview) {
    const rib = document.createElement('aside');
    rib.className = 'ribbon';
    rib.setAttribute('aria-label', 'Preview notice');
    rib.innerHTML = '<p>Preview for review by the SEASTRONG team. Please don’t forward this link yet.</p>';
    document.body.prepend(rib);
  }
  if (MODE.test || MODE.mock) {
    const bar = document.createElement('aside');
    bar.className = 'modebar';
    bar.setAttribute('aria-label', 'Mode');
    bar.innerHTML = '<p>' + (MODE.test ? '<span class="badge badge-test">Test mode</span> ' : '') +
      (MODE.mock ? '<span class="badge badge-mock">Mock mode: nothing is sent</span>' : '') + '</p>';
    document.body.prepend(bar);
  }

  // site-wide "Pause animations" toggle (the hero listens for html.ss-motion-off)
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const saved = store.get(MOTION_KEY);
  const off = saved === 'off' || (saved !== 'on' && reduce);
  root.classList.toggle('ss-motion-off', off);
  root.classList.toggle('ss-motion-on', !off && saved === 'on');
  if (!off && saved === 'on' && reduce) setTimeout(() => { if (window.SSHero) window.SSHero.play(); }, 0);
  document.querySelectorAll('[data-motion-toggle]').forEach(btn => {
    btn.setAttribute('aria-pressed', String(off));
    btn.addEventListener('click', () => {
      const nowOff = !root.classList.contains('ss-motion-off');
      root.classList.toggle('ss-motion-off', nowOff);
      root.classList.toggle('ss-motion-on', !nowOff);
      document.querySelectorAll('[data-motion-toggle]').forEach(b => b.setAttribute('aria-pressed', String(nowOff)));
      store.set(MOTION_KEY, nowOff ? 'off' : 'on');
      // run after the hero has reacted to the class change, so an explicit choice wins
      setTimeout(() => { if (window.SSHero) { if (nowOff) window.SSHero.pause(); else window.SSHero.play(); } }, 0);
    });
  });
}

export function download(name, text, type) {
  const blob = new Blob([text], { type: (type || 'application/json') + ';charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.rel = 'noopener';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
