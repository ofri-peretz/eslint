const { tag } = require('../../lib.cjs');

module.exports = {
  rule: 'lock-file',
  domain: 4, // 4 packageManager values; the lock-file set is a fixed fact of this repo
  traces: 100,
  key: (s) => tag(s.pm),
  config: (s) => ({
    packageManager: { AnyPM: 'any', Npm: 'npm', Yarn: 'yarn', Pnpm: 'pnpm' }[
      tag(s.pm)
    ],
  }),
  code: () => "import express from 'express';\nexport const app = express();\n",
  model: (s) => s.verdict,
};
