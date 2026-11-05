const { tag } = require('../../lib.cjs');
const { keyOf } = require('../../quality.cjs');
const { FILE, src } = require('../../react.cjs');

const NAME = {
  TypeName: 'type',
  KindName: 'kind',
  VariantName: 'variant',
  ModeName: 'mode',
};
// [type annotation, the two values the component switches on]
const SHAPE = {
  Union2: ["'checkbox' | 'radio'", "'checkbox'", "'radio'"],
  Union3: ["'checkbox' | 'radio' | 'switch'", "'checkbox'", "'radio'"],
  UnionUndef: ["'checkbox' | 'radio' | undefined", "'checkbox'", "'radio'"],
  Alias: ['RowKind', "'checkbox'", "'radio'"],
  Single: ["'checkbox'", "'checkbox'", "'radio'"],
  StringKw: ['string', "'checkbox'", "'radio'"],
  NumUnion: ['1 | 2', '1', '2'],
};

module.exports = {
  rule: 'no-kind-prop-discriminator',
  domain: 4 * 2 * 7,
  traces: 500,
  filename: FILE,
  key: keyOf('name', 'keySp', 'shape'),
  code: (s) => {
    const n = NAME[tag(s.name)];
    const k = tag(s.keySp) === 'Quoted' ? `'${n}'` : n;
    const [ty, a] = SHAPE[tag(s.shape)];
    return src(
      "type RowKind = 'checkbox' | 'radio';",
      `interface RowProps { ${k}: ${ty}; label: string }`,
      'export function Row(props: RowProps) {',
      `  if (props['${n}'] === ${a}) return <input type="checkbox" aria-label={props.label} />;`,
      '  return <input type="radio" aria-label={props.label} />;',
      '}',
    );
  },
};
