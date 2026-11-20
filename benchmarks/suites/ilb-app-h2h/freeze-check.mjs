#!/usr/bin/env node
// Freeze-order check (plan 6.2 rule 4). Exits non-zero unless, in git history, the first commit touching each stage
// comes strictly after the previous stage, and nothing in stages a-c was touched after the first results commit.
//   (a) apps.json + truth/<app>.json  (b) truth/class-map.json  (c) configs/  (d) results/ilb-app-h2h/<app>.json
// Squash-merging collapses history and defeats this check: run it on the PR branch, before merge.
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = execFileSync('git', ['rev-parse', '--show-toplevel'], {
  cwd: here,
  encoding: 'utf8',
}).trim();
const rel = (p) => path.relative(repo, path.join(here, p));
const app = process.argv[2] ?? 'nodegoat';
const order = execFileSync('git', ['rev-list', '--reverse', 'HEAD'], {
  cwd: repo,
  encoding: 'utf8',
})
  .trim()
  .split('\n');
const idx = new Map(order.map((h, i) => [h, i]));
const commits = (paths) =>
  execFileSync('git', ['log', '--format=%H', '--', ...paths], {
    cwd: repo,
    encoding: 'utf8',
  })
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((h) => idx.get(h));
const stages = [
  ['a: apps.json + truth', [rel('apps.json'), rel(`truth/${app}.json`)]],
  ['b: class-map', [rel('truth/class-map.json')]],
  ['c: configs', [rel('configs')]],
  [
    'd: results',
    [
      path.relative(
        repo,
        path.join(repo, 'benchmarks/results/ilb-app-h2h', `${app}.json`),
      ),
    ],
  ],
];
const info = stages.map(([n, p]) => {
  const c = commits(p);
  return {
    n,
    first: Math.min(...c),
    last: Math.max(...c),
    none: c.length === 0,
  };
});
let ok = true;
for (const s of info)
  if (s.none) {
    console.error(`FAIL ${s.n}: no commit touches it`);
    ok = false;
  }
for (let i = 1; i < info.length && ok; i++)
  if (!(info[i].first > info[i - 1].first)) {
    console.error(
      `FAIL: ${info[i].n} first committed before or with ${info[i - 1].n}`,
    );
    ok = false;
  }
if (ok)
  for (const s of info.slice(0, 3))
    if (s.last > info[3].first) {
      console.error(
        `FAIL: ${s.n} changed after the first run was committed (needs a dated revision, old numbers kept)`,
      );
      ok = false;
    }
console.log(ok ? 'freeze order OK' : 'freeze order VIOLATED');
process.exit(ok ? 0 : 1);
