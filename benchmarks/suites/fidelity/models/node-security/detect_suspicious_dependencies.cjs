const { tag } = require('../../lib.cjs');

module.exports = {
  rule: 'detect-suspicious-dependencies',
  domain: 48, // 12 names x 4 import spellings
  traces: 600,
  key: (s) => `${tag(s.name)}|${tag(s.spelling)}`,
  code: (s) => {
    const spec = {
      Exact: 'react',
      Typo1: 'reakt',
      Transposed: 'axois', // 2 edits from axios
      Deletion: 'expres',
      SubpathExact: 'lodash/fp',
      SubpathTypo: 'lodsh/fp',
      Scoped: '@myorg/react-utils',
      Relative: './utils',
      Builtin: 'node:fs',
      Unrelated: 'zod',
      NearLegit: 'preact', // 1 edit from react
      FarSimilar: 'webpack-merge-and-more', // shares a prefix, many edits away
    }[tag(s.name)];
    return {
      EsmImport: `import dep from '${spec}';\nexport const x = dep;`,
      Require: `const dep = require('${spec}');\nexport const x = dep;`,
      DynamicImport: `export const load = () => import('${spec}');`,
      ExportFrom: `export * from '${spec}';`,
    }[tag(s.spelling)];
  },
  model: (s) => s.verdict,
};
