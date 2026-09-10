/**
 * Tests for consistent-type-specifier-style
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { consistentTypeSpecifierStyle } from '../rules/consistent-type-specifier-style';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run(
  'consistent-type-specifier-style',
  consistentTypeSpecifierStyle,
  {
    valid: [
      // Default option (prefer-inline): inline types are valid
      {
        name: 'the inline `{ type Foo }` form',
        code: `import { type Foo } from 'foo';`,
      },
      { code: `import { type Foo, type Bar } from 'foo';` },
      { code: `import { type Foo, bar } from 'foo';` },

      // Value imports (no type) - always valid
      { code: `import { foo } from 'foo';` },
      { code: `import foo from 'foo';` },
      { code: `import * as foo from 'foo';` },

      // prefer-top-level: top-level type imports are valid
      {
        code: `import type { Foo } from 'foo';`,
        options: ['prefer-top-level'],
      },
      {
        code: `import type { Foo, Bar } from 'foo';`,
        options: ['prefer-top-level'],
      },

      // Mixed type and value with prefer-top-level (can't change this)
      {
        code: `import { type Foo, bar } from 'foo';`,
        options: ['prefer-top-level'],
      },
    ],

    invalid: [
      // prefer-inline (default): top-level type should be inline
      {
        name: 'a top-level `import type` where the configured style is inline',
        code: `import type { Foo } from 'foo';`,
        errors: [{ messageId: 'preferInline' }],
        output: `import { type Foo } from 'foo';`,
      },
      {
        code: `import type { Foo, Bar } from 'foo';`,
        errors: [{ messageId: 'preferInline' }],
        output: `import { type Foo, type Bar } from 'foo';`,
      },
      {
        code: `import type { Foo as F } from 'foo';`,
        errors: [{ messageId: 'preferInline' }],
        output: `import { type Foo as F } from 'foo';`,
      },

      // prefer-top-level: inline types should be top-level
      {
        code: `import { type Foo } from 'foo';`,
        options: ['prefer-top-level'],
        errors: [{ messageId: 'preferTopLevel' }],
        output: `import type { Foo } from 'foo';`,
      },
      {
        code: `import { type Foo, type Bar } from 'foo';`,
        options: ['prefer-top-level'],
        errors: [{ messageId: 'preferTopLevel' }],
        output: `import type { Foo, Bar } from 'foo';`,
      },
      {
        code: `import { type Foo as F, type Bar as B } from 'foo';`,
        options: ['prefer-top-level'],
        errors: [{ messageId: 'preferTopLevel' }],
        output: `import type { Foo as F, Bar as B } from 'foo';`,
      },

      // burgee sweep 2026-09-10, from
      // packages/compat-oracle/src/drivers/yargs.ts:7 and
      // packages/burgee/src/yargs/burgee.test.ts:10, both of which write
      // `import yargs, { type Argv } from 'yargs';`.
      //
      // The report is right — every NAMED specifier is an inline type, so the
      // preference does apply. The rewrite is not: it rebuilds the statement from
      // the named specifiers alone, and a default or namespace binding is not among
      // them, so `--fix` deletes a live value import and every use of it below
      // becomes an undefined reference. Reported, since the preference is
      // unchanged; not rewritten.
      {
        name: 'a default binding alongside an inline type is reported, but rewriting it would delete the default',
        code: `import yargs, { type Argv } from 'yargs';`,
        options: ['prefer-top-level'],
        errors: [{ messageId: 'preferTopLevel' }],
        output: null,
      },
      {
        name: 'and with several inline types beside the default',
        code: `import def, { type T, type U } from 'm2';`,
        options: ['prefer-top-level'],
        errors: [{ messageId: 'preferTopLevel' }],
        output: null,
      },
    ],
  },
);
