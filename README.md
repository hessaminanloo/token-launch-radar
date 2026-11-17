# Token Launch Radar — token-launch-radar

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/hessaminanloo/token-launch-radar/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/hessaminanloo/token-launch-radar/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

**Token Launch Radar** reads one sealed DefiLlama snapshot (758 protocols, snapshot date
2026-11-14) and ranks the protocols whose token does not exist yet by an **implied value**:
what a token would be worth if the protocol launched today and the market priced it the way
it prices comparable launched protocols. Every row carries a concrete farm plan — the steps
to position for that launch, what they cost and how long they take.

The board holds **198 rows**: the snapshot's full 40-protocol watchlist plus 158 early finds
below its $50M floor. Protocols whose token already trades are never ranked — the dashboard
lists the largest of them separately at their recorded market caps.

## The model

```
implied value = TVL × category multiple × momentum × maturity × breadth
```

- **Category multiple** — what launched tokens of this kind fetch per dollar of TVL, one table
  for every protocol (chains 1.20×, prediction markets 0.80×, perps 0.60×, DEXs 0.55×,
  lending 0.45×, RWA 0.38×, yield 0.30×, bridges 0.22×, curators 0.18×, …). No protocol's
  name is ever looked up.
- **Momentum** — the 7-day TVL change, clamped to −50%…+100%, at 0.6% of value per point
  (×0.70 to ×1.60). Unreported counts as flat.
- **Maturity** — ×0.75 to ×1.20 over four tokenless years since DefiLlama began tracking the
  protocol; an unrecorded listing day takes ×0.90.
- **Breadth** — +2% per extra chain, up to ten (×1.20).

**Selection** applies the watchlist's own genuineness screen at every size: a row must record
no token and must not be an exchange listing, a wrapped, staked or bridged product of an asset
that already trades, or a versioned duplicate. 144 pre-token entries are screened out on that
rule — WBTC and the exchange listings among them, however large their TVL.

Each farm plan is generated per protocol from its category family, its chains and its TVL
tier: setup and funding, the family's core loop (supply/borrow, LP, staking, vault deposits,
trading flow, bridging, RWA onboarding…), a weekly cadence, breadth or governance, and the
record keeping that makes the work count — every step with a dollar cost and a clock.

## Run it

```sh
mkdir -p out
MAKEFUN_OUTPUT_DIR=out node main.ts --input <path-to-snapshot.json>
```

Node 22+, standard library only, no network. The program is deterministic: the same snapshot
in, the same bytes out. It writes `board.json`, `data.js` (the dashboard's data), `dashboard/`,
`screenshots/` and `dossier.json` (via the vendored `vendor/makefun-board.ts`) to the output
directory.

## Layout

- `main.ts` — the hand-in program: snapshot in, board + dashboard data + dossier out.
- `lib/model.ts` — the model: the category table, the four factors, the genuineness screen,
  board assembly and validation, and the per-protocol farm-plan generator.
- `dashboard/` — the static page (board, filters, per-protocol detail view, the
  already-trading strip, the model statement). Renders fully offline; source under 64 KB.
- `screenshots/` — three real renders of the built dashboard at 1440×900: the board, a
  protocol detail view, a filtered view.
- `vendor/makefun-board.ts` — the kit's dossier library, unchanged.

## License

MIT — see `LICENSE`.
