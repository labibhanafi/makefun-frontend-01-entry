// Potboard router: four surfaces on hash routes, each view module loaded
// lazily the first time its route is visited, so the first load carries only
// this file, the shared helpers and the stylesheet.
//
//   #/                              bounty board
//   #/bounty/<slug>                 one bounty's page
//   #/bounty/<slug>/leaderboard    its leaderboard
//   #/profile/<handle>              a public profile
//
// window.__shotReady is false while a route loads and true once its data has
// rendered — screenshot scripts wait on it. A single one-second timer keeps
// every visible countdown fresh by rewriting only the countdown text nodes,
// never the page.

import { timeLeft } from './format.js';

const app = document.getElementById('app');
let routeToken = 0;

function parseRoute(hash) {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  if (parts.length === 0) return { name: 'board' };
  if (parts[0] === 'bounty' && parts[1] && parts[2] === 'leaderboard') return { name: 'leaderboard', slug: parts[1] };
  if (parts[0] === 'bounty' && parts[1]) return { name: 'bounty', slug: parts[1] };
  if (parts[0] === 'profile' && parts[1]) return { name: 'profile', handle: parts[1] };
  return { name: 'board' };
}

function loadView(route) {
  switch (route.name) {
    case 'bounty': return import('./views/bounty.js');
    case 'leaderboard': return import('./views/leaderboard.js');
    case 'profile': return import('./views/profile.js');
    default: return import('./views/board.js');
  }
}

async function render() {
  const token = ++routeToken;
  const route = parseRoute(location.hash);
  window.__shotReady = false;
  app.innerHTML = '<p class="loading" role="status">Loading live data from make.fun…</p>';
  try {
    const view = await loadView(route);
    if (token !== routeToken) return; // a newer navigation already won
    await view.render(app, route);
  } catch (err) {
    if (token !== routeToken) return;
    document.title = 'Something went wrong · Potboard';
    app.innerHTML = '<section class="panel"><h1>Could not load that page</h1>'
      + '<p>The make.fun API did not answer as expected. Check your connection and '
      + '<a href="#/">return to the bounty board</a>.</p></section>';
    console.error(err);
  }
  if (token !== routeToken) return;
  window.scrollTo(0, 0);
  window.__shotReady = true;
}

// Live countdowns: update text in place, one tick a second, no re-render.
setInterval(() => {
  const now = Date.now();
  document.querySelectorAll('[data-countdown]').forEach((el) => {
    el.textContent = timeLeft(el.getAttribute('data-countdown'), now);
  });
}, 1000);

window.addEventListener('hashchange', render);
render();
