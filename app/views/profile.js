// A public profile (#/profile/<handle>): who they are, their competitive
// record, and every solution they have entered — each one linking back to its
// bounty and, where the bounty has been scored, showing its score or placing.

import { assetUrl, fetchProfile } from '../api.js';
import { esc, fullDate, microPct, money } from '../format.js';

/** A solution's score: judge-style micro rates read as percentages, anything
 *  else falls back to the API's display string. */
function scoreText(score) {
  if (!score || !score.column) return '';
  const label = score.column.title || score.column.key;
  const micro = String(score.column.source || '').includes('micro') || score.column.key === 'judge';
  const value = micro && score.value != null ? microPct(score.value) : score.display ?? score.value;
  return value == null || value === '' ? '' : `${label}: ${value}`;
}

function solutionHtml(s) {
  const c = s.competition || {};
  const bits = [];
  if (s.placement != null) bits.push(`Placed #${s.placement}`);
  if (s.prize_usd != null && Number(s.prize_usd) > 0) bits.push(`won ${money(s.prize_usd)}`);
  const score = scoreText(s.score);
  if (score) bits.push(score);
  if (s.entered_at) bits.push(`entered ${fullDate(s.entered_at)}`);
  return `<li class="solution">
    <p class="solution-title">${esc(s.title || 'Untitled entry')}</p>
    <p class="solution-meta"><a href="#/bounty/${encodeURIComponent(c.slug || '')}">${esc(c.title || c.slug || 'Bounty')}</a>
    ${c.category ? ` · ${esc(c.category)}` : ''} · pot ${money(c.reward_usd)}${bits.length ? ` · ${esc(bits.join(' · '))}` : ''}</p>
    ${c.slug ? `<p class="solution-links"><a href="#/bounty/${encodeURIComponent(c.slug)}/leaderboard">Leaderboard</a></p>` : ''}
  </li>`;
}

export async function render(root, route) {
  let p;
  try {
    p = await fetchProfile(route.handle);
  } catch {
    document.title = 'Profile not found · Potboard';
    root.innerHTML = '<section class="panel"><h1>Profile not found</h1>'
      + `<p>There is no public make.fun profile for “${esc(route.handle)}”. `
      + 'Handles are exact — check the spelling, or <a href="#/">return to the bounty board</a>.</p></section>';
    return;
  }
  document.title = `@${p.handle} · Potboard`;
  const rec = p.record || {};
  const picture = `https://make.fun/api/profiles/${encodeURIComponent(p.handle)}/picture.png`;
  const stats = [
    ['Competitions entered', rec.competitions_entered],
    ['Placed', rec.competitions_placed],
    ['Won', rec.competitions_won],
    ['Podium finishes', rec.podium_finishes],
    ['Best placement', rec.best_placement != null ? `#${rec.best_placement}` : null],
    ['Prizes won', rec.prize_usd != null ? money(rec.prize_usd) : null],
  ].filter(([, v]) => v != null);
  const links = [];
  if (p.github_login) links.push(`<a href="https://github.com/${encodeURIComponent(p.github_login)}">GitHub @${esc(p.github_login)}</a>`);
  if (p.x) links.push(`<span>X: ${esc(p.x)}</span>`);
  if (p.discord) links.push(`<span>Discord: ${esc(p.discord)}</span>`);
  if (p.wallet?.address) {
    links.push(p.wallet.explorer_url
      ? `<a href="${esc(p.wallet.explorer_url)}">Wallet ${esc(p.wallet.address.slice(0, 6))}…${esc(p.wallet.address.slice(-4))}</a>`
      : `<span>Wallet ${esc(p.wallet.address)}</span>`);
  }
  const solutions = Array.isArray(p.solutions) ? p.solutions : [];

  root.innerHTML = `
    <p class="crumbs"><a href="#/">← Bounty board</a></p>
    <article class="profile">
      <header class="profile-head">
        <img class="profile-pic" crossorigin="anonymous" alt="Profile picture of ${esc(p.handle)}" width="96" height="96"
          src="${esc(p.avatar?.url ? assetUrl(p.avatar.url) : picture)}">
        <div>
          <h1>@${esc(p.handle)}${p.house ? ' <span class="chip chip-fee">house</span>' : ''}</h1>
          ${p.display_name ? `<p class="profile-name">${esc(p.display_name)}</p>` : ''}
          ${p.bio ? `<p class="profile-bio">${esc(p.bio)}</p>` : ''}
          <p class="profile-meta">Joined ${esc(fullDate(p.joined_at))}${links.length ? ` · ${links.join(' · ')}` : ''}</p>
        </div>
      </header>
      <section aria-labelledby="record-h"><h2 id="record-h">Record</h2>
      ${stats.length
        ? `<div class="hero-stats">${stats.map(([k, v]) => `<div class="stat"><span class="stat-label">${esc(k)}</span><span class="stat-value">${esc(v)}</span></div>`).join('')}</div>`
        : '<p>No recorded results yet.</p>'}
      </section>
      <section aria-labelledby="entries-h"><h2 id="entries-h">Entries (${solutions.length})</h2>
      ${solutions.length
        ? `<ul class="solutions">${solutions.map(solutionHtml).join('')}</ul>`
        : '<p>No entries yet — this account has not entered a bounty so far.</p>'}
      </section>
    </article>`;
}
