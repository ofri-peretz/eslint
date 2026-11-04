const { tag } = require('../../lib.cjs');

const PAYLOAD = {
  Raw: (e) => e,
  Stack: (e) => `${e}.stack`,
  StackBracket: (e) => `${e}['stack']`,
  Message: (e) => `${e}.message`,
  ObjInErr: (e) => `{ error: ${e} }`,
  ObjMessage: (e) => `{ error: ${e}.message }`,
  Spread: (e) => `{ ...${e} }`,
  Template: (e) => `\`Failed: \${${e}.stack}\``,
  Generic: () => "{ error: 'Internal Server Error' }",
  Wrapped: (e) => `serialize(${e})`,
};
const SINK = {
  Send: (r, p) => `${r}.send(${p});`,
  Json: (r, p) => `${r}.json(${p});`,
  StatusJson: (r, p) => `${r}.status(500).json(${p});`,
  End: (r, p) => `${r}.end(${p});`,
  BracketSend: (r, p) => `${r}['send'](${p});`,
  ResponseParam: (r, p) => `${r}.status(500).json(${p});`,
  NextCall: (r, p) => `next(${p});`,
};
const GUARD = {
  NoGuard: (st) => st,
  IfDev: (st) => `if (process.env.NODE_ENV === 'development') { ${st} }`,
  IfProd: (st) => `if (process.env.NODE_ENV === 'production') { ${st} }`,
};
// Each source introduces (or not) an error binding and runs `stmt(errName, resName)`.
const SOURCE = {
  CatchErr: (stmt, r) => [
    `app.post('/invoices', async (req, ${r}, next) => {`,
    '  try {',
    '    await work(req.body);',
    '  } catch (err) {',
    `    ${stmt('err')}`,
    '  }',
    '});',
  ],
  CatchE: (stmt, r) => [
    `app.post('/invoices', async (req, ${r}, next) => {`,
    '  try {',
    '    await work(req.body);',
    '  } catch (e) {',
    `    ${stmt('e')}`,
    '  }',
    '});',
  ],
  ErrorMiddleware: (stmt, r) => [
    `app.use((err, req, ${r}, next) => {`,
    `  ${stmt('err')}`,
    '});',
  ],
  CallbackErr: (stmt, r) => [
    `app.get('/file', (req, ${r}, next) => {`,
    '  fs.readFile(filePath, (err, data) => {',
    `    if (err) { ${stmt('err')} }`,
    `    ${r}.send(data);`,
    '  });',
    '});',
  ],
  CallbackError: (stmt, r) => [
    `app.get('/file', (req, ${r}, next) => {`,
    '  fs.readFile(filePath, (error, data) => {',
    `    if (error) { ${stmt('error')} }`,
    `    ${r}.send(data);`,
    '  });',
    '});',
  ],
  NoBinding: (stmt, r) => [
    `app.get('/report', async (req, ${r}, next) => {`,
    '  const result = await work(req.query);',
    `  ${stmt('result')}`,
    '});',
  ],
};

module.exports = {
  rule: 'no-error-details-in-response',
  // Base 6 sources x 10 payloads; Sinks 7; Strict 10 payloads; Dev 3 guards x 2.
  domain: 60 + 7 + 10 + 6,
  traces: 2500,
  key: (s) =>
    [
      'focus',
      'source',
      'payload',
      'sink',
      'guard',
      'allowMessage',
      'allowInDev',
    ]
      .map((k) => `${k}=${tag(s[k])}`)
      .join(' '),
  config: (s) => ({ allowMessage: s.allowMessage, allowInDev: s.allowInDev }),
  code: (s) => {
    const sink = tag(s.sink);
    const r = sink === 'ResponseParam' ? 'response' : 'res';
    const stmt = (e) =>
      GUARD[tag(s.guard)](SINK[sink](r, PAYLOAD[tag(s.payload)](e)));
    return [
      "import express from 'express';",
      "import fs from 'node:fs';",
      "import { work, serialize, filePath } from './lib';",
      'const app = express();',
      ...SOURCE[tag(s.source)](stmt, r),
      '',
    ].join('\n');
  },
};
