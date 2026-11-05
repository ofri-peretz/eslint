const { tag, withTestFile } = require('../../lib.cjs');
const { keyOf } = require('../../reliability.cjs');

// [lines above the catch clause, lines inside the catch body]
const BODY = {
  Empty: [[], []],
  OnlySemicolon: [[], [';']],
  CommentInside: [
    [],
    ['// intentional: a missing cache file means a cold start'],
  ],
  CommentAbove: [
    ['// intentional: a missing cache file means a cold start'],
    [],
  ],
  CommentFarAbove: [[], []],
  Logs: [[], ["console.error('cache read failed', err);"]],
  Rethrows: [[], ["throw new Error('cache read failed', { cause: err });"]],
  ReturnsFallback: [[], ['return null;']],
  SetsFlag: [[], ['failed = true;']],
};

const base = {
  rule: 'no-silent-errors',
  // Bodies 9 x 2 option values; Forms 4 x 2 bodies.
  domain: 18 + 8,
  traces: 500,
  key: keyOf('focus', 'body', 'form', 'allowWithComment'),
  config: (s) => ({ allowWithComment: s.allowWithComment }),
  code: (s) => {
    const b = tag(s.body);
    const form = tag(s.form);
    const [above, inside] = BODY[b];
    const binding = form === 'NoBinding' ? '' : ' (err)';
    const usesErr = inside.some((l) => l.includes('err'));
    // `catch {}` cannot name the error; give the handler its own value.
    const body =
      form === 'NoBinding' && usesErr
        ? inside.map((l) => l.replace(', err', ', failed'))
        : inside;
    const lines = [
      ...(b === 'CommentFarAbove'
        ? [
            '// intentional: a missing cache file means a cold start',
            '',
            '',
            '',
            '',
          ]
        : []),
      'try {',
      `  data = ${form === 'InAsync' ? 'await readCache()' : 'readCache()'};`,
      ...above.map((l) => `  ${l}`),
      `} catch${binding} {`,
      ...body.map((l) => `  ${l}`),
      form === 'WithFinally' ? '} finally {\n  done = true;\n}' : '}',
      'return data;',
    ];
    return [
      'declare function readCache(): unknown;',
      'let data: unknown;',
      'let failed = false;',
      'let done = false;',
      `export ${form === 'InAsync' ? 'async ' : ''}function load() {`,
      ...lines.map((l) => `  ${l}`),
      '}',
      'export const state = () => ({ failed, done });',
      '',
    ].join('\n');
  },
};

module.exports = withTestFile(base, { option: 'ignoreInTests', flip: false });
