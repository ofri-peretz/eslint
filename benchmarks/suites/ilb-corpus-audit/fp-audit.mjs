/**
 * False positives on the labelled corpus: which `safe/` fixtures fire, and from
 * which rule. A fixture under `safe/` carries a "This MUST NOT fire" comment —
 * anything reported here is noise by construction.
 *
 * Reported under both presets, because the two answer different questions:
 * `recommended` is what a consumer installs, `all` is the maximal
 * configuration. See harness.mjs.
 *
 * Run: node fp-audit.mjs
 */
import { fixtures, lint, makeEslint, ruleCount } from './harness.mjs';

const safe = fixtures('safe');

for (const preset of ['recommended', 'all']) {
  const eslint = makeEslint(preset);
  const byRule = {};
  let dirty = 0;

  console.log(`\n══ ${preset}  (${ruleCount(preset)} rules)\n`);

  for (const fixture of safe) {
    const msgs = await lint(eslint, fixture);
    if (!msgs.length) continue;
    dirty++;
    console.log(`${fixture.dir}/safe/${fixture.file}`);
    for (const m of msgs) {
      byRule[m.ruleId] = (byRule[m.ruleId] ?? 0) + 1;
      console.log(`    ${m.ruleId}  L${m.line}`);
    }
  }

  console.log(`\nFP ${dirty}/${safe.length} (${((dirty / safe.length) * 100).toFixed(1)}%)`);
  Object.entries(byRule)
    .sort((a, b) => b[1] - a[1])
    .forEach(([r, c]) => console.log(`  ${String(c).padStart(3)}  ${r}`));
}
