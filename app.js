const express = require('express');
const app = express();

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// in-memory data store, resets whenever the server restarts, that's fine for this project
let feedbackList = [];
let nextId = 1;

const CATEGORIES = ['Academics', 'Hostel', 'Mess', 'Facilities', 'Transport','Library'];
const MOODS = ['Good', 'Okay', 'Bad'];

const MOOD_ICON = { Good: 'GD', Okay: 'OK', Bad: 'BD' };

// escape user input so no one can inject HTML/script tags through the form
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const sha = process.env.GIT_SHA || process.env.RENDER_GIT_COMMIT || 'local';
const commit = sha.slice(0, 7);

function pageStyles() {
  return `
    :root {
      --ink: #1c2430;
      --ink-soft: #4b5563;
      --line: #dde2e8;
      --panel: #ffffff;
      --floor: #f4f6f8;
      --accent: #6d28d9;
      --accent-ink: #4c1d95;
      --good-bg: #e5f4ea; --good-ink: #1e6b3c;
      --okay-bg: #fdf1de; --okay-ink: #92400e;
      --bad-bg: #fbe4e6;  --bad-ink: #991b2e;
      font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    * { box-sizing: border-box; }
    body { margin: 0; background: var(--floor); color: var(--ink); line-height: 1.5; }
    a { color: var(--accent); }
    .top-bar { background: #1a1523; color: #e6e9ee; padding: 14px 24px; }
    .top-bar-inner { max-width: 1040px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
    .brand { font-weight: 700; font-size: 17px; }
    .brand span { color: #c4b5fd; }
    .top-links { display: flex; gap: 18px; font-size: 13px; }
    .top-links a { color: #cbd5e1; text-decoration: none; }
    .top-links a:hover { color: #ffffff; }

    .hero { background: #1a1523; color: #e6e9ee; padding: 40px 24px 56px; }
    .hero-inner { max-width: 1040px; margin: 0 auto; }
    .hero h1 { font-size: 27px; margin: 0 0 10px; max-width: 640px; }
    .hero p.lede { color: #b6bfcc; max-width: 580px; margin: 0 0 26px; font-size: 15px; }
    .stat-row { display: flex; gap: 12px; flex-wrap: wrap; }
    .stat-card { background: #241c33; border: 1px solid #362a4a; border-radius: 8px; padding: 14px 18px; min-width: 160px; }
    .stat-card .n { font-size: 22px; font-weight: 700; }
    .stat-card .l { font-size: 12px; color: #a99cc0; margin-top: 2px; }

    .wrap { max-width: 1040px; margin: -30px auto 0; padding: 0 24px 60px; }
    .panel { background: var(--panel); border: 1px solid var(--line); border-radius: 10px; padding: 26px; margin-bottom: 28px; }
    .panel h2 { font-size: 18px; margin: 0 0 4px; }
    .panel .sub { font-size: 13px; color: var(--ink-soft); margin: 0 0 20px; }

    .report-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px 16px; }
    .field { display: flex; flex-direction: column; gap: 6px; }
    .field.full { grid-column: 1 / -1; }
    .field label { font-size: 12px; font-weight: 600; color: var(--ink-soft); text-transform: uppercase; letter-spacing: 0.4px; }
    input[type=text], input:not([type]), select, textarea {
      border: 1px solid var(--line); border-radius: 6px; padding: 9px 11px; font-size: 14px;
      background: #fff; color: var(--ink); font-family: inherit; resize: vertical;
    }
    input:focus, select:focus, textarea:focus { outline: 2px solid #ddd6fe; outline-offset: 1px; border-color: var(--accent); }
    .form-actions { grid-column: 1 / -1; display: flex; align-items: center; gap: 12px; margin-top: 4px; }

    button, .btn { background: var(--accent); color: #fff; border: 1px solid var(--accent-ink); border-radius: 6px; padding: 9px 16px; font-size: 14px; font-weight: 600; cursor: pointer; font-family: inherit; }
    button:hover, .btn:hover { background: var(--accent-ink); }

    .filter-row { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 20px; }
    .filter-row a { display: inline-flex; align-items: center; gap: 6px; text-decoration: none; font-size: 13px; color: var(--ink); background: var(--floor); border: 1px solid var(--line); border-radius: 6px; padding: 6px 12px; }
    .filter-row a.active { background: var(--accent); color: #fff; border-color: var(--accent-ink); }

    .breakdown { display: flex; flex-direction: column; gap: 12px; }
    .breakdown .row { display: flex; align-items: center; gap: 10px; font-size: 13px; }
    .breakdown .name { flex: 0 0 110px; color: var(--ink-soft); font-weight: 600; }
    .breakdown .bar-track { flex: 1; background: var(--floor); border-radius: 4px; height: 10px; overflow: hidden; }
    .breakdown .bar-fill { background: var(--bad-ink); height: 100%; }
    .breakdown .pct { width: 46px; text-align: right; font-weight: 700; }
    .breakdown .n { width: 70px; text-align: right; color: var(--ink-soft); font-size: 12px; }
    .flag { display: inline-block; font-size: 11px; font-weight: 700; background: var(--bad-bg); color: var(--bad-ink); border-radius: 4px; padding: 2px 8px; margin-left: 8px; }

    .feed-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
    .feed-card { border: 1px solid var(--line); border-radius: 8px; padding: 16px; background: #fff; display: flex; flex-direction: column; gap: 8px; }
    .feed-card .top-line { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
    .cat-tag { font-size: 11px; font-weight: 700; color: var(--ink-soft); background: var(--floor); border: 1px solid var(--line); border-radius: 4px; padding: 2px 6px; white-space: nowrap; }
    .mood-pill { font-size: 11px; font-weight: 700; border-radius: 4px; padding: 3px 8px; }
    .mood-pill.Good { background: var(--good-bg); color: var(--good-ink); }
    .mood-pill.Okay { background: var(--okay-bg); color: var(--okay-ink); }
    .mood-pill.Bad { background: var(--bad-bg); color: var(--bad-ink); }
    .feed-card .msg { font-size: 13.5px; color: var(--ink-soft); }
    .feed-card .meta { font-size: 12px; color: #6b7280; border-top: 1px dashed var(--line); padding-top: 8px; display: flex; justify-content: space-between; align-items: center; gap: 8px; }
    .status-pill { font-size: 11px; font-weight: 700; border-radius: 4px; padding: 3px 8px; background: #e5e7eb; color: #374151; }
    .status-pill.addressed { background: var(--good-bg); color: var(--good-ink); }
    .feed-card form { margin: 0; }
    .feed-card button { padding: 6px 12px; font-size: 12.5px; }

    .empty-state { border: 1px dashed var(--line); border-radius: 8px; padding: 30px; text-align: center; color: var(--ink-soft); font-size: 14px; }

    footer { max-width: 1040px; margin: 0 auto; padding: 0 24px 40px; font-size: 12.5px; color: #6b7280; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px; }

    @media (max-width: 720px) {
      .report-grid, .feed-grid { grid-template-columns: 1fr; }
      .wrap { margin-top: -20px; }
    }
  `;
}

function computeStats(list) {
  const byCategory = {};
  CATEGORIES.forEach((c) => { byCategory[c] = { total: 0, bad: 0, unresolvedBad: 0 }; });

  list.forEach((f) => {
    const c = byCategory[f.category];
    c.total += 1;
    if (f.mood === 'Bad') {
      c.bad += 1;
      if (f.status === 'unresolved') c.unresolvedBad += 1;
    }
  });

  let mostConcerning = null;
  let highestUnresolvedBad = 0;
  CATEGORIES.forEach((c) => {
    if (byCategory[c].unresolvedBad > highestUnresolvedBad) {
      highestUnresolvedBad = byCategory[c].unresolvedBad;
      mostConcerning = c;
    }
  });

  return {
    total: list.length,
    unresolved: list.filter((f) => f.status === 'unresolved').length,
    byCategory,
    mostConcerning,
  };
}

function renderStatRow(stats) {
  return `
    <div class="stat-row">
      <div class="stat-card"><div class="n">${stats.total}</div><div class="l">Feedback submitted</div></div>
      <div class="stat-card"><div class="n">${stats.unresolved}</div><div class="l">Still unresolved</div></div>
      <div class="stat-card"><div class="n">${stats.mostConcerning ? esc(stats.mostConcerning) : '—'}</div><div class="l">Most concerning category</div></div>
    </div>
  `;
}

function renderReportForm() {
  return `
    <section class="panel">
      <h2>Share feedback</h2>
      <p class="sub">Completely anonymous, no name or login needed. Pick a category, how it made you feel, and a short message.</p>
      <form method="POST" action="/feedback" class="report-grid">
        <div class="field">
          <label for="category">Category</label>
          <select id="category" name="category" required>
            ${CATEGORIES.map((c) => `<option value="${esc(c)}">${esc(c)}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label for="mood">How do you feel about it?</label>
          <select id="mood" name="mood" required>
            ${MOODS.map((m) => `<option value="${esc(m)}">${esc(m)}</option>`).join('')}
          </select>
        </div>
        <div class="field full">
          <label for="message">Your feedback</label>
          <textarea id="message" name="message" rows="2" placeholder="e.g. Mess food quality has dropped this week" required></textarea>
        </div>
        <div class="form-actions">
          <button type="submit">Submit anonymously</button>
          <span style="font-size:12.5px;color:var(--ink-soft)">Your submission carries no name or identifying info.</span>
        </div>
      </form>
    </section>
  `;
}

function renderBreakdown(stats) {
  const maxTotal = Math.max(1, ...CATEGORIES.map((c) => stats.byCategory[c].total));
  const rows = CATEGORIES.map((c) => {
    const data = stats.byCategory[c];
    const pct = data.total ? Math.round((data.bad / data.total) * 100) : 0;
    const widthPct = Math.round((data.total / maxTotal) * 100);
    const flag = c === stats.mostConcerning ? '<span class="flag">Needs attention</span>' : '';
    return `
      <div class="row">
        <span class="name">${esc(c)}${flag}</span>
        <span class="bar-track"><span class="bar-fill" style="width:${widthPct ? pct : 0}%"></span></span>
        <span class="pct">${pct}% bad</span>
        <span class="n">${data.total} total</span>
      </div>
    `;
  }).join('');

  return `
    <section class="panel">
      <h2>Sentiment by category</h2>
      <p class="sub">Percentage of "Bad" feedback within each category, out of everything submitted so far.</p>
      <div class="breakdown">${rows}</div>
    </section>
  `;
}

function renderFilterRow(activeCategory) {
  const allLink = `<a href="/" class="${!activeCategory ? 'active' : ''}">All feedback</a>`;
  const catLinks = CATEGORIES.map((c) => {
    const isActive = activeCategory === c;
    return `<a href="/?category=${encodeURIComponent(c)}" class="${isActive ? 'active' : ''}">${esc(c)}</a>`;
  }).join('');
  return `<div class="filter-row">${allLink}${catLinks}</div>`;
}

function renderFeedbackCard(f) {
  const addressBtn = f.status === 'unresolved'
    ? `<form method="POST" action="/feedback/${f.id}/address">
         <button type="submit">Mark addressed</button>
       </form>`
    : '';
  return `
    <article class="feed-card">
      <div class="top-line">
        <span class="cat-tag">${esc(f.category)}</span>
        <span class="mood-pill ${f.mood}">${MOOD_ICON[f.mood]} ${esc(f.mood)}</span>
      </div>
      <div class="msg">${esc(f.message)}</div>
      <div class="meta">
        <span class="status-pill ${f.status}">${f.status === 'unresolved' ? 'Unresolved' : 'Addressed'}</span>
      </div>
      ${addressBtn}
    </article>
  `;
}

function renderFeed(visibleList, activeCategory) {
  const cards = visibleList.slice().reverse().map(renderFeedbackCard).join('');
  const emptyText = activeCategory
    ? `No feedback in "${esc(activeCategory)}" yet.`
    : 'No feedback submitted yet. Use the form above to be the first.';
  return `
    <section class="panel">
      <h2>Recent feedback</h2>
      <p class="sub">Newest first. Filter by category to narrow the feed.</p>
      ${renderFilterRow(activeCategory)}
      <div class="feed-grid">
        ${cards || `<div class="empty-state" style="grid-column:1/-1">${emptyText}</div>`}
      </div>
    </section>
  `;
}

function renderPage(options = {}) {
  const activeCategory = CATEGORIES.includes(options.category) ? options.category : null;
  const visibleList = activeCategory ? feedbackList.filter((f) => f.category === activeCategory) : feedbackList;
  const stats = computeStats(feedbackList);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>CampusPulse</title>
  <style>${pageStyles()}</style>
</head>
<body>
  <div class="top-bar">
    <div class="top-bar-inner">
      <div class="brand">Campus<span>Pulse</span></div>
      <div class="top-links">
        <a href="/">Board</a>
        <a href="/api/feedback">API</a>
        <a href="/health">Status</a>
      </div>
    </div>
  </div>

  <div class="hero">
    <div class="hero-inner">
      <h1>Anonymous campus feedback, aggregated into something worth acting on.</h1>
      <p class="lede">Report how you feel about academics, hostel, mess, facilities or transport. No name needed. The board surfaces which area needs attention most.</p>
      ${renderStatRow(stats)}
    </div>
  </div>

  <div class="wrap">
    ${renderReportForm()}
    ${renderBreakdown(stats)}
    ${renderFeed(visibleList, activeCategory)}
  </div>

  <footer>
    <span>CampusPulse</span>
    <span>commit ${esc(commit)}</span>
  </footer>
</body>
</html>`;
}

app.get('/', (req, res) => {
  res.send(renderPage({ category: req.query.category }));
});

app.post('/feedback', (req, res) => {
  const { category, mood, message } = req.body;

  if (!category || !mood || !message) {
    return res.status(400).send('category, mood and message are all required');
  }
  if (!CATEGORIES.includes(category)) {
    return res.status(400).send('Invalid category');
  }
  if (!MOODS.includes(mood)) {
    return res.status(400).send('Invalid mood');
  }

  feedbackList.push({
    id: nextId++,
    category,
    mood,
    message,
    status: 'unresolved',
  });

  res.redirect('/');
});

app.post('/feedback/:id/address', (req, res) => {
  const id = Number(req.params.id);
  const entry = feedbackList.find((f) => f.id === id);

  if (!entry) {
    return res.status(404).send('Feedback entry not found');
  }

  entry.status = 'addressed';
  res.redirect('/');
});

app.get('/api/feedback', (req, res) => res.json(feedbackList));

app.get('/health', (req, res) => res.json({ status: 'ok', commit }));

// exposed only so tests can reset state between test cases
app.resetForTests = () => {
  feedbackList = [];
  nextId = 1;
};

module.exports = app;
