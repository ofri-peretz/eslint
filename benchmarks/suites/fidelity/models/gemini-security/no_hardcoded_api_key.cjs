const { tag } = require('../../lib.cjs');
const {
  CLIENTS,
  GEMINI_POSITIONAL,
  KEYS,
  clientFile,
  keyArgs,
} = require('../../ai-sdk.cjs');

const PROPS = { ApiKey: 'apiKey', Project: 'project' };

function code(s) {
  const spelling = tag(s.spelling);
  const positional = tag(s.form) === 'Positional';
  const client = positional
    ? GEMINI_POSITIONAL[spelling]
    : CLIENTS.gemini[spelling];
  const { imports, pre, args, param } = keyArgs(
    tag(s.value),
    'gemini',
    positional ? null : PROPS[tag(s.prop)],
    KEYS.gemini,
  );
  return clientFile(client, args, { imports, pre, param });
}

module.exports = {
  rule: 'no-hardcoded-api-key',
  // 18 options values + 14 positional values + 2 props x 2 + 15 spellings x 2
  domain: 18 + 14 + 2 * 2 + 15 * 2,
  traces: 800,
  key: (s) =>
    `${tag(s.part)}|${tag(s.form)}|${tag(s.value)}|${tag(s.prop)}|${tag(s.spelling)}`,
  code,
};
