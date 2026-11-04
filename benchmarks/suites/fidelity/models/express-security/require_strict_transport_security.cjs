const { tag } = require('../../lib.cjs');

/** The HSTS value; undefined = omitted. */
const VALUE = {
  Omitted: undefined,
  HstsFalse: 'false',
  HstsTrue: 'true',
  EmptyObj: '{}',
  MaxAge0: '{ maxAge: 0 }',
  MaxAge300: '{ maxAge: 300 }',
  BelowFloor: '{ maxAge: 15551999 }',
  Floor: '{ maxAge: 15552000 }',
  Year: '{ maxAge: 31536000 }',
  YearSubFalse: '{ maxAge: 31536000, includeSubDomains: false }',
  YearSubTrue: '{ maxAge: 31536000, includeSubDomains: true, preload: true }',
  SubFalseOnly: '{ includeSubDomains: false }',
};

const opt = (key, v) => (v === undefined ? '' : `{ ${key}: ${v} }`);
const arg = (v) => v ?? '';

/** [import line, middleware expression]. */
const FORM = {
  HelmetHsts: (v) => [
    "import helmet from 'helmet';",
    `helmet(${opt('hsts', v)})`,
  ],
  HelmetSts: (v) => [
    "import helmet from 'helmet';",
    `helmet(${opt('strictTransportSecurity', v)})`,
  ],
  RenamedHelmet: (v) => [
    "import securityHeaders from 'helmet';",
    `securityHeaders(${opt('hsts', v)})`,
  ],
  RequireHelmet: (v) => [
    "const helmet = require('helmet');",
    `helmet(${opt('hsts', v)})`,
  ],
  HstsFactory: (v) => [
    "import helmet from 'helmet';",
    `helmet.hsts(${arg(v)})`,
  ],
  StsFactory: (v) => [
    "import helmet from 'helmet';",
    `helmet.strictTransportSecurity(${arg(v)})`,
  ],
  NamedSts: (v) => [
    "import { strictTransportSecurity } from 'helmet';",
    `strictTransportSecurity(${arg(v)})`,
  ],
};

module.exports = {
  rule: 'require-strict-transport-security',
  // Forms: 4 object forms x 12 configs + 3 factories x 10 = 78;
  // Options: 12 configs x 2 non-default opts on helmet({ hsts }) = 24
  domain: 78 + 24,
  traces: 1500,
  key: (s) =>
    ['config', 'form', 'opts'].map((k) => `${k}=${tag(s[k])}`).join(' '),
  config: (s) =>
    ({
      MinYear: { minMaxAge: 31536000 },
      NoSubRequired: { requireSubDomains: false },
    })[tag(s.opts)],
  code: (s) => {
    const [imp, mw] = FORM[tag(s.form)](VALUE[tag(s.config)]);
    return [
      "import express from 'express';",
      imp,
      'const app = express();',
      `app.use(${mw});`,
      'app.listen(3000);',
      '',
    ].join('\n');
  },
};
