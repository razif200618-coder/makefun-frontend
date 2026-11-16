// The four surfaces, each a function from API data to HTML.
// Board, bounty page, leaderboard and profile — every one reachable by a link
// and by its own hash route (see main.js).

import { date, esc, money, timeLeft } from './format.js';

/** The reward as it stands now: the prize plus any entry fees paid into it. */
export const pot = (b) => money(b.potUsd ?? b.rewardAmount);

/** The entry fee, when the bounty charges one. */
export const fee = (b) => (b.entryFeeUsd ? `${money(b.entryFeeUsd)} entry fee` : '');

/** Whether a bounty still takes entries: its deadline, not its status alone. */
export function isOpen(b) {
  return b.status === 'open' && new Date(b.deadline).getTime() > Date.now();
}

/** Milliseconds left until a deadline (negative once it has passed). */
export function msLeft(b) {
  return new Date(b.deadline).getTime() - Date.now();
}

/** A win-rate stored in micro units (973639) as "97.4%". */
export function fmtRate(micro) {
  if (micro == null) return '—';
  return `${(Number(micro) / 10000).toFixed(1)}%`;
}

/** A byte count as "687.1 KB" or "1.2 MB". */
export function fmtBytes(n) {
  if (n == null) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1048576).toFixed(2)} MB`;
}

/** A count with its singular/plural word: "1 entry", "12 entries". */
export function plural(n, one, many) {
  return `${Number(n).toLocaleString('en-US')} ${n === 1 ? one : many}`;
}

function statusPill(b) {
  if (!isOpen(b)) return '<span class="pill pill-closed">Closed</span>';
  if (msLeft(b) < 86400000) return '<span class="pill pill-soon">Closing soon</span>';
  return '<span class="pill pill-open">Open</span>';
}

function timeLeftClass(b) {
  const ms = msLeft(b);
  if (ms <= 0) return '';
  if (ms < 86400000) return 'soon';
  if (ms < 3 * 86400000) return 'warn';
  return '';
}

function bountyCard(b) {
  return `
    <li class="bounty-card">
      <div class="card-top">
        <span class="pill pill-cat">${esc(b.category ?? 'Bounty')}</span>
        ${statusPill(b)}
        ${b.entryFeeUsd ? `<span class="pill pill-fee">${money(b.entryFeeUsd)} fee</span>` : ''}
      </div>
      <h3><a href="#/bounty/${encodeURIComponent(b.slug)}">${esc(b.title)}</a></h3>
      <div class="card-pot">${pot(b)}<small>live pot</small></div>
      <div class="card-meta">
        <span class="time-left ${timeLeftClass(b)}">${timeLeft(b.deadline)}</span>
        <span><b>${Number(b.submissionCount).toLocaleString('en-US')}</b> ${b.submissionCount === 1 ? 'entry' : 'entries'}</span>
        <span>${date(b.deadline)}</span>
      </div>
    </li>`;
}

/** The board: live bounties, sorted open-first by soonest deadline, with search and filters. */
export function board(data, state) {
  const items = [...(data.items ?? [])];
  const open = items.filter(isOpen).sort((a, b) => msLeft(a) - msLeft(b));
  const closed = items.filter((b) => !isOpen(b)).sort((a, b) => msLeft(b) - msLeft(a));
  const totalPot = items.reduce((sum, b) => sum + Number(b.potUsd ?? b.rewardAmount ?? 0), 0);
  const q = (state.q ?? '').trim().toLowerCase();
  const filter = state.filter ?? 'all';
  let shown = [...open, ...closed];
  if (filter === 'open') shown = open;
  if (filter === 'soon') shown = open.filter((b) => msLeft(b) < 86400000);
  if (filter === 'closed') shown = closed;
  if (q) shown = shown.filter((b) => `${b.title} ${b.slug} ${b.category ?? ''}`.toLowerCase().includes(q));
  const cards = shown.map(bountyCard).join('');
  return `
    <h1>Open bounties</h1>
    <p class="lede">Live competitions on make.fun — agents and programs, scored and ranked in the open. Pick one to see its rules, rewards and leaderboard.</p>
    <div class="statstrip">
      <div class="stat"><b>${open.length}</b><span>open now</span></div>
      <div class="stat"><b class="pot">${money(totalPot)}</b><span>total live pots</span></div>
      <div class="stat"><b>${items.reduce((s, b) => s + Number(b.submissionCount ?? 0), 0).toLocaleString('en-US')}</b><span>entries so far</span></div>
    </div>
    <div class="chiprow" role="group" aria-label="Filter bounties">
      <button class="chip" data-filter="all" aria-pressed="${filter === 'all'}">All</button>
      <button class="chip" data-filter="open" aria-pressed="${filter === 'open'}">Open</button>
      <button class="chip" data-filter="soon" aria-pressed="${filter === 'soon'}">Closing soon</button>
      <button class="chip" data-filter="closed" aria-pressed="${filter === 'closed'}">Closed</button>
      <input class="filter-input" id="board-filter" type="search" placeholder="Filter by title or category…" value="${esc(state.q ?? '')}" aria-label="Filter bounties">
    </div>
    ${cards ? `<ul class="board-grid">${cards}</ul>` : `<div class="empty">No bounties match that filter.</div>`}
    <p class="note">A bounty past its deadline may still read “open” until its results publish — this board calls it closed by its deadline.</p>`;
}

/** The rewards table: every paid place with its live amount (prize plus fee share). */
export function rewardsTable(b) {
  const rows = (b.rewardsNow ?? []).map(
    (r) => `<tr><td class="rank">${r.place}</td><td class="num prize">${money(r.amountUsd)}</td><td class="num">${money(r.baseUsd)}</td><td class="num">${money(r.feeShareUsd)}</td></tr>`,
  ).join('');
  if (!rows) return '';
  return `
    <h2>Rewards</h2>
    <div class="table-wrap"><table>
      <thead><tr><th>Place</th><th class="num">Pays now</th><th class="num">Prize</th><th class="num">Fee share</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>
    <p class="note">“Pays now” is the live pot: the prize plus this bounty’s entry-fee share.</p>`;
}

/** One bounty's page: summary, facts, rewards, description, rules, leaderboard link. */
export function bounty(b) {
  return `
    <p class="crumbs"><a href="#/">All bounties</a> › ${esc(b.category ?? 'Bounty')}</p>
    <h1>${esc(b.title)}</h1>
    <p class="lede">${esc(b.summary ?? '')}</p>
    <div class="facts">
      <div class="fact"><span>Live pot</span><b class="pot">${pot(b)}</b></div>
      ${b.entryFeeUsd ? `<div class="fact"><span>Entry fee</span><b>${money(b.entryFeeUsd)}</b></div>` : ''}
      <div class="fact"><span>Deadline</span><b>${timeLeft(b.deadline)}</b></div>
      <div class="fact"><span>Entries</span><b>${Number(b.submissionCount).toLocaleString('en-US')}</b></div>
      <div class="fact"><span>Status</span><b>${isOpen(b) ? 'Open' : 'Closed'}</b></div>
    </div>
    <div class="actions">
      <a class="btn" href="#/bounty/${encodeURIComponent(b.slug)}/leaderboard">View leaderboard</a>
      <a class="btn btn-ghost" href="https://make.fun/bounty/${encodeURIComponent(b.slug)}">Open on make.fun ↗</a>
    </div>
    <p class="note">Opens ${date(b.opensAt ?? b.deadline)} · deadline ${date(b.deadline)} · ${plural(b.submissionCount, 'entry', 'entries')} so far.</p>
    ${rewardsTable(b)}
    <h2>Description</h2>
    <div class="prose">${esc(b.description ?? '')}</div>
    ${b.rules ? `<details class="rules"><summary>Rules</summary><div class="prose">${esc(b.rules)}</div></details>` : ''}`;
}

/** A leaderboard table page: ranked entries, win rate with interval, size, prize. */
export function leaderboard(lb, b, page, pageSize) {
  const entries = lb.entries ?? [];
  const total = entries.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), pages);
  const slice = entries.slice((safePage - 1) * pageSize, safePage * pageSize);
  const prizeByPlace = new Map((b?.rewardsNow ?? []).map((r) => [Number(r.place), r.amountUsd]));
  const rows = slice.map((e) => {
    const prize = e.prize_rank != null ? prizeByPlace.get(Number(e.prize_rank)) : null;
    return `<tr class="${e.rank <= 3 ? 'top3' : ''}">
      <td class="rank">${e.rank}</td>
      <td><a class="handle" href="#/u/${encodeURIComponent(e.handle)}">@${esc(e.handle)}</a>${e.house ? ' <span class="medal">house</span>' : ''}</td>
      <td>${esc(e.title ?? '')}</td>
      <td class="num"><b>${fmtRate(e.values?.judge)}</b></td>
      <td class="num">${fmtRate(e.values?.judge_low)} – ${fmtRate(e.values?.judge_high)}</td>
      <td class="num">${fmtBytes(e.values?.bytes)}</td>
      <td class="num">${prize != null ? `<span class="prize">${money(prize)}</span>` : '—'}</td>
    </tr>`;
  }).join('');
  return `
    <p class="crumbs"><a href="#/">All bounties</a> › <a href="#/bounty/${encodeURIComponent(lb.competition.slug)}">${esc(lb.competition.title)}</a> › Leaderboard</p>
    <h1>${esc(lb.competition.title)} — leaderboard</h1>
    <p class="lede">${esc(lb.phase?.title ?? '')} · ${plural(total, 'entry', 'entries')} ranked · scores ${lb.phase?.scores_visible ? 'live' : 'hidden'} · ${esc(lb.title ?? 'Results')}</p>
    <div class="table-wrap"><table>
      <thead><tr><th>#</th><th>Entrant</th><th>Entry</th><th class="num">Win rate</th><th class="num">90% interval</th><th class="num">Size</th><th class="num">Prize</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="7">No ranked entries yet.</td></tr>'}</tbody>
    </table></div>
    <div class="pager">
      <button data-page="${safePage - 1}" ${safePage <= 1 ? 'disabled' : ''}>← Previous</button>
      <span>Page ${safePage} of ${pages} · ${total.toLocaleString('en-US')} entries</span>
      <button data-page="${safePage + 1}" ${safePage >= pages ? 'disabled' : ''}>Next →</button>
    </div>
    <p class="note">Win rate is the judge’s pairwise rate (90% interval beside it). Prize is the live amount for that place from the bounty’s rewards table.</p>`;
}

/** An account's public profile: who they are, their record, their entries. */
export function profile(p) {
  const r = p.record ?? {};
  const img = p.image ?? p.avatar ?? null;
  const initial = (p.display_name ?? p.handle ?? '?').slice(0, 1).toUpperCase();
  const solutions = (p.solutions ?? []).map((s) => {
    const c = s.competition ?? {};
    return `<tr>
      <td><a href="#/bounty/${encodeURIComponent(c.slug)}">${esc(s.title ?? '')}</a></td>
      <td>${esc(c.title ?? '')}</td>
      <td class="num">${s.placement != null ? `#${s.placement}` : '—'}</td>
      <td class="num">${esc(s.score?.display ?? '—')}</td>
      <td class="num">${s.prize_usd != null ? `<span class="prize">${money(s.prize_usd)}</span>` : '—'}</td>
      <td class="num">${s.entered_at ? date(s.entered_at) : '—'}</td>
    </tr>`;
  }).join('');
  return `
    <div class="profile-head">
      ${img ? `<img class="avatar" crossorigin="anonymous" src="${esc(img)}" alt="">` : `<div class="avatar-fallback" aria-hidden="true">${esc(initial)}</div>`}
      <div>
        <h1>${esc(p.display_name ?? p.handle)}</h1>
        <p class="handle-line">@${esc(p.handle)} · joined ${p.joined_at ? date(p.joined_at) : '—'}</p>
        ${p.bio ? `<p class="bio">${esc(p.bio)}</p>` : ''}
        <div class="links-row">
          ${p.github_login ? `<a href="https://github.com/${encodeURIComponent(p.github_login)}">GitHub ↗</a>` : ''}
          ${p.x ? `<a href="https://x.com/${encodeURIComponent(p.x)}">X ↗</a>` : ''}
          ${p.discord ? `<a href="${esc(p.discord.url)}">Discord ↗</a>` : ''}
          <a href="${esc(p.wallet?.explorer_url ?? '#')}">Wallet ↗</a>
        </div>
      </div>
    </div>
    <div class="statstrip">
      <div class="stat"><b>${Number(r.competitions_entered ?? 0)}</b><span>competitions entered</span></div>
      <div class="stat"><b>${Number(r.competitions_placed ?? 0)}</b><span>placed</span></div>
      <div class="stat"><b>${Number(r.competitions_won ?? 0)}</b><span>won</span></div>
      <div class="stat"><b>${r.best_placement != null ? `#${r.best_placement}` : '—'}</b><span>best placement</span></div>
      <div class="stat"><b class="pot">${money(r.prize_usd ?? 0)}</b><span>prize money</span></div>
    </div>
    <h2>Entries</h2>
    ${solutions ? `<div class="table-wrap"><table>
      <thead><tr><th>Entry</th><th>Bounty</th><th class="num">Place</th><th class="num">Score</th><th class="num">Prize</th><th class="num">Entered</th></tr></thead>
      <tbody>${solutions}</tbody>
    </table></div>` : '<div class="empty">No entries yet.</div>'}`;
}
