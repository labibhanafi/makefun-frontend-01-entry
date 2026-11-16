[![make.fun · makefun-frontend-01](https://make.fun/badge/makefun-frontend-01.svg)](https://make.fun/bounty/makefun-frontend-01?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)
[![rank](https://make.fun/badge/makefun-frontend-01/labibhanafi/makefun-frontend-01-entry/rank.svg)](https://make.fun/bounty/makefun-frontend-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)
[![reward](https://make.fun/badge/makefun-frontend-01/labibhanafi/makefun-frontend-01-entry/reward.svg)](https://make.fun/bounty/makefun-frontend-01?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)

# Potboard — a fast, accessible make.fun frontend

Potboard is a complete, read-only frontend for [make.fun](https://make.fun), built as plain
static files with no framework and no build step. It is an entry to make.fun's
[makefun-frontend-01](https://make.fun/bounty/makefun-frontend-01) bounty,
“Build the best make.fun frontend”.

## The four surfaces

All data is live from `https://make.fun/api` (GET only), on hash routes:

- `#/` — the **bounty board**: every open bounty with its live pot (base reward plus entry
  fees paid so far), entry fee or “free to enter”, live countdown and deadline, entry count,
  category, skills and sponsor. Search filters and sorting (pot, deadline, entries) work
  in place. A bounty past its deadline is grouped under “Closed — awaiting results” even
  while the API still calls it open, because the deadline — not the status — decides
  whether it still takes entries.
- `#/bounty/<slug>` — the **bounty page**: summary, the full description with its rules,
  a rewards table computed from the live pot (each place's base prize, its share of the
  entry fees, and what it pays now), entry fee, dates and status, with a link onward to
  the leaderboard.
- `#/bounty/<slug>/leaderboard` — the **leaderboard**: the table is built from the API's
  own column description, so judge win rates, Elo, sizes and validity all render correctly
  for any bounty; long boards page 25 rows at a time, and every handle links to its profile.
- `#/profile/<handle>` — the **public profile**: picture, bio, join date, wallet and social
  links, the competitive record (entered / placed / won / podiums / best placement / prizes),
  and every entry with its bounty, score, placement and prize.

## Performance and speed

- **First load is three files**: `index.html`, one stylesheet, and the router module
  (plus two tiny shared helpers). Each view loads lazily behind a literal `import()`
  per route. No framework, no webfonts — a system font stack only.
- **ETag revalidation**: repeat API fetches send `If-None-Match` and reuse the cached
  body on a 304 (the API's ETags turn over each minute, so this is the intended pattern).
- **Request dedup**: concurrent calls for the same path share one in-flight promise.
- **No rebuilds on tick**: a single one-second timer rewrites only the countdown text
  nodes; search and sort re-render only the results region.
- Every API string is escaped before it reaches HTML; navigation is fully keyboard
  friendly with a skip link, landmarks, labelled controls and visible focus.

## Run it

Node 22.18+, standard library only:

```sh
node serve.ts --port 8091   # serves app/ at http://localhost:8091
```

Hand the entry in (copies `app/` and `screenshots/` to the output directory and writes
`dossier.json` with the vendored library):

```sh
mkdir -p out
MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Layout

- `main.ts` — the hand-in program (copies the app, writes the dossier).
- `serve.ts` — a small static dev server for `app/`.
- `app/` — the frontend: `index.html`, `style.css`, `main.js` (router), `api.js`
  (ETag cache + dedup), `format.js`, and one lazily loaded module per view in `app/views/`.
- `screenshots/` + `shots.json` — three captures of the running app on live data.
- `vendor/makefun-frontend.ts` — make.fun's dossier library, vendored unchanged from the kit.

## License

MIT — see `LICENSE`.
