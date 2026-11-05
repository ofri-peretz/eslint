/**
 * Tests for no-named-as-default-member rule
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noNamedAsDefaultMember } from '../rules/no-named-as-default-member';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    parserOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
    },
  },
});

ruleTester.run('no-named-as-default-member', noNamedAsDefaultMember, {
  valid: [
    // Standard default usage
    {
      name: 'an ordinary property of the default',
      code: `
        import foo from './foo';
        const bar = foo.bar;
      `,
    },

    // Destructuring default
    {
      code: `
        import foo from './foo';
        const { bar } = foo;
      `,
    },

    // Named import usage
    {
      code: `import { bar } from './foo';`,
    },
  ],

  invalid: [
    // No resolver is involved, and the comment block that used to sit here
    // guessed that one was — it hedged about mocking an ExportMap the rule
    // never reads. What the rule actually does is narrower and needs nothing:
    // within one file it sees `import foo, { bar } from './foo'`, so it knows
    // `bar` IS a named export of that module, and a later `foo.bar` is
    // therefore reaching a named export through the default binding.
    {
      name: 'a property read off the default that is also a named export of the same module',
      code: `import foo, { bar } from './foo'; const baz = foo.bar;`,
      errors: [{ messageId: 'namedAsDefaultMember' }],
    },
    {
      // The rule skipped every computed member, so this spelling — what a
      // minifier emits, and the only spelling available for a key that is not
      // a valid identifier — passed while `foo.bar` reported.
      // @found grammar review
      name: 'FN: the same access written through a computed literal key',
      code: `import foo, { bar } from './foo'; const baz = foo['bar'];`,
      errors: [{ messageId: 'namedAsDefaultMember' }],
    },
    {
      name: 'a named export whose name is not a valid identifier, so only the computed form exists',
      code: `import foo, { "kebab-name" as k } from './foo'; const baz = foo['kebab-name'];`,
      errors: [{ messageId: 'namedAsDefaultMember' }],
    },
    {
      name: 'the same access as a call',
      code: `import foo, { run } from './foo'; foo.run();`,
      errors: [{ messageId: 'namedAsDefaultMember' }],
    },
  ],
});

/**
 * Fidelity (benchmarks/suites/fidelity/models/import-next/no_named_as_default_member.qnt):
 * the default is followed by binding, through every spelling of the read.
 */
describe('no-named-as-default-member — fidelity', () => {
  ruleTester.run('binding and spellings', noNamedAsDefaultMember, {
    valid: [
      {
        name: 'a parameter shadowing the default import is another value',
        code: "import foo, { bar } from './m';\nexport const v = (foo: any) => foo.bar;",
      },
      {
        name: 'aliasing the default reads no property',
        code: "import foo, { bar } from './m';\nexport const alias = foo;",
      },
      {
        name: 'a rest element in the destructuring names no export',
        code: "import foo, { bar } from './m';\nexport const { ...all } = foo;",
      },
      {
        name: 'a type-only import of the name is not evidence',
        code: "import foo from './m';\nimport type { bar } from './m';\nexport const v = foo.bar;",
      },
      {
        name: 'a computed key in the destructuring names nothing',
        code: "import foo, { bar } from './m';\nexport const f = (k: string) => { const { [k]: v } = foo; return v; };",
      },
      {
        name: 'an inline type import of the name is not evidence',
        code: "import foo, { type bar } from './m';\nexport const v = foo.bar;",
      },
      {
        name: 'a type-only re-export of the name is not evidence',
        code: "import foo from './m';\nexport { type bar } from './m';\nexport const v = foo.bar;",
      },
      {
        name: 'a runtime key names nothing',
        code: "import foo, { bar } from './m';\nexport const v = (k: string) => foo[k];",
      },
    ],
    invalid: [
      {
        name: 'import { default as foo } is the default import',
        code: "import { default as foo, bar } from './m';\nexport const v = foo.bar;",
        errors: [{ messageId: 'namedAsDefaultMember' }],
      },
      {
        name: 'destructuring the named export off the default',
        code: "import foo, { bar } from './m';\nexport const { bar: v } = foo;",
        errors: [{ messageId: 'namedAsDefaultMember' }],
      },
      {
        name: 'a re-export of the name is evidence',
        code: "import foo from './m';\nexport { bar } from './m';\nexport const v = foo.bar;",
        errors: [{ messageId: 'namedAsDefaultMember' }],
      },
    ],
  });
});
