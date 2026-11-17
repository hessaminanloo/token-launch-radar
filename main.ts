// Token Launch Radar — the hand-in program (Node 22, standard library only).
//
// Reads the sealed snapshot (default /input/snapshot.json, or --input <file|dir>), ranks the
// pre-token protocols with the model in lib/model.ts, and writes the entry's outputs:
//
//   board.json    the ranked board the gate reads (rows with farm plans)
//   data.js       the same radar, as the script the dashboard page loads
//   dashboard/    this repository's static page, copied through
//   screenshots/  this repository's three screenshots, copied through
//   dossier.json  the judge's summary, written by vendor/makefun-board.ts from the files above
//
// Locally, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input ../input/snapshot.json
//
// The program is deterministic: the same snapshot in, the same bytes out, on every run.

import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { boardIssue, buildRadar, dataScript, parseSnapshot } from './lib/model.ts';
import { buildDossier } from './vendor/makefun-board.ts';

const repoDir = fileURLToPath(new URL('.', import.meta.url));

/** Read `--name value` or `--name=value` from the arguments, else the fallback. */
function option(name: string, fallback: string): string {
  const args = process.argv.slice(2);
  const at = args.indexOf(`--${name}`);
  if (at >= 0 && at + 1 < args.length) return args[at + 1]!;
  const eq = args.find((a) => a.startsWith(`--${name}=`));
  return eq === undefined ? fallback : eq.slice(name.length + 3);
}

function fail(message: string): never {
  process.stderr.write(`token launch radar: ${message}\n`);
  process.exit(1);
}

const inputArg = option('input', '/input');
const snapshotPath = inputArg.endsWith('.json') ? inputArg : join(inputArg, 'snapshot.json');
if (!existsSync(snapshotPath)) {
  fail(`no snapshot at ${snapshotPath} — pass --input <snapshot.json|directory> or mount the sealed /input`);
}
const outDir = option('output', process.env.MAKEFUN_OUTPUT_DIR ?? '/output');

const snapshot = parseSnapshot(readFileSync(snapshotPath, 'utf8'));
const { board, radar } = buildRadar(snapshot);
const issue = boardIssue(board, snapshot);
if (issue !== null) fail(`the model produced a board the gate refuses: ${issue}`);

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'board.json'), `${JSON.stringify({ rows: board })}\n`);
writeFileSync(join(outDir, 'data.js'), dataScript(radar));

/** Copy every regular file of a directory (dot-names skipped), returning the names copied. */
function copyDirectory(from: string, to: string): string[] {
  if (!existsSync(from)) return [];
  mkdirSync(to, { recursive: true });
  const names: string[] = [];
  for (const name of readdirSync(from)) {
    if (name.startsWith('.')) continue;
    const source = join(from, name);
    if (!statSync(source).isFile()) continue;
    copyFileSync(source, join(to, name));
    names.push(name);
  }
  return names;
}

const pageFiles = copyDirectory(join(repoDir, 'dashboard'), join(outDir, 'dashboard'));
if (!pageFiles.includes('index.html')) fail('dashboard/ holds no index.html to hand in');

const IMAGE_NAME = /^[A-Za-z0-9_][A-Za-z0-9._-]{0,127}$/;
const shots = copyDirectory(join(repoDir, 'screenshots'), join(outDir, 'screenshots'));
if (shots.length < 3 || shots.length > 4) {
  fail(`screenshots/ holds ${shots.length} images — hand in 3: the board, a detail view, a filtered view`);
}
for (const name of shots) {
  if (!IMAGE_NAME.test(name)) fail(`screenshots/${name}: names are letters, digits and . _ -, 1 to 128 characters`);
}

// Written last, from the finished output, so the dossier matches the files byte for byte.
writeFileSync(
  join(outDir, 'dossier.json'),
  buildDossier(outDir, {
    text_max_bytes: 65_536,
    screenshots: { max: 4, max_bytes: 524_288 },
    dashboard: { max_files: 400, max_bytes: 4_194_304 },
  }),
);

const watchRows = board.filter((r) => r.watchlist).length;
process.stdout.write(
  `token launch radar: ${snapshot.protocols.length} protocols read, ${board.length} pre-token rows ranked ` +
    `(${watchRows} watchlist, ${board.length - watchRows} early), ${radar.live.length} already-trading set aside\n` +
    `token launch radar: wrote board.json, data.js, dashboard/ (${pageFiles.length} files), ` +
    `screenshots/ (${shots.length} images) and dossier.json to ${outDir}\n`,
);
