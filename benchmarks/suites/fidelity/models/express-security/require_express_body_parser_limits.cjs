const { tag, withTestFile } = require('../../lib.cjs');

const OPTS = {
  NoOpts: '',
  NoLimitKey: '{ extended: true }',
  Kb100: "{ limit: '100kb' }",
  Mb1: "{ limit: '1mb' }",
  Mb2: "{ limit: '2mb' }",
  Mb5: "{ limit: '5mb' }",
  Mb8: "{ limit: '8mb' }",
  Mb50: "{ limit: '50mb' }",
  Mb50Upper: "{ extended: true, limit: '50MB' }",
  Gb1: "{ limit: '1gb' }",
  Num1mb: '{ limit: 1048576 }',
  Num50mb: '{ limit: 52428800 }',
};

const base = {
  rule: 'require-express-body-parser-limits',
  domain: 12 * 11 + 12 * 2, // limits x parsers at default + limits x 2 options
  traces: 1500,
  key: (s) =>
    ['limit', 'parser', 'opts'].map((k) => `${k}=${tag(s[k])}`).join(' '),
  config: (s) =>
    ({
      MaxRaised: { maxLimit: 20971520 },
      Excessive2mb: { excessiveLimits: ['2mb'] },
    })[tag(s.opts)],
  code: (s) => {
    const o = OPTS[tag(s.limit)];
    const p = tag(s.parser);
    const head = {
      BodyParserJson: ["import bodyParser from 'body-parser';"],
      BodyParserUrlencoded: ["import bodyParser from 'body-parser';"],
      RequireBodyParser: ["const bodyParser = require('body-parser');"],
      RenamedBodyParser: ["import parsers from 'body-parser';"],
      DestructuredJson: ["import { json } from 'express';"],
    }[p];
    const call = {
      ExpressJson: `express.json(${o})`,
      ExpressUrlencoded: `express.urlencoded(${o})`,
      ExpressRaw: `express.raw(${o})`,
      ExpressText: `express.text(${o})`,
      BodyParserJson: `bodyParser.json(${o})`,
      BodyParserUrlencoded: `bodyParser.urlencoded(${o})`,
      RequireBodyParser: `bodyParser.json(${o})`,
      RenamedBodyParser: `parsers.json(${o})`,
      DestructuredJson: `json(${o})`,
      RouterUse: `express.json(${o})`,
      RouteLevel: `express.json(${o})`,
    }[p];
    const mount = {
      RouterUse: [
        'const router = express.Router();',
        `router.use(${call});`,
        "app.use('/api', router);",
      ],
      RouteLevel: [
        `app.post('/upload', ${call}, (req: any, res: any) => res.json(req.body));`,
      ],
    }[p] ?? [`app.use(${call});`];
    return [
      "import express from 'express';",
      ...(head ?? []),
      'const app = express();',
      ...mount,
      'app.listen(3000);',
      '',
    ].join('\n');
  },
};

// Test-file dimension: x3 domain, see lib.cjs `withTestFile`.
module.exports = withTestFile(base, { option: 'allowInTests', flip: true });
