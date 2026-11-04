/**
 * Model-to-rule fidelity: does each Quint model agree with the rule it models?
 *
 * Each model is a pair under models/<plugin>/: `<model>.qnt` states what the
 * rule should decide, `<model>.cjs` turns a sampled input into real source.
 * Quint samples the inputs (ITF traces), this script lints each one with the
 * built rule and compares the verdicts.
 *
 * Exit 1 when:
 *   - a model and its rule disagree on any input (the divergence is printed
 *     with the code that caused it), or
 *   - a model's sampled inputs do not cover its declared `domain`, or
 *   - a rule in one of PLUGINS has no model.
 *
 *   npm run fidelity                          # every model
 *   npm run fidelity -- node-security         # one plugin
 *   npm run fidelity -- node-security/no_weak_hash_algorithm
 *
 * Needs built plugins (`dist/`); Quint is fetched pinned through npx.
 */
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const REPO = path.resolve(__dirname, '../../..');
const { Linter } = require(require.resolve('eslint', { paths: [REPO] }));
const tsParser = require(
  require.resolve('@typescript-eslint/parser', { paths: [REPO] }),
);
const MODELS_DIR = path.join(__dirname, 'models');
const QUINT = '@informalsystems/quint@0.33.1';
const DEFAULT_TRACES = 300;
/** Fixed, so a run is reproducible: the same seed samples the same inputs. */
const SEED = 1329;
/** Every rule these plugins export must have a model. */
const PLUGINS = [
  'secure-coding',
  'nestjs-security',
  'browser-security',
  'node-security',
  'vercel-ai-security',
  'jwt-security',
  'mongodb-security',
];

const loadPlugin = (short) => {
  const p = require(
    `${REPO}/packages/eslint-plugin-${short}/dist/src/index.js`,
  );
  return p.default ?? p;
};

/** Sample the model with Quint into a temp dir and return every ITF state. */
function loadStates(qnt, traces) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fidelity-'));
  try {
    execFileSync(
      'npx',
      [
        '-y',
        QUINT,
        'run',
        qnt,
        '--max-steps=1',
        `--n-traces=${traces}`,
        `--seed=${SEED}`,
        `--max-samples=${traces + 1000}`,
        `--out-itf=${path.join(dir, 't_{seq}.itf.json')}`,
        '--verbosity=0',
      ],
      { stdio: 'inherit' },
    );
    return fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('.itf.json'))
      .flatMap(
        (f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')).states,
      );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function lint(short, cfg, code, ruleOpts, filename) {
  const linter = new Linter({ configType: 'flat' });
  const id = `${short}/${cfg.rule}`;
  const msgs = linter.verify(
    code,
    [
      {
        files: ['**/*.{js,jsx,ts,tsx}'],
        plugins: { [short]: loadPlugin(short) },
        languageOptions: { parser: cfg.parser ?? tsParser },
        rules: { [id]: ['error', ...(ruleOpts ? [ruleOpts] : [])] },
      },
    ],
    { filename: filename ?? 'src/app.ts' },
  );
  const fatal = msgs.find((m) => m.fatal);
  if (fatal)
    throw new Error(
      `parse error in synthesized code: ${fatal.message}\n${code}`,
    );
  return msgs.some((m) => m.ruleId === id);
}

function run(short, model) {
  const cfg = require(path.join(MODELS_DIR, short, `${model}.cjs`));
  const key = cfg.input ?? cfg.key;
  const verdict = cfg.model ?? ((s) => s.verdict);
  const states = loadStates(
    path.join(MODELS_DIR, short, `${model}.qnt`),
    cfg.traces ?? DEFAULT_TRACES,
  );
  const tally = { TP: 0, FP: 0, FN: 0, TN: 0 };
  const divergences = new Map();
  const covered = new Set();
  for (const s of states) {
    const modelSays = verdict(s);
    const code = cfg.code(s);
    // `filename` may vary per input, e.g. to model `allowInTests`.
    const file =
      typeof cfg.filename === 'function' ? cfg.filename(s) : cfg.filename;
    const ruleSays = lint(short, cfg, code, cfg.config?.(s), file);
    covered.add(key(s));
    tally[modelSays ? (ruleSays ? 'TP' : 'FN') : ruleSays ? 'FP' : 'TN']++;
    if (modelSays !== ruleSays) {
      divergences.set(
        `${key(s)} model=${modelSays} rule=${ruleSays}`,
        code.trim().split('\n').join(' / '),
      );
    }
  }
  return {
    id: `${short}/${model}`,
    cfg,
    states: states.length,
    covered: covered.size,
    tally,
    divergences,
  };
}

const all = fs.readdirSync(MODELS_DIR).flatMap((short) =>
  fs
    .readdirSync(path.join(MODELS_DIR, short))
    .filter((f) => f.endsWith('.cjs'))
    .map((f) => [short, f.slice(0, -4)]),
);
const filters = process.argv.slice(2);
const selected = filters.length
  ? all.filter(([short, m]) =>
      filters.some((f) => f === short || f === `${short}/${m}`),
    )
  : all;

let failed = 0;
for (const [short, model] of selected) {
  const r = run(short, model);
  const complete = r.covered === r.cfg.domain;
  console.log(
    `\n== ${r.id} (${r.cfg.rule}) samples=${r.states} inputs=${r.covered}/${r.cfg.domain}`,
    JSON.stringify(r.tally),
  );
  for (const [k, code] of r.divergences)
    console.log(`  DIVERGES ${k}\n      code: ${code}`);
  if (!complete)
    console.log(`  INCOMPLETE: raise \`traces\` or fix \`domain\``);
  if (r.divergences.size || !complete) failed++;
}

// Completeness: for every plugin run whole (no filter, or named bare), so a
// single-model run stays usable and each CI matrix job still checks its plugin.
const missing = [];
const whole = filters.length
  ? PLUGINS.filter((short) => filters.includes(short))
  : PLUGINS;
if (whole.length) {
  // Only the plugins checked here, so one broken model elsewhere cannot
  // crash an unrelated plugin's job.
  const modelled = new Set(
    all
      .filter(([short]) => whole.includes(short))
      .map(
        ([short, m]) =>
          `${short}/${require(path.join(MODELS_DIR, short, `${m}.cjs`)).rule}`,
      ),
  );
  for (const short of whole) {
    for (const name of Object.keys(loadPlugin(short).rules)) {
      if (!modelled.has(`${short}/${name}`)) missing.push(`${short}/${name}`);
    }
  }
  if (missing.length)
    console.log(`\nNO MODEL (${missing.length}):\n  ${missing.join('\n  ')}`);
}

console.log(
  `\n${selected.length} model(s), ${failed} failing, ${missing.length} rule(s) unmodelled`,
);
if (failed || missing.length) process.exit(1);
