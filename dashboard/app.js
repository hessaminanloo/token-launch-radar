/* Token Launch Radar — the page's logic. Reads window.RADAR (written by main.ts from the same
   board.json the gate reads, so what the page shows is what was handed in), renders the board,
   filters and sorts it in the browser, and opens a detail view per protocol with the model's
   four factors and the farm plan. No network, no framework, no storage. */

(function () {
  'use strict';
  var R = window.RADAR;
  if (!R) return;
  var rows = R.rows;
  var bySlug = {};
  rows.forEach(function (r) { bySlug[r.slug] = r; });

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function money(n) {
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return '$' + Math.round(n / 1e3) + 'K';
    return '$' + n;
  }
  function pct(v) {
    if (v === null || v === undefined) return '<span class="flat">—</span>';
    var cls = v > 0.05 ? 'up' : v < -0.05 ? 'down' : 'flat';
    return '<span class="' + cls + '">' + (v > 0 ? '+' : '') + v.toFixed(1) + '%</span>';
  }
  function ageText(days) {
    if (days === null || days === undefined) return '—';
    if (days >= 730) return (days / 365).toFixed(1) + 'y';
    return days + 'd';
  }
  function chainText(chains) {
    if (!chains.length) return '—';
    if (chains.length <= 2) return chains.join(', ');
    return chains[0] + ', ' + chains[1] + ' +' + (chains.length - 2);
  }

  /* ------------------------------------------------ header stats */
  var totalImplied = rows.reduce(function (s, r) { return s + r.implied_value_usd; }, 0);
  var stats = [
    [String(R.protocol_count), 'protocols scanned'],
    [String(R.board_size), 'pre-token ranked'],
    [String(R.watchlist_size) + ' / ' + String(R.watchlist_size), 'watchlist covered'],
    [money(totalImplied), 'total implied value'],
    [R.as_of, 'snapshot date'],
  ];
  $('stats').innerHTML = stats.map(function (s) {
    return '<div class="stat"><b>' + esc(s[0]) + '</b><span>' + esc(s[1]) + '</span></div>';
  }).join('');

  /* ------------------------------------------------ filter options */
  var cats = {}, chains = {};
  rows.forEach(function (r) {
    if (r.category) cats[r.category] = 1;
    r.chains.forEach(function (c) { chains[c] = 1; });
  });
  $('cat').innerHTML = '<option value="">All categories</option>' + Object.keys(cats).sort().map(function (c) {
    return '<option value="' + esc(c) + '">' + esc(c) + '</option>';
  }).join('');
  $('chain').innerHTML = '<option value="">All chains</option>' + Object.keys(chains).sort().map(function (c) {
    return '<option value="' + esc(c) + '">' + esc(c) + '</option>';
  }).join('');

  /* ------------------------------------------------ board rendering */
  var state = { q: '', seg: 'all', cat: '', chain: '', mintvl: 0, sort: 'rank' };

  function visible() {
    var q = state.q.trim().toLowerCase();
    var out = rows.filter(function (r) {
      if (state.seg === 'watch' && !r.watchlist) return false;
      if (state.seg === 'early' && r.watchlist) return false;
      if (state.cat && r.category !== state.cat) return false;
      if (state.chain && r.chains.indexOf(state.chain) < 0) return false;
      if (r.tvl_usd < state.mintvl) return false;
      if (q && r.name.toLowerCase().indexOf(q) < 0 && r.slug.indexOf(q) < 0) return false;
      return true;
    });
    var key = state.sort;
    out.sort(function (a, b) {
      if (key === 'tvl') return b.tvl_usd - a.tvl_usd;
      if (key === 'change') return (b.change_7d == null ? -1e9 : b.change_7d) - (a.change_7d == null ? -1e9 : a.change_7d);
      if (key === 'age') return (b.age_days == null ? -1 : b.age_days) - (a.age_days == null ? -1 : a.age_days);
      if (key === 'ratio') return b.implied_value_usd / b.tvl_usd - a.implied_value_usd / a.tvl_usd;
      return a.rank - b.rank;
    });
    return out;
  }

  function render() {
    var list = visible();
    $('count').textContent = list.length + ' of ' + rows.length + ' shown';
    $('empty').hidden = list.length > 0;
    $('rows').innerHTML = list.map(function (r) {
      var badge = r.watchlist ? '<span class="badge watch">Watchlist</span>' : '<span class="badge early">Early find</span>';
      return '<tr data-slug="' + esc(r.slug) + '"' + (r.watchlist ? ' class="watch"' : '') + '>' +
        '<td class="rank">' + r.rank + '</td>' +
        '<td class="name"><span class="pname">' + esc(r.name) + '</span>' + badge + '<br><span class="pslug">' + esc(r.slug) + '</span></td>' +
        '<td class="cat">' + esc(r.category || '—') + '</td>' +
        '<td class="chains">' + esc(chainText(r.chains)) + '</td>' +
        '<td class="num money">' + money(r.tvl_usd) + '</td>' +
        '<td class="num">' + pct(r.change_7d) + '</td>' +
        '<td class="num age">' + ageText(r.age_days) + '</td>' +
        '<td class="num value">' + money(r.implied_value_usd) + '</td>' +
        '<td class="num ratio">' + (r.implied_value_usd / r.tvl_usd).toFixed(2) + '×</td>' +
        '</tr>';
    }).join('');
  }

  /* ------------------------------------------------ detail drawer */
  function bar(label, value, frac) {
    var w = Math.max(3, Math.min(100, Math.round(frac * 100)));
    return '<div class="bar-row"><span class="bl">' + esc(label) + '</span>' +
      '<span class="bar-track"><span class="bar-fill" style="width:' + w + '%"></span></span>' +
      '<span class="bv">' + value + '</span></div>';
  }

  function openDetail(slug) {
    var r = bySlug[slug];
    if (!r) return;
    var m = r.model;
    var facts = [
      ['TVL', money(r.tvl_usd)],
      ['7d TVL change', r.change_7d === null ? 'not reported' : (r.change_7d > 0 ? '+' : '') + r.change_7d.toFixed(2) + '%'],
      ['Category', r.category || 'none recorded'],
      ['Chains', r.chains.length ? r.chains.join(', ') : '—'],
      ['Tracked since', r.listed_at || 'not recorded'],
      ['Tokenless age', r.age_days === null ? 'unknown' : r.age_days + ' days'],
      ['Segment', r.watchlist ? 'Watchlist (≥ ' + money(R.floor_usd) + ' TVL)' : 'Early find (below the floor)'],
      ['Token status', 'records no token'],
    ];
    $('drawer-card').innerHTML =
      '<button class="close" id="close" type="button">ESC ✕</button>' +
      '<h2>' + esc(r.name) + '</h2>' +
      '<div class="dslug">' + esc(r.slug) + ' · board rank #' + r.rank + ' of ' + rows.length + '</div>' +
      '<div class="dvalue">' + money(r.implied_value_usd) + '</div>' +
      '<div class="dlabel">Implied token value if it launched today — model ' + esc(R.model_version) + '</div>' +
      '<div class="facts">' + facts.map(function (f) {
        return '<div class="fact"><span>' + esc(f[0]) + '</span><b>' + esc(f[1]) + '</b></div>';
      }).join('') + '</div>' +
      '<h3>How the model gets there</h3>' +
      bar('TVL base', money(r.tvl_usd), Math.min(1, r.tvl_usd / 3e9)) +
      bar('Category ×', m.multiple.toFixed(2) + '×', m.multiple / 1.2) +
      bar('Momentum ×', m.momentum.toFixed(2) + '×', (m.momentum - 0.7) / 0.9) +
      bar('Maturity ×', m.maturity.toFixed(2) + '×', (m.maturity - 0.75) / 0.45) +
      bar('Breadth ×', m.breadth.toFixed(2) + '×', (m.breadth - 1) / 0.2) +
      '<h3>Farm plan — ' + r.farm_steps.length + ' steps</h3>' +
      '<ol class="steps">' + r.farm_steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol>';
    $('drawer').hidden = false;
    $('close').addEventListener('click', closeDetail);
  }
  function closeDetail() { $('drawer').hidden = true; }
  $('drawer').addEventListener('click', function (e) { if (e.target === $('drawer')) closeDetail(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeDetail(); });
  $('rows').addEventListener('click', function (e) {
    var tr = e.target.closest ? e.target.closest('tr[data-slug]') : null;
    if (tr) openDetail(tr.getAttribute('data-slug'));
  });

  /* ------------------------------------------------ live strip + model notes */
  $('live').innerHTML = '<h2>Already trading — kept off the board</h2>' +
    '<p class="note">These protocols record a token in the snapshot, so the market has already priced them. ' +
    'The radar lists them at their recorded market caps for scale and never ranks them: a market price is not a model claim.</p>' +
    '<div class="live-grid">' + R.live.map(function (l) {
      return '<div class="live-item"><span class="ln">' + esc(l.name) + ' <span class="ls">' + esc(l.symbol || '') + '</span></span>' +
        '<span class="lm">' + money(l.mcap_usd) + '</span></div>';
    }).join('') + '</div>';

  $('model').innerHTML = '<h2>The model — ' + esc(R.model_version) + '</h2>' +
    '<div class="formula">implied value = TVL × category multiple × momentum × maturity × breadth</div>' +
    '<div class="factors">' +
    '<div class="factor"><h3>Category multiple</h3><p>What launched tokens of this kind fetch per dollar of TVL: <b>chains 1.20×</b>, prediction markets 0.80×, perps 0.60×, DEXs 0.55×, lending 0.45×, RWA 0.38×, yield 0.30×, bridges 0.22×, curators 0.18×. One table for every protocol — no name is ever looked up.</p></div>' +
    '<div class="factor"><h3>Momentum</h3><p>Seven-day TVL change, clamped to −50%…+100%, at <b>0.6% of value per point</b> (×0.70 to ×1.60). A protocol growing into its launch is worth more than one shrinking into it; an unreported change counts as flat.</p></div>' +
    '<div class="factor"><h3>Maturity</h3><p><b>×0.75 to ×1.20</b> over four tokenless years. The longer a protocol has run without a token, the more its record proves — and the more pent-up the launch. An unrecorded listing day takes the mid value, ×0.90.</p></div>' +
    '<div class="factor"><h3>Breadth</h3><p><b>+2% per extra chain</b>, up to ten (×1.20). A protocol already distributed across chains launches to a wider holder base than a single-chain one of the same TVL.</p></div>' +
    '</div>' +
    '<p class="note">Every row passes the watchlist\u2019s own genuineness screen: it records no token, and it is not an exchange listing, a wrapped, staked or bridged product of an asset that already trades, or a versioned duplicate — ' + R.screened_out + ' pre-token entries were screened out on that rule, WBTC and the exchange listings among them, however large their TVL. The board is the watchlist in full plus the strongest screened protocols below its ' + money(R.floor_usd) + ' floor, ' + rows.length + ' rows in all. Open any row for its four factors and its farm plan.</p>';

  /* ------------------------------------------------ wiring + deep links */
  function bind(id, key, parse) {
    $(id).addEventListener('input', function () {
      state[key] = parse ? parse($(id).value) : $(id).value;
      render();
    });
    $(id).addEventListener('change', function () {
      state[key] = parse ? parse($(id).value) : $(id).value;
      render();
    });
  }
  bind('q', 'q');
  bind('seg', 'seg');
  bind('cat', 'cat');
  bind('chain', 'chain');
  bind('mintvl', 'mintvl', function (v) { return Number(v) || 0; });
  bind('sort', 'sort');

  var params = new URLSearchParams(window.location.search);
  if (params.get('q')) { $('q').value = params.get('q'); state.q = params.get('q'); }
  if (params.get('seg')) { $('seg').value = params.get('seg'); state.seg = params.get('seg'); }
  if (params.get('cat')) { $('cat').value = params.get('cat'); state.cat = params.get('cat'); }
  if (params.get('chain')) { $('chain').value = params.get('chain'); state.chain = params.get('chain'); }
  if (params.get('sort')) { $('sort').value = params.get('sort'); state.sort = params.get('sort'); }
  render();
  if (params.get('slug')) openDetail(params.get('slug'));
  window.__radarReady = true;
})();
