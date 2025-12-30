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

ruleTester.run('consistent-type-specifier-style', consistentTypeSpecifierStyle, {
  valid: [
    // Default option (prefer-inline): inline types are valid
    { code: `import { type Foo } from 'foo';` },
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
  ],
});
