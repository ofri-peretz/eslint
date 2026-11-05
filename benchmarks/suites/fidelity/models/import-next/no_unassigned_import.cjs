const { tag } = require('../../lib.cjs');
const { importOf, keyOf, src } = require('../../imports.cjs');

const SPEC = './polyfill';

const line = (form) => {
  if (form === 'EmptyBraces') return `import {} from '${SPEC}';`;
  if (form === 'RequireStatement') return `require('${SPEC}');`;
  return importOf(form, SPEC);
};

const CONFIG = {
  Defaults: undefined,
  AllowThis: { allowModules: [SPEC] },
  AllowOther: { allowModules: ['./other'] },
};

module.exports = {
  rule: 'no-unassigned-import',
  domain: 15 * 3,
  traces: 400,
  key: keyOf('form', 'config'),
  config: (s) => CONFIG[tag(s.config)],
  code: (s) => src(line(tag(s.form))),
};
