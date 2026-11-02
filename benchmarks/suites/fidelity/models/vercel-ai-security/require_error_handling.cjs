const { tag, withTestFile } = require('../../lib.cjs');

const FN = {
  GenerateText: 'generateText',
  GenerateObject: 'generateObject',
  StreamText: 'streamText',
  StreamObject: 'streamObject',
};

const base = {
  rule: 'require-error-handling',
  domain: 120, // 2 importsAi x 4 fns x 5 handlings x 3 spellings
  traces: 1500,
  key: (s) =>
    ['importsAi', 'fn', 'handling', 'spelling']
      .map((k) => `${k}=${tag(s[k])}`)
      .join(' '),
  config: () => ({}),
  code: (s) => {
    const name = FN[tag(s.fn)];
    const sp = tag(s.spelling);
    const src = s.importsAi ? "'ai'" : "'./llm'";
    const imp = {
      Named: `import { ${name} } from ${src};`,
      Namespace: `import * as ai from ${src};`,
      Aliased: `import { ${name} as callModel } from ${src};`,
    }[sp];
    const callee = {
      Named: name,
      Namespace: `ai.${name}`,
      Aliased: 'callModel',
    }[sp];
    const h = tag(s.handling);
    const onError =
      h === 'OnErrorOption' ? ', onError: (e) => logger.error(e)' : '';
    const call = `await ${callee}({ model: m, prompt: 'Hello'${onError} })`;
    const body = {
      NoHandling: [`const result = ${call};`, 'return result;'],
      OnErrorOption: [`const result = ${call};`, 'return result;'],
      TryCatch: [
        'try {',
        `  const result = ${call};`,
        '  return result;',
        '} catch (error) {',
        '  logger.error(error);',
        '  throw error;',
        '}',
      ],
      TryFinally: [
        'try {',
        `  const result = ${call};`,
        '  return result;',
        '} finally {',
        "  logger.info('done');",
        '}',
      ],
      TryAroundCallback: [
        'try {',
        '  items.forEach(async (item) => {',
        `    ${call};`,
        '  });',
        '} catch (error) {',
        '  logger.error(error);',
        '}',
      ],
    }[h];
    return [
      imp,
      "import { m, logger, items } from './deps';",
      'export async function handler() {',
      ...body.map((l) => `  ${l}`),
      '}',
      '',
    ].join('\n');
  },
};

// Test-file dimension: x3 domain, see lib.cjs `withTestFile`.
module.exports = withTestFile(base, { option: 'allowInTests', flip: false });
