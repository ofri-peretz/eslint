/**
 * ilb:throughput — rule·file evaluations per second, for any competitor.
 *
 * Wall-clock is not a fair comparison between plugins with different rule counts: it
 * measures how much work was asked for, not how fast it was done. A plugin with 14 rules
 * will always "win" a stopwatch against one with 72, while doing a fifth of the analysis.
 *
 * The size-normalised metric is:
 *
 *     throughput = (rules enabled x files linted) / seconds
 *
 * This is the perf number to quote for every competitor, alongside — never instead of —
 * raw wall-clock, which is what a user actually feels.
 *
 * Usage:
 *   node suites/ilb-throughput/run.mjs [corpusDir]
 *
 * Register a competitor by adding an entry to CONTENDERS. Each is `{ label, plugins }`
 * where `plugins` maps an ESLint plugin prefix to the imported plugin object; every rule
 * the plugin exports is enabled, so the rule count is the plugin's full surface.
 */
import { ESLint } from 'eslint';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CORPUS = path.resolve(process.argv[2] ?? path.join(HERE, '../../corpus'));
const ROUNDS = 3;

const load = async (name) => {
  try {
    return (await import(name)).default;
  } catch {
    console.warn(`  skipping ${name} — not installed`);
    return null;
  }
};

const CONTENDERS = [
  {
    label: 'eslint-plugin-security',
    plugins: { security: await load('eslint-plugin-security') },
  },
  {
    label: 'Interlace (secure-coding + browser + node)',
    plugins: {
      'secure-coding': await load('eslint-plugin-secure-coding'),
      'browser-security': await load('eslint-plugin-browser-security'),
      'node-security': await load('eslint-plugin-node-security'),
    },
  },
].filter((c) => Object.values(c.plugins).every(Boolean));

/**
 * Vendor and build output must never enter a corpus.
 *
 * A scan that included minified webpack bundles once reported a competitor at 7,642 findings
 * vs our 2,932 — "we are 2.6x quieter". Excluding files no repo actually lints, the real
 * numbers were 2,469 vs 2,533: we were marginally NOISIER. 68% of their output came from
 * files nobody lints, because a rule that flags every `obj[key]` finds nothing else in
 * minified code. Any noise or throughput comparison that skips this filter is invalid.
 */
const VENDOR_DIR = /^(node_modules|\.git|dist|build|out|coverage|vendor|third_party|public|static|assets|fixtures|__fixtures__)$/;
const VENDOR_FILE = /\.min\.(js|css)$|\.bundle\.|chunk\.|\.d\.ts$/;
/** Minified code has no line structure; >500 chars/line is not human-authored source. */
const MAX_CHARS_PER_LINE = 500;

function isMinified(file) {
  const source = fs.readFileSync(file, 'utf8');
  const lines = source.split('\n').length;
  return source.length / lines > MAX_CHARS_PER_LINE;
}

const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return VENDOR_DIR.test(entry.name) ? [] : walk(full);
    if (!/\.(js|mjs|cjs|jsx|ts|tsx)$/.test(entry.name)) return [];
    if (VENDOR_FILE.test(entry.name)) return [];
    return isMinified(full) ? [] : [full];
  });

const files = walk(CORPUS);
if (files.length === 0) {
  console.error(`no lintable files under ${CORPUS}`);
  process.exit(1);
}

console.log(`corpus: ${files.length} files under ${path.relative(process.cwd(), CORPUS)}\n`);

const results = [];
for (const { label, plugins } of CONTENDERS) {
  const rules = {};
  for (const [prefix, plugin] of Object.entries(plugins)) {
    for (const rule of Object.keys(plugin.rules ?? {})) rules[`${prefix}/${rule}`] = 'error';
  }

  const eslint = new ESLint({
    cwd: CORPUS,
    overrideConfigFile: true,
    overrideConfig: [
      {
        files: ['**/*.{js,mjs,cjs,jsx,ts,tsx}'],
        languageOptions: { ecmaVersion: 'latest', sourceType: 'module' },
        plugins,
        rules,
      },
    ],
    warnIgnored: true,
  });

  const timings = [];
  let linted = 0;
  for (let round = 0; round < ROUNDS; round++) {
    const started = performance.now();
    const run = await eslint.lintFiles(files);
    timings.push(performance.now() - started);
    // A silently-ignored file costs no time and would inflate throughput — count real work only.
    linted = run.filter((r) => !r.messages.some((m) => !m.ruleId && /ignored|outside/i.test(m.message))).length;
  }
  timings.sort((a, b) => a - b);
  const median = timings[Math.floor(timings.length / 2)];
  const ruleCount = Object.keys(rules).length;
  const throughput = (ruleCount * linted) / (median / 1000);

  results.push({ label, ruleCount, linted, median, throughput });
}

if (results.some((r) => r.linted === 0)) {
  console.error('a contender linted 0 files — check the corpus and `files` pattern, not the numbers');
  process.exit(1);
}

const width = Math.max(...results.map((r) => r.label.length));
console.log('contender'.padEnd(width), 'rules', ' files', '  median', '   rule·file/s');
for (const r of results) {
  console.log(
    r.label.padEnd(width),
    String(r.ruleCount).padStart(5),
    String(r.linted).padStart(6),
    `${Math.round(r.median)}ms`.padStart(8),
    String(Math.round(r.throughput)).padStart(14),
  );
}

const best = results.reduce((a, b) => (b.throughput > a.throughput ? b : a));
const worst = results.reduce((a, b) => (b.throughput < a.throughput ? b : a));
if (best !== worst) {
  console.log(
    `\n${best.label} evaluates ${(best.throughput / worst.throughput).toFixed(2)}x more rule-work per second than ${worst.label}.`,
  );
  const fastest = results.reduce((a, b) => (b.median < a.median ? b : a));
  console.log(
    `Wall-clock still favours ${fastest.label} (${Math.round(fastest.median)}ms). Quote both — throughput is the fair` +
      ' comparison, wall-clock is what the user feels.',
  );
}
