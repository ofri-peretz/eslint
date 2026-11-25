#!/usr/bin/env node
// Reads a project's package.json files and prints the ESLint flat config the
// security-linting skill specifies. Zero dependencies, Node 20+, offline.
//
//   node render-config.mjs [--dir <project>] [--json] [--write]
//
// It never edits an existing config file and never removes a plugin. With an
// existing flat config it writes ONE new file (eslint.security.config.mjs|cjs)
// and prints the two-line patch to apply by hand. With no config it writes a
// fresh eslint.config.mjs. Dry run unless --write is given.
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const MAP = JSON.parse(
  readFileSync(join(HERE, '..', 'references', 'stack-map.json'), 'utf8'),
);

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const opt = (n, d) => {
  if (!args.includes(n)) return d;
  const v = args[args.indexOf(n) + 1];
  if (!v || v.startsWith('--')) {
    console.error(
      `${n} needs a value. Usage: render-config.mjs [--dir <project>] [--json] [--write] [--force]`,
    );
    process.exit(2);
  }
  return v;
};
const dir = resolve(opt('--dir', process.cwd()));

const readJson = (p) => {
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
};

// ---- read the project ------------------------------------------------------
const root = readJson(join(dir, 'package.json'));
if (!root) {
  console.error(`No package.json in ${dir}`);
  process.exit(2);
}
const manifests = [root];
const ws = Array.isArray(root.workspaces)
  ? root.workspaces
  : (root.workspaces?.packages ?? []);
for (const pattern of ws) {
  if (pattern.endsWith('/*')) {
    const base = join(dir, pattern.slice(0, -2));
    if (!existsSync(base)) continue;
    for (const d of readdirSync(base)) {
      const m = readJson(join(base, d, 'package.json'));
      if (m) manifests.push(m);
    }
  } else {
    const m = readJson(join(dir, pattern, 'package.json'));
    if (m) manifests.push(m);
  }
}
const deps = new Set();
const fields = new Set();
for (const m of manifests) {
  for (const k of [
    'dependencies',
    'devDependencies',
    'peerDependencies',
    'optionalDependencies',
  ])
    for (const n of Object.keys(m[k] ?? {})) deps.add(n);
  for (const f of Object.keys(m)) fields.add(f);
}

const eslintSpec =
  root.devDependencies?.eslint ?? root.dependencies?.eslint ?? '';
const eslintMajor = Number(/(\d+)/.exec(eslintSpec)?.[1]) || null;

const FLAT = ['js', 'mjs', 'cjs', 'ts', 'mts', 'cts'].map(
  (e) => `eslint.config.${e}`,
);
const RC = [
  '.eslintrc',
  '.eslintrc.js',
  '.eslintrc.cjs',
  '.eslintrc.json',
  '.eslintrc.yml',
  '.eslintrc.yaml',
];
const flatFile = FLAT.find((f) => existsSync(join(dir, f)));
const rcFile = RC.find((f) => existsSync(join(dir, f)));
const existingText = flatFile ? readFileSync(join(dir, flatFile), 'utf8') : '';
const configStyle = flatFile ? 'flat' : rcFile ? 'eslintrc' : 'none';

const ts = deps.has('typescript') || existsSync(join(dir, 'tsconfig.json'));
const reactish = ['react', 'react-dom', 'preact', 'next'].some((d) =>
  deps.has(d),
);
const pm = existsSync(join(dir, 'pnpm-lock.yaml'))
  ? 'pnpm add -D'
  : existsSync(join(dir, 'yarn.lock'))
    ? 'yarn add -D'
    : existsSync(join(dir, 'bun.lock')) || existsSync(join(dir, 'bun.lockb'))
      ? 'bun add -d'
      : 'npm install --save-dev';

// ---- choose plugins --------------------------------------------------------
const matches = (p) =>
  p.always ||
  (p.dependencies ?? []).some((d) => deps.has(d)) ||
  (p.dependencyPrefixes ?? []).some((pre) =>
    [...deps].some((d) => d.startsWith(pre)),
  ) ||
  (p.fields ?? []).some((f) => fields.has(f));

const ident = (pkg) =>
  pkg
    .replace(/^eslint-plugin-/, '')
    .replace(/-(\w)/g, (_, c) => c.toUpperCase());

const baselineWired = /eslint-plugin-security(?![\w-])/.test(existingText);
const picked = [];
if (!baselineWired)
  picked.push({
    ...MAP.baseline,
    id: 'security',
    why: MAP.baseline.why,
    examples: [],
    baseline: true,
  });
for (const p of MAP.plugins)
  if (matches(p)) {
    const already = new RegExp(
      p.package.replace(/[-/]/g, '\\$&') + '(?![\\w-])',
    ).test(existingText);
    if (!already) picked.push({ ...p, id: ident(p.package) });
  }

const tsParserNeeded =
  ts && !/typescript-eslint|@typescript-eslint\/parser/.test(existingText);

// ---- render ----------------------------------------------------------------
const cjs =
  flatFile?.endsWith('.cjs') ||
  flatFile?.endsWith('.cts') ||
  (flatFile?.endsWith('.js') && root.type !== 'module');
const imp = (id, pkg) =>
  cjs ? `const ${id} = require('${pkg}');` : `import ${id} from '${pkg}';`;
const lines = [];
lines.push(
  '// Security lint wiring from the security-linting skill',
  '// (https://github.com/ofri-peretz/eslint/tree/main/skills/security-linting).',
  '// ESLint 9 and 10 flat config. Nothing here replaces a plugin you already use.',
);
if (configStyle === 'flat')
  lines.push(
    `// Add \`...interlaceSecurity\` to the array your ${flatFile} exports.`,
  );
lines.push('');
for (const p of picked) lines.push(imp(p.id, p.package));
if (tsParserNeeded) lines.push(imp('tseslint', 'typescript-eslint'));
lines.push('');

const entries = [];
if (configStyle !== 'flat')
  entries.push(`  { ignores: ['dist/**', 'build/**', 'coverage/**'] },`);
if (tsParserNeeded)
  entries.push(
    `  // TypeScript files need a TypeScript parser.`,
    `  { files: ['**/*.{ts,tsx,mts,cts}'], languageOptions: { parser: tseslint.parser } },`,
  );
if (configStyle !== 'flat' && reactish && !ts)
  entries.push(
    `  { files: ['**/*.{js,jsx}'], languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } } },`,
  );
for (const p of picked)
  entries.push(`  // ${p.package}: ${p.why}`, `  ${p.id}.configs.${p.preset},`);

const body = `[\n${entries.join('\n')}\n]`;
lines.push(cjs ? `module.exports = ${body};` : `export default ${body};`);
lines.push('');
const contents = lines.join('\n');

const fileName =
  configStyle === 'flat'
    ? `eslint.security.config.${cjs ? 'cjs' : 'mjs'}`
    : 'eslint.config.mjs';

const patch =
  configStyle === 'flat'
    ? {
        file: flatFile,
        import: cjs
          ? `const interlaceSecurity = require('./${fileName}');`
          : `import interlaceSecurity from './${fileName}';`,
        spread: '...interlaceSecurity,',
        note: 'Add the import with your other imports and the spread as an element of the exported array (inside defineConfig([...]) or tseslint.config(...) too). Keep every entry already there.',
      }
    : null;

const install = [
  ...new Set([
    ...picked.map((p) => p.package),
    ...(tsParserNeeded ? ['typescript-eslint'] : []),
  ]),
].filter((n) => !deps.has(n));

const warnings = [];
if (configStyle === 'eslintrc')
  warnings.push(
    `Found ${rcFile}. ESLint 9 and 10 ignore eslintrc files. Migrate it (npx @eslint/migrate-config ${rcFile}) and keep every plugin it lists; this script wrote a new flat config that does not yet contain your old rules.`,
  );
if (eslintMajor && eslintMajor < 9)
  warnings.push(
    `package.json asks for ESLint ${eslintMajor}. Flat config needs ESLint 8.57 or newer; our plugins support ESLint 8.40+, 9 and 10. Upgrading to 9 or 10 is recommended.`,
  );
if (
  picked.some((p) => p.id === 'browserSecurity') &&
  picked.some((p) => p.id === 'nodeSecurity')
)
  warnings.push(
    'Browser and Node signals were both found. If they live in separate folders, scope browser-security with `files: [...]` so it does not run on server code.',
  );

const plan = {
  dir,
  eslintMajor,
  configStyle,
  existingConfig: flatFile ?? rcFile ?? null,
  baselineAlreadyWired: baselineWired,
  typescript: ts,
  additions: picked.map((p) => ({
    package: p.package,
    preset: p.preset,
    why: p.why,
    limits: p.limits ?? null,
  })),
  install: install.length ? `${pm} ${install.join(' ')}` : null,
  file: { path: fileName, contents },
  patch,
  warnings,
};

if (flag('--write')) {
  if (existsSync(join(dir, fileName)) && !flag('--force')) {
    console.error(
      `${fileName} already exists; not overwriting. Review it, or pass --force to replace it.`,
    );
    process.exit(3);
  }
  writeFileSync(join(dir, fileName), contents);
}

if (flag('--json')) {
  console.log(JSON.stringify(plan, null, 2));
} else {
  console.log(
    `# ${configStyle === 'flat' ? 'Patch existing' : 'New'} flat config -> ${fileName}\n`,
  );
  for (const a of plan.additions)
    console.log(`- ${a.package} (${a.preset}): ${a.why}`);
  if (plan.install) console.log(`\nInstall: ${plan.install}`);
  if (patch)
    console.log(
      `\nIn ${patch.file}: ${patch.import}  +  ${patch.spread}\n${patch.note}`,
    );
  for (const w of warnings) console.log(`\nWARNING: ${w}`);
  console.log(
    `\n--- ${fileName}${flag('--write') ? ' (written)' : ' (dry run, pass --write)'} ---\n${contents}`,
  );
}
