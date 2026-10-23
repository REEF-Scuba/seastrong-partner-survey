/* SEASTRONG partner questionnaire: question content and copy (v1).
   This file is the single source of truth for all wording, ids and team proposals.
   Types:
     single  -> answers[id] = optionId (string)
     multi   -> answers[id] = [optionId, ...]
     rank    -> answers[id] = { itemId: rankNumber (1 = first) }
     tri     -> answers[id] = { itemId: 'must' | 'nice' | 'later' | 'skip' }
   rec = the team's proposal (shown as "Team proposal"); rec: null means no proposal is shown. */

export const STEPS = [
  { id: 'welcome',  title: 'Welcome' },
  { id: 'about',    title: 'About you' },
  { id: 'contacts', title: 'Your contacts' },
  { id: 'A',        title: 'Purpose and voice',  intro: 'What the website is for, who it serves first, and how it sounds.' },
  { id: 'B',        title: 'Look and feel',       intro: 'Logo, overall look, color, type and imagery.' },
  { id: 'C',        title: 'Homepage and engagement', intro: 'The first ten seconds, and what keeps people exploring.' },
  { id: 'D',        title: 'Content, community and policy', intro: 'Places, partners, community Voices, languages, policy tools and how often we publish.' },
  { id: 'S',        title: 'Social media',        intro: 'Which channels SEASTRONG runs, how we post together, and how your organization’s channels work.' },
  { id: 'finish',   title: 'Finish' }
];

export const ORGS = [
  // code, display name, country. Order follows the proposal's list of participants.
  { code: 'UBRE',  name: 'University of Bremen', country: 'Germany' },
  { code: 'ZMT',   name: 'Leibniz Centre for Tropical Marine Research (ZMT)', country: 'Germany' },
  { code: 'UNIVE', name: 'Ca’ Foscari University of Venice', country: 'Italy' },
  { code: 'EPHE',  name: 'École Pratique des Hautes Études (EPHE)', country: 'France' },
  { code: 'ENU',   name: 'Edinburgh Napier University', country: 'United Kingdom' },
  { code: 'IHE',   name: 'IHE Delft Institute for Water Education', country: 'Netherlands' },
  { code: 'ULANC', name: 'Lancaster University', country: 'United Kingdom' },
  { code: 'SZN',   name: 'Stazione Zoologica Anton Dohrn', country: 'Italy' },
  { code: 'UAL',   name: 'University of Almería', country: 'Spain' },
  { code: 'HRHP',  name: 'Healthy Reefs for Healthy People', country: 'Belize' },
  { code: 'TIDE',  name: 'Toledo Institute for Development and Environment (TIDE)', country: 'Belize' },
  { code: 'TAL',   name: 'Talanoa Consulting Fiji', country: 'Fiji' },
  { code: 'USP',   name: 'The University of the South Pacific', country: 'Fiji' },
  { code: 'SIF',   name: 'Seychelles Islands Foundation', country: 'Seychelles' },
  { code: 'SPGA',  name: 'Seychelles Parks and Gardens Authority', country: 'Seychelles' },
  // shown under a separate optgroup label "Prospective partner"
  { code: 'UA',    name: 'Université des Antilles', country: 'Guadeloupe (France)', group: 'prospective' },
  { code: 'Other', name: 'Other organization (please name it)', country: '' , group: 'other' }
];

export const WELCOME = {
  kicker: 'SEASTRONG · Horizon Europe',
  title: 'Help shape the SEASTRONG website and social media',
  lead: 'SEASTRONG’s website and social media channels launch in early 2027. They need to work for every partner and every place we work, so we’d like your organization’s view before we build them.',
  bullets: [
    'What the website is for, how it looks and what it contains',
    'Which social media channels SEASTRONG runs, and how we post together',
    'Who on your team we should work with on the website and on communications'
  ],
  practical: [
    'About 20 to 30 minutes. Only a few questions are required; skip anything you don’t have a view on.',
    'Your progress is saved in this browser, so you can stop and come back on the same device.',
    'When you finish, you’ll see how partners have voted so far. Results show totals only, never names or contact details.'
  ],
  who: 'Ideally one response per partner organization, agreed with colleagues where you can. If more than one person from your organization would like a say, that’s welcome too.',
  proposals: 'Most questions show a team proposal, based on our review of more than 35 project websites and the research on science communication and science-policy work. Nothing is decided yet. Choose what you think works best, and use the comment boxes freely.',
  start: 'Start',
  resume: 'Continue where you left off',
  startOver: 'Start over'
};

export const ABOUT = {
  title: 'About you',
  intro: 'So we know whose views these are and who to follow up with.',
  fields: {
    organisation: { label: 'Your organization', required: true },
    organisation_other: { label: 'Organization name', required: 'if Other' },
    respondent_name: { label: 'Your name', required: true, autocomplete: 'name' },
    respondent_role: { label: 'Your role or position', hint: 'For example: researcher, communications officer, program director' },
    respondent_email: { label: 'Your work email', required: true, autocomplete: 'email', type: 'email' },
    responding_for: { label: 'Whose views are these?', type: 'single', options: [
      { id: 'org', label: 'My organization’s', desc: 'Agreed with colleagues' },
      { id: 'team', label: 'My team’s or lab’s' },
      { id: 'personal', label: 'My own' }
    ]}
  }
};

export const CONTACTS = {
  title: 'Your contacts',
  intro: 'We’ll build and run the website and social media together with every partner. Each organization needs a website liaison and a communications liaison. They can be the same person.',
  roles: {
    website_liaison: {
      label: 'Website liaison',
      desc: 'Checks your partner profile, sends photos and updates, and reviews pages about your work or your place before they go live. Roughly an hour a month, more around launch.',
      who: [ { id: 'me', label: 'Me' }, { id: 'other', label: 'Someone else' } ]
    },
    comms_liaison: {
      label: 'Communications liaison',
      desc: 'Coordinates news, events and social media with us, and knows how your organization approves public content. Roughly an hour or two a month.',
      who: [ { id: 'same', label: 'Same as the website liaison' }, { id: 'me', label: 'Me' }, { id: 'other', label: 'Someone else' } ]
    }
  },
  personFields: [
    { key: 'name', label: 'Full name', required: true, autocomplete: 'name' },
    { key: 'role', label: 'Role or position' },
    { key: 'email', label: 'Work email', required: true, type: 'email' },
    { key: 'phone', label: 'Phone or WhatsApp', hint: 'Include the country code, for example +501 or +679', type: 'tel' },
    { key: 'preferred', label: 'Best way to reach them', type: 'multi', options: ['Email', 'WhatsApp', 'Phone', 'Video call (Teams, Zoom, Meet)'] },
    { key: 'timezone', label: 'Time zone', type: 'timezone', hint: 'We guessed from your device. Change it if needed.' },
    { key: 'languages', label: 'Working languages', type: 'chips', options: ['English', 'Spanish', 'French', 'German', 'Italian', 'Dutch', 'Belize Kriol', 'Garifuna', 'Q’eqchi’', 'Mopan', 'iTaukei', 'Fiji Hindi', 'Seselwa Kreol'], allowOther: true },
    { key: 'availability', label: 'Availability notes', hint: 'For example: in the field January to March; part-time; best mornings' },
    { key: 'notes', label: 'Anything else we should know?' }
  ],
  thirdPartyNote: 'Please only list colleagues who know you’re sharing their work contact details with the SEASTRONG communications team.',
  profile: {
    title: 'Your partner profile',
    WEB_PROVIDE: { id: 'WEB_PROVIDE', type: 'multi', title: 'What could your organization provide for its page on the website?', options: [
      { id: 'logo', label: 'Logo in vector format', desc: 'SVG, EPS, AI or PDF' },
      { id: 'desc', label: 'A 50 to 100 word description of your organization' },
      { id: 'people', label: 'Photos and short bios of named people', desc: 'With their consent' },
      { id: 'site', label: 'Photos or video of your sites or work', desc: 'With consent and credit' },
      { id: 'none', label: 'None of these yet' }
    ]},
    named_people: { label: 'Who should be named on your organization’s page?', hint: 'Names and roles in SEASTRONG. We will confirm with each person before publishing.', type: 'textarea', stored: 'comments.named_people' },
    website_url: { label: 'Your organization’s website', type: 'url', stored: 'contacts.profile.website_url' },
    WEB_HOST: { id: 'WEB_HOST', type: 'single', title: 'Could your organization link to SEASTRONG, or host a SEASTRONG page or news item, on your own website?', options: [
      { id: 'yes', label: 'Yes' }, { id: 'probably', label: 'Probably' }, { id: 'unlikely', label: 'Unlikely' }, { id: 'unsure', label: 'Not sure' }
    ]},
    brand_rules: { label: 'Does your organization have co-branding or logo rules we should follow?', type: 'single', options: [ { id: 'yes', label: 'Yes' }, { id: 'no', label: 'No' }, { id: 'unsure', label: 'Not sure' } ], stored: 'contacts.profile.brand_rules', followup: { label: 'Link or short summary', stored: 'comments.brand_rules_notes', showIf: 'yes' } }
  }
};

export const QUESTIONS = [
/* ---------------- A: Purpose and voice ---------------- */
{ id: 'A1', g: 'A', type: 'single', title: 'What should the website mainly be?',
  why: 'This shapes the homepage, the menu and what we build first. Most EU project websites end up as a showcase by default, without anyone deciding.',
  rec: 'hub', options: [
  { id: 'hub', label: 'Knowledge hub with a heartbeat', desc: 'A trusted shelf for every output, a front door to the people behind the work, and a living monthly story. Serves every audience.' },
  { id: 'showcase', label: 'Classic project showcase', desc: 'About, partners, news and deliverables. Familiar and quick to build, but easy to forget.' },
  { id: 'magazine', label: 'Story-led magazine', desc: 'Big stories, photo essays and people first. Strong for the public, weaker for policy and science users.' },
  { id: 'tool', label: 'Tool first, with a map as the homepage', desc: 'Like Global Mangrove Watch. Powerful once data exist (from 2028), but empty at launch.' }
]},
{ id: 'A2', g: 'A', type: 'rank', title: 'Who should the homepage serve first?',
  why: 'Every page serves several audiences, but the order decides what appears first and which path we build first. Use the arrows to reorder, most important at the top.',
  rec: ['policy', 'managers', 'communities', 'scientists', 'public', 'educators', 'ec'], items: [
  { id: 'policy', label: 'Agency staff and policymakers', desc: 'Ministries, marine planning agencies, regional bodies, EU officers' },
  { id: 'managers', label: 'Protected-area managers and practitioners', desc: 'Co-managers such as TIDE, SPGA and SIF, locally managed marine area networks, restoration groups' },
  { id: 'communities', label: 'Coastal communities and knowledge holders', desc: 'Including Garifuna, Maya, Kriol, iTaukei, Indo-Fijian and Seychellois communities' },
  { id: 'scientists', label: 'Scientists', desc: 'Methods, data, code and collaborators' },
  { id: 'public', label: 'Curious public and media', desc: 'Here for 10 seconds, maybe 10 minutes' },
  { id: 'educators', label: 'Educators and students', desc: 'Lessons, training modules and role models' },
  { id: 'ec', label: 'The European Commission and reviewers', desc: 'Evidence of delivery and compliance' }
]},
{ id: 'A3', g: 'A', type: 'single', title: 'Which voice should the website speak in?',
  why: 'Here is the same fact written four ways. Tone builds trust faster than any logo.',
  rec: 'warm', options: [
  { id: 'warm', label: 'Warm and precise', desc: 'Plain language, journalistic, honest about threats and specific about solutions.' },
  { id: 'inst', label: 'Institutional', desc: 'Formal, third person, EU register. Safe with reviewers, distant for everyone else.' },
  { id: 'urgent', label: 'Urgent and activist', desc: 'Emotive, high stakes, heavy on calls to action. Mobilizes some readers and alienates agencies.' },
  { id: 'play', label: 'Playful and curious', desc: 'Wonder-led and conversational. Great for the public, risky on policy pages.' }
]},
{ id: 'A4', g: 'A', type: 'single', title: 'Which line should sit under the name?',
  why: 'The tagline appears under the name on the homepage, social media profiles and slides. “Stronger together” is already in the project’s full title, so the tagline can do different work. Suggest your own in the comment box.',
  rec: 'one', options: [
  { id: 'one', label: 'Three ecosystems. One seascape.', desc: 'States the core idea in five words, and pairs well with “Stronger together”.' },
  { id: 'coasts', label: 'Connected coasts are stronger coasts.', desc: 'Echoes the project name; works as a campaign line.' },
  { id: 'mtr', label: 'From mangrove to reef, and back.', desc: 'Movement and exchange; good for storytelling.' },
  { id: 'title', label: 'Stronger together', desc: 'The project title itself. Simple, but many projects use it, so it is hard to find in search.' }
]},
{ id: 'A5', g: 'A', type: 'single', title: 'How should the name be written?',
  why: 'The proposal writes SEASTRONG, the EU’s CORDIS database writes SeaStrong, and a diver-watch line is called Seastrong. Some screen readers spell out all-capital words letter by letter.',
  rec: 'mixed', options: [
  { id: 'caps', label: 'SEASTRONG everywhere', desc: 'Matches the proposal and the logo. Shouty in long text, and some screen readers spell it out.' },
  { id: 'camel', label: 'SeaStrong everywhere', desc: 'Readable, matches CORDIS and is distinct from the watch. The logo lettering would change to match.' },
  { id: 'mixed', label: 'SEASTRONG in the logo, SeaStrong in text', desc: 'Keeps the existing logo while running text reads naturally. Common practice for project names.' }
]},
{ id: 'A6', g: 'A', type: 'single', title: 'Which main menu would be easiest to use?',
  why: 'Two structures have been proposed. Both would hold the same content; they differ in how visitors find it.',
  rec: null, newPreview: 'menu', options: [
  { id: 'compact', label: 'Compact: four headings', desc: 'About us · News and opportunities · Resources · Partner login, with pages grouped underneath (for example: Our research, Where we work, Partners, Events, Publications, Training materials).',
    menu: ['About us', 'News & opportunities', 'Resources', 'Partner login'] },
  { id: 'hub', label: 'Knowledge hub: eight sections', desc: 'The science · Places · People and partners · Policy and practice · Voices · Open science · Learn · Field notes.',
    menu: ['The science', 'Places', 'People', 'Policy', 'Voices', 'Open science', 'Learn', 'Field notes'] },
  { id: 'blend', label: 'A blend', desc: 'A short top menu, with the knowledge-hub sections as clear routes inside it.',
    menu: ['About', 'Science & places', 'Policy & practice', 'Resources', 'News'] }
]},

/* ---------------- B: Look and feel ---------------- */
{ id: 'B1', g: 'B', type: 'single', title: 'How should we use the SEASTRONG logo?',
  why: 'Dr. Sonia Bejarano (ZMT) drew the SEASTRONG logo by hand: a wave curling over mangrove, seagrass and coral. It has real warmth and is already in use. Hand-drawn artwork can be hard to read at very small sizes, such as browser tabs and social media profile pictures. Any change will be made together with Sonia. The last option shows a new concept for comparison.',
  rec: 'hybrid', options: [
  { id: 'keep', label: 'Use it exactly as it is', desc: 'The drawing at every size, from banners to browser tabs.' },
  { id: 'refine', label: 'Keep the drawing, add a clean wordmark', desc: 'The drawing alongside a crisp typographic SEASTRONG and a short descriptor.' },
  { id: 'hybrid', label: 'The drawing plus a simple companion mark', desc: 'The hand-drawn logo for banners, print and slides, with a simplified echo of it for icons and small sizes. Keeps the character and solves the practical problems.' },
  { id: 'identity', label: 'A new identity: the three-strand S', desc: 'A new, precise mark: three parallel strands in mangrove, seagrass and coral colors form one S, trading places along the curve the way the habitats exchange water, nutrients and young fish. It reads at every size and in a single color. The hand-drawn logo could live on in illustrations.' }
]},
{ id: 'B2', g: 'B', type: 'single', title: 'What overall look should the website have?',
  why: 'The mood that sets SEASTRONG apart from the template look of most EU project websites while staying credible. Each preview is a miniature homepage.',
  rec: 'sunlit', options: [
  { id: 'sunlit', label: 'Sunlit Shallows, with hand-drawn accents', desc: 'Light and airy, with sand and lagoon tones and an editorial serif. Pencil-style ecosystem illustrations echo the logo. Professional and warm.' },
  { id: 'deep', label: 'Deep Tide', desc: 'Dark and immersive, with glowing accents and big photography. Dramatic and memorable, but harder to keep accessible and heavier on slow connections.' },
  { id: 'notebook', label: 'Field Notebook', desc: 'Cream paper, hand-drawn lines, handwritten notes and taped-in photos. The most distinctive and closest to the logo; it needs discipline to stay professional.' },
  { id: 'atlas', label: 'Atlas', desc: 'Crisp white, a strict grid, maps at the center and a European blue. Feels like an authoritative data portal, with less emotional pull.' }
]},
{ id: 'B3', g: 'B', type: 'single', title: 'Which color palette?',
  why: 'Every option is tuned so text meets accessibility contrast standards (WCAG AA). Ecosystem colors will be used consistently on maps, tags and charts.',
  rec: 'logo', options: [
  { id: 'logo', label: 'From the logo, tuned', desc: 'The blue wave, greens and coral magenta of the hand-drawn logo, deepened for contrast, with sand and ink.' },
  { id: 'lagoon', label: 'Lagoon and coral', desc: 'Brighter, tropical and optimistic. Teal leads, with coral accents.' },
  { id: 'deep', label: 'Deep ocean', desc: 'Moody blues with a single glowing accent.' },
  { id: 'neutral', label: 'Neutral with EU blue', desc: 'Grays and white with the EU’s Reflex Blue. Institutional and safe.' }
]},
{ id: 'B4', g: 'B', type: 'single', title: 'Which typefaces?',
  why: 'Live samples are shown below. All are free, open-license fonts that we can host ourselves, which keeps data protection simple.',
  rec: 'fraunces', options: [
  { id: 'fraunces', label: 'Fraunces with Inter', desc: 'A warm, characterful serif for headlines with a highly legible sans serif for reading. Editorial and human.' },
  { id: 'atkinson', label: 'Atkinson Hyperlegible throughout', desc: 'Designed by the Braille Institute for readers with low vision. Accessibility as identity, but less distinctive.' },
  { id: 'grotesk', label: 'Space Grotesk with IBM Plex Sans', desc: 'Technical, data-forward and modern. Suits the Atlas look.' },
  { id: 'dm', label: 'DM Serif Display with DM Sans', desc: 'Classic and elegant, with high contrast. A little more formal.' }
]},
{ id: 'B5', g: 'B', type: 'single', title: 'What kind of imagery?',
  why: 'Images carry most of the emotional weight, and also the ethical risk: consent, and the clichés of the “pristine paradise” and the “helpless victim”. Every photo of an identifiable person needs written consent.',
  rec: 'mix', options: [
  { id: 'mix', label: 'Real partner photography with illustrated concepts', desc: 'Photos of real people and places (with consent and credit), and hand-drawn illustrations for processes you can’t photograph, such as nutrient flows.' },
  { id: 'illus', label: 'Illustration-led', desc: 'A commissioned hand-drawn world in the style of the logo. Very distinctive, with no consent issues, but slower to produce.' },
  { id: 'photo', label: 'Immersive underwater photography', desc: 'Full-width reef and mangrove imagery. Beautiful, but often generic, and heavy on slow connections.' },
  { id: 'data', label: 'Data graphics-led', desc: 'Maps, charts and diagrams as the main visuals. Credible, but cold for communities and the public.' }
]},
{ id: 'B6', g: 'B', type: 'single', title: 'Should the website offer dark mode?',
  why: 'Many people browse in dark mode, including many who experience migraine or find bright screens tiring. Supporting it adds roughly 10% to design time.',
  rec: 'auto', options: [
  { id: 'auto', label: 'Follow the device setting, with a switch', desc: 'Respects each visitor’s system setting, with a switch in the header.' },
  { id: 'light', label: 'Light only', desc: 'Simpler and cheaper; fine for most visitors.' }
]},

/* ---------------- C: Homepage and engagement ---------------- */
{ id: 'C1', g: 'C', type: 'single', title: 'What should visitors see first on the homepage?',
  why: 'The opening view decides whether people stay. Each preview is animated, and the scene at the top of this questionnaire is a version of the first option. Try the interactive idea in the demo box.',
  rec: 'scape', demo: 'demoToy', options: [
  { id: 'scape', label: 'Living seascape cross-section', desc: 'An animated mangrove, seagrass and reef scene. Each flow can be clicked and leads into the science. Explains the project without words.' },
  { id: 'globe', label: 'Three oceans on a slowly turning globe', desc: 'Belize, Fiji and Seychelles glow; click one to fly in. Shows the global scale but says less about connectivity.' },
  { id: 'film', label: 'Short field film (muted, captioned, with pause)', desc: 'Emotional and real, but needs strong footage, is heavy on island connections and goes stale.' },
  { id: 'toy', label: '“Connect the seascape” interactive', desc: 'Visitors switch habitats on and off and see what changes. Highly engaging, but risks overclaiming before the project’s models exist.' }
]},
{ id: 'C2', g: 'C', type: 'single', title: 'How much motion overall?',
  why: 'Movement holds attention, especially for readers whose attention drifts, but decoration can get in the way of understanding. Whatever we choose, the website will respect “reduce motion” settings and offer a pause control.',
  rec: 'lively', demo: 'demoMotion', options: [
  { id: 'calm', label: 'Calm', desc: 'Motion only in response to the reader: fades, hover effects, play buttons.' },
  { id: 'lively', label: 'Lively, with meaning', desc: 'Gentle ambient movement that shows processes (flows, swaying seagrass), plus reveals as you scroll. Always pausable.' },
  { id: 'immersive', label: 'Immersive', desc: 'Parallax, particles and scroll-driven scenes. Spectacular, but heavier, harder to make accessible and riskier for credibility.' }
]},
{ id: 'C3', g: 'C', type: 'tri', title: 'Which engagement features matter?',
  why: 'Mark each feature Must, Nice, Later or Skip. “Later” means building it in a later phase, once there is content to fill it.',
  items: [
  { id: 'depth', ic: '🎚️', label: 'Depth switch (Glance · Explain · Deep dive)', desc: 'Readers choose how deep to go on every page.', rec: 'must' },
  { id: 'doors', ic: '🚪', label: 'Audience doors on the homepage', desc: 'Four curated paths into the website.', rec: 'must' },
  { id: 'field', ic: '📍', label: '“Now in the field” strip', desc: 'Where teams are this month, and the latest field note. The site never looks dormant.', rec: 'must' },
  { id: 'scrolly', ic: '📜', label: 'One flagship scroll story a year', desc: 'For example, follow a young snapper from the mangroves to the reef.', rec: 'later' },
  { id: 'toy', ic: '🧪', label: 'Teaching model in the browser', desc: 'A simplified version of the project’s ecosystem model, for learning.', rec: 'later' },
  { id: 'quiz', ic: '❓', label: 'Two-minute quizzes with instant explanations', desc: 'No timers, no leaderboards.', rec: 'nice' },
  { id: 'gloss', ic: '📖', label: 'Pop-up definitions for technical terms', desc: 'Tap a term for a one-line definition.', rec: 'must' },
  { id: 'slider', ic: '↔️', label: 'Before and after sliders for restoration sites', desc: 'Keyboard-operable, with a side-by-side alternative.', rec: 'later' },
  { id: 'sound', ic: '🎧', label: 'Reef and mangrove soundscapes', desc: 'Only when a visitor presses play, with a description.', rec: 'nice' },
  { id: 'passport', ic: '🐟', label: '“Species passport” cards', desc: 'Cards for species that move between habitats (parrotfish, snapper, seabirds), with their journeys.', rec: 'nice' },
  { id: 'readtime', ic: '⏱️', label: 'Reading times, progress bars and short summaries', desc: 'Helps readers who skim or drift.', rec: 'must' },
  { id: 'timeline', ic: '🗓️', label: 'Interactive project timeline, 2026 to 2031', desc: 'Milestones, field seasons and results as they arrive.', rec: 'nice' },
  { id: 'counters', ic: '🔢', label: 'Animated number counters', desc: 'Common on EU sites, but often show “0” on slow connections or to screen readers.', rec: 'skip' },
  { id: 'social', ic: '📱', label: 'Embedded social media feed', desc: 'Adds tracking cookies and page weight, and goes stale.', rec: 'skip' },
  { id: 'ai', ic: '🤖', label: '“Ask the project” AI chatbot', desc: 'Novel, but risks wrong answers on a science website, and raises cost and oversight questions.', rec: 'skip' }
]},
{ id: 'C4', g: 'C', type: 'single', title: 'How should readers choose how deep to go?',
  why: 'Try the demo, then choose how layering should work across the website.',
  rec: 'switch', demo: 'demoDepth', options: [
  { id: 'switch', label: 'One depth switch for the whole site', desc: 'A single control changes every page. Distinctive and memorable, but needs disciplined writing in three layers.' },
  { id: 'expand', label: 'Expandable sections on each page', desc: '“Read more” and “Methods” panels under each summary. Familiar and easy.' },
  { id: 'pages', label: 'Separate pages for each audience', desc: 'A page for policymakers, another for scientists. Clear, but duplicates effort.' }
]},
{ id: 'C5', g: 'C', type: 'single', title: 'How should the homepage’s audience doors be worded?',
  why: 'Labels based on who you are can feel like boxes. Labels based on what you need let people choose without being categorized.',
  rec: 'need', options: [
  { id: 'need', label: 'By need', desc: 'Use the evidence · Explore the science · Hear local voices · Learn and teach' },
  { id: 'who', label: 'By identity', desc: 'I work in policy · I’m a scientist · I live on the coast · I’m curious' },
  { id: 'none', label: 'No doors: one guided scroll', desc: 'A single story-like homepage that everyone scrolls through.' }
]},

/* ---------------- D: Content, community and policy ---------------- */
{ id: 'D1', g: 'D', type: 'single', title: 'What should lead each place page?',
  why: 'There will be a page for Belize, Fiji and Seychelles (and Guadeloupe, if confirmed). Place pages are where “local first, credit loudly” becomes real, or doesn’t. Each will be co-owned by the partners in that country.',
  rec: 'people', options: [
  { id: 'people', label: 'Local partners and people first', desc: 'Opens with who is there, in their own words and languages, then the seascape and the science.' },
  { id: 'map', label: 'Map and study sites first', desc: 'Opens with the map of the study area and its sites. Scientific and clear, but can feel extractive.' },
  { id: 'story', label: 'A story first', desc: 'Opens with the latest field note or community Voice, rotated monthly.' }
]},
{ id: 'D2', g: 'D', type: 'single', title: 'How should partners be presented?',
  why: 'Our review of more than 35 project websites found that walls of logos tell visitors almost nothing. SEASTRONG has 15 partner organizations and about 25 named people.',
  rec: 'people', options: [
  { id: 'people', label: 'People first: a map with profile cards', desc: 'A map of the nine countries; faces, names, roles in SEASTRONG and one line on what each person does. Logos at equal size below.' },
  { id: 'orgs', label: 'Organization cards with roles', desc: 'One card per partner: logo, country, what it leads (in plain words) and its lead people.' },
  { id: 'logos', label: 'A grid of logos', desc: 'Fast and conventional, but the pattern our review found least informative.' }
]},
{ id: 'D3', g: 'D', type: 'tri', title: 'Which policy and practice tools should we offer?',
  why: 'Research on evidence use suggests that relationships, timing and local fit matter more than reports alone. Mark each tool Must, Nice, Later or Skip.',
  items: [
  { id: 'country', ic: '🏛️', label: 'Country policy pages', desc: 'Belize, Fiji and Seychelles, plus regional and EU: who decides what, and what SEASTRONG can offer each.', rec: 'must' },
  { id: 'cal', ic: '🗓️', label: 'A calendar of policy moments', desc: 'COPs, IUCN, the UN Ocean Conference, Our Ocean, and national planning and budget cycles, each linked to what we bring.', rec: 'must' },
  { id: 'ask', ic: '✉️', label: '“Ask SEASTRONG” evidence requests', desc: 'A form that goes to the right country lead, with a promised response time.', rec: 'must' },
  { id: 'briefs', ic: '📄', label: 'Policy briefs as web pages, in three layers, with PDF', desc: 'Three key messages, a one-page summary, the full brief, translations and a suggested citation.', rec: 'later' },
  { id: 'variants', ic: '🔀', label: 'Data-led and story-led versions of each brief', desc: 'Legislators and their staff tend to prefer different formats.', rec: 'nice' },
  { id: 'changed', ic: '📈', label: '“What changed” record', desc: 'A dated, verifiable public record of requests, invitations and uptake.', rec: 'nice' },
  { id: 'eu', ic: '🇪🇺', label: 'EU corner', desc: 'How SEASTRONG serves EU biodiversity, nature restoration and ocean policy, for Commission officers.', rec: 'must' },
  { id: 'alerts', ic: '🔔', label: 'Email alerts for new briefs, by country or topic', desc: 'Subscribe to new briefs only.', rec: 'nice' },
  { id: 'slides', ic: '🖼️', label: 'Slide packs for officials', desc: 'Editable slides officials can drop into their own briefings.', rec: 'later' }
]},
{ id: 'D4', g: 'D', type: 'single', title: 'How should community Voices be made?',
  why: 'SEASTRONG centers the knowledge of Indigenous peoples and local communities, and free, prior and informed consent (FPIC). Who holds the pen is the clearest sign of whether that commitment is real.',
  rec: 'coauthor', options: [
  { id: 'coauthor', label: 'Written by community members, paid, with a veto', desc: 'Community members write or record with support. They are paid, credited by name and can veto edits. Marked “community-reviewed”, with a Local Contexts notice.' },
  { id: 'curated', label: 'Curated by partners', desc: 'Partners such as TIDE, Talanoa, SIF and SPGA select and edit stories with their communities.' },
  { id: 'team', label: 'Interviews by the project team', desc: 'Researchers interview community members. Faster, but more extractive.' },
  { id: 'later', label: 'Not at launch: decide in year 2', desc: 'Wait until relationships and consent protocols are in place.' }
]},
{ id: 'D5', g: 'D', type: 'multi', title: 'Which languages should the website use?',
  why: 'Tick every language you would like to see eventually. Translating the whole website is costly, so the team proposes English, Spanish and French for the site’s structure and key pages, plus short community summaries (written and audio) in local languages, always reviewed by native speakers and never machine translation alone.',
  options: [
  { id: 'en', label: 'English', desc: 'All content', rec: true },
  { id: 'es', label: 'Spanish', desc: 'Belize and Mesoamerican Reef partners', rec: true },
  { id: 'fr', label: 'French', desc: 'Seychelles, Guadeloupe and French partners', rec: true },
  { id: 'kriol', label: 'Belize Kriol', desc: 'Community summaries', rec: true },
  { id: 'garifuna', label: 'Garifuna', desc: 'Audio summaries', rec: false },
  { id: 'maya', label: 'Q’eqchi’ and Mopan Maya', desc: 'Audio summaries (Toledo District)', rec: false },
  { id: 'itaukei', label: 'iTaukei (Fijian)', desc: 'Community summaries', rec: true },
  { id: 'hindi', label: 'Fiji Hindi', desc: 'Community summaries', rec: true },
  { id: 'kreol', label: 'Seselwa Kreol', desc: 'Community summaries', rec: true },
  { id: 'de', label: 'German Easy Language (Leichte Sprache) page', desc: 'Required if the University of Bremen operates the site', rec: true }
  ],
  followup: { id: 'D5_REVIEW', type: 'multi', title: 'Could your organization help review content in any of these languages?', optional: true, options: 'same as D5 minus en' }
},
{ id: 'D6', g: 'D', type: 'single', title: 'How prominent should open science be?',
  why: 'The proposal commits to publishing each study’s plan (a pre-registration) two months before it starts, plus open data, code and models. Few projects show this, and it is a strong signal of credibility for scientists and reviewers.',
  rec: 'top', options: [
  { id: 'top', label: 'A main menu item', desc: '“Results and open science”: results tracker, pre-registrations, data, code, publications and the data management plan.' },
  { id: 'inside', label: 'Inside “Results”', desc: 'One click deeper, under the results tracker.' },
  { id: 'min', label: 'Footer links only', desc: 'Links out to Zenodo and GitHub.' }
]},
{ id: 'D7', g: 'D', type: 'single', title: 'How often should we publish news, and should there be a newsletter?',
  why: 'The communication plan proposes one website update a month and one story per field trip. A newsletter is the only channel the project fully owns.',
  rec: 'monthlyq', options: [
  { id: 'monthlyq', label: 'Monthly field notes and a quarterly newsletter', desc: 'Sustainable. The newsletter brings together the best of the quarter and upcoming policy moments.' },
  { id: 'monthly', label: 'A monthly newsletter', desc: 'More presence, and more work every month.' },
  { id: 'social', label: 'No newsletter, social media only', desc: 'The least effort, but the project would own no audience.' },
  { id: 'joint', label: 'Join a shared newsletter', desc: 'For example, co-publish with partner or sister-project newsletters.' }
]},
{ id: 'F2', g: 'D', type: 'single', title: 'Which place should the first version of the website feature in depth?',
  why: 'One rich example can be more convincing than three thin ones, but every place matters.',
  rec: 'all', options: [
  { id: 'bz', label: 'Belize', desc: 'Healthy Reefs report cards, TIDE’s protected areas and the Mesoamerican Reef.' },
  { id: 'fj', label: 'Fiji', desc: 'Locally managed marine areas, iTaukei governance, USP and Talanoa.' },
  { id: 'sc', label: 'Seychelles', desc: 'Aldabra (a UNESCO World Heritage Site) and Sainte Anne Marine National Park.' },
  { id: 'all', label: 'All three at equal depth', desc: 'No place comes second, though each is slightly less detailed.' }
]},

/* ---------------- S: Social media ---------------- */
{ id: 'D8', g: 'S', type: 'tri', title: 'Which social media channels should SEASTRONG run?',
  why: 'The plan is to run only the channels we can keep active, and to reach most people through partners’ channels, where audiences already follow you. “Skip” means SEASTRONG would not run its own account there and would share through partners instead. Mark each channel Must, Nice, Later or Skip.',
  items: [
  { id: 'li', ic: 'in', label: 'LinkedIn', desc: 'Policymakers, scientists and EU officers. Proposed as the main channel.', rec: 'must' },
  { id: 'yt', ic: '▶', label: 'YouTube', desc: 'Webinar recordings and field films, shown on the website.', rec: 'must' },
  { id: 'ig', ic: '◎', label: 'Instagram', desc: 'The public, young researchers and field imagery.', rec: 'nice' },
  { id: 'bsky', ic: '🦋', label: 'Bluesky', desc: 'Where much of the marine science community has moved.', rec: 'nice' },
  { id: 'wa', ic: '💬', label: 'WhatsApp channels, one per country', desc: 'Run with country partners, depending on how people in each place actually communicate.', rec: 'later' },
  { id: 'fb', ic: 'f', label: 'Facebook', desc: 'Strong in the Caribbean and the Pacific, where partners already have reach.', rec: 'skip' },
  { id: 'x', ic: '𝕏', label: 'X (formerly Twitter)', desc: 'A shrinking science audience.', rec: 'skip' },
  { id: 'tt', ic: '♪', label: 'TikTok', desc: 'High effort; possible later, led by early-career researchers.', rec: 'skip' },
  { id: 'masto', ic: '🐘', label: 'Mastodon', desc: 'Small reach; the University of Bremen is active there.', rec: 'skip' }
]},
{ id: 'S2', g: 'S', type: 'single', title: 'How often should SEASTRONG post?',
  why: 'Regular, modest posting tends to build an audience better than bursts followed by silence.',
  rec: 'weekly', options: [
  { id: 'weekly', label: 'About once a week, plus live coverage of fieldwork and events', desc: 'Sustainable with a small team and partners sharing.' },
  { id: 'several', label: 'Two to three times a week', desc: 'More visible; needs steady content from partners and early-career researchers.' },
  { id: 'events', label: 'Only around milestones and events', desc: 'The least effort, but channels look dormant in between.' }
]},
{ id: 'S3', g: 'S', type: 'multi', max: 5, title: 'What should SEASTRONG post about? Choose up to five.',
  why: 'This tells us what to plan for, and what to ask partners for.',
  options: [
  { id: 'diaries', label: 'Field diaries from early-career researchers', rec: true },
  { id: 'spotlight', label: '“Meet the team” partner spotlights, one a month', rec: true },
  { id: 'video', label: 'Short videos from the field', rec: true },
  { id: 'papers', label: 'Plain-language summaries of new papers and data', rec: true },
  { id: 'policy', label: 'Policy moments: briefs, meetings, conferences', rec: true },
  { id: 'jobs', label: 'Jobs, PhD places and training opportunities', rec: false },
  { id: 'events', label: 'Webinars and events', rec: false },
  { id: 'voices', label: 'Community voices, co-authored and with consent', rec: false },
  { id: 'species', label: 'Species and habitat explainers', rec: false },
  { id: 'behind', label: 'Behind the scenes in the lab and the field', rec: false },
  { id: 'visuals', label: 'Maps and data visuals', rec: false }
]},
{ id: 'S4', g: 'S', type: 'multi', title: 'Which ways of posting together would work for your organization?',
  why: 'Most of SEASTRONG’s reach will come through partners. Pick every option that would work for you.',
  options: [
  { id: 'kit', label: 'Share kits', desc: 'We send ready-to-post text, images and image descriptions, and you post on your channels.' },
  { id: 'tag', label: 'Tag and reshare', desc: 'We tag you in SEASTRONG posts and you reshare when it suits you.' },
  { id: 'collab', label: 'Joint posts', desc: 'One post that appears on both accounts (Instagram and Facebook support this).' },
  { id: 'calendar', label: 'A shared content calendar', desc: 'Partners add upcoming fieldwork, events and news so we can plan ahead.' },
  { id: 'takeover', label: 'Account takeovers', desc: 'A partner team runs the SEASTRONG account for a day or a week of fieldwork.' }
]},
{ id: 'S5', g: 'S', type: 'single', title: 'Which languages should SEASTRONG’s posts use?',
  why: 'Partners work in at least eight languages. Posts in a reader’s own language travel further, but every translation needs a native-speaker check.',
  rec: 'enplus', options: [
  { id: 'en', label: 'English only', desc: 'Simplest; partners translate if they wish when they reshare.' },
  { id: 'enplus', label: 'English, plus Spanish or French when a post is about a Spanish- or French-speaking place', desc: 'Reaches Belize, Mesoamerican, Seychelles and Guadeloupe audiences.' },
  { id: 'local', label: 'English, plus local languages for community-focused posts', desc: 'Most inclusive; needs native-speaker review each time.' }
]}
];

/* Operational social media questions (step S, after S5). Aggregated in results unless noted. */
export const SOCIAL_OPS = {
  channelsIntro: 'Your organization’s own channels. Approximate follower numbers are fine. We use them to plan who can carry which kind of post, and to report the partnership’s combined reach.',
  platforms: ['LinkedIn', 'Instagram', 'Facebook', 'X (Twitter)', 'YouTube', 'Bluesky', 'TikTok', 'Mastodon', 'Threads', 'WhatsApp channel', 'Other'],
  channelFields: [
    { key: 'platform', label: 'Platform', type: 'select' },
    { key: 'handle', label: 'Account name or link' },
    { key: 'followers', label: 'Followers (approx.)', type: 'number', min: 0 },
    { key: 'run_by', label: 'Who runs it?', type: 'select', options: [
      { id: 'org', label: 'Our organization' }, { id: 'unit', label: 'A department, program or lab' },
      { id: 'central', label: 'A central press or communications office' }, { id: 'person', label: 'An individual researcher' } ] }
  ],
  personalChannels: { label: 'Colleagues’ personal or lab accounts that might share SEASTRONG posts (optional)', hint: 'For example: “Lab Instagram, about 2,000 followers”', stored: 'comments.personal_channels' },
  SOC_FREQ: { id: 'SOC_FREQ', type: 'single', title: 'How often could your organization work with us on a post, or share SEASTRONG content?', options: [
    { id: 'weekly', label: 'About once a week' }, { id: 'fortnight', label: 'Every two weeks' }, { id: 'monthly', label: 'About once a month' },
    { id: 'quarter', label: 'Every two to three months' }, { id: 'milestones', label: 'Only for major milestones' }, { id: 'notnow', label: 'Not at the moment' } ] },
  SOC_HELP: { id: 'SOC_HELP', type: 'multi', title: 'What could your organization help with?', options: [
    { id: 'reshare', label: 'Resharing SEASTRONG posts' }, { id: 'original', label: 'Posting about SEASTRONG work at your sites' },
    { id: 'media', label: 'Supplying photos and video' }, { id: 'spotlight', label: 'Hosting a “Meet the team” spotlight' },
    { id: 'quotes', label: 'Quotes or short interviews' }, { id: 'translate', label: 'Translating or reviewing posts in a local language' },
    { id: 'takeover', label: 'An account takeover during fieldwork' } ] },
  socialContact: { label: 'Who should we work with on social media?', who: [
    { id: 'comms', label: 'The communications liaison' }, { id: 'web', label: 'The website liaison' }, { id: 'me', label: 'Me' }, { id: 'other', label: 'Someone else' } ] },
  SOC_CONTROL: { id: 'SOC_CONTROL', type: 'single', title: 'Who can post on your organization’s main channels?', options: [
    { id: 'direct', label: 'We post directly; no approval needed' },
    { id: 'office', label: 'Posts go through our communications or press office' },
    { id: 'leadership', label: 'Posts need approval from leadership' },
    { id: 'mixed', label: 'It depends on the channel' },
    { id: 'unsure', label: 'Not sure' } ] },
  /* Shown only if SOC_CONTROL is office, leadership or mixed */
  SOC_APPROVAL: { id: 'SOC_APPROVAL', type: 'single', title: 'How easy is it to get a post about SEASTRONG approved?', options: [
    { id: 'sameday', label: 'Easy: usually the same day' }, { id: 'days', label: 'Manageable: two or three working days' },
    { id: 'week', label: 'Slow: about a week or more' }, { id: 'hard', label: 'Difficult: external projects are rarely approved' }, { id: 'varies', label: 'It varies' } ] },
  approvalTips: { label: 'What helps approval go smoothly?', hint: 'For example: send drafts five working days ahead; always include the EU funding line', stored: 'comments.approval_tips' },
  approver: { label: 'Who approves posts?', hint: 'So we can coordinate with them directly if you’re happy for us to.', fields: ['name', 'role', 'email', 'phone'],
    okToContact: { label: 'May we contact them directly?', options: [ { id: 'yes', label: 'Yes, please do' }, { id: 'via', label: 'Please go through me or our liaison first' } ] } },
  SOC_ASSETS: { id: 'SOC_ASSETS', type: 'single', title: 'Do you have photos or video from your sites or team that SEASTRONG could use, with credit?', options: [
    { id: 'yes', label: 'Yes, with consent from identifiable people' }, { id: 'check', label: 'Yes, but consent needs checking' },
    { id: 'few', label: 'A few' }, { id: 'no', label: 'Not yet' } ] },
  imageRules: { label: 'Credit format or usage rules for your images (optional)', stored: 'comments.image_rules' }
};

export const FINISH = {
  title: 'Almost done',
  overall: { label: 'Anything else? Concerns, ideas, things we missed, people we should talk to', stored: 'comments.overall' },
  consentData: 'I agree that the SEASTRONG project may store my answers and the contact details I have entered, to plan the website and social media and to coordinate with my organization. I have read the privacy notice.',
  consentContact: 'The SEASTRONG communications team may contact me, and the colleagues I have listed, about website and social media coordination.',
  colleaguesReminder: 'If you listed colleagues, please let them know.',
  submit: 'Submit and see the results',
  submitting: 'Sending your answers…',
  failTitle: 'We couldn’t send your answers just now',
  failBody: 'Your answers are still saved in this browser. Please try again in a moment. If it keeps failing, download your answers and email the file to us.',
  thanksTitle: 'Thank you',
  thanksBody: 'Your answers have been received. Here is how partners have voted so far.'
};

export const RESULTS_COPY = {
  title: 'How partners are voting so far',
  caveat: 'Early results. With only a few responses, the numbers can shift quickly.',
  yourChoice: 'Your choice',
  teamProposal: 'Team proposal',
  reachTitle: 'Combined reach of partners who have responded',
  reachNote: 'Approximate follower numbers reported by partners, using each organization’s latest response. Followers overlap between accounts, so this is an upper bound on reach, not a count of people.',
  empty: 'No responses yet. Check back soon.',
  error: 'The results couldn’t be loaded just now. Please refresh the page in a moment.'
};
