import { RuleTester } from '@typescript-eslint/rule-tester';
import { RuleTester as ESLintRuleTester } from 'eslint';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import * as path from 'node:path';
import { noDuplicates } from '../rules/no-duplicates';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

describe('no-duplicates', () => {
  ruleTester.run('no-duplicates', noDuplicates, {
    valid: [
      {
        name: 'one import of a module',
        code: "import { merge, find } from 'lodash';",
      },
      "import foo from 'foo'; import bar from 'bar';",
    ],
    invalid: [
      {
        name: 'two value imports from the same module',
        code: "import { merge } from 'lodash'; import { find } from 'lodash';",
        output: "import { merge, find } from 'lodash'; ", // Fixer remove might leave trailing space or newline depending on whitespace
        errors: [{ messageId: 'noDuplicates' }, { messageId: 'noDuplicates' }],
      },
    ],
  });
});

/**
 * A type-only import is not a duplicate of a value import.
 *
 * `import type { T } from 'm'` is erased at compile time. Folding it into
 * `import { v } from 'm'` creates a runtime dependency that was not there,
 * which is what `verbatimModuleSyntax` exists to prevent and what tree-shaking
 * relies on. The declarations are separate on purpose.
 *
 * 42 of the 94 findings on the pinned 8-repository corpus — 45% — were this
 * shape. ESLint core's `import/no-duplicates` separates them the same way.
 */
describe('no-duplicates — importKind is part of the identity', () => {
  ruleTester.run('type vs value', noDuplicates, {
    valid: [
      {
        name: 'a type import and a value import, which merge cleanly',
        code: "import type { T } from './m';\nimport { v } from './m';\nexport const x: T = v;",
      },
      {
        // Order does not matter.
        code: "import { v } from './m';\nimport type { T } from './m';\nexport const x: T = v;",
      },
    ],
    invalid: [
      {
        // POSITIVE CONTROL: two value imports still merge. Without this the
        // valid cases above pass on a rule that stopped reporting entirely.
        code: "import { a } from './m';\nimport { b } from './m';",
        errors: [{ messageId: 'noDuplicates' }, { messageId: 'noDuplicates' }],
        output: "import { a, b } from './m';\n",
      },
      {
        // Two TYPE-only imports are duplicates of each other, and merge.
        code: "import type { A } from './m';\nimport type { B } from './m';",
        errors: [{ messageId: 'noDuplicates' }, { messageId: 'noDuplicates' }],
        output: "import type { A, B } from './m';\n",
      },
    ],
  });
});

/**
 * The plugin runs on plain JavaScript too, where espree leaves `importKind`
 * undefined rather than `'value'`. The `?? 'value'` fallback in the group key
 * is what keeps every JS import in one bucket instead of a bucket keyed on
 * `undefined` — reachable, so pinned.
 */
describe('no-duplicates — plain JavaScript, no importKind', () => {
  // ESLint's own RuleTester, deliberately. `@typescript-eslint/rule-tester`
  // installs the TS parser by default even when none is given, so a block
  // written there would still see `importKind: 'value'` and the fallback would
  // stay unreached.
  const jsRuleTester = new ESLintRuleTester({
    languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
  });

  jsRuleTester.run('espree', noDuplicates as never, {
    valid: ["import { a, b } from './m';"],
    invalid: [
      {
        code: "import { a } from './m';\nimport { b } from './m';",
        errors: [{ messageId: 'noDuplicates' }, { messageId: 'noDuplicates' }],
        output: "import { a, b } from './m';\n",
      },
    ],
  });
});

/**
 * Fidelity (benchmarks/suites/fidelity/models/import-next/no_duplicates.qnt):
 * one module is the file the resolver sees, a namespace import cannot merge
 * with a named one, and two ambient `declare module` blocks are two scopes.
 * `src/app.ts` resolves `./files/foo` to src/files/foo.ts; absolute, so both
 * engines resolve it the same way.
 */
const APP = path.resolve(__dirname, '../app.ts');

describe('no-duplicates — fidelity', () => {
  ruleTester.run('module identity, namespace and scope', noDuplicates, {
    valid: [
      {
        name: 'a namespace import beside a named import cannot be one statement',
        code: "import * as ns from './m';\nimport { a } from './m';",
      },
      {
        name: 'a namespace import beside an inline type import cannot be one statement',
        code: "import * as ns from './m';\nimport { type A } from './m';",
      },
      {
        name: 'imports in two declare module blocks belong to two modules',
        code: "declare module 'a' {\n  import { A } from './m';\n}\ndeclare module 'b' {\n  import { B } from './m';\n}",
        filename: 'src/types.d.ts',
      },
      {
        name: 'a query suffix names a different module',
        code: "import { bar } from './files/foo';\nimport raw from './files/foo?raw';",
        filename: APP,
      },
    ],
    invalid: [
      {
        name: "'./files/foo' and './files/foo.js' resolve to one file",
        code: "import { bar } from './files/foo';\nimport { baz } from './files/foo.js';",
        filename: APP,
        errors: [{ messageId: 'noDuplicates' }, { messageId: 'noDuplicates' }],
        output: "import { bar, baz } from './files/foo';\n",
      },
      {
        name: "'./files/foo' and './files/foo.ts' resolve to one file",
        code: "import { bar } from './files/foo';\nimport './files/foo.ts';",
        filename: APP,
        errors: [{ messageId: 'noDuplicates' }, { messageId: 'noDuplicates' }],
        output: "import { bar } from './files/foo';\n",
      },
      {
        name: 'two imports in one declare module block are duplicates',
        code: "declare module 'a' {\n  import { A } from './m';\n  import { B } from './m';\n}",
        filename: 'src/types.d.ts',
        errors: [{ messageId: 'noDuplicates' }, { messageId: 'noDuplicates' }],
        output: "declare module 'a' {\n  import { A, B } from './m';\n  \n}",
      },
      {
        name: 'a default in the duplicate is not spliced into braces (no fix)',
        code: "import { a } from './m';\nimport d from './m';",
        errors: [{ messageId: 'noDuplicates' }, { messageId: 'noDuplicates' }],
        output: null,
      },
      {
        name: 'named specifiers after a default-only import get their own braces',
        code: "import d from './m';\nimport { a } from './m';",
        errors: [{ messageId: 'noDuplicates' }, { messageId: 'noDuplicates' }],
        output: "import d, { a } from './m';\n",
      },
    ],
  });
});

/**
 * A type-only default and a type-only named (or namespace) import of one
 * module cannot be one statement: TypeScript rejects `import type D, { A }`
 * (TS1363). eslint-plugin-import keeps them apart too.
 */
describe('no-duplicates: type-only default beside type-only named', () => {
  ruleTester.run('type-only default and named', noDuplicates, {
    valid: [
      {
        name: 'a type-only default beside type-only named names',
        code: "import type D from './m'; import type { A } from './m';",
      },
      {
        name: 'type-only named names beside a type-only default',
        code: "import type { A } from './m'; import type D from './m';",
      },
      {
        name: 'a type-only default beside a type-only namespace',
        code: "import type D from './m'; import type * as M from './m';",
      },
    ],
    invalid: [
      {
        name: 'two type-only defaults of one module',
        code: "import type D from './m'; import type E from './m';",
        errors: [{ messageId: 'noDuplicates' }, { messageId: 'noDuplicates' }],
      },
      {
        name: 'two type-only named imports of one module still merge',
        code: "import type { A } from './m'; import type { B } from './m';",
        output: "import type { A, B } from './m'; ",
        errors: [{ messageId: 'noDuplicates' }, { messageId: 'noDuplicates' }],
      },
    ],
  });
});

describe('no-duplicates — inline type specifiers', () => {
  // eslint-plugin-import's buckets: an import with an inline `type`
  // specifier goes with the `import type { … }` statements, not with the
  // value imports of the same module.
  ruleTester.run('inline type specifiers', noDuplicates, {
    valid: [
      {
        name: 'an inline type import beside a default value import',
        code: "import { type x } from './m'; import y from './m';",
      },
      {
        name: 'an inline type import beside a value import',
        code: "import { type x } from './m'; import { y } from './m';",
      },
    ],
    invalid: [
      {
        name: 'an inline type import beside an import type statement',
        code: "import { type x } from 'm'; import type { y } from 'm';",
        output: "import { type x, type y } from 'm'; ",
        errors: [{ messageId: 'noDuplicates' }, { messageId: 'noDuplicates' }],
      },
      {
        name: 'two imports with inline types merge',
        code: "import { a, type x } from 'm'; import { type y } from 'm';",
        output: "import { a, type x, type y } from 'm'; ",
        errors: [{ messageId: 'noDuplicates' }, { messageId: 'noDuplicates' }],
      },
    ],
  });
});
