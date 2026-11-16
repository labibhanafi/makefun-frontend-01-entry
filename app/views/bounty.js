// One bounty's page (#/bounty/<slug>): summary, live pot, entry fee, dates and
// status up top; the full description rendered as readable sections; and the
// rewards table computed from the live pot — rewardsNow already carries each
// place's base prize plus its share of the entry fees paid so far.

import { fetchBounty } from '../api.js';
import { entryCount, esc, fullDate, isOpen, money, timeLeft } from '../format.js';

/** Escape first, then give the plain-text description light structure:
 *  '## ' lines become subheadings, '- ' runs become lists, the rest paragraphs. */
export function describeHtml(text) {
  const lines = String(text ?? '').split('\n');
  const out = [];
  let list = null;
  const closeList = () => { if (list) { out.push(`<ul>${list}</ul>`); list = null; } };
  for (const raw of lines) {
    const line = raw.trim();
    if (line.startsWith('- ')) {
      list = (list ?? '') + `<li>${esc(line.slice(2))}</li>`;
      continue;
    }
    closeList();
    if (!line) continue;
    if (line.startsWith('## ')) out.push(`<h3>${esc(line.slice(3))}</h3>`);
    else if (line.startsWith('# ')) out.push(`<h3>${esc(line.slice(2))}</h3>`);
    else out.push(`<p>${esc(line)}</p>`);
  }
  closeList();
  return out.join('');
}

function rewardsTable(b) {
  const now = Array.isArray(b.rewardsNow) ? b.rewardsNow : [];
  if (now.length) {
    const rows = now.map((r) => `<tr><td>${esc(r.place)}</td><td>${money(r.baseUsd)}</td>`
      + `<td>${money(r.feeShareUsd)}</td><td class="num-strong">${money(r.amountUsd)}</td></tr>`).join('');
    return `<table class="table"><caption>Live pot ${money(b.potUsd)} split by place</caption>`
      + '<thead><tr><th scope="col">Place</th><th scope="col">Base prize</th>'
      + '<th scope="col">Share of entry fees</th><th scope="col">Pays now</th></tr></thead>'
      + `<tbody>${rows}</tbody></table>`;
  }
  const table = b.rewards && typeof b.rewards === 'object' ? Object.entries(b.rewards) : [];
  if (!table.length) return '<p>No prize table has been published for this bounty yet.</p>';
  const rows = table.map(([place, usd]) => `<tr><td>${esc(place)}</td><td class="num-strong">${money(usd)}</td></tr>`).join('');
  return `<table class="table"><caption>Prize table</caption><thead><tr><th scope="col">Place</th>`
    + `<th scope="col">Prize</th></tr></thead><tbody>${rows}</tbody></table>`;
}

export async function render(root, route) {
  const b = await fetchBounty(route.slug);
  const open = isOpen(b);
  document.title = `${b.title} · Potboard`;
  const skills = (b.skills || []).map((s) => `<span class="chip chip-skill">${esc(s)}</span>`).join('');
  root.innerHTML = `
    <p class="crumbs"><a href="#/">← Bounty board</a></p>
    <article class="bounty">
      <p class="card-top"><span class="card-cat">${esc(b.category || 'Bounty')}</span>
      <span class="card-status ${open ? 'is-open' : 'is-closed'}">${open ? '● Open for entries' : '● Closed'}</span></p>
      <h1>${esc(b.title)}</h1>
      <p class="lede">${esc(b.summary || '')}</p>
      <section class="hero-stats" aria-label="Bounty facts">
        <div class="stat"><span class="stat-label">Live pot</span><span class="stat-value pot">${money(b.potUsd ?? b.rewardAmount)}</span>
        <span class="stat-note">base ${money(b.rewardAmount)}${b.entryFeesUsd ? ` + ${money(b.entryFeesUsd)} in entry fees` : ''}</span></div>
        <div class="stat"><span class="stat-label">Entry fee</span><span class="stat-value">${b.entryFeeUsd != null && Number(b.entryFeeUsd) > 0 ? money(b.entryFeeUsd) : 'Free'}</span>
        <span class="stat-note">${b.entryFeePayers ? `${esc(b.entryFeePayers)} entrants have paid` : 'no fee to enter'}</span></div>
        <div class="stat"><span class="stat-label">Time left</span><span class="stat-value" data-countdown="${esc(b.deadline)}">${esc(timeLeft(b.deadline))}</span>
        <span class="stat-note">deadline ${esc(fullDate(b.deadline))}</span></div>
        <div class="stat"><span class="stat-label">Entries</span><span class="stat-value">${esc(entryCount(b.submissionCount))}</span>
        <span class="stat-note">by ${esc(b.sponsor?.name || 'make.fun')}${b.sponsor?.isVerified ? ' ✓ verified sponsor' : ''}</span></div>
      </section>
      <p class="actions"><a class="button" href="#/bounty/${encodeURIComponent(b.slug)}/leaderboard">View the leaderboard</a>
      <a class="button button-quiet" href="https://make.fun/bounty/${encodeURIComponent(b.slug)}">Open on make.fun</a></p>
      ${skills ? `<p class="card-chips" aria-label="Skills">${skills}</p>` : ''}
      <section aria-labelledby="desc-h"><h2 id="desc-h">About this bounty</h2>
      <div class="description">${describeHtml(b.description)}</div></section>
      <section aria-labelledby="rewards-h"><h2 id="rewards-h">Rewards</h2>${rewardsTable(b)}</section>
      <section aria-labelledby="facts-h"><h2 id="facts-h">Dates and status</h2>
      <dl class="facts">
        <div><dt>Status</dt><dd>${esc(b.status)}${open ? ' — still taking entries' : ' — no longer taking entries'}</dd></div>
        ${b.publishedAt ? `<div><dt>Published</dt><dd>${esc(fullDate(b.publishedAt))}</dd></div>` : ''}
        <div><dt>Deadline</dt><dd>${esc(fullDate(b.deadline))} (<span data-countdown="${esc(b.deadline)}">${esc(timeLeft(b.deadline))}</span>)</dd></div>
        <div><dt>Category</dt><dd>${esc(b.category || '—')}</dd></div>
        <div><dt>Sponsor</dt><dd>${esc(b.sponsor?.name || 'make.fun')}</dd></div>
      </dl></section>
    </article>`;
}
