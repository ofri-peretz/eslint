const { tag, withTestFile } = require('../../lib.cjs');

const base = {
  rule: 'require-audit-logging',
  domain: 64, // 2 importsAi x 8 logging x 2 fns x 2 spellings
  traces: 900,
  key: (s) =>
    ['importsAi', 'logging', 'fn', 'spelling']
      .map((k) => `${k}=${tag(s[k])}`)
      .join(' '),
  config: () => ({}),
  code: (s) => {
    const name = tag(s.fn) === 'GenerateText' ? 'generateText' : 'streamText';
    const src = s.importsAi ? "'ai'" : "'./llm'";
    const ns = tag(s.spelling) === 'Namespace';
    const imp = ns
      ? `import * as ai from ${src};`
      : `import { ${name} } from ${src};`;
    const callee = ns ? `ai.${name}` : name;
    const l = tag(s.logging);
    const before = {
      ConsoleLogBefore: "console.log('ai call', { userId });",
      LoggerInfoBefore: "logger.info('ai call', { userId });",
      DebugBefore: "debug('ai call');",
      ShowDialogBefore: "showDialog('thinking');",
    }[l];
    const tel =
      l === 'TelemetryEnabled'
        ? ', experimental_telemetry: { isEnabled: true }'
        : l === 'TelemetryDisabled'
          ? ', experimental_telemetry: { isEnabled: false }'
          : '';
    return [
      imp,
      "import { m, logger, debug, showDialog } from './deps';",
      'export async function handler(userId, userInput) {',
      before ? `  ${before}` : '',
      `  const result = await ${callee}({ model: m, prompt: userInput${tel} });`,
      l === 'LogAfter' ? "  logger.info('ai call', { userId });" : '',
      '  return result;',
      '}',
      '',
    ]
      .filter((x, i, a) => x !== '' || i === a.length - 1)
      .join('\n');
  },
};

// Test-file dimension: x3 domain, see lib.cjs `withTestFile`.
module.exports = withTestFile(base, { option: 'allowInTests', flip: false });
