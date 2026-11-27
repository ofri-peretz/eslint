const { tag } = require('../../lib.cjs');

/** logger -> { pre?: module lines, body?: handler lines, call: receiver.method }. */
const LOGGER = {
  Console: { call: 'console.log' },
  Pino: {
    pre: "import pino from 'pino';\nconst logger = pino();",
    call: 'logger.info',
  },
  Winston: {
    pre: "const winston = require('winston');\nconst logger = winston.createLogger({});",
    call: 'logger.error',
  },
  Audit: { call: 'audit.write' },
  LocalConsole: { body: 'const console = sink;', call: 'console.log' },
};

const VALUE = {
  Whole: 'call.metadata',
  GetMap: 'call.metadata.getMap()',
  ToJson: 'call.metadata.toJSON()',
  AuthGet: "call.metadata.get('Authorization')",
  CookieGet: "call.metadata.get('cookie')[0]",
  ApiKeyIndexed: "call.metadata.get('x-api-key')[0]",
  MapCookie: 'call.metadata.getMap().cookie',
  RequestId: "call.metadata.get('x-request-id')",
  ComputedName: 'call.metadata.get(name)',
  Presence: "call.metadata.get('authorization').length > 0",
  Request: 'call.request',
};

const WRAP = {
  Bare: (v) => v,
  InObject: (v) => `{ value: ${v} }`,
  InTemplate: (v) => `\`seen \${${v}}\``,
  Stringified: (v) => `JSON.stringify(${v})`,
};

function code(s) {
  const logger = LOGGER[tag(s.logger)];
  const arg = WRAP[tag(s.wrap)](VALUE[tag(s.value)]);
  return [
    logger.pre,
    'server.addService(svc, {',
    '  Get(call, cb) {',
    logger.body ? `    ${logger.body}` : '',
    `    ${logger.call}(${arg});`,
    '  },',
    '});',
  ]
    .filter(Boolean)
    .join('\n');
}

module.exports = {
  rule: 'no-credential-metadata-logging',
  domain: 5 * 11 * 4, // loggers x values x wraps
  traces: 2400,
  key: (s) => `${tag(s.logger)}|${tag(s.value)}|${tag(s.wrap)}`,
  code,
};
