#!/usr/bin/env node
// With-and-without harness for skills/security-linting.
//
//   npm run eval:security-linting-skill            # print results, exit 1 on failure
//   npm run eval:security-linting-skill -- --write # also write RESULTS.md
//
// WITHOUT = the project as it is today: its existing flat config, or for the app
// with none, eslint-plugin-security alone (what most skills in the wild write).
// WITH    = the config skills/security-linting/scripts/render-config.mjs writes
// from the app's package.json, patched in the way the skill documents.
//
// Both arms run on ESLint 9 and ESLint 10. ESLint 10 is the repo's own. ESLint 9
// is installed once into a temp directory (only `eslint`, never one of our
// packages). Our plugins always load through the workspace symlinks in the
// repo's node_modules, which point at packages/*/dist: local builds, so no run
// of this harness downloads anything from the registry that is ours.
//
// Build first: npx turbo run build --filter='eslint-plugin-*'
import { execFileSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..');
const RENDER = join(REPO, 'skills/security-linting/scripts/render-config.mjs');
const MAP = JSON.parse(
  readFileSync(
    join(REPO, 'skills/security-linting/references/stack-map.json'),
    'utf8',
  ),
);
const PLANTS = JSON.parse(readFileSync(join(HERE, 'plants.json'), 'utf8')).apps;
const ESLINT9_VERSION = '9.39.4';
const WRITE = process.argv.includes('--write');

const failures = [];
const fail = (m) => failures.push(m);

// ---- ESLint 9 and 10 -------------------------------------------------------
const e9dir = join(tmpdir(), `interlace-skill-eslint-${ESLINT9_VERSION}`);
const e9ok = () => {
  try {
    return (
      JSON.parse(
        readFileSync(join(e9dir, 'node_modules/eslint/package.json'), 'utf8'),
      ).version === ESLINT9_VERSION
    );
  } catch {
    return false;
  }
};
if (!e9ok()) {
  mkdirSync(e9dir, { recursive: true });
  writeFileSync(
    join(e9dir, 'package.json'),
    '{"name":"eslint9-host","private":true}',
  );
  execFileSync(
    'npm',
    [
      'install',
      '--prefer-offline',
      '--no-audit',
      '--no-fund',
      '--ignore-scripts',
      `eslint@${ESLINT9_VERSION}`,
    ],
    { cwd: e9dir, stdio: 'inherit' },
  );
}
const ENGINES = [
  { label: 'ESLint 9', base: e9dir },
  { label: 'ESLint 10', base: REPO },
].map((e) => {
  const req = createRequire(join(e.base, 'x.js'));
  return {
    ...e,
    ESLint: req('eslint').ESLint,
    version: req('eslint/package.json').version,
  };
});
for (const e of ENGINES) console.log(`${e.label}: eslint@${e.version}`);
if (!ENGINES[0].version.startsWith('9.')) fail('ESLint 9 host is not 9.x');
if (!ENGINES[1].version.startsWith('10.')) fail('repo ESLint is not 10.x');

// ---- helpers ---------------------------------------------------------------
const sandbox = (app) => {
  const d = mkdtempSync(join(tmpdir(), 'interlace-skill-'));
  const work = join(d, 'project');
  cpSync(join(HERE, 'apps', app), work, { recursive: true });
  symlinkSync(join(REPO, 'node_modules'), join(work, 'node_modules'));
  return { d, work };
};

const render = (work) =>
  JSON.parse(
    execFileSync('node', [RENDER, '--dir', work, '--json', '--write'], {
      encoding: 'utf8',
    }),
  );

// The two documented edits: one import with the other imports, one spread
// inside the exported array. Throws on a shape it does not recognise, so a
// fixture config the skill could not patch fails loudly.
const applyPatch = (text, patch) => {
  const imports = [
    ...text.matchAll(/^(?:import .*;|const .* = require\(.*\);)$/gm),
  ];
  const last = imports.at(-1);
  let out = last
    ? text.slice(0, last.index + last[0].length) +
      `\n${patch.import}` +
      text.slice(last.index + last[0].length)
    : `${patch.import}\n${text}`;
  const close = out.match(/(\s*)\](\)?);?\s*$/);
  if (!close) throw new Error('config does not end in ]; or ]);');
  out =
    out.slice(0, close.index).replace(/,?\s*$/, '') +
    `,\n  ${patch.spread}\n` +
    out.slice(close.index + close[1].length);
  return out;
};

const lint = async (engine, cwd) => {
  const eslint = new engine.ESLint({ cwd });
  const results = await eslint.lintFiles(['src']);
  const out = [];
  for (const r of results)
    for (const m of r.messages)
      out.push({
        file: relative(realpathSync(cwd), realpathSync(r.filePath))
          .split(sep)
          .join('/'),
        line: m.line,
        rule: m.ruleId,
        severity: m.severity,
        fatal: Boolean(m.fatal),
        message: m.message.split('\n')[0],
      });
  return out;
};

const keyOf = (f) => `${f.file}:${f.line}:${f.rule}`;
const ruleSet = (fs) => new Set(fs.map((f) => f.rule).filter(Boolean));

// ---- the three apps --------------------------------------------------------
const rows = [];
const detail = {};
for (const app of Object.keys(PLANTS)) {
  const { d, work } = sandbox(app);
  const original = existsSync(join(work, 'eslint.config.mjs'))
    ? readFileSync(join(work, 'eslint.config.mjs'), 'utf8')
    : null;

  // WITHOUT config for an app that has none: eslint-plugin-security alone.
  let withoutText = original;
  if (original === null) {
    withoutText = [
      "import security from 'eslint-plugin-security';",
      "import tseslint from 'typescript-eslint';",
      'export default [',
      "  { files: ['**/*.{ts,tsx}'], languageOptions: { parser: tseslint.parser } },",
      '  security.configs.recommended,',
      '];',
      '',
    ].join('\n');
    writeFileSync(join(work, 'eslint.config.mjs'), withoutText);
  }
  const withoutFindings = {};
  for (const e of ENGINES) withoutFindings[e.label] = await lint(e, work);

  // WITH: render, then patch the existing config the documented way.
  if (original === null) rmSync(join(work, 'eslint.config.mjs'));
  const plan = render(work);
  if (plan.patch) {
    const patched = applyPatch(original, plan.patch);
    writeFileSync(join(work, plan.patch.file), patched);
    // Never remove a user's plugin: every original line must still be there.
    for (const line of original.split('\n').filter((l) => l.trim()))
      if (!patched.includes(line))
        fail(`${app}: patch dropped an original config line: ${line}`);
  }
  // Plugins must resolve to workspace builds, not registry copies.
  for (const a of plan.additions.filter(
    (x) => x.package !== 'eslint-plugin-security',
  )) {
    const real = realpathSync(join(work, 'node_modules', a.package));
    if (
      !real.startsWith(join(REPO, 'packages') + sep) ||
      !real.includes('eslint-plugin-')
    )
      fail(`${app}: ${a.package} resolved outside the workspace: ${real}`);
  }
  const withFindings = {};
  for (const e of ENGINES) {
    try {
      withFindings[e.label] = await lint(e, work);
    } catch (err) {
      fail(
        `${app}: config failed to load on ${e.label}: ${String(err.message).split('\n')[0]}`,
      );
      withFindings[e.label] = [];
    }
  }

  for (const e of ENGINES) {
    const w0 = withoutFindings[e.label];
    const w1 = withFindings[e.label];
    for (const f of [...w0, ...w1])
      if (f.fatal) fail(`${app} ${e.label}: fatal ${f.message}`);
    const have = ruleSet(w1);
    for (const p of PLANTS[app].required)
      if (!w1.some((f) => f.file === p.file && f.rule === p.rule))
        fail(`${app} ${e.label}: ${p.rule} did not fire in ${p.file}`);
    // Keeping the incumbent: every finding without must still be there with.
    const withKeys = new Set(w1.map(keyOf));
    for (const f of w0)
      if (!withKeys.has(keyOf(f))) fail(`${app} ${e.label}: lost ${keyOf(f)}`);
    const flagged = (x) =>
      w1.some((f) => f.file === x.file && f.rule === x.rule);
    rows.push({
      app,
      engine: e.label,
      without: w0.length,
      withCount: w1.length,
      added: w1.length - w0.length,
      newRules: [...have].filter((r) => !ruleSet(w0).has(r)).length,
      required: `${PLANTS[app].required.filter(flagged).length}/${PLANTS[app].required.length}`,
      requiredWithout: `${PLANTS[app].required.filter((p) => w0.some((f) => f.file === p.file && f.rule === p.rule)).length}/${PLANTS[app].required.length}`,
      unflagged: PLANTS[app].unflagged.map(
        (x) => `${x.rule} (${flagged(x) ? 'now flagged' : 'not flagged'})`,
      ),
    });
  }
  // Same findings on both majors.
  const a = withFindings['ESLint 9'].map(keyOf).sort().join('\n');
  const b = withFindings['ESLint 10'].map(keyOf).sort().join('\n');
  if (a !== b) fail(`${app}: ESLint 9 and 10 disagree on the WITH findings`);
  detail[app] = {
    install: plan.install,
    additions: plan.additions.map((x) => x.package),
    warnings: plan.warnings,
  };
  rmSync(d, { recursive: true, force: true });
}

// ---- every plugin the map can name loads and runs --------------------------
{
  const d = mkdtempSync(join(tmpdir(), 'interlace-skill-'));
  const work = join(d, 'project');
  mkdirSync(join(work, 'src'), { recursive: true });
  const dependencies = {};
  for (const p of MAP.plugins) {
    for (const dep of p.dependencies ?? []) dependencies[dep] = '*';
    for (const pre of p.dependencyPrefixes ?? [])
      dependencies[`${pre}sdk`] = '*';
  }
  writeFileSync(
    join(work, 'package.json'),
    JSON.stringify({
      name: 'all',
      private: true,
      type: 'module',
      dependencies,
      devDependencies: { typescript: '*' },
    }),
  );
  writeFileSync(join(work, 'src/a.ts'), 'export const a: number = 1;\n');
  symlinkSync(join(REPO, 'node_modules'), join(work, 'node_modules'));
  const plan = render(work);
  const expected = MAP.plugins.length + 1; // every plugin + the baseline
  if (plan.additions.length !== expected)
    fail(`all-plugins: rendered ${plan.additions.length} of ${expected}`);
  for (const e of ENGINES) {
    try {
      await lint(e, work);
      rows.push({
        app: `all ${plan.additions.length} plugins`,
        engine: e.label,
        without: '-',
        withCount: 'loads',
        added: '-',
        newRules: '-',
        required: 'n/a',
        requiredWithout: 'n/a',
        unflagged: [],
      });
    } catch (err) {
      fail(
        `all-plugins: failed to load on ${e.label}: ${String(err.message).split('\n')[0]}`,
      );
    }
  }
  rmSync(d, { recursive: true, force: true });
}

// ---- report ----------------------------------------------------------------
const versions = Object.fromEntries(
  readdirSync(join(REPO, 'packages'))
    .filter((p) => p.startsWith('eslint-plugin-'))
    .map((p) => [
      p,
      JSON.parse(
        readFileSync(join(REPO, 'packages', p, 'package.json'), 'utf8'),
      ).version,
    ]),
);
const secVersion = JSON.parse(
  readFileSync(
    join(REPO, 'node_modules/eslint-plugin-security/package.json'),
    'utf8',
  ),
).version;
const head =
  '| App | Engine | Findings without | Findings with | Planted issues flagged without | Planted issues flagged with | New rule ids |\n| :-- | :-- | --: | --: | --: | --: | --: |';
const table = rows
  .map(
    (r) =>
      `| ${r.app} | ${r.engine} | ${r.without} | ${r.withCount} | ${r.requiredWithout} | ${r.required} | ${r.newRules} |`,
  )
  .join('\n');
const unflagged = Object.entries(PLANTS)
  .flatMap(([app]) =>
    rows
      .filter((r) => r.app === app && r.engine === 'ESLint 10')
      .flatMap((r) => r.unflagged.map((u) => `- ${app}: ${u}`)),
  )
  .join('\n');
const date = new Date().toISOString().slice(0, 10);
const md = `# security-linting skill: with and without

Measured ${date} by \`npm run eval:security-linting-skill -- --write\`. Not a claim about assistants: it measures the config the skill specifies, rendered by \`skills/security-linting/scripts/render-config.mjs\`, on three fixture apps in \`evals/security-linting-skill/apps/\`.

- Without: the app's existing flat config, or \`eslint-plugin-security\` alone where the app has none.
- With: the rendered config, patched into the existing one without removing a line of it.
- Engines: ESLint ${ENGINES[0].version} and ${ENGINES[1].version}. \`eslint-plugin-security\` ${secVersion}. Interlace plugins are the local workspace builds (\`packages/*/dist\`), not registry installs.
- Exit code is non-zero if a config fails to load, a planted issue the harness requires is not flagged, a finding present without is lost with, or the two ESLint majors disagree.

${head}
${table}

Planted issues that no rule flagged (recorded, not required):

${unflagged || '- none'}

Read it as a floor, not a score: "findings" counts every message including the baseline's, and the fixtures were written by us, so they show the wiring works, not how often these rules are right on your code. For that, see the measurement on the docs page "Use alongside eslint-plugin-security".

Plugin versions measured: ${Object.entries(versions)
  .filter(([k]) => MAP.plugins.some((p) => p.package === k))
  .map(([k, v]) => `${k}@${v}`)
  .join(', ')}.
`;
console.log('\n' + md);
if (WRITE) {
  const { format } = await import('prettier');
  writeFileSync(
    join(HERE, 'RESULTS.md'),
    await format(md, { parser: 'markdown', singleQuote: true }),
  );
}

if (failures.length) {
  console.error('\nFAILED:\n' + failures.map((f) => `  - ${f}`).join('\n'));
  process.exit(1);
}
console.log(
  '\nOK: every config loads on ESLint 9 and 10 and flags every required planted issue.',
);
