#!/usr/bin/env node
// Pools per-app result JSONs into counts with Wilson 95% intervals. Counts, not a composite score.
// Pooling is dominated by the app with the most findings (Juice Shop), so per-app rows are printed alongside.
// Usage: node pooled.mjs  (reads the latest revision of each app; writes benchmarks/results/ilb-app-h2h/summary.json)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const dir = path.resolve(here, '../../results/ilb-app-h2h');
const files = {
  nodegoat: 'nodegoat.rev3.json',
  dvna: 'dvna.rev2.json',
  juiceshop: 'juiceshop.json',
};
const wilson = (k, n) => {
  if (!n) return [null, null];
  const z = 1.96,
    p = k / n,
    d = 1 + (z * z) / n;
  const c = p + (z * z) / (2 * n),
    h = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
  return [+((c - h) / d).toFixed(3), +((c + h) / d).toFixed(3)];
};
const pct = (k, n) => (n ? +((k / n) * 100).toFixed(1) : null);
const data = Object.fromEntries(
  Object.entries(files).map(([a, f]) => [
    a,
    JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')),
  ]),
);
const out = { sources: files, configs: {}, perApp: {} };
for (const cfg of ['A', 'B', 'C']) {
  const row = {
    items: 0,
    itemsHit: 0,
    lintableY: 0,
    lintableYHit: 0,
    findings: 0,
    tp: 0,
    unlistedReal: 0,
    loc: 0,
  };
  for (const [app, r] of Object.entries(data)) {
    const s = r.summary[cfg];
    const truth = JSON.parse(
      fs.readFileSync(
        path.join(
          here,
          `truth/${app === 'juiceshop' ? 'juiceshop' : app}.json`,
        ),
        'utf8',
      ),
    );
    const yIds = new Set(
      truth.items.filter((i) => i.lintable === 'y').map((i) => i.id),
    );
    const hits = new Set(s.itemsHit);
    row.items += s.truthItems;
    row.itemsHit += hits.size;
    row.lintableY += yIds.size;
    row.lintableYHit += [...hits].filter((h) => yIds.has(h)).length;
    row.findings += s.findings;
    row.tp += s.tp;
    row.unlistedReal += s.unlistedReal;
    row.loc += s.loc;
    (out.perApp[app] ??= {})[cfg] = {
      items: s.truthItems,
      itemsHit: hits.size,
      findings: s.findings,
      tp: s.tp,
      unlistedReal: s.unlistedReal,
      precisionStrict: s.precisionStrict,
      recallAll: s.recallAll,
      recallLintableY: s.recallLintableY,
      findingsPerKLoc: s.findingsPerKLoc,
    };
  }
  out.configs[cfg] = {
    ...row,
    recall: {
      value: pct(row.itemsHit, row.items),
      wilson95: wilson(row.itemsHit, row.items),
    },
    recallLintableY: {
      value: pct(row.lintableYHit, row.lintableY),
      wilson95: wilson(row.lintableYHit, row.lintableY),
    },
    precisionStrict: {
      value: pct(row.tp, row.findings),
      wilson95: wilson(row.tp, row.findings),
    },
    precisionLenient: {
      value: pct(row.tp + row.unlistedReal, row.findings),
      wilson95: wilson(row.tp + row.unlistedReal, row.findings),
    },
    findingsPerKLoc: +((row.findings / row.loc) * 1000).toFixed(1),
  };
}
fs.writeFileSync(
  path.join(dir, 'summary.json'),
  JSON.stringify(out, null, 2) + '\n',
);
for (const [c, r] of Object.entries(out.configs)) {
  console.log(
    `${c}: recall ${r.itemsHit}/${r.items} ${r.recall.value}% ${JSON.stringify(r.recall.wilson95)} | lintable-y ${r.lintableYHit}/${r.lintableY} ${r.recallLintableY.value}% ${JSON.stringify(r.recallLintableY.wilson95)} | strict ${r.tp}/${r.findings} ${r.precisionStrict.value}% ${JSON.stringify(r.precisionStrict.wilson95)} | lenient ${r.precisionLenient.value}% ${JSON.stringify(r.precisionLenient.wilson95)} | ${r.findingsPerKLoc}/kLOC`,
  );
}
