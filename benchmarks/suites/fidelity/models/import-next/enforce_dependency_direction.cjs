const { tag } = require('../../lib.cjs');
const { importOf, keyOf, src } = require('../../imports.cjs');

const DIR = {
  Domain: 'domain',
  Application: 'application',
  Infrastructure: 'infrastructure',
  Presentation: 'presentation',
  Lib: 'lib',
};

const spec = (target) => {
  if (target === 'Local') return './x';
  if (target === 'Package') return 'infrastructure';
  return `../../${DIR[target.slice(2)]}/x`;
};

const CONFIG = {
  Defaults: undefined,
  NoSameLayer: { allowSameLayer: false },
  Reversed: {
    layers: ['presentation', 'infrastructure', 'application', 'domain'],
  },
  Narrow: { layerPatterns: ['domain', 'application'] },
};

module.exports = {
  rule: 'enforce-dependency-direction',
  domain: 13 + 5 * 7 * 4,
  traces: 1500,
  key: keyOf('focus', 'form', 'layer', 'target', 'config'),
  filename: (s) => `src/${DIR[tag(s.layer)]}/feature/file.ts`,
  config: (s) => CONFIG[tag(s.config)],
  code: (s) => src(importOf(tag(s.form), spec(tag(s.target)))),
};
