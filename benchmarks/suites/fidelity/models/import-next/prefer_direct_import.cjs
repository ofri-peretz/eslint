const { tag } = require('../../lib.cjs');
const { keyOf, src } = require('../../imports.cjs');

const SPEC = { Mapped: '@/ui', Unmapped: '@/other', Direct: '@/ui/Button' };

const FORM = {
  Named: (q) => `import { Button } from '${q}';`,
  Renamed: (q) => `import { Button as B } from '${q}';`,
  MultiNamed: (q) => `import { Button, Card } from '${q}';`,
  Default: (q) => `import UI from '${q}';`,
  Namespace: (q) => `import * as UI from '${q}';`,
  TypeOnly: (q) => `import type { Props } from '${q}';`,
  InlineType: (q) => `import { type Props } from '${q}';`,
  MixedInline: (q) => `import { type Props, Button } from '${q}';`,
  SideEffect: (q) => `import '${q}';`,
  ExportNamed: (q) => `export { Button } from '${q}';`,
  ExportAll: (q) => `export * from '${q}';`,
  Require: (q) => `const { Button } = require('${q}');`,
  Dynamic: (q) => `export const load = () => import('${q}');`,
};

const MAPPINGS = [{ barrel: '^@/ui$', directPath: '@/ui/{name}' }];
const OPTS = {
  Configured: { mappings: MAPPINGS },
  ConfiguredNoFix: { mappings: MAPPINGS, autoFix: false },
};

module.exports = {
  rule: 'prefer-direct-import',
  domain: 13 * 3 * 2,
  traces: 700,
  key: keyOf('form', 'target', 'opts'),
  config: (s) => OPTS[tag(s.opts)],
  code: (s) => src(FORM[tag(s.form)](SPEC[tag(s.target)])),
};
