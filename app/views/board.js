// The bounty board (#/): every competition the API lists as open, split by
// the deadline test into bounties still taking entries and ones whose clock
// has run out. Search filters the already-fetched list in place and sorting
// re-orders the cards — neither touches the network again.

import { fetchBoard } from '../api.js';
import { entryCount, esc, fullDate, isOpen, money, timeLeft } from '../format.js';

const SORTERS = {
  pot: (a, b) => Number(b.potUsd ?? b.rewardAmount) - Number(a.potUsd ?? a.rewardAmount),
  deadline: (a, b) => new Date(a.deadline) - new Date(b.deadline),
  entries: (a, b) => (b.submissionCount || 0) - (a.submissionCount || 0),
};

function card(b, open) {
  const fee = b.entryFeeUsd != null && Number(b.entryFeeUsd) > 0
    ? `<span class="chip chip-fee">${money(b.entryFeeUsd)} entry fee</span>`
    : '<span class="chip chip-free">Free to enter</span>';
  const skills = (b.skills || []).slice(0, 3)
    .map((s) => `<span class="chip chip-skill">${esc(s)}</span>`).join('');
  return `<article class="card${open ? '' : ' card-closed'}">
    <p class="card-top"><span class="card-cat">${esc(b.category || 'Bounty')}</span>
    <span class="card-status ${open ? 'is-open' : 'is-closed'}">${open ? '● Open' : '● Closed'}</span></p>
    <h3 class="card-title"><a href="#/bounty/${encodeURIComponent(b.slug)}">${esc(b.title)}</a></h3>
    <p class="card-summary">${esc(b.summary || '')}</p>
    <p class="card-pot">${money(b.potUsd ?? b.rewardAmount)} <span class="card-pot-label">live pot</span></p>
    <dl class="card-facts">
      <div><dt>Time left</dt><dd data-countdown="${esc(b.deadline)}">${esc(timeLeft(b.deadline))}</dd></div>
      <div><dt>Deadline</dt><dd>${esc(fullDate(b.deadline))}</dd></div>
      <div><dt>Entries</dt><dd>${esc(entryCount(b.submissionCount))}</dd></div>
      <div><dt>Sponsor</dt><dd>${esc(b.sponsor?.name || 'make.fun')}${b.sponsor?.isVerified ? ' ✓' : ''}</dd></div>
    </dl>
    <p class="card-chips">${fee}${skills}</p>
    <p class="card-links"><a href="#/bounty/${encodeURIComponent(b.slug)}">View bounty</a>
    · <a href="#/bounty/${encodeURIComponent(b.slug)}/leaderboard">Leaderboard</a></p>
  </article>`;
}

function groupHtml(title, note, items, open) {
  if (!items.length) return '';
  return `<section aria-label="${esc(title)}"><h2 class="group-title">${esc(title)} `
    + `<span class="group-count">${items.length}</span></h2><p class="group-note">${esc(note)}</p>`
    + `<div class="grid">${items.map((b) => card(b, open)).join('')}</div></section>`;
}

export async function render(root) {
  const data = await fetchBoard();
  const items = Array.isArray(data.items) ? data.items : [];
  document.title = 'Bounty board · Potboard for make.fun';

  if (!items.length) {
    root.innerHTML = '<section class="panel"><h1>Bounty board</h1>'
      + '<p>No bounties are listed right now. Please check back soon.</p></section>';
    return;
  }

  const openPot = items.filter((b) => isOpen(b))
    .reduce((sum, b) => sum + Number(b.potUsd ?? b.rewardAmount ?? 0), 0);
  root.innerHTML = `
    <section class="board-head">
      <h1>Live bounty board</h1>
      <p class="lede">Every open make.fun bounty with its live pot — base reward plus
      entry fees paid so far — its entry fee, time left and entry count.</p>
      <p class="board-stats"><strong>${items.length}</strong> bounties ·
      <strong>${money(openPot)}</strong> in pots still open for entries</p>
      <form class="controls" role="search">
        <label>Search <input id="q" type="search" placeholder="Title, category or skill…" autocomplete="off"></label>
        <label>Sort by
          <select id="sort">
            <option value="pot">Biggest pot</option>
            <option value="deadline">Ending soonest</option>
            <option value="entries">Most entries</option>
          </select>
        </label>
      </form>
    </section>
    <div id="board-results"></div>`;

  const results = root.querySelector('#board-results');
  const input = root.querySelector('#q');
  const select = root.querySelector('#sort');

  const paint = () => {
    const q = input.value.trim().toLowerCase();
    const sorter = SORTERS[select.value] || SORTERS.pot;
    const shown = items
      .filter((b) => !q || [b.title, b.category, b.summary, ...(b.skills || [])]
        .join(' ').toLowerCase().includes(q))
      .sort(sorter);
    if (!shown.length) {
      results.innerHTML = '<section class="panel"><h2>No matches</h2>'
        + '<p>No bounty matches that search. Try a shorter word.</p></section>';
      return;
    }
    results.innerHTML =
      groupHtml('Open for entries', 'These bounties still take entries — the clock is live.', shown.filter((b) => isOpen(b)), true)
      + groupHtml('Closed — awaiting results', 'The deadline has passed, so these no longer take entries even though the API still lists them as open.', shown.filter((b) => !isOpen(b)), false);
  };
  input.addEventListener('input', paint);
  select.addEventListener('change', paint);
  paint();
}
