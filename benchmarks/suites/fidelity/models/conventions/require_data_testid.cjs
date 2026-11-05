const { tag } = require('../../lib.cjs');
const { keyOf, src } = require('../../quality.cjs');

/** [tag name, other attributes]. */
const ELEMENT = {
  Button: ['button', ''],
  AnchorHref: ['a', ' href="/docs"'],
  AnchorPlain: ['a', ' id="top"'],
  CompHandler: ['MyButton', ' onClick={go}'],
  CompPlain: ['MyButton', ''],
  Thead: ['thead', ''],
};

const TESTID = {
  Missing: '',
  Literal: ' data-testid="submit"',
  Template: ' data-testid={`page-${page}`}',
  Ident: ' data-testid={TEST_ID}',
  Member: ' data-testid={ids.submit}',
  Conditional: " data-testid={ok ? 'save' : 'cancel'}",
  Shorthand: ' data-testid',
  Spread: ' {...props}',
};

const OPT = {
  Default: () => undefined,
  RequireOn: (name) => ({ requireOn: [name] }),
  Ignore: (name) => ({ ignore: [name] }),
  PatternFlip: () => ({ componentPattern: '^Ui' }),
  HandlerFlip: () => ({ componentRequiresHandler: false }),
  StableFlip: () => ({ enforceStableValues: false }),
};

module.exports = {
  rule: 'require-data-testid',
  domain: 6 * 8 * 6,
  traces: 2400,
  key: keyOf('element', 'testId', 'opt'),
  filename: 'src/app.tsx',
  config: (s) => OPT[tag(s.opt)](ELEMENT[tag(s.element)][0]),
  code: (s) => {
    const [name, attrs] = ELEMENT[tag(s.element)];
    return src(
      "import { MyButton } from './ui';",
      "const TEST_ID = 'submit';",
      "const ids = { submit: 'submit' } as const;",
      'declare function go(): void;',
      'export function View(props: object, page: number, ok: boolean) {',
      `  return <${name}${attrs}${TESTID[tag(s.testId)]}>label</${name}>;`,
      '}',
    );
  },
};
