const { tag } = require('../../lib.cjs');
const { keyOf } = require('../../quality.cjs');
const { FILE, src } = require('../../react.cjs');

const NAME = {
  IsUpper: 'isLooped',
  IsLower: 'island',
  IsOnly: 'is',
  Plain: 'looped',
};
const TY = {
  BoolT: ': boolean',
  OptBool: '?: boolean',
  BoolOrUndef: '?: boolean | undefined',
  Str: ': string',
};

module.exports = {
  rule: 'no-is-prefix-prop',
  domain: 4 * 2 * 4 * 3,
  traces: 700,
  filename: FILE,
  key: keyOf('name', 'keySp', 'ty', 'container'),
  code: (s) => {
    const n = NAME[tag(s.name)];
    const k = tag(s.keySp) === 'Quoted' ? `'${n}'` : n;
    const member = `${k}${TY[tag(s.ty)]}`;
    const body = '  return <video data-looped={String(props)} />;';
    switch (tag(s.container)) {
      case 'Interface':
        return src(
          `interface PlayerProps { ${member}; }`,
          'export function Player(props: PlayerProps) {',
          body,
          '}',
        );
      case 'Alias':
        return src(
          `type PlayerProps = { ${member} };`,
          'export function Player(props: PlayerProps) {',
          body,
          '}',
        );
      default:
        return src(`export function Player(props: { ${member} }) {`, body, '}');
    }
  },
};
