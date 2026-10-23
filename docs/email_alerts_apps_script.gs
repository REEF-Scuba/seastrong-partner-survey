/**
 * SEASTRONG partner questionnaire: email alert for every new response.
 *
 * How it works: when a response is saved, the Supabase database (project "SeaStrong")
 * sends a small JSON message to this web app. The script checks the shared token and
 * emails the Google account that owns this script, with a running tally.
 * Test responses (made with ?test=1) are marked [TEST] and left out of the tally.
 *
 * To add more recipients, put their addresses in EXTRA_RECIPIENTS, comma-separated.
 * To try it, select testEmail in the toolbar and click Run.
 */
const SHARED_TOKEN = '__SHARED_TOKEN__';
const EXTRA_RECIPIENTS = '';
const RESULTS_URL = 'https://reef-scuba.github.io/seastrong-partner-survey/results.html';
const TABLE_URL = 'https://supabase.com/dashboard/project/kljyffmicdvdnxgtrmbb/editor';

const ORG_NAMES = {
  UBRE: 'University of Bremen', ZMT: 'Leibniz Centre for Tropical Marine Research (ZMT)',
  UNIVE: 'Ca’ Foscari University of Venice', EPHE: 'École Pratique des Hautes Études (EPHE)',
  ENU: 'Edinburgh Napier University', IHE: 'IHE Delft Institute for Water Education',
  ULANC: 'Lancaster University', SZN: 'Stazione Zoologica Anton Dohrn', UAL: 'University of Almería',
  HRHP: 'Healthy Reefs for Healthy People', TIDE: 'Toledo Institute for Development and Environment (TIDE)',
  TAL: 'Talanoa Consulting Fiji', USP: 'The University of the South Pacific',
  SIF: 'Seychelles Islands Foundation', SPGA: 'Seychelles Parks and Gardens Authority',
  UA: 'Université des Antilles'
};
const FOR_LABELS = { org: 'the whole organization', team: 'a team or lab', personal: 'themselves' };

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    if (!data || data.token !== SHARED_TOKEN) return reply_({ ok: false });
    sendAlert_(data.response || {}, data.tally || {});
    return reply_({ ok: true });
  } catch (err) {
    return reply_({ ok: false, error: String(err) });
  }
}

function sendAlert_(r, t) {
  const owner = Session.getEffectiveUser().getEmail();
  const to = [owner].concat(EXTRA_RECIPIENTS ? EXTRA_RECIPIENTS.split(',') : []).map(s => s.trim()).filter(Boolean).join(',');
  const org = r.org === 'Other' ? (r.org_other || 'Other organization') : (ORG_NAMES[r.org] || r.org || 'Unknown');
  const mins = r.duration_s ? Math.round(Number(r.duration_s) / 60) : null;
  const n = t.responses || 0;
  const subject = (r.test ? '[TEST] ' : '') + 'SEASTRONG questionnaire: new response from ' + org +
    ' (' + n + ' ' + (n === 1 ? 'response' : 'responses') + ' so far)';

  const byOrg = Object.keys(t.by_org || {}).map(k => ({ name: ORG_NAMES[k] || k, n: t.by_org[k] }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const missing = (t.missing || []).map(k => ORG_NAMES[k] || k);

  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const row = (k, v) => '<tr><td style="padding:4px 12px 4px 0;color:#5d7380;vertical-align:top">' + k + '</td><td style="padding:4px 0">' + v + '</td></tr>';

  const html =
    '<div style="font-family:Arial,Helvetica,sans-serif;color:#0b2a3c;font-size:14px;line-height:1.5;max-width:600px">' +
    (r.test ? '<p style="background:#fff4d6;padding:8px 12px;border-radius:6px"><b>Test response.</b> Not counted in the tally or the public results.</p>' : '') +
    '<h2 style="margin:0 0 8px;font-size:20px">New response: ' + esc(org) + '</h2>' +
    '<table style="border-collapse:collapse;font-size:14px">' +
      row('From', esc(r.name) + (r.role ? ', ' + esc(r.role) : '')) +
      row('Speaking for', esc(FOR_LABELS[r.responding_for] || 'not stated')) +
      row('Answered', esc(r.answered) + ' questions' + (r.channels ? ', ' + esc(r.channels) + ' social channel' + (r.channels == 1 ? '' : 's') + ' listed' : '')) +
      row('Time taken', mins != null ? mins + ' minutes' : 'not recorded') +
      row('May we contact them?', r.consent_contact ? 'Yes' : 'No') +
    '</table>' +
    '<h3 style="margin:18px 0 6px;font-size:16px">Tally so far</h3>' +
    '<p style="margin:0 0 6px"><b>' + n + '</b> ' + (n === 1 ? 'response' : 'responses') + ' from <b>' + (t.partners_responded || 0) +
      ' of ' + (t.partners_total || 15) + '</b> partner organizations' + (t.other_responses ? ', plus ' + t.other_responses + ' from other organizations' : '') + '.</p>' +
    (byOrg.length ? '<p style="margin:0 0 6px"><b>Responded:</b> ' + byOrg.map(o => esc(o.name) + (o.n > 1 ? ' (' + o.n + ')' : '')).join('; ') + '</p>' : '') +
    (missing.length ? '<p style="margin:0 0 6px"><b>Still to respond:</b> ' + missing.map(esc).join('; ') + '</p>' : '<p style="margin:0 0 6px"><b>All 15 partners have responded.</b></p>') +
    '<p style="margin:16px 0 0"><a href="' + RESULTS_URL + '">Results page</a> &nbsp;·&nbsp; <a href="' + TABLE_URL + '">Full answers in Supabase</a> (table survey_responses; contacts in the survey_contacts view)</p>' +
    '<p style="margin:16px 0 0;color:#5d7380;font-size:12px">Sent automatically by the SEASTRONG questionnaire. Contains personal data: please do not forward outside the project team.</p>' +
    '</div>';

  const plain = [
    (r.test ? 'TEST RESPONSE (not counted).\n' : '') + 'New response: ' + org,
    'From: ' + (r.name || '') + (r.role ? ', ' + r.role : ''),
    'Answered: ' + (r.answered || 0) + ' questions' + (mins != null ? '; time taken ' + mins + ' minutes' : ''),
    '',
    'Tally: ' + n + ' responses from ' + (t.partners_responded || 0) + ' of ' + (t.partners_total || 15) + ' partner organizations.',
    missing.length ? 'Still to respond: ' + missing.join('; ') : 'All 15 partners have responded.',
    '',
    'Results: ' + RESULTS_URL,
    'Full answers: ' + TABLE_URL
  ].join('\n');

  MailApp.sendEmail({ to: to, subject: subject, body: plain, htmlBody: html, name: 'SEASTRONG questionnaire' });
}

function reply_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** Sends a sample alert to you, so you can see what it looks like. */
function testEmail() {
  sendAlert_(
    { org: 'TIDE', name: 'Sample Person', role: 'Communications officer', responding_for: 'org', test: true,
      duration_s: 1500, answered: 34, channels: 3, consent_contact: true },
    { responses: 3, partners_responded: 3, partners_total: 15, other_responses: 0,
      by_org: { UBRE: 1, TIDE: 1, HRHP: 1 },
      missing: ['ZMT', 'UNIVE', 'EPHE', 'ENU', 'IHE', 'ULANC', 'SZN', 'UAL', 'TAL', 'USP', 'SIF', 'SPGA'] }
  );
}
