import { createRequire } from 'node:module';
import path from 'node:path';
const root = '/Users/ofri/repos/ofriperetz.dev/eslint-wt-h2h';
const require = createRequire(root + '/package.json');
const { ESLint } = require('eslint');
const cm = require(
  root + '/benchmarks/suites/ilb-app-h2h/truth/class-map.json',
).classes;
const o = await import(
  root + '/benchmarks/suites/ilb-app-h2h/configs/ours.config.mjs'
);
const cfgRules = (cfg) =>
  new Set(cfg.flatMap((c) => Object.keys(c.rules || {})));
const inC = cfgRules(o.C.nodegoat);
const mapRules = [...new Set(Object.values(cm).flatMap((c) => c.ours))];
console.log(
  'class-map rules NOT enabled in config C:',
  mapRules.filter((r) => !inC.has(r)).join(', ') || 'none',
);
// diagnostic: every class-map rule at error (NOT part of the benchmark)
const plugins = {
  'secure-coding': o.plugins.secureCoding,
  'node-security': o.plugins.nodeSecurity,
  'express-security': o.plugins.expressSecurity,
  'mongodb-security': o.plugins.mongodbSecurity,
};
const eslint = new ESLint({
  cwd: process.argv[2],
  overrideConfigFile: true,
  overrideConfig: [
    ...o.B.slice(0, 3),
    { plugins, rules: Object.fromEntries(mapRules.map((r) => [r, 'error'])) },
  ],
  errorOnUnmatchedPattern: false,
});
const rep = await eslint.lintFiles([
  'server.js',
  'app/routes/**/*.js',
  'app/data/**/*.js',
]);
for (const r of rep)
  for (const m of r.messages)
    if (mapRules.includes(m.ruleId))
      console.log(
        path.relative(process.argv[2], r.filePath) + ':' + m.line,
        m.ruleId,
      );
