const { tag } = require('../../lib.cjs');
const { CLIENTS, browserArgs, clientFile } = require('../../ai-sdk.cjs');

const SPELLINGS = {
  ...CLIENTS.openai,
  // The Realtime WebSocket client: options first, the REST client second.
  Realtime: {
    head: "import { OpenAIRealtimeWebSocket } from 'openai/beta/realtime/websocket';\nimport { openai } from './openai-client';",
    ctor: (args) =>
      `const client = new OpenAIRealtimeWebSocket(${args.replace('{ ', "{ model: 'gpt-realtime', ")}, openai);`,
  },
  // The same flag on another vendor's browser-capable client.
  OtherVendor: {
    head: "import OpenAI from 'openai';\nimport Groq from 'groq-sdk';",
    ctor: (args) => `const client = new Groq(${args});`,
  },
};

function code(s) {
  const key = tag(s.key);
  let spelling = tag(s.spelling);
  // A token provider is AzureOpenAI's option.
  if (key === 'AzureProvider') spelling = 'Azure';
  // The WebSocket takes its key from the REST client, not its own options.
  const { imports, pre, args, param } = browserArgs(
    tag(s.flag),
    spelling === 'Realtime' ? 'NoKey' : key,
    'openai',
  );
  return clientFile(SPELLINGS[spelling], args, { imports, pre, param });
}

module.exports = {
  rule: 'no-browser-api-key-exposure',
  // 7 flags + 13 keys + 11 spellings x 2 flags
  domain: 7 + 13 + 11 * 2,
  traces: 500,
  key: (s) => `${tag(s.part)}|${tag(s.flag)}|${tag(s.key)}|${tag(s.spelling)}`,
  code,
};
