const { tag } = require('../../lib.cjs');

const NAME = {
  Password: 'password',
  Passwords: 'passwords',
  ApiTokenSnake: 'api_token',
  AccessTokenCamel: 'accessToken',
  Token: 'token',
  Author: 'author',
  Cardinality: 'cardinality',
  Page: 'page',
  Pin: 'pin',
  OtpCode: 'otpCode',
};

module.exports = {
  rule: 'no-sensitive-data-in-query',
  domain: 350, // 10 names x 7 accesses x 5 configs
  traces: 4000,
  key: (s) => `name=${tag(s.name)} access=${tag(s.access)} cfg=${tag(s.cfg)}`,
  config: (s) =>
    ({
      SensitivePin: { sensitiveParams: ['pin'] },
      PatternOtp: { extraPatterns: ['^otp'] },
      AllowToken: { allowedParams: ['token'] },
    })[tag(s.cfg)],
  code: (s) => {
    const n = NAME[tag(s.name)];
    const a = tag(s.access);
    const req = a === 'RequestName' ? 'request' : 'req';
    const read = {
      Dot: `const value = req.query.${n};`,
      Bracket: `const value = req.query['${n}'];`,
      Destructure: `const { ${n} } = req.query;`,
      DestructureRenamed: `const { ${n}: value } = req.query;`,
      RequestName: `const value = request.query.${n};`,
      Params: `const value = req.params.${n};`,
      Body: `const value = req.body.${n};`,
    }[a];
    if (tag(s.cfg) === 'NoExpress') {
      return [
        "import { lookup } from './store';",
        `export function handle(${req}: any, res: any) {`,
        `  ${read}`,
        '  res.end(lookup());',
        '}',
        '',
      ].join('\n');
    }
    return [
      "import express from 'express';",
      "import { lookup } from './store';",
      'const app = express();',
      `app.get('/account', (${req}: any, res: any) => {`,
      `  ${read}`,
      '  res.json(lookup());',
      '});',
      '',
    ].join('\n');
  },
};
