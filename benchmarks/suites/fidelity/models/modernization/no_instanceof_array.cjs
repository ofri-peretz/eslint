const { tag } = require('../../lib.cjs');
const { keyOf, src } = require('../../quality.cjs');

const CHECK = {
  GlobalArray: ['export const isList = (v: unknown) => v instanceof Array;'],
  GlobalThisArray: [
    'export const isList = (v: unknown) => v instanceof globalThis.Array;',
  ],
  ImportedArray: [
    "import { Array } from 'effect';",
    'export const isList = (v: unknown) => v instanceof Array;',
  ],
  ParamArray: [
    'export const isOf = (v: unknown, Array: Function) => v instanceof Array;',
  ],
  ArrayOnLeft: ['export const isCtor = (F: Function) => Array instanceof F;'],
  OtherClass: ['export const isMap = (v: unknown) => v instanceof Map;'],
  IsArrayCall: ['export const isList = (v: unknown) => Array.isArray(v);'],
};

module.exports = {
  rule: 'no-instanceof-array',
  domain: 7 * 3,
  traces: 300,
  key: keyOf('spelling', 'allow'),
  config: (s) =>
    tag(s.allow) === 'Default' ? undefined : { allow: ['legacy-realm'] },
  code: (s) =>
    src(
      tag(s.allow) === 'Matched'
        ? ['// legacy-realm: every array here is built in this realm']
        : [],
      CHECK[tag(s.spelling)],
    ),
};
