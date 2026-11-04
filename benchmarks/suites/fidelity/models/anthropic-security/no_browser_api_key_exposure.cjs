const { tag } = require('../../lib.cjs');
const { CLIENTS, browserArgs, clientFile } = require('../../ai-sdk.cjs');

const SPELLINGS = {
  ...CLIENTS.anthropic,
  // The same flag on another vendor's browser-capable client.
  OtherVendor: {
    head: "import Anthropic from '@anthropic-ai/sdk';\nimport Groq from 'groq-sdk';",
    ctor: (args) => `const client = new Groq(${args});`,
  },
};

function code(s) {
  const { imports, pre, args, param } = browserArgs(
    tag(s.flag),
    tag(s.key),
    'anthropic',
  );
  return clientFile(SPELLINGS[tag(s.spelling)], args, {
    imports,
    pre,
    param,
  });
}

module.exports = {
  rule: 'no-browser-api-key-exposure',
  // 7 flags + 13 keys + 9 spellings x 2 flags
  domain: 7 + 13 + 9 * 2,
  traces: 500,
  key: (s) => `${tag(s.part)}|${tag(s.flag)}|${tag(s.key)}|${tag(s.spelling)}`,
  code,
};
