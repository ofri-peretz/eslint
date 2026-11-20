// Diagnostic only (NOT part of any headline number): switch on every class-map rule of ours for one app, to separate
// "not in the preset" from "the rule cannot see it". Usage: node diagnose.mjs <clone-dir> [--app nodegoat|dvna]
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const require = createRequire(path.join(root, 'package.json'));
const { ESLint } = require('eslint');
const cloneDir = process.argv[2];
const ai = process.argv.indexOf('--app');
const appName = ai > -1 ? process.argv[ai + 1] : 'nodegoat';
const j = (f) => JSON.parse(fs.readFileSync(path.join(here, f), 'utf8'));
const apps = Object.assign(
  {},
  ...fs
    .readdirSync(here)
    .filter((f) => /^apps(\.[a-z0-9-]+)?\.json$/.test(f))
    .map(j),
);
const extra = fs.existsSync(path.join(here, `truth/class-map.${appName}.json`))
  ? j(`truth/class-map.${appName}.json`).classes
  : {};
const cm = { ...j('truth/class-map.json').classes, ...extra };
const o = await import(
  pathToFileURL(path.join(here, 'configs/ours.config.mjs'))
);
const ap = path.join(here, `configs/ours.${appName}.config.mjs`);
const appOurs = fs.existsSync(ap) ? await import(pathToFileURL(ap)) : null;
const cfg = (appOurs?.C ?? o.C)[appName];
const enabled = new Set(cfg.flatMap((c) => Object.keys(c.rules || {})));
const mapRules = [...new Set(Object.values(cm).flatMap((c) => c.ours))];
console.log(
  'class-map rules NOT enabled in config C:',
  mapRules.filter((r) => !enabled.has(r)).join(', ') || 'none',
);
const plugins = Object.fromEntries(
  cfg.flatMap((c) => Object.entries(c.plugins || {})),
);
for (const [ns, key] of [
  ['secure-coding', 'secureCoding'],
  ['node-security', 'nodeSecurity'],
  ['express-security', 'expressSecurity'],
  ['mongodb-security', 'mongodbSecurity'],
])
  plugins[ns] ??= o.plugins[key];
const eslint = new ESLint({
  cwd: cloneDir,
  overrideConfigFile: true,
  overrideConfig: [
    ...cfg,
    { plugins, rules: Object.fromEntries(mapRules.map((r) => [r, 'error'])) },
  ],
  errorOnUnmatchedPattern: false,
});
const rep = await eslint.lintFiles(apps[appName].lintGlobs);
for (const r of rep)
  for (const m of r.messages)
    if (mapRules.includes(m.ruleId))
      console.log(
        `${path.relative(cloneDir, r.filePath)}:${m.line} ${m.ruleId}`,
      );
