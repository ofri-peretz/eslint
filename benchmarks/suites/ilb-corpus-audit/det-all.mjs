/**
 * Detection on the labelled corpus: how many `vulnerable/` fixtures are caught,
 * and by which rule. Each fixture carries a "This MUST be detected" comment.
 *
 * Reported under both presets — `recommended` is what a consumer installs,
 * `all` is the maximal configuration. Quoting the second as if it were the
 * first overstates coverage. See harness.mjs.
 *
 * Run: node det-all.mjs
 */
import { fixtures, lint, makeEslint, ruleCount } from './harness.mjs';

const vulnerable = fixtures('vulnerable');

for (const preset of ['recommended', 'all']) {
  const eslint = makeEslint(preset);
  const byRule = {};
  const missed = [];
  let caught = 0;

  for (const fixture of vulnerable) {
    const msgs = await lint(eslint, fixture);
    if (!msgs.length) {
      missed.push(`${fixture.dir}/${fixture.file}`);
      continue;
    }
    caught++;
    for (const m of msgs) byRule[m.ruleId] = (byRule[m.ruleId] ?? 0) + 1;
  }

  const pct = ((caught / vulnerable.length) * 100).toFixed(1);
  console.log(`\n══ ${preset}  (${ruleCount(preset)} rules)`);
  console.log(`DETECT ${caught}/${vulnerable.length} (${pct}%)`);
  if (missed.length) {
    console.log('\nundetected:');
    missed.forEach((m) => console.log(`  ${m}`));
  }
}
