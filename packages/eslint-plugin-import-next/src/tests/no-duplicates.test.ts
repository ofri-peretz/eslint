import { RuleTester } from '@typescript-eslint/rule-tester';
import { RuleTester as ESLintRuleTester } from 'eslint';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
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
      "import { merge, find } from 'lodash';",
      "import foo from 'foo'; import bar from 'bar';",
    ],
    invalid: [
      {
        code: "import { merge } from 'lodash'; import { find } from 'lodash';",
        output: "import { merge, find } from 'lodash'; ", // Fixer remove might leave trailing space or newline depending on whitespace
        errors: [{ messageId: 'noDuplicates' }],
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
        errors: [{ messageId: 'noDuplicates' }],
        output: "import { a, b } from './m';\n",
      },
      {
        // Two TYPE-only imports are duplicates of each other, and merge.
        code: "import type { A } from './m';\nimport type { B } from './m';",
        errors: [{ messageId: 'noDuplicates' }],
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
        errors: [{ messageId: 'noDuplicates' }],
        output: "import { a, b } from './m';\n",
      },
    ],
  });
});
