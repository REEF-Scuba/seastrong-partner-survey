# SEASTRONG partner questionnaire

A short website that asks SEASTRONG's partner organizations how the project's website and social media should work, collects the contacts we need, and then shows everyone the combined results (totals only).

- Live address: https://reef-scuba.github.io/seastrong-partner-survey/
- Results only: https://reef-scuba.github.io/seastrong-partner-survey/results.html
- Privacy notice: https://reef-scuba.github.io/seastrong-partner-survey/privacy.html

It is a static site (HTML, CSS and plain JavaScript modules, no build step). Responses are saved to a Supabase database in the EU (Frankfurt). There are no cookies, no analytics and no third-party requests apart from Supabase. All fonts are self-hosted.

## Before sending the link to partners

1. In `assets/config.js`, set `preview: false` (this removes the "Preview for review" ribbon).
2. Set `deadline` if you want one, for example `deadline: '14 November 2026'`. It appears on the welcome page as "Please respond by 14 November 2026."
3. Check `contactName`, `contactRole` and `contactEmail`. They appear in the footer and the privacy notice.
4. Replace the drawn EU emblem in the footer of each page (`index.html`, `results.html`, `privacy.html`, `404.html`) with the official file from the EU download center. Each spot is marked with an HTML comment.
5. Make one test submission with `?test=1` added to the address (see below) and check it arrives in Supabase.

## Settings (`assets/config.js`)

| Setting | What it does |
| --- | --- |
| `supabaseUrl` | The Supabase project address. |
| `supabaseKey` | The publishable key. It is public by design: the database only accepts new responses (with consent) and shares totals through `survey_results()`. |
| `supabaseLegacyAnonKey` | Used once, automatically, if the publishable key is ever refused (HTTP 401). |
| `surveyVersion` | Stored with every response (`v1`). Change it only for a new edition of the questionnaire. |
| `contactName`, `contactRole`, `contactEmail` | Who partners can contact. |
| `deadline` | Optional text shown on the welcome page. Leave `''` for none. |
| `preview` | `true` shows the team-review ribbon. Set to `false` for partners. |

If you ever move the database to a different Supabase project, the pages' Content Security Policy already allows any `https://*.supabase.co` address. A different host would need the `connect-src` part of the `Content-Security-Policy` meta tag updated in each HTML page.

## Testing without affecting the results

- `index.html?mock=1` sends nothing anywhere. Submitting waits 0.6 seconds and the results come from `assets/mock-results.json` (nine invented responses). Mock mode keeps its own draft in the browser, separate from a real one.
- `index.html?test=1` really submits, but the row is marked `client_meta.test = true`. Test rows never appear in the public results. A small "Test mode" badge shows at the top.
- Both can be combined: `index.html?mock=1&test=1`.

## Viewing responses in Supabase

Open the Supabase dashboard for the project, then:

- **Table Editor, `survey_responses`**: one row per submission, with the organization, the respondent, `answers` (choices only), `comments` (all free text), `contacts` and `social` (channels and follower numbers).
- **Table Editor, `survey_contacts`**: a view with just the contact details (website liaison, communications liaison, social media contact, approver) and whether people agreed to be contacted.
- The public results page calls the function `survey_results()`, which returns totals only and skips test rows.

Useful queries for the SQL Editor:

```sql
-- real responses, newest first
select created_at, organisation, organisation_other, respondent_name, respondent_email, answers, comments
from survey_responses
where coalesce(client_meta->>'test', 'false') <> 'true'
order by created_at desc;

-- one row per answer, for spreadsheets
select r.created_at, r.organisation, a.key as question, a.value as answer
from survey_responses r, jsonb_each(r.answers) a
where coalesce(r.client_meta->>'test', 'false') <> 'true'
order by r.created_at, a.key;

-- all comments
select r.organisation, c.key as question, c.value #>> '{}' as comment
from survey_responses r, jsonb_each(r.comments) c
where coalesce(r.client_meta->>'test', 'false') <> 'true';

-- remove test rows (admins only, from the dashboard)
delete from survey_responses where client_meta->>'test' = 'true';
```

## Exporting a CSV

- In the Table Editor, open `survey_responses` (or `survey_contacts`) and use **Export, Export as CSV**.
- Or run any query above in the SQL Editor and use **Download CSV** on the results.

Question ids in `answers` and `comments` (A1, A2, ... S5, plus WEB_PROVIDE, WEB_HOST, SOC_FREQ, SOC_HELP, SOC_CONTROL, SOC_APPROVAL, SOC_ASSETS and D5_REVIEW) match the ids in `assets/data.js`, where the full question wording and option labels live.

## Changing the wording

All questions, options, team proposals and page copy are in `assets/data.js`. Edit the text there. Do not change any `id` after responses start arriving, because the stored answers and the results refer to them. House style: American English, no em dashes or en dashes.

## What is in this folder

| Path | Contents |
| --- | --- |
| `index.html` | The questionnaire (all steps, thank-you page and results). |
| `results.html` | The results on their own, with a link to the questionnaire. |
| `privacy.html` | The privacy notice. |
| `404.html` | Page-not-found page that links back to the questionnaire. |
| `assets/config.js` | Settings (see above). |
| `assets/data.js` | All questions and copy. |
| `assets/app.js` | The questionnaire's behavior. |
| `assets/model.js` | Saved progress, validation and the data sent to Supabase. |
| `assets/results.js` | The results charts (plain HTML and CSS). |
| `assets/common.js`, `assets/page.js` | Shared helpers and the script for the results and privacy pages. |
| `assets/previews.js` | The small visual previews and demos on the option cards. |
| `assets/styles.css` | All styles. |
| `assets/mock-results.json` | Invented results used only in mock mode. |
| `assets/fonts/` | Self-hosted fonts (SIL Open Font License, see `LICENSE.txt`). |
| `assets/img/` | Logos and icons. |
| `hero/` | The animated seascape on the welcome page (`hero/README.md` explains it). |
| `.nojekyll` | Tells GitHub Pages to serve the files as they are. |

## Publishing

The site is served by GitHub Pages from the root of the `main` branch of `REEF-Scuba/seastrong-partner-survey` (Settings, Pages, Deploy from a branch, `main`, `/ (root)`). All links are relative, so the site works at its sub-path. Changes go live a minute or two after they are pushed.
