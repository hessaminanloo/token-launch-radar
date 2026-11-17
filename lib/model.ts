// Token Launch Radar — the valuation model and board builder.
//
// One sealed DefiLlama snapshot goes in; one ranked board of pre-token protocols comes out.
// The board answers a single question per protocol: if this protocol issued a token today and
// the market priced it the way it prices comparable launched protocols, what would that token
// be worth? The answer is built only from the snapshot's own figures — TVL, the seven-day TVL
// change, the day DefiLlama began tracking the protocol, its category and its chain spread:
//
//   implied = TVL x category multiple x momentum x maturity x breadth
//
//   category multiple  what launched tokens of this kind fetch per dollar of TVL (see the table)
//   momentum           1 + 0.006 x clamp(change_7d, -50, +100): a growing protocol's token
//                      launches into demand, a shrinking one into doubt (factor 0.70 to 1.60)
//   maturity           0.75 + 0.45 x min(age_days, 1460) / 1460: four tokenless years is the
//                      strongest track record the model credits (factor 0.75 to 1.20)
//   breadth            1 + 0.02 x min(chains - 1, 10): distribution across chains supports a
//                      larger launch (factor 1.00 to 1.20)
//
// No protocol's name is ever looked up: the same arithmetic scores every row, and the dashboard
// shows each row's four factors so a reader can re-derive every value by hand. Protocols whose
// token already trades are never ranked here — they are listed separately at their recorded
// market caps, because a market price is not a model's claim.
//
// Selection applies the watchlist's own genuineness screen at every size, not only above its
// floor: a row must record no token and must not be an exchange listing, a wrapped, staked or
// bridged product of an asset that already trades, or a versioned duplicate of another entry.
// WBTC is Bitcoin already trading under a wrapper and an exchange's reserve listing has no
// launch of its own to radar, so neither is ranked, however large its TVL.

/** The snapshot's protocol entry: exactly the ten fields the sealed input carries. */
export interface SnapshotProtocol {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
}

/** The whole snapshot document. */
export interface Snapshot {
  as_of: string;
  source: string;
  floor_usd: number;
  protocols: SnapshotProtocol[];
  watchlist: string[];
}

/** The model's version label, named in the dashboard so a reader can cite the model that ranked. */
export const MODEL_VERSION = 'launch-radar-2';

/** Board size cap: the watchlist plus the strongest screened pre-token protocols below it. */
export const BOARD_ROWS = 220;

/** Categories that name a product of an asset that already trades, or an exchange listing. */
export const PRODUCT_CATEGORIES = new Set([
  'Bridge',
  'Canonical Bridge',
  'Liquid Staking',
  'Liquid Restaking',
  'Restaked BTC',
  'CEX',
]);

/** Exchange names the watchlist rule screens out as a name's first word. */
export const EXCHANGE_PREFIXES = ['Binance', 'Coinbase', 'Bybit', 'Kraken', 'Bitget', 'OKX', 'Bitfinex', 'Gemini'];

/** A name ending in a version marker: a space, then V2, v3, 2.0 and the like. */
export const VERSION_SUFFIX = /\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$/;

/**
 * The genuineness screen, the watchlist's own: no token recorded, not a product category, no
 * whole word wrapped, staked or staking in the name, no exchange's name first, no version
 * marker last. Applied to every candidate, so the board ranks only protocols with a launch
 * of their own still to come.
 */
export function isLaunchCandidate(p: SnapshotProtocol): boolean {
  if (!isPreToken(p)) return false;
  if (p.category !== null && PRODUCT_CATEGORIES.has(p.category)) return false;
  if (/\b(wrapped|staked|staking)\b/i.test(p.name)) return false;
  if (EXCHANGE_PREFIXES.some((e) => p.name === e || p.name.startsWith(`${e} `))) return false;
  if (VERSION_SUFFIX.test(p.name)) return false;
  return true;
}

/** How many already-trading protocols the dashboard lists beside the board, by market cap. */
export const LIVE_ROWS = 16;

/**
 * What a launched token fetches per dollar of TVL, by category, read off how the market prices
 * comparable tokenised protocols: trading venues and perps keep a large share of flow value,
 * chains price the network itself far above its DeFi TVL, curators keep only a thin fee share
 * of the assets they steer, and wrappers of other people's assets earn the least claim.
 */
export const CATEGORY_MULTIPLE: Record<string, number> = {
  'Chain': 1.2,
  'Prediction Market': 0.8,
  'Decentralized AI': 0.7,
  'AI Agents': 0.7,
  'Derivatives': 0.6,
  'Dexs': 0.55,
  'Launchpad': 0.5,
  'Privacy': 0.5,
  'Lending': 0.45,
  'NFT Marketplace': 0.45,
  'Liquid Restaking': 0.42,
  'Restaking': 0.4,
  'Synthetics': 0.4,
  'Interest Rate Derivatives': 0.4,
  'RWA': 0.38,
  'CDP': 0.35,
  'CDP Manager': 0.35,
  'Options': 0.35,
  'Options Vault': 0.35,
  'Yield': 0.3,
  'Yield Aggregator': 0.3,
  'Payments': 0.3,
  'Insurance': 0.3,
  'Stablecoin Issuer': 0.3,
  'Dual-Token Stablecoin': 0.3,
  'Algo-Stables': 0.3,
  'Uncollateralized Lending': 0.3,
  'Crypto Card Issuer': 0.3,
  'Token Locker': 0.3,
  'OTC Marketplace': 0.3,
  'Collateral Markets': 0.3,
  'Collateral Management': 0.3,
  'Reserve Currency': 0.3,
  'DOR': 0.3,
  'Liquid Staking': 0.28,
  'Basis Trading': 0.25,
  'Indexes': 0.25,
  'Liquidity Manager': 0.25,
  'Anchor BTC': 0.25,
  'Decentralized BTC': 0.25,
  'Restaked BTC': 0.25,
  'Bridge': 0.22,
  'Canonical Bridge': 0.22,
  'Cross Chain Bridge': 0.22,
  'Staking Pool': 0.2,
  'CeDeFi': 0.2,
  'Governance Incentives': 0.2,
  'Risk Curators': 0.18,
  'Onchain Capital Allocator': 0.18,
  'CEX': 0.15,
  'Farm': 0.15,
  'Leveraged Farming': 0.15,
};

/** The multiple for a category the table does not name (or none recorded). */
export const DEFAULT_MULTIPLE = 0.3;

/** Momentum: per-cent of clamped seven-day change converted into a value factor. */
export const MOMENTUM_PER_PCT = 0.006;
export const MOMENTUM_MIN_PCT = -50;
export const MOMENTUM_MAX_PCT = 100;

/** Maturity: the floor factor, the range above it, and the age at which credit stops growing. */
export const MATURITY_FLOOR = 0.75;
export const MATURITY_RANGE = 0.45;
export const MATURITY_DAYS = 1460;
/** The maturity factor credited when the snapshot records no listing day. */
export const UNKNOWN_AGE_FACTOR = 0.9;

/** Breadth: the factor added per extra chain, and the extra chains credited at most. */
export const BREADTH_PER_CHAIN = 0.02;
export const BREADTH_MAX_EXTRA = 10;

/** A protocol records no token when neither a CoinGecko id nor a symbol is recorded for it. */
export function isPreToken(p: SnapshotProtocol): boolean {
  return p.gecko_id === null && p.symbol === null;
}

/** Whole days from a `YYYY-MM-DD` listing day to the snapshot's `as_of` day, or null. */
export function ageDays(listedAt: string | null, asOf: string): number | null {
  if (listedAt === null) return null;
  const from = Date.parse(`${listedAt}T00:00:00Z`);
  const to = Date.parse(`${asOf}T00:00:00Z`);
  if (Number.isNaN(from) || Number.isNaN(to)) return null;
  return Math.max(0, Math.round((to - from) / 86_400_000));
}

/** The four factors of one protocol's implied value, each named so the page can show its work. */
export interface Valuation {
  multiple: number;
  momentum: number;
  maturity: number;
  breadth: number;
  age_days: number | null;
  implied_value_usd: number;
}

/** Score one protocol. Pure arithmetic on the snapshot's fields; nothing is looked up by name. */
export function valueProtocol(p: SnapshotProtocol, asOf: string): Valuation {
  const multiple = CATEGORY_MULTIPLE[p.category ?? ''] ?? DEFAULT_MULTIPLE;
  const change = p.change_7d === null ? 0 : Math.min(MOMENTUM_MAX_PCT, Math.max(MOMENTUM_MIN_PCT, p.change_7d));
  const momentum = 1 + MOMENTUM_PER_PCT * change;
  const age = ageDays(p.listed_at, asOf);
  const maturity = age === null ? UNKNOWN_AGE_FACTOR : MATURITY_FLOOR + MATURITY_RANGE * (Math.min(age, MATURITY_DAYS) / MATURITY_DAYS);
  const breadth = 1 + BREADTH_PER_CHAIN * Math.min(Math.max(p.chains.length - 1, 0), BREADTH_MAX_EXTRA);
  const implied = Math.max(1, Math.round(p.tvl_usd * multiple * momentum * maturity * breadth));
  return { multiple, momentum, maturity, breadth, age_days: age, implied_value_usd: implied };
}

/** One row of board.json: the gate's five fields, plus the record the dashboard renders. */
export interface BoardRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  listed_at: string | null;
  age_days: number | null;
  watchlist: boolean;
  token_status: 'pre-token';
  implied_value_usd: number;
  model: { multiple: number; momentum: number; maturity: number; breadth: number };
  farm_steps: string[];
}

/** A protocol whose token already trades, listed at the market's own figures, never ranked. */
export interface LiveRow {
  slug: string;
  name: string;
  symbol: string | null;
  category: string | null;
  tvl_usd: number;
  mcap_usd: number;
}

/** Everything the dashboard renders: the board, the live list, and the model's own statement. */
export interface Radar {
  model_version: string;
  as_of: string;
  floor_usd: number;
  protocol_count: number;
  watchlist_size: number;
  board_size: number;
  screened_out: number;
  live_size: number;
  rows: BoardRow[];
  live: LiveRow[];
}

/** Parse and lightly validate the sealed snapshot document. */
export function parseSnapshot(text: string): Snapshot {
  const doc = JSON.parse(text) as Snapshot;
  if (!Array.isArray(doc.protocols) || !Array.isArray(doc.watchlist)) {
    throw new Error('snapshot: protocols and watchlist must be arrays');
  }
  return doc;
}

/**
 * Build the board: every watchlist protocol, then the screened pre-token protocols below the
 * floor with the most TVL until the board is full, all ranked by implied value. Already-trading
 * protocols are set aside into the live list at their recorded market caps, and pre-token
 * products of assets that already trade are screened out of the ranking altogether.
 */
export function buildRadar(snapshot: Snapshot): { board: BoardRow[]; radar: Radar } {
  const watch = new Set(snapshot.watchlist);
  const candidates = snapshot.protocols.filter(isLaunchCandidate);
  const byTvl = [...candidates].sort((a, b) => b.tvl_usd - a.tvl_usd || (a.slug < b.slug ? -1 : 1));
  const chosen = new Map<string, SnapshotProtocol>();
  for (const slug of snapshot.watchlist) {
    const p = snapshot.protocols.find((x) => x.slug === slug);
    if (p !== undefined) chosen.set(slug, p);
  }
  for (const p of byTvl) {
    if (chosen.size >= BOARD_ROWS) break;
    chosen.set(p.slug, p);
  }

  const scored = [...chosen.values()].map((p) => ({ p, v: valueProtocol(p, snapshot.as_of) }));
  scored.sort((a, b) => b.v.implied_value_usd - a.v.implied_value_usd || b.p.tvl_usd - a.p.tvl_usd || (a.p.slug < b.p.slug ? -1 : 1));

  const board: BoardRow[] = [];
  let previous = Number.POSITIVE_INFINITY;
  scored.forEach(({ p, v }, i) => {
    // Whole-dollar rounding can tie two neighbours; the board's values never rise with rank.
    const value = Math.min(v.implied_value_usd, previous);
    previous = value;
    board.push({
      rank: i + 1,
      slug: p.slug,
      name: p.name,
      category: p.category,
      chains: p.chains,
      tvl_usd: p.tvl_usd,
      change_7d: p.change_7d,
      listed_at: p.listed_at,
      age_days: v.age_days,
      watchlist: watch.has(p.slug),
      token_status: 'pre-token',
      implied_value_usd: value,
      model: { multiple: v.multiple, momentum: v.momentum, maturity: v.maturity, breadth: v.breadth },
      farm_steps: farmPlan(p, snapshot.as_of),
    });
  });

  const live: LiveRow[] = snapshot.protocols
    .filter((p) => !isPreToken(p) && p.mcap_usd !== null)
    .sort((a, b) => (b.mcap_usd ?? 0) - (a.mcap_usd ?? 0))
    .slice(0, LIVE_ROWS)
    .map((p) => ({ slug: p.slug, name: p.name, symbol: p.symbol, category: p.category, tvl_usd: p.tvl_usd, mcap_usd: p.mcap_usd ?? 0 }));

  const radar: Radar = {
    model_version: MODEL_VERSION,
    as_of: snapshot.as_of,
    floor_usd: snapshot.floor_usd,
    protocol_count: snapshot.protocols.length,
    watchlist_size: snapshot.watchlist.length,
    board_size: board.length,
    screened_out: snapshot.protocols.filter(isPreToken).length - candidates.length,
    live_size: live.length,
    rows: board,
    live,
  };
  return { board, radar };
}

/** The first way this board breaks the gate's board rules, or null when it holds. */
export function boardIssue(board: BoardRow[], snapshot: Snapshot): string | null {
  if (board.length < 100 || board.length > 4000) return `board holds ${board.length} rows, outside 100..4000`;
  const slugs = new Set<string>();
  for (const row of board) {
    if (slugs.has(row.slug)) return `slug ${row.slug} appears twice`;
    slugs.add(row.slug);
    if (!snapshot.protocols.some((p) => p.slug === row.slug)) return `slug ${row.slug} is not in the snapshot`;
    if (row.farm_steps.length < 3 || row.farm_steps.length > 12) return `${row.slug}: ${row.farm_steps.length} farm steps`;
    for (const step of row.farm_steps) {
      const n = step.trim().length;
      if (n < 20 || n > 600) return `${row.slug}: a farm step of ${n} characters`;
    }
  }
  for (const slug of snapshot.watchlist) if (!slugs.has(slug)) return `watchlist slug ${slug} is missing`;
  const values = [...board].sort((a, b) => a.rank - b.rank).map((r) => r.implied_value_usd);
  for (let i = 0; i < values.length; i++) {
    if (board[i]!.rank !== i + 1) return 'ranks are not exactly 1..N';
    if (i > 0 && values[i]! > values[i - 1]!) return 'implied value rises as rank ascends';
  }
  if (values.every((v) => v === values[0])) return 'every implied value is the same';
  return null;
}

/** The dashboard's data file: the radar as a script the static page loads beside itself. */
export function dataScript(radar: Radar): string {
  return `window.RADAR = ${JSON.stringify(radar)};\n`;
}

// ------------------------------------------------------------------ farm plans
//
// Every row carries a plan a reader can start today. Plans are generated per protocol from its
// category family, its chains and its TVL tier — never from its name in a lookup table — and
// each step states the action, an estimated cost in dollars and the time it takes. The tiers
// scale the suggested position to the protocol's depth: a $500 position is a signal in a $20M
// protocol and a rounding error in a $2B one, so the plan says which.

/** Compact dollars for plan text: $2.5B, $340M, $75K. */
function fmtUsd(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(n >= 1e10 ? 0 : 2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(n >= 1e8 ? 0 : 1)}M`;
  if (n >= 1e3) return `$${Math.round(n / 1e3)}K`;
  return `$${n}`;
}

/** The working chains a plan names: the first two, and how many more there are. */
function chainPhrase(chains: string[]): string {
  if (chains.length === 0) return 'its home chain';
  if (chains.length === 1) return chains[0]!;
  if (chains.length === 2) return `${chains[0]} and ${chains[1]}`;
  return `${chains[0]} (and ${chains.length - 1} more chains it runs on)`;
}

/** What one transaction roughly costs on a chain, in the plan's plain words. */
function gasPhrase(chain: string): string {
  if (chain === 'Ethereum') return 'Ethereum mainnet gas of roughly $8–25 a transaction at quiet times';
  if (chain === 'Bitcoin') return 'Bitcoin network fees of roughly $1–5 a transaction';
  if (chain === 'Solana') return 'Solana fees of a few cents a transaction';
  if (chain === 'Tron') return 'Tron fees of roughly $1–3 a transaction';
  return `transaction fees of roughly $0.10–2 on ${chain}`;
}

/** Position size and patience, scaled to the protocol's depth. */
interface Tier { size: string; weeks: number; sessions: string }
function tierOf(tvl: number): Tier {
  if (tvl >= 1_000_000_000) return { size: '$2,000–5,000', weeks: 16, sessions: 'two or three sessions a week' };
  if (tvl >= 250_000_000) return { size: '$1,000–3,000', weeks: 14, sessions: 'two sessions a week' };
  if (tvl >= 75_000_000) return { size: '$500–1,500', weeks: 12, sessions: 'one or two sessions a week' };
  return { size: '$250–750', weeks: 10, sessions: 'one session a week' };
}

type Family = 'dex' | 'lending' | 'perps' | 'vault' | 'staking' | 'bridge' | 'rwa' | 'chain' | 'stable' | 'generic';

const FAMILY: Record<string, Family> = {
  'Dexs': 'dex', 'NFT Marketplace': 'dex',
  'Lending': 'lending', 'Uncollateralized Lending': 'lending',
  'Derivatives': 'perps', 'Options': 'perps', 'Options Vault': 'perps', 'Interest Rate Derivatives': 'perps',
  'Risk Curators': 'vault', 'Onchain Capital Allocator': 'vault', 'Yield': 'vault', 'Yield Aggregator': 'vault',
  'Basis Trading': 'vault', 'Liquidity Manager': 'vault', 'Farm': 'vault', 'Leveraged Farming': 'vault',
  'Indexes': 'vault', 'Collateral Markets': 'vault', 'Collateral Management': 'vault',
  'Liquid Staking': 'staking', 'Liquid Restaking': 'staking', 'Restaking': 'staking', 'Staking Pool': 'staking',
  'Anchor BTC': 'staking', 'Decentralized BTC': 'staking', 'Restaked BTC': 'staking',
  'Bridge': 'bridge', 'Canonical Bridge': 'bridge', 'Cross Chain Bridge': 'bridge',
  'RWA': 'rwa',
  'Chain': 'chain',
  'CDP': 'stable', 'CDP Manager': 'stable', 'Dual-Token Stablecoin': 'stable', 'Algo-Stables': 'stable',
  'Stablecoin Issuer': 'stable', 'Stablecoin Wrapper': 'stable',
};

function familyOf(category: string | null): Family {
  return FAMILY[category ?? ''] ?? 'generic';
}

/** The middle steps of a plan — the family's core loop — written for one protocol. */
function coreSteps(family: Family, p: SnapshotProtocol, tier: Tier, home: string): string[] {
  const name = p.name;
  const tvl = fmtUsd(p.tvl_usd);
  switch (family) {
    case 'dex':
      return [
        `Trade on ${name} itself: swap ${tier.size} of volume a week on ${home} in the pairs you would use anyway, favouring its deepest pools. Real, repeated volume is what DEX points and fee-tier snapshots count; budget ${gasPhrase(home)} plus spread on each swap.`,
        `Add a two-sided LP position of ${tier.size} to one of ${name}'s top-three pools by TVL and leave it in range: liquidity held through weekly snapshots is the behaviour a launch rewards, and the position earns swap fees while it waits. Rebalance when it drifts out of range, about monthly.`,
      ];
    case 'lending':
      return [
        `Supply ${tier.size} of a core asset (ETH or a major stablecoin) to ${name} on ${home} and keep it supplied: lenders are the constituency a lending token launches to, and time-weighted supplied balance is the usual measure. Cost is the deposit and withdrawal gas — ${gasPhrase(home)}.`,
        `Open a conservative borrow against that collateral at under 40% of its limit and repay it in full each month: a completed borrow-and-repay history marks the wallet as a real user of both sides of ${name}'s market, at an interest cost of roughly $5–30 a cycle on this size.`,
      ];
    case 'perps':
      return [
        `Trade ${name}'s perpetuals (or options) on ${home} with small, hedged positions: build genuine volume of about ${tier.size} a week rather than one large trade, since venue points weight consistent flow over spikes. Fees run roughly 0.02–0.06% a side, so a week of flow costs about $10–40.`,
        `Deposit margin and hold an open position across the weekly snapshot rather than round-tripping in a day: venues reward open interest and days active. Keep liquidation distance wide (under 3x effective leverage) so the farming position cannot be wiped out by one volatile session.`,
      ];
    case 'vault':
      return [
        `Deposit ${tier.size} into ${name}'s flagship vault or curated market on ${home} and hold the vault shares: curated vaults track deposit age and size for points and launch allocations. Entry cost is one approval plus one deposit — ${gasPhrase(home)} — and the yield is real while you wait.`,
        `Spread a second ${tier.size} across one more of ${name}'s vaults or markets rather than doubling the first: breadth across a curator's book is visible in its reporting and diversifies the single-vault risk. Review the vault's strategy and curator notes monthly; moving takes one withdrawal and one deposit.`,
      ];
    case 'staking':
      return [
        `Stake ${tier.size} of the underlying asset through ${name} on ${home} and hold the liquid staking or restaking receipt token: points in staking protocols accrue per token per day, so an early, uninterrupted hold is the whole strategy. Cost is the staking transaction — ${gasPhrase(home)}.`,
        `Put the receipt token to work in one integrated venue ${name} lists (a lending market or LP that accepts it) for a second layer of activity, keeping at least half unstaked-in-place so an integration's failure cannot take the whole position. Check the integration list monthly; integrations change.`,
      ];
    case 'bridge':
      return [
        `Bridge ${tier.size} to ${home === p.chains[0] ? 'a destination chain' : home} through ${name} and bridge it back the following week, then repeat on a steady rhythm: bridge points count completed routes and distinct weeks, not raw size. Each hop costs the bridge fee (about 0.05–0.3%) plus ${gasPhrase(home)}.`,
        `Vary the routes: use ${name} between at least two different chain pairs over the plan, and once a month leave funds on the far side for a week to use one local application. Route diversity and dwell time are what separate a user from a single repeated transfer in most bridge scoring.`,
      ];
    case 'rwa':
      return [
        `Complete ${name}'s onboarding on ${home} early — account, and KYC where its real-world-asset products require it — then mint or buy ${tier.size} of its flagship tokenised asset. Onboarding queues and eligibility lists are often fixed before a launch, so being inside early is the step that cannot be backfilled. Onboarding itself is free; the mint costs ${gasPhrase(home)}.`,
        `Hold the position and use one of ${name}'s secondary features (redemption window, collateral use, or its yield distributions) at least once a quarter, so the account shows a full product cycle rather than a single purchase. Keep the onboarding documents and transaction records; RWA launches verify holders carefully.`,
      ];
    case 'chain':
      return [
        `Bridge ${tier.size} of funds onto ${p.chains[0] ?? name} and become a regular user of the chain ${name} anchors: hold a native balance, make two or three transactions a week in its main applications, and keep the activity in one wallet. Chain launches reward persistent addresses, and ${gasPhrase(p.chains[0] ?? '')} keeps the habit cheap.`,
        `Use at least three different applications on the chain each month (a DEX, a lending market, a bridge out and back) and vote or stake in any governance the chain already runs: breadth across the ecosystem is the standard chain-airdrop screen, and it costs only the transactions themselves.`,
      ];
    case 'stable':
      return [
        `Mint or borrow ${tier.size} of ${name}'s stablecoin against collateral on ${home}, following its standard flow end to end: issuers count wallets that have held the stablecoin over time. Minting costs collateral interest of a few per cent a year plus ${gasPhrase(home)}; keep the health factor above 2.`,
        `Provide the stablecoin to its main liquidity pool paired with a major stablecoin, ${tier.size} on the ${name} side: stable-pair LPs earn fees with minimal price risk, and pool depth is a figure issuers publish. Add and remove once to learn the flow, then leave the position in place.`,
      ];
    default:
      return [
        `Use ${name}'s core product on ${home} with a real position of ${tier.size}, completing its full standard flow once end to end (deposit, action, withdrawal or claim) so the wallet reads as a genuine user. Direct cost is ${gasPhrase(home)} per transaction in that flow.`,
        `Return for ${tier.sessions} and repeat the core action at modest size rather than arriving once with a large amount: protocols with ${tvl} of TVL designing a launch look for returning wallets, and a steady history is built over the plan's ${tier.weeks} weeks, not in a single day.`,
      ];
  }
}

/**
 * One protocol's farm plan: setup, the family's core loop, a cadence, breadth, and the record
 * keeping that makes the work count — six steps, each with its cost and its clock.
 */
export function farmPlan(p: SnapshotProtocol, asOf: string): string[] {
  const name = p.name;
  const tier = tierOf(p.tvl_usd);
  const family = familyOf(p.category);
  const home = p.chains[0] ?? 'its home chain';
  const where = chainPhrase(p.chains);
  const age = ageDays(p.listed_at, asOf);
  const steps: string[] = [];

  steps.push(
    `Set up one dedicated wallet and fund it on ${home}: bridge or buy in enough for a ${tier.size} working position plus fees. ${name} runs on ${where}; starting on ${home} keeps gas lowest (${gasPhrase(home)}) and one wallet keeps the whole history attributable to you. Setup takes one session of about 30 minutes.`,
  );
  steps.push(...coreSteps(family, p, tier, home));
  steps.push(
    `Hold the cadence for ${tier.weeks} weeks: ${tier.sessions}, about 20 minutes each, re-checking the position, compounding any rewards back into ${name}, and logging each session's date and transaction hashes in a simple spreadsheet. Total running cost over the plan is roughly $20–80 in fees at this size, most of it in the first month.`,
  );
  if (p.chains.length > 1) {
    steps.push(
      `In week three, repeat the core action on a second chain ${name} supports — ${p.chains[1]} is the natural choice — with a smaller ${tier.size.split('–')[0]} position: multi-chain users are a distinct, usually rewarded cohort in launch allocations, and the extra cost is one bridge (about 0.1–0.3%) plus local fees.`,
    );
  } else {
    steps.push(
      `Join ${name}'s governance and community surfaces in week two — its forum, Discord or governance portal — and vote in at least one proposal a month if voting exists: governance participation is a cheap, commonly screened signal, costing minutes rather than money, and it cannot be backdated once a snapshot is announced.`,
    );
  }
  steps.push(
    age !== null && age > 730
      ? `Track the launch signals monthly: ${name} has run ${Math.floor(age / 365) === 1 ? 'over a year' : `${Math.floor(age / 365)} years`} with no token recorded, so watch for points programmes, foundation filings or governance threads about a token, and keep the position live until one lands. Cap total exposure at the ${tier.size} band — a launch is a possibility the plan prices, never a promise.`
      : `Track the launch signals monthly: points programmes, a foundation announcement or governance threads about a token are the usual precursors, and eligibility snapshots are rarely announced in advance, so keep the position live and the records current. Cap total exposure at the ${tier.size} band — a launch is a possibility the plan prices, never a promise.`,
  );
  return steps;
}
