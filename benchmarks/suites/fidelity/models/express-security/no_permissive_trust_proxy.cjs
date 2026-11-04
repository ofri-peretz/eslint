const { tag } = require('../../lib.cjs');

const CALL = {
  SetTrue: (r) => `${r}.set('trust proxy', true);`,
  BracketSetTrue: (r) => `${r}['set']('trust proxy', true);`,
  Enable: (r) => `${r}.enable('trust proxy');`,
  SetOne: (r) => `${r}.set('trust proxy', 1);`,
  SetLoopback: (r) => `${r}.set('trust proxy', 'loopback');`,
  SetSubnet: (r) => `${r}.set('trust proxy', '10.0.0.0/8');`,
  SetFn: (r) => `${r}.set('trust proxy', (ip: string) => ip === '10.0.0.1');`,
  SetFalse: (r) => `${r}.set('trust proxy', false);`,
  Disable: (r) => `${r}.disable('trust proxy');`,
  OtherKeyTrue: (r) => `${r}.set('case sensitive routing', true);`,
  EnableOther: (r) => `${r}.enable('strict routing');`,
};

module.exports = {
  rule: 'no-permissive-trust-proxy',
  domain: 99, // 11 calls x 9 contexts
  traces: 1500,
  key: (s) => `call=${tag(s.call)} ctx=${tag(s.ctx)}`,
  config: (s) =>
    ({
      GatewayNamed: { appReceiverNames: ['gateway'] },
      AppNotNamed: { appReceiverNames: ['gateway'] },
      HopCount: { hopCount: 2 },
    })[tag(s.ctx)],
  code: (s) => {
    const ctx = tag(s.ctx);
    const [head, decl, recv] = {
      Server: [
        "import express from 'express';",
        'const server = express();',
        'server',
      ],
      Router: [
        "import express from 'express';",
        'const router = express.Router();',
        'router',
      ],
      Require: [
        "const express = require('express');",
        'const app = express();',
        'app',
      ],
      Gateway: [
        "import express from 'express';",
        'const gateway = express();',
        'gateway',
      ],
      GatewayNamed: [
        "import express from 'express';",
        'const gateway = express();',
        'gateway',
      ],
      NoExpress: [
        "import Koa from 'koa';",
        'const app: any = new Koa();',
        'app',
      ],
    }[ctx] ?? [
      "import express from 'express';",
      'const app = express();',
      'app',
    ];
    return [
      head,
      decl,
      CALL[tag(s.call)](recv),
      `${recv}.listen(3000);`,
      '',
    ].join('\n');
  },
};
