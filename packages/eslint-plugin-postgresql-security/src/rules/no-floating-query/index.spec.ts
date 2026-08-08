import { RuleTester } from '@typescript-eslint/rule-tester';
import * as parser from '@typescript-eslint/parser';
import { noFloatingQuery } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    parserOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
    },
  },
});

ruleTester.run('no-floating-query', noFloatingQuery, {
  valid: [
    // Await
    "await client.query('SELECT 1')",
    "async function foo() { await client.query('SELECT 1'); }",
    
    // Return
    "return client.query('SELECT 1')",
    "function foo() { return client.query('SELECT 1'); }",
    
    // Assignment
    "const p = client.query('SELECT 1')",
    "let p; p = client.query('SELECT 1')",
    
    // Promise Methods & Chaining
    "client.query('SELECT 1').then(res => console.log(res))",
    "client.query('SELECT 1').catch(err => console.error(err))",
    "client.query('SELECT 1').finally(() => cleanup())",
    "Promise.all([client.query('SELECT 1')])",
    "Promise.allSettled([client.query('SELECT 1')])",
    "Promise.race([client.query('SELECT 1')])",
    
    // Arrow Function Implicit Return
    "const foo = () => client.query('SELECT 1')",
    "items.map(i => client.query('INSERT', [i]))",
    
    // Void Operator (Explicit Ignore)
    "void client.query('SELECT 1')",
    
    // Logical Expressions (Short-circuit)
    "isValid && client.query('UPDATE ...')",
    "isValid || client.query('LOG ...')",
    
    // Conditional (Ternary)
    "isValid ? client.query('COMMIT') : client.query('ROLLBACK')",
    
    // Sequence Expression
    "(other(), client.query('SELECT 1'))",
    
    // Object/Array Definition
    "const obj = { p: client.query('SELECT 1') }",
    "const arr = [client.query('SELECT 1')]",
    
    // Template Literal
    "`Result: ${client.query('SELECT 1')}`",

    // Argument Passing
    "doSomething(client.query('SELECT 1'))",
  ],
  invalid: [
    {
      code: "client.query('SELECT 1');",
      errors: [{ messageId: 'noFloatingQuery' }],
    },
    {
      code: `
      async function foo() {
        pool.query('INSERT ...');
      }
      `,
      errors: [{ messageId: 'noFloatingQuery' }],
    },
    {
      code: "if (true) { client.query('SELECT 1'); }",
      errors: [{ messageId: 'noFloatingQuery' }],
    },
    {
      code: "try { client.query('SELECT 1'); } catch (e) {}",
      errors: [{ messageId: 'noFloatingQuery' }],
    },
    {
      code: "for (let i=0; i<10; i++) { client.query('INSERT ...'); }",
      errors: [{ messageId: 'noFloatingQuery' }],
    },
    {
      code: "while (true) { client.query('SELECT 1'); break; }",
      errors: [{ messageId: 'noFloatingQuery' }],
    },
    {
      code: "switch (x) { case 1: client.query('SELECT 1'); break; }",
      errors: [{ messageId: 'noFloatingQuery' }],
    },
    {
      // Parentheses (checking if rule handles parens or if parser collapses them)
      // Standard parser often handles this transparently, but good to test.
      code: "(client.query('SELECT 1'));",
      errors: [{ messageId: 'noFloatingQuery' }],
    },
    {
      // Multiple statements
      code: `
        client.query('SELECT 1');
        client.query('SELECT 2');
      `,
      errors: [{ messageId: 'noFloatingQuery' }, { messageId: 'noFloatingQuery' }],
    }
  ],
});
