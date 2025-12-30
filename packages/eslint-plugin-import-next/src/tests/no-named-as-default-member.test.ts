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
    // This rule typically reports when you access a property on a default import
    // that has the same name as a named export from that module.
    // Testing this usually requires the resolver to see the exports of './foo'.
    // Without full resolver mock, we test that the structure reports IF it detects it.
    // Since we can't easily mock the external file's exports in this unit test without
    // the resolver context, we may need to skip actual detection logic or mock the context.
    
    // HOWEVER, for the purpose of coverage, we can simulate the rule's logic if it relies on
    // simplified checks or if we can mock the "ExportMap" or similar utils.
    
    // If we assume the rule uses a simplified heuristic (e.g. checking existing named imports),
    // we can try:
    {
      code: `
        import foo, { bar } from './foo';
        const baz = foo.bar; // Accessing 'bar' on default 'foo' when 'bar' is a named export
      `,
      errors: [{ messageId: 'namedAsDefaultMember' }],
      // If the rule relies on filesystem/resolver, this might fail or pass depending on mocking.
      // We'll try to run it. If it fails due to missing resolver data, we might need to skip.
    },
  ],
});
