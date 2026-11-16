// A make.fun frontend: board, bounty page, leaderboard and profile, on hash routes.
//
//   #/                              the board
//   #/bounty/<slug>                 one bounty
//   #/bounty/<slug>/leaderboard     that bounty's leaderboard
//   #/u/<handle>                    one account's public profile
//
// window.__shotReady is false while a page loads and true once its data is on
// screen, so a screenshot script knows when to capture. Views re-render from
// the API cache, so going back to a page already seen costs no new request.

import { getBounties, getBounty, getLeaderboard, getProfile } from './api.js';
import { board, bounty, leaderboard, profile } from './views.js';

const app = document.getElementById('app');
const navLinks = [...document.querySelectorAll('[data-nav]')];
const searchForm = document.getElementById('topsearch');
const searchInput = document.getElementById('topsearch-input');

const PAGE_SIZE = 25;

/** Board filter state, kept across renders so a re-render never loses it. */
const boardState = { q: '', filter: 'all' };

function setNav(route) {
  for (const a of navLinks) a.classList.toggle('active', a.dataset.nav === route);
}

function showLoading(text) {
  app.innerHTML = `<div class="loading">${text}</div>`;
}

function showError(err) {
  app.innerHTML = `<div class="error">Could not load this page — ${err.message}. <a href="#/">Back to the board</a></div>`;
}

/** Parse the hash into a route: { name, slug?, handle?, page? }. */
export function parseRoute(hash) {
  const m = hash.match(/^#\/bounty\/([^/?#]+)\/leaderboard(?:\?page=(\d+))?/);
  if (m) return { name: 'leaderboard', slug: decodeURIComponent(m[1]), page: Number(m[2] ?? 1) };
  const b = hash.match(/^#\/bounty\/([^/?#]+)/);
  if (b) return { name: 'bounty', slug: decodeURIComponent(b[1]) };
  const u = hash.match(/^#\/u\/([^/?#]+)/);
  if (u) return { name: 'profile', handle: decodeURIComponent(u[1]) };
  return { name: 'board' };
}

async function renderBoard() {
  setNav('board');
  document.title = 'make.fun bounties';
  const data = await getBounties();
  app.innerHTML = board(data, boardState);
  const filterInput = document.getElementById('board-filter');
  filterInput?.addEventListener('input', () => {
    boardState.q = filterInput.value;
    app.innerHTML = board(data, boardState);
    document.getElementById('board-filter')?.focus();
  });
  for (const chip of app.querySelectorAll('[data-filter]')) {
    chip.addEventListener('click', () => {
      boardState.filter = chip.dataset.filter;
      app.innerHTML = board(data, boardState);
      document.getElementById('board-filter')?.focus();
    });
  }
}

async function renderBounty(slug) {
  setNav('bounty');
  const b = await getBounty(slug);
  document.title = `${b.title} | make.fun bounties`;
  app.innerHTML = bounty(b);
}

async function renderLeaderboard(slug, page) {
  setNav('leaderboard');
  const [lb, b] = await Promise.all([getLeaderboard(slug), getBounty(slug).catch(() => null)]);
  document.title = `${lb.competition.title} leaderboard | make.fun bounties`;
  app.innerHTML = leaderboard(lb, b, page, PAGE_SIZE);
  for (const btn of app.querySelectorAll('[data-page]')) {
    btn.addEventListener('click', () => {
      location.hash = `#/bounty/${encodeURIComponent(slug)}/leaderboard?page=${btn.dataset.page}`;
    });
  }
}

async function renderProfile(handle) {
  setNav('');
  const p = await getProfile(handle);
  document.title = `${p.display_name ?? p.handle} (@${p.handle}) | make.fun bounties`;
  app.innerHTML = profile(p);
}

async function render() {
  window.__shotReady = false;
  const route = parseRoute(location.hash);
  try {
    if (route.name === 'bounty') await renderBounty(route.slug);
    else if (route.name === 'leaderboard') await renderLeaderboard(route.slug, route.page);
    else if (route.name === 'profile') await renderProfile(route.handle);
    else await renderBoard();
  } catch (err) {
    showError(err);
  }
  window.scrollTo(0, 0);
  window.__shotReady = true;
}

searchForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const q = searchInput.value.trim();
  if (q.startsWith('@')) {
    location.hash = `#/u/${encodeURIComponent(q.slice(1))}`;
  } else {
    boardState.q = q;
    boardState.filter = 'all';
    location.hash = '#/';
    render();
  }
});

window.addEventListener('hashchange', render);
render();
