const { tag } = require('../../lib.cjs');
const { keyOf, src } = require('../../quality.cjs');

const VALUE = {
  False: 'false',
  ConstFalse: 'OFF',
  True: 'true',
  ToolName: "'esbuild'",
  Unknown: 'flag',
};

function setting(s) {
  const k = tag(s.key).toLowerCase();
  const v = VALUE[tag(s.value)];
  switch (tag(s.spelling)) {
    case 'QuotedKey':
      return [`export default { build: { '${k}': ${v} } };`];
    case 'ComputedKey':
      return [`export default { build: { ['${k}']: ${v} } };`];
    case 'Assign':
      return [
        'const config: any = { build: {} };',
        `config.build.${k} = ${v};`,
        'export default config;',
      ];
    case 'AssignSubscript':
      return [
        'const config: any = { build: {} };',
        `config.build['${k}'] = ${v};`,
        'export default config;',
      ];
    default:
      return [`export default { build: { ${k}: ${v} } };`];
  }
}

module.exports = {
  rule: 'require-code-minification',
  domain: 5 * 4 * 5 * 2,
  traces: 2000,
  key: keyOf('spelling', 'key', 'value', 'keysOpt'),
  filename: 'vite.config.ts',
  config: (s) =>
    tag(s.keysOpt) === 'CompressOnly'
      ? { minificationKeys: ['compress'] }
      : undefined,
  code: (s) =>
    src(
      'declare const flag: boolean;',
      'const OFF = false;',
      'void OFF; void flag;',
      setting(s),
    ),
};
