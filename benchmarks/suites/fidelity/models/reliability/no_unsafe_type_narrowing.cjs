const { tag, withTestFile } = require('../../lib.cjs');
const { keyOf } = require('../../reliability.cjs');

const SHAPE = {
  AsUnknownAs: 'raw as unknown as User',
  AsAnyAs: 'raw as any as User',
  AngleUnknown: '<User>(<unknown>raw)',
  AngleAny: '<User>(<any>raw)',
  MixedAngleOuter: '<User>(raw as unknown)',
  MixedAsOuter: '(<unknown>raw) as User',
  SingleAs: 'raw as User',
  AsUnknownOnly: 'raw as unknown',
  AsConst: "({ id: 1, name: 'a' }) as const",
  Satisfies: "({ id: 1, name: 'a' }) satisfies User",
  AngleSingle: '<User>raw',
};
const NOTE = '// validated by the schema above';

module.exports = withTestFile(
  {
    rule: 'no-unsafe-type-narrowing',
    // Shapes 11; two comment slices of 4 comments x 2 option values.
    domain: 11 + 8 + 8,
    traces: 500,
    key: keyOf('focus', 'shape', 'comment', 'allowWithComment'),
    config: (s) => ({ allowWithComment: s.allowWithComment }),
    code: (s) => {
      const expr = SHAPE[tag(s.shape)];
      const c = tag(s.comment);
      return [
        'interface User { id: number; name: string }',
        'export function parse(raw: { id: number; name: string } | string) {',
        `  const seen = typeof raw;${c === 'TrailingPrevStatement' ? ` ${NOTE}` : ''}`,
        ...(c === 'OwnLineAbove' ? [`  ${NOTE}`] : []),
        `  const user = ${expr};${c === 'TrailingSameLine' ? ` ${NOTE}` : ''}`,
        '  return { seen, user };',
        '}',
        '',
      ].join('\n');
    },
  },
  { option: 'ignoreInTests', flip: false },
);
