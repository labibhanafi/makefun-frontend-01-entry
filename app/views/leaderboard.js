// A bounty's leaderboard (#/bounty/<slug>/leaderboard). The API describes its
// own table — a columns array (key, title, precision) plus entries carrying
// rank, handle, title and a values/display pair per column — so the table is
// built from that description and stays right for every bounty, whatever its
// scoring. Long boards are paged 25 rows at a time: only the visible page is
// in the DOM.

import { assetUrl, fetchLeaderboard } from '../api.js';
import { esc, microPct } from '../format.js';

const PAGE_SIZE = 25;

/** One cell: judge rates arrive as micro-units and read as percentages, the
 *  valid flag as a tick, byte sizes in KB; everything else uses the API's own
 *  display string when it has one. */
export function cellText(entry, column) {
  const raw = entry.values ? entry.values[column.key] : undefined;
  if (column.key.startsWith('judge') && raw != null) return microPct(raw);
  if (column.key === 'valid') return raw === 1 || raw === '1' ? '✓ valid' : '—';
  if (column.key === 'bytes' && raw != null) return `${(Number(raw) / 1024).toFixed(0)} KB`;
  const shown = entry.display ? entry.display[column.key] : undefined;
  return shown != null && shown !== '' ? String(shown) : raw != null ? String(raw) : '—';
}

function rowHtml(entry, columns) {
  const cells = columns.map((c) => `<td>${esc(cellText(entry, c))}</td>`).join('');
  const avatar = entry.image
    ? `<img class="avatar" crossorigin="anonymous" alt="" width="28" height="28" src="${esc(assetUrl(entry.image))}">`
    : '<span class="avatar avatar-none" aria-hidden="true"></span>';
  return `<tr>
    <th scope="row" class="rank">${esc(entry.rank ?? '—')}</th>
    <td class="who">${avatar}<span><a href="#/profile/${encodeURIComponent(entry.handle || '')}">${esc(entry.handle || 'unknown')}</a>
    ${entry.title ? `<span class="entry-title">${esc(entry.title)}</span>` : ''}</span></td>
    ${cells}</tr>`;
}

export async function render(root, route) {
  const data = await fetchLeaderboard(route.slug);
  const comp = data.competition || {};
  const columns = (data.columns || []).filter((c) => !c.hidden);
  const entries = Array.isArray(data.entries) ? data.entries : [];
  document.title = `Leaderboard · ${comp.title || route.slug} · Potboard`;

  const head = `
    <p class="crumbs"><a href="#/">← Board</a> · <a href="#/bounty/${encodeURIComponent(route.slug)}">Bounty page</a></p>
    <h1>${esc(data.title || 'Leaderboard')}</h1>
    <p class="lede">${esc(comp.title || route.slug)}${data.phase?.title ? ` — ${esc(data.phase.title)} phase` : ''}.
    ${entries.length} ranked ${entries.length === 1 ? 'entry' : 'entries'}${data.metrics_withheld ? '; detailed metrics are withheld until results are published' : ''}.</p>`;

  if (!entries.length) {
    root.innerHTML = head + '<section class="panel"><h2>No ranked entries yet</h2>'
      + '<p>Entries appear here once they have been scored. '
      + `<a href="#/bounty/${encodeURIComponent(route.slug)}">Back to the bounty</a></p></section>`;
    return;
  }

  root.innerHTML = head + `
    <div class="table-wrap"><table class="table lb">
      <thead><tr><th scope="col">Rank</th><th scope="col">Entrant</th>
      ${columns.map((c) => `<th scope="col">${esc(c.title)}</th>`).join('')}</tr></thead>
      <tbody id="lb-body"></tbody>
    </table></div>
    <nav class="pager" aria-label="Leaderboard pages">
      <button type="button" id="lb-prev">← Previous</button>
      <span id="lb-status" role="status"></span>
      <button type="button" id="lb-next">Next →</button>
    </nav>`;

  const body = root.querySelector('#lb-body');
  const status = root.querySelector('#lb-status');
  const prev = root.querySelector('#lb-prev');
  const next = root.querySelector('#lb-next');
  const pages = Math.ceil(entries.length / PAGE_SIZE);
  let page = 0;

  const paint = () => {
    body.innerHTML = entries.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
      .map((e) => rowHtml(e, columns)).join('');
    status.textContent = `Page ${page + 1} of ${pages} · entries ${page * PAGE_SIZE + 1}–${Math.min(entries.length, (page + 1) * PAGE_SIZE)} of ${entries.length}`;
    prev.disabled = page === 0;
    next.disabled = page >= pages - 1;
  };
  prev.addEventListener('click', () => { if (page > 0) { page -= 1; paint(); } });
  next.addEventListener('click', () => { if (page < pages - 1) { page += 1; paint(); } });
  paint();
}
