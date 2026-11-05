const { tag, withTestFile } = require('../../lib.cjs');
const { keyOf } = require('../../reliability.cjs');

// [module head, thrown expression]
const THROWN = {
  NewBuiltinLiteral: ['', "new Error('cache read failed')"],
  NewBuiltinEmpty: ['', 'new Error()'],
  NewBuiltinEmptyString: ['', "new Error('')"],
  NewBuiltinTemplate: [
    '',
    '`cache read failed for ${id}`'.replace(/^/, 'new Error(') + ')',
  ],
  CallBuiltinLiteral: ['', "TypeError('cache read failed')"],
  CallBuiltinEmpty: ['', 'TypeError()'],
  ConstMessage: ["const MESSAGE = 'cache read failed';", 'new Error(MESSAGE)'],
  Rethrow: ['', 'err'],
  StringLiteral: ['', "'cache read failed'"],
  EmptyString: ['', "''"],
  TemplateLit: ['', '`cache read failed for ${id}`'],
  ObjectWithMessage: ['', "{ message: 'cache read failed', code: 'E_CACHE' }"],
  ObjectNoMessage: ['', "{ code: 'E_CACHE' }"],
  NullLit: ['', 'null'],
  UndefinedId: ['', 'undefined'],
  LocalSubclassSuperMessage: [
    "class CacheMiss extends Error {\n  constructor() {\n    super('cache read failed');\n  }\n}",
    'new CacheMiss()',
  ],
  LocalSubclassNeutralName: [
    'class Failure extends Error {}',
    "new Failure('cache read failed')",
  ],
  LocalPlainClassNamedError: [
    'class CacheError {\n  constructor(readonly detail: string) {}\n}',
    "new CacheError('cache read failed')",
  ],
};

const base = {
  rule: 'no-missing-error-context',
  domain: 18 * 2 * 2,
  traces: 900,
  key: keyOf('thrown', 'requireMessage', 'requireStackTrace'),
  config: (s) => ({
    requireMessage: s.requireMessage,
    requireStackTrace: s.requireStackTrace,
  }),
  code: (s) => {
    const [head, value] = THROWN[tag(s.thrown)];
    return [
      'declare function readCache(id: number): unknown;',
      head,
      'export function load(id: number) {',
      '  try {',
      '    return readCache(id);',
      '  } catch (err) {',
      `    throw ${value};`,
      '  }',
      '}',
      '',
    ].join('\n');
  },
};

module.exports = withTestFile(base, { option: 'ignoreInTests', flip: false });
