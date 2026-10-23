/* SEASTRONG questionnaire: the aggregate results view (thank-you page and results.html).
   Charts are plain HTML and CSS; every number is real text. */
import { STEPS, ORGS, RESULTS_COPY } from './data.js';
import { Q, STEP_Q, TRI_VALUES, TRI_LABELS } from './model.js';
import { esc, fmtInt, fmtDateTime, plural, fetchResults, store, SUBMITTED_KEY } from './common.js';

const CONTRIB = ['WEB_PROVIDE', 'WEB_HOST', 'SOC_FREQ', 'SOC_HELP', 'SOC_CONTROL', 'SOC_APPROVAL', 'SOC_ASSETS', 'D5_REVIEW'];
const GROUPS = ['A', 'B', 'C', 'D', 'S'].map(id => ({
  id, title: STEPS.find(s => s.id === id).title,
  ids: STEP_Q[id].filter(q => !CONTRIB.includes(q))
}));
const CHECK = '<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" focusable="false"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const STAR = '<span aria-hidden="true">★</span> ';

const sum = o => Object.values(o || {}).reduce((a, b) => a + (Number(b) || 0), 0);
const pct = (n, d) => (d ? Math.round((n / d) * 100) : 0);
const tagMine = '<span class="tag tag-mine">' + CHECK + ' ' + esc(RESULTS_COPY.yourChoice) + '</span>';
const tagProp = '<span class="tag tag-prop">' + STAR + esc(RESULTS_COPY.teamProposal) + '</span>';

function heading(level, text, id, cls) {
  const l = Math.min(6, Math.max(1, level));
  return '<h' + l + (id ? ' id="' + id + '"' : '') + (cls ? ' class="' + cls + '"' : '') + '>' + text + '</h' + l + '>';
}

function noAnswers() { return '<p class="r-none">No answers to this question yet.</p>'; }

function choiceBlock(q, data, mine) {
  const counts = (data.choice_counts || {})[q.id] || {};
  const total = data.responses || 0;
  const multi = q.type === 'multi';
  const answered = sum(counts);
  if (!answered) return noAnswers();
  const denom = multi ? total : answered;
  const meta = multi
    ? 'Percent of all ' + plural(total, 'response', 'responses') + '. People could choose more than one.'
    : plural(answered, 'person', 'people') + ' answered.';
  const rows = q.options.map(o => {
    const n = counts[o.id] || 0;
    const p = pct(n, denom);
    const isRec = multi ? o.rec === true : q.rec === o.id;
    const isMine = multi ? Array.isArray(mine) && mine.includes(o.id) : mine === o.id;
    return '<li class="rb' + (isMine ? ' is-mine' : '') + '">' +
      '<div class="rb-head"><span class="rb-label">' + esc(o.label) + (isMine || isRec ? ' <span class="rb-tags">' + (isMine ? tagMine : '') + (isRec ? tagProp : '') + '</span>' : '') + '</span>' +
      '<span class="rb-val"><strong>' + fmtInt(n) + '</strong> <span class="rb-pct">' + p + '%</span></span></div>' +
      '<div class="rb-track" aria-hidden="true"><span style="width:' + p + '%"></span></div></li>';
  }).join('');
  return '<p class="r-meta">' + meta + '</p><ul class="rb-list" role="list">' + rows + '</ul>';
}

function rankBlock(q, data, mine) {
  const r = (data.rankings || {})[q.id] || {};
  const items = q.items.filter(it => r[it.id] && r[it.id].n);
  if (!items.length) return noAnswers();
  const max = q.items.length;
  items.sort((a, b) => (r[a.id].avg - r[b.id].avg) || (q.rec.indexOf(a.id) - q.rec.indexOf(b.id)));
  const n = Math.max.apply(null, items.map(it => r[it.id].n));
  const rows = items.map((it, i) => {
    const avg = Number(r[it.id].avg);
    const w = Math.max(4, Math.round(((max - avg) / (max - 1)) * 100));
    const recPos = q.rec.indexOf(it.id) + 1;
    const myPos = mine && typeof mine === 'object' ? mine[it.id] : null;
    return '<li class="rb rk' + (myPos ? ' is-mine' : '') + '">' +
      '<div class="rb-head"><span class="rb-label"><span class="rk-pos">' + (i + 1) + '.</span> ' + esc(it.label) + '</span>' +
      '<span class="rb-val">average position <strong>' + avg.toFixed(1) + '</strong></span></div>' +
      '<div class="rb-track" aria-hidden="true"><span style="width:' + w + '%"></span></div>' +
      '<p class="rk-sub"><span class="sub-prop">' + STAR + 'Team proposal: position ' + recPos + '</span>' + (myPos ? '<span class="sub-mine">' + CHECK + ' Your order: position ' + myPos + '</span>' : '') + '</p></li>';
  }).join('');
  return '<p class="r-meta">' + plural(n, 'person', 'people') + ' ranked this list. Lower average positions are higher priorities.</p><ol class="rb-list rk-list" role="list">' + rows + '</ol>';
}

function triLegend() {
  return '<ul class="tri-legend" role="list" aria-label="Key">' + TRI_VALUES.map(v =>
    '<li><span class="sw rs-' + v + '" aria-hidden="true"></span>' + TRI_LABELS[v] + '</li>').join('') + '</ul>';
}

function triBlock(q, data, mine) {
  const m = (data.matrices || {})[q.id] || {};
  const rated = q.items.filter(it => sum(m[it.id]));
  if (!rated.length) return noAnswers();
  const rows = q.items.map(it => {
    const c = m[it.id] || {};
    const n = sum(c);
    const my = mine && typeof mine === 'object' ? mine[it.id] : null;
    if (!n) {
      return '<li class="rt"><div class="rt-head"><span class="rt-label">' + esc(it.label) + '</span><span class="rt-lead">No ratings yet</span></div></li>';
    }
    let lead = TRI_VALUES[0];
    TRI_VALUES.forEach(v => { if ((c[v] || 0) > (c[lead] || 0)) lead = v; });
    const ties = TRI_VALUES.filter(v => (c[v] || 0) === (c[lead] || 0));
    const leadText = ties.length > 1
      ? 'Tied: ' + ties.map(v => TRI_LABELS[v]).join(' and ') + ' (' + fmtInt(c[lead]) + ' each)'
      : 'Most said <strong>' + TRI_LABELS[lead] + '</strong> (' + fmtInt(c[lead]) + ' of ' + fmtInt(n) + ')';
    const segs = TRI_VALUES.filter(v => c[v]).map(v =>
      '<span class="rs-' + v + '" style="width:' + ((c[v] / n) * 100).toFixed(2) + '%" title="' + TRI_LABELS[v] + ': ' + fmtInt(c[v]) + '"></span>').join('');
    const counts = TRI_VALUES.map(v => TRI_LABELS[v] + ' ' + fmtInt(c[v] || 0)).join(' · ');
    return '<li class="rt' + (my ? ' is-mine' : '') + '">' +
      '<div class="rt-head"><span class="rt-label">' + esc(it.label) + '</span><span class="rt-lead">' + leadText + '</span></div>' +
      '<div class="rt-stack" aria-hidden="true">' + segs + '</div>' +
      '<p class="rt-counts"><span>' + counts + '</span><span class="sub-prop">' + STAR + 'Team proposal: ' + TRI_LABELS[it.rec] + '</span>' +
      (my ? '<span class="sub-mine">' + CHECK + ' Your rating: ' + TRI_LABELS[my] + '</span>' : '') + '</p></li>';
  }).join('');
  return triLegend() + '<ul class="rt-list" role="list">' + rows + '</ul>';
}

function questionBlock(id, data, mine, level) {
  const q = Q[id];
  if (!q) return '';
  const my = mine ? mine[id] : null;
  let body = '';
  if (q.type === 'single' || q.type === 'multi') body = choiceBlock(q, data, my);
  else if (q.type === 'rank') body = rankBlock(q, data, my);
  else if (q.type === 'tri') body = triBlock(q, data, my);
  return '<section class="r-q" aria-labelledby="rq-' + id + '">' + heading(level, esc(q.title), 'rq-' + id, 'r-q-title') + body + '</section>';
}

function reachBlock(data, level) {
  const reach = data.social_reach || {};
  const platforms = Object.keys(reach).filter(p => reach[p] && (reach[p].followers || reach[p].organisations));
  const total = data.social_total_followers || 0;
  let body;
  if (!platforms.length) {
    body = '<p class="r-none">No follower numbers have been reported yet.</p>';
  } else {
    platforms.sort((a, b) => (reach[b].followers - reach[a].followers) || a.localeCompare(b));
    const max = Math.max.apply(null, platforms.map(p => reach[p].followers || 0)) || 1;
    body = '<p class="reach-total"><strong>' + fmtInt(total) + '</strong> followers across ' + plural(data.social_organisations || 0, 'organization', 'organizations') + '</p>' +
      '<ul class="rb-list" role="list">' + platforms.map(p => {
        const f = reach[p].followers || 0;
        return '<li class="rb"><div class="rb-head"><span class="rb-label">' + esc(p) + ' <span class="rb-sub">' + plural(reach[p].organisations || 0, 'organization', 'organizations') + '</span></span>' +
          '<span class="rb-val"><strong>' + fmtInt(f) + '</strong> <span class="rb-pct">followers</span></span></div>' +
          '<div class="rb-track rb-track-reach" aria-hidden="true"><span style="width:' + Math.max(f ? 2 : 0, Math.round((f / max) * 100)) + '%"></span></div></li>';
      }).join('') + '</ul>';
  }
  return '<section class="r-reach" aria-labelledby="r-reach-h">' + heading(level, esc(RESULTS_COPY.reachTitle), 'r-reach-h') + body +
    '<p class="r-note">' + esc(RESULTS_COPY.reachNote) + '</p></section>';
}

function orgList(data) {
  const codes = (data.organisations || []).filter(c => c && c !== 'Other');
  const names = ORGS.filter(o => codes.includes(o.code)).map(o => o.name);
  codes.forEach(c => { if (!ORGS.some(o => o.code === c)) names.push(c); });
  const others = data.other_organisations || 0;
  if (!names.length && !others) return '';
  let txt = names.join(', ');
  if (others) txt += (names.length ? ', and ' : '') + plural(others, 'other organization', 'other organizations');
  return '<p class="r-orgs"><span class="r-orgs-label">Responses so far from:</span> ' + esc(txt) + '.</p>';
}

/* level = heading level of the results title (1 on results.html, 2 on the thank-you view). */
export function renderResults(data, opts) {
  const o = opts || {};
  const level = o.level || 2;
  const mine = o.mine || null;
  const responses = data.responses || 0;
  const orgCount = (data.organisations || []).filter(c => c !== 'Other').length + (data.other_organisations || 0);
  let html = '<div class="results">' + heading(level, esc(RESULTS_COPY.title), 'results-h', 'results-title' + (level === 1 ? ' focus-target' : ''));
  if (level === 1) html = html.replace('id="results-h"', 'id="results-h" tabindex="-1"');
  if (!responses) {
    return html + '<p class="r-empty">' + esc(RESULTS_COPY.empty) + '</p></div>';
  }
  html += '<div class="r-summary">' +
    '<p class="r-count"><strong>' + plural(responses, 'response', 'responses') + '</strong> from <strong>' + plural(orgCount, 'organization', 'organizations') + '</strong></p>' +
    orgList(data) +
    (data.generated_at ? '<p class="r-updated">Updated ' + esc(fmtDateTime(data.generated_at)) + '</p>' : '') +
    '<p class="r-caveat">' + esc(RESULTS_COPY.caveat) + '</p>' +
    (mine ? '<p class="r-key">' + tagMine + ' marks your own answers. ' + tagProp + ' marks what the team proposed.</p>' : '<p class="r-key">' + tagProp + ' marks what the team proposed.</p>') +
    '</div>';
  const groups = GROUPS.concat([{ id: 'contrib', title: 'How partners can contribute', ids: CONTRIB }]);
  html += '<nav class="r-jump" aria-label="Results sections"><span class="r-jump-label">Jump to:</span> <ul role="list">' +
    '<li><a href="#r-reach-h" data-jump>Combined reach</a></li>' +
    groups.map(g => '<li><a href="#r-' + g.id + '" data-jump>' + esc(g.title) + '</a></li>').join('') + '</ul></nav>';
  html += reachBlock(data, level + 1);
  groups.forEach(g => {
    html += '<section class="r-group" aria-labelledby="r-' + g.id + '">' + heading(level + 1, esc(g.title), 'r-' + g.id, 'r-group-title') +
      g.ids.map(id => questionBlock(id, data, mine, level + 2)).join('') + '</section>';
  });
  return html + '</div>';
}

export function myAnswers() {
  const s = store.getJSON(SUBMITTED_KEY);
  return s && s.answers && typeof s.answers === 'object' ? s.answers : null;
}

/* Loads the results into el, with loading, empty and error states. */
export async function loadResults(el, opts) {
  const o = Object.assign({ level: 2 }, opts || {});
  el.setAttribute('aria-busy', 'true');
  el.innerHTML = '<p class="r-loading">Loading the latest results…</p>';
  try {
    const data = await fetchResults();
    el.innerHTML = renderResults(data || {}, { level: o.level, mine: myAnswers() });
  } catch (e) {
    el.innerHTML = heading(o.level, esc(RESULTS_COPY.title), 'results-h', 'results-title') +
      '<div class="r-error" role="alert"><p>' + esc(RESULTS_COPY.error) + '</p>' +
      '<button type="button" class="btn btn-secondary" data-results-retry>Try again</button></div>';
    const b = el.querySelector('[data-results-retry]');
    if (b) b.addEventListener('click', () => loadResults(el, o));
  }
  el.removeAttribute('aria-busy');
  el.querySelectorAll('a[data-jump]').forEach(a => a.addEventListener('click', e => {
    const t = el.querySelector(a.getAttribute('href'));
    if (!t) return;
    e.preventDefault();
    t.setAttribute('tabindex', '-1');
    t.scrollIntoView({ block: 'start' });
    t.focus({ preventScroll: true });
  }));
}

