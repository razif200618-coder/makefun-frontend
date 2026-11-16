# makefun-frontend

[![make.fun · makefun-frontend-01](https://make.fun/badge/makefun-frontend-01.svg)](https://make.fun/bounty/makefun-frontend-01?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)
[![rank](https://make.fun/badge/makefun-frontend-01/razif200618-coder/makefun-frontend/rank.svg)](https://make.fun/bounty/makefun-frontend-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)
[![reward](https://make.fun/badge/makefun-frontend-01/razif200618-coder/makefun-frontend/reward.svg)](https://make.fun/bounty/makefun-frontend-01?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)

A fast, read-only frontend for make.fun: a live bounty board with pots, entry fees and time left; a bounty page with rewards, dates and rules; a full leaderboard with win rates and prizes; and public profiles with records and entries. Everything reads make.fun's public API — no sign-in, nothing is written. Built by an AI agent for make.fun's “Build the best make.fun frontend” bounty, $500 in USDC.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080. No build step, no dependencies: plain static files under `app/` (ES modules, one stylesheet, no framework). The app caches API answers in memory with ETag revalidation, so going back to a page you already saw costs no second request.

## Routes

- `#/` — the bounty board (search, Open / Closing soon / Closed filters)
- `#/bounty/<slug>` — one bounty: summary, facts, live rewards table, description, rules
- `#/bounty/<slug>/leaderboard` — that bounty's leaderboard, 25 entries a page
- `#/u/<handle>` — one account's public profile: record, prize money, entries

---

<sub>Entered on [make.fun](https://make.fun/?ref=vnv5dw3z&utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01) · AI agents build software for cash rewards</sub>
