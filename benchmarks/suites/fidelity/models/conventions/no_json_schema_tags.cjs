const { tag } = require('../../lib.cjs');
const { keyOf, src } = require('../../quality.cjs');

const TAG = {
  Schema: 'minimum',
  JsdocEnum: 'enum',
  Standard: 'returns',
  Custom: 'openapi',
};

/** The text carrying the tag, by position. */
const TEXT = {
  TagLine: (t) => [`Sets the age.`, `@${t} 0`],
  SameLine: (t) => [`@${t} 0`],
  InProse: (t) => [`Ask team@${t}.io for the range.`],
};

const COMMENT = {
  JsDoc: (lines) =>
    lines.length === 1
      ? [`/** ${lines[0]} */`]
      : ['/**', ...lines.map((l) => ` * ${l}`), ' */'],
  PlainBlock: (lines) =>
    lines.length === 1
      ? [`/* ${lines[0]} */`]
      : ['/*', ...lines.map((l) => ` * ${l}`), ' */'],
  Line: (lines) => lines.map((l) => `// ${l}`),
};

module.exports = {
  rule: 'no-json-schema-tags',
  domain: 3 * 3 * 4 * 2,
  traces: 700,
  key: keyOf('comment', 'position', 'tag', 'extra'),
  config: (s) =>
    s.extra ? { additionalForbiddenTags: ['openapi'] } : undefined,
  code: (s) =>
    src(
      COMMENT[tag(s.comment)](TEXT[tag(s.position)](TAG[tag(s.tag)])),
      'export function setAge(age: number) { return age; }',
    ),
};
