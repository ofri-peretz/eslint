/**
 * SAFE - a CLI entry point. Included to show the rule visits every file in the
 * corpus and stays quiet on each, not merely on the first one.
 *
 * That distinction matters: `reportedRoots` is MODULE scope, so if this
 * project were missing its lock file only ONE of these fixtures could ever be
 * reported and the rest would score as misses. See `MEASUREMENT-PROBE.mts`
 * case 2, where the second file of a genuinely unlocked project is silent.
 */
const { parseArgs } = require('node:util');

function main(argv) {
  const { values } = parseArgs({
    args: argv.slice(2),
    options: { format: { type: 'string', default: 'stylish' } },
  });
  process.stdout.write(`format=${values.format}\n`);
  return 0;
}

module.exports = { main };
