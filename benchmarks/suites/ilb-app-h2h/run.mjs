#!/usr/bin/env node
// ilb-app-h2h: graded head-to-head on a vulnerable app, ours (local build) vs eslint-plugin-security.
// Usage: node benchmarks/suites/ilb-app-h2h/run.mjs --app nodegoat [--clone-dir <dir>] [--out <file>]
// One command, end to end: pin-checked clone, toolchain receipt, 4 configs, labelling, results JSON.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../../..');
const require = createRequire(path.join(repoRoot, 'package.json'));
const arg = (n, d) => {
  const i = process.argv.indexOf(`--${n}`);
  return i > -1 ? process.argv[i + 1] : d;
};
const appName = arg('app', 'nodegoat');
// apps.json holds NodeGoat; later apps live in apps.<name>.json so the frozen file is never edited.
const apps = Object.assign(
  {},
  ...fs
    .readdirSync(here)
    .filter((f) => /^apps(\.[a-z0-9-]+)?\.json$/.test(f))
    .sort()
    .map((f) => JSON.parse(fs.readFileSync(path.join(here, f), 'utf8'))),
);
const app = apps[appName];
if (!app) throw new Error(`unknown app ${appName}`);
const truth = JSON.parse(
  fs.readFileSync(path.join(here, app.truthFile), 'utf8'),
);
// Base map (frozen with NodeGoat) plus an optional per-app map for classes that app adds.
const classMap = {
  ...JSON.parse(
    fs.readFileSync(path.join(here, 'truth/class-map.json'), 'utf8'),
  ).classes,
  ...(fs.existsSync(path.join(here, `truth/class-map.${appName}.json`))
    ? JSON.parse(
        fs.readFileSync(
          path.join(here, `truth/class-map.${appName}.json`),
          'utf8',
        ),
      ).classes
    : {}),
};
const manualPath = path.join(here, 'labels', `${appName}.manual.json`);
const manual = fs.existsSync(manualPath)
  ? JSON.parse(fs.readFileSync(manualPath, 'utf8'))
  : {};
const out = arg(
  'out',
  path.join(repoRoot, 'benchmarks/results/ilb-app-h2h', `${appName}.json`),
);
const cloneDir = arg(
  'clone-dir',
  path.join(os.tmpdir(), `ilb-app-h2h-${appName}`),
);
const sh = (cmd, args, cwd) =>
  execFileSync(cmd, args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();

// 1. Pin-checked clone (outside the repo). Never npm install inside the app.
if (!fs.existsSync(path.join(cloneDir, '.git'))) {
  sh('git', ['clone', '--quiet', app.repo, cloneDir]);
}
sh('git', ['checkout', '--quiet', app.commit], cloneDir);
const head = sh('git', ['rev-parse', 'HEAD'], cloneDir);
if (head !== app.commit)
  throw new Error(`refusing unpinned checkout: ${head} != ${app.commit}`);

// 2. Toolchain receipt. Abort if a plugin of ours resolves under node_modules (that would be npm, not local).
const ours = {
  'secure-coding': 'eslint-plugin-secure-coding',
  'node-security': 'eslint-plugin-node-security',
  'express-security': 'eslint-plugin-express-security',
  'mongodb-security': 'eslint-plugin-mongodb-security',
  'sequelize-security': 'eslint-plugin-sequelize-security',
};
const toolchain = {
  node: process.version,
  platform: `${process.platform}-${process.arch}`,
  eslint: require('eslint/package.json').version,
  tsParser: require('@typescript-eslint/parser/package.json').version,
  ourRepo: {
    head: sh('git', ['rev-parse', 'HEAD'], repoRoot),
    dirtyPackages: sh(
      'git',
      ['status', '--porcelain', '--', 'packages'],
      repoRoot,
    )
      .split('\n')
      .filter(Boolean),
  },
  plugins: {},
};
for (const [short, dir] of Object.entries(ours)) {
  const pkgDir = path.join(repoRoot, 'packages', dir);
  const dist = path.join(pkgDir, 'dist/src/index.js');
  if (!fs.existsSync(dist))
    throw new Error(`${dir} not built: run npm run build (turbo) first`);
  const real = fs.realpathSync(dist);
  if (real.includes(`${path.sep}node_modules${path.sep}`))
    throw new Error(`${dir} resolves under node_modules (npm), not local`);
  const version = JSON.parse(
    fs.readFileSync(path.join(pkgDir, 'package.json'), 'utf8'),
  ).version;
  const srcNewest = Math.max(
    ...walk(path.join(pkgDir, 'src')).map((f) => fs.statSync(f).mtimeMs),
  );
  if (fs.statSync(dist).mtimeMs < srcNewest)
    throw new Error(`${dir} dist is older than src: rebuild`);
  toolchain.plugins[short] = {
    name: dir,
    version,
    path: path.relative(repoRoot, real),
    source: 'local-build',
  };
}
const secPkg = require('eslint-plugin-security/package.json');
if (secPkg.version !== '4.2.1')
  throw new Error(
    `eslint-plugin-security must be 4.2.1, got ${secPkg.version}`,
  );
toolchain.plugins.security = {
  name: 'eslint-plugin-security',
  version: secPkg.version,
  source: 'npm',
};

function walk(d) {
  return fs
    .readdirSync(d, { withFileTypes: true })
    .flatMap((e) =>
      e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)],
    );
}

// 3. Lint. cwd INSIDE the clone, explicit config; fail on ignored-file messages (trap 1).
const { ESLint } = require('eslint');
const incumbent = await import(
  pathToFileURL(path.join(here, 'configs/incumbent.config.mjs'))
);
const oursCfg = await import(
  pathToFileURL(path.join(here, 'configs/ours.config.mjs'))
);
// Per-app driver config (C) may live in configs/ours.<app>.config.mjs so the frozen file is untouched.
const appOursPath = path.join(here, `configs/ours.${appName}.config.mjs`);
const appOurs = fs.existsSync(appOursPath)
  ? await import(pathToFileURL(appOursPath))
  : null;
const cCfg = (appOurs?.C ?? oursCfg.C)[appName];
const cLabel = appOurs?.C_LABEL ?? 'B + mongodb-security recommended';
const configs = {
  A: {
    side: 'incumbent',
    cfg: incumbent.A,
    label: 'eslint-plugin-security recommended',
  },
  'A-all': {
    side: 'incumbent',
    cfg: incumbent.A_all,
    label: 'eslint-plugin-security, every rule at error',
  },
  B: {
    side: 'ours',
    cfg: oursCfg.B,
    label:
      'secure-coding + node-security + express-security, recommended presets',
  },
  C: {
    side: 'ours',
    cfg: cCfg,
    label: cLabel,
  },
};
const targets = app.lintGlobs.filter((g) =>
  fs.existsSync(path.join(cloneDir, g.replace(/\/?\*\*.*$/, ''))),
);
const loc = (files) =>
  files.reduce((n, f) => n + fs.readFileSync(f, 'utf8').split('\n').length, 0);

const results = {};
for (const [name, c] of Object.entries(configs)) {
  const eslint = new ESLint({
    cwd: cloneDir,
    overrideConfigFile: true,
    overrideConfig: c.cfg,
    errorOnUnmatchedPattern: false,
  });
  const t0 = performance.now();
  const reports = await eslint.lintFiles(targets);
  const ms = performance.now() - t0;
  const findings = [];
  const nullRule = [];
  const ruleOnFileSet = reports.map((r) => path.relative(cloneDir, r.filePath));
  for (const r of reports) {
    for (const m of r.messages) {
      const file = path.relative(cloneDir, r.filePath);
      if (m.ruleId === null) {
        nullRule.push({
          file,
          line: m.line,
          fatal: !!m.fatal,
          message: m.message,
        });
        continue;
      }
      findings.push({
        file,
        line: m.line,
        ruleId: m.ruleId,
        message: m.message,
      });
    }
  }
  const ignored = nullRule.filter((m) =>
    /ignored|outside of base path/i.test(m.message),
  );
  if (ignored.length)
    throw new Error(
      `${name}: files silently ignored: ${JSON.stringify(ignored)}`,
    );
  const lintedFiles = reports.map((r) => r.filePath);
  let expectedFiles = null;
  if (app.checkAllFilesLinted) {
    // Trap 2 (TypeScript silently skipped): every tracked file in scope, minus the shared ignores, must have been linted.
    const tracked = sh(
      'git',
      ['ls-files', '-z', '--', ...app.lintGlobs.map((g) => `:(glob)${g}`)],
      cloneDir,
    )
      .split('\0')
      .filter(Boolean)
      .filter(
        (f) =>
          !/(^|\/)(test|tests|cypress|node_modules|dist|build|coverage)\//.test(
            f,
          ) &&
          !/\.(spec|test)\.(ts|js)$|\.min\.js$/.test(f) &&
          !/^(frontend\/src\/assets|data\/static\/codefixes|app\/assets|public|artifacts)\//.test(
            f,
          ),
      );
    const done = new Set(ruleOnFileSet);
    const missing = tracked.filter((f) => !done.has(f));
    if (missing.length)
      throw new Error(
        `${name}: ${missing.length} in-scope files not linted, e.g. ${missing.slice(0, 5)}`,
      );
    expectedFiles = tracked.length;
  }
  results[name] = {
    ...c,
    cfg: undefined,
    filesLinted: lintedFiles.length,
    expectedFiles,
    loc: loc(lintedFiles),
    ms: Math.round(ms),
    parseErrors: nullRule,
    rawFindings: findings,
    files: ruleOnFileSet,
  };
}

// 4. Label (mechanical per plan 6.1; manual overrides only for unlisted-real / undecidable, each with a written reason).
const norm = (side, id) => id; // our presets register the short namespaces already; assert below
const inRange = (it, f) =>
  it.file === f.file && it.ranges.some(([a, b]) => f.line >= a && f.line <= b);
const wilson = (k, n) => {
  if (!n) return [null, null];
  const z = 1.96,
    p = k / n,
    d = 1 + (z * z) / n;
  const c = p + (z * z) / (2 * n),
    h = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
  return [+((c - h) / d).toFixed(3), +((c + h) / d).toFixed(3)];
};

const summary = {};
for (const [name, r] of Object.entries(results)) {
  const seen = new Map();
  for (const f of r.rawFindings) seen.set(`${f.file}:${f.line}:${f.ruleId}`, f); // unit = (file,line,ruleId)
  const dupCount = r.rawFindings.length - seen.size;
  const findings = [...seen.values()].map((f) => {
    const key = `${f.file}:${f.line}:${f.ruleId}`;
    const regions = truth.items.filter((it) => inRange(it, f));
    const tpItems = regions.filter((it) =>
      (classMap[it.class]?.[r.side] ?? []).includes(norm(r.side, f.ruleId)),
    );
    let verdict, reason;
    if (tpItems.length) verdict = 'TP';
    else if (regions.length) verdict = 'FP-right-place-wrong-reason';
    else verdict = 'FP';
    if (verdict !== 'TP' && manual[key]) ({ verdict, reason } = manual[key]);
    return {
      ...f,
      verdict,
      itemIds: tpItems.map((i) => i.id),
      regionIds: regions.map((i) => i.id),
      reason,
    };
  });
  const cnt = (v) => findings.filter((f) => f.verdict === v).length;
  const tp = cnt('TP'),
    real = cnt('unlisted-real'),
    und = cnt('undecidable');
  const fp = findings.length - tp - real - und;
  const decided = findings.length - und;
  const hit = new Set(
    findings.filter((f) => f.verdict === 'TP').flatMap((f) => f.itemIds),
  );
  const lint = truth.items.filter((i) => i.lintable === 'y');
  summary[name] = {
    label: r.label,
    side: r.side,
    filesLinted: r.filesLinted,
    expectedFiles: r.expectedFiles,
    loc: r.loc,
    ms: r.ms,
    parseErrors: r.parseErrors.length,
    findings: findings.length,
    duplicateRuleHitsDropped: dupCount,
    findingsPerKLoc: +((findings.length / r.loc) * 1000).toFixed(1),
    tp,
    fpTotal: fp,
    fpRightPlaceWrongReason: cnt('FP-right-place-wrong-reason'),
    unlistedReal: real,
    undecidable: und,
    precisionStrict: decided ? +(tp / decided).toFixed(3) : null,
    precisionLenient: decided ? +((tp + real) / decided).toFixed(3) : null,
    precisionStrictWilson95: wilson(tp, decided),
    truthItems: truth.items.length,
    itemsHit: [...hit].sort(),
    recallAll: +(hit.size / truth.items.length).toFixed(3),
    recallLintableY: +(
      lint.filter((i) => hit.has(i.id)).length / lint.length
    ).toFixed(3),
    lintableYCount: lint.length,
    byRule: Object.fromEntries(
      [...new Set(findings.map((f) => f.ruleId))]
        .sort()
        .map((id) => [id, findings.filter((f) => f.ruleId === id).length]),
    ),
    findingsDetail: findings,
  };
}

// 5. Incumbent wins, ours-only wins, both-zero (computed, not hand-written).
const hits = (n) => new Set(summary[n].itemsHit);
const ids = truth.items.map((i) => i.id);
const comparison = {};
for (const [inc, o] of [
  ['A', 'B'],
  ['A', 'C'],
  ['A-all', 'B'],
  ['A-all', 'C'],
]) {
  comparison[`${inc}_vs_${o}`] = {
    incumbentOnly: ids.filter((i) => hits(inc).has(i) && !hits(o).has(i)),
    oursOnly: ids.filter((i) => hits(o).has(i) && !hits(inc).has(i)),
    both: ids.filter((i) => hits(o).has(i) && hits(inc).has(i)),
    neither: ids.filter((i) => !hits(o).has(i) && !hits(inc).has(i)),
  };
}

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(
  out,
  JSON.stringify(
    {
      suite: 'ilb-app-h2h',
      app: appName,
      pin: app.commit,
      license: app.license,
      generatedAt: new Date().toISOString(),
      toolchain,
      truthItems: truth.items.length,
      summary,
      comparison,
    },
    null,
    2,
  ) + '\n',
);

for (const [n, s] of Object.entries(summary)) {
  console.log(
    `${n.padEnd(6)} findings=${s.findings} TP=${s.tp} FP=${s.fpTotal} real=${s.unlistedReal} recall=${s.recallAll} (lintable ${s.recallLintableY}) precStrict=${s.precisionStrict} parseErr=${s.parseErrors} ${s.ms}ms`,
  );
}
console.log(`wrote ${path.relative(repoRoot, out)}`);
