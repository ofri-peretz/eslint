import { RuleTester } from '@typescript-eslint/rule-tester';
import * as parser from '@typescript-eslint/parser';
import { noFloatingQuery } from './index';

/**
 * Every fixture imports a PostgreSQL client, because the rule now abstains in
 * files that use no PostgreSQL at all. Wrapping the arrays rather than editing
 * each fixture means one cannot be left behind — a fixture missing the import
 * would pass vacuously on the gate instead of exercising the detection it was
 * written for.
 */
const withPg = (code: string): string => `import { Pool } from 'pg';\n${code}`;
const pg = <T,>(cases: T[]): T[] =>
  cases.map((c) =>
    typeof c === 'string'
      ? (withPg(c) as T)
      : ({ ...c, code: withPg((c as { code: string }).code) } as T),
  );


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
  valid: pg([
    // Await
    "await client.query('SELECT 1')",
    "async function foo() { await client.query('SELECT 1'); }",
    
    // Return
    "return client.query('SELECT 1')",
    "function foo() { return client.query('SELECT 1'); }",
    
    // Assignment WITH a later read — the binding is the owner.
    "async function f() { const p = client.query('SELECT 1'); return await p; }",
    "async function f() { let p; p = client.query('SELECT 1'); return await p; }",

    // Promise Methods & Chaining. A rejection handler is what makes a
    // fire-and-forget chain handled: `.catch(h)` or the two-argument
    // `.then(onFulfilled, onRejected)`. See the invalid block for the
    // one-argument `.then` and the bare `.finally`, which are not.
    "client.query('SELECT 1').then(res => console.log(res), err => report(err))",
    "client.query('SELECT 1').catch(err => console.error(err))",
    "client.query('SELECT 1').catch(err => console.error(err)).finally(() => cleanup())",
    "Promise.all([client.query('SELECT 1')])",
    "Promise.allSettled([client.query('SELECT 1')])",
    "Promise.race([client.query('SELECT 1')])",
    
    // Arrow Function Implicit Return
    "const foo = () => client.query('SELECT 1')",
    "items.map(i => client.query('INSERT', [i]))",
    
    // Void Operator (Explicit Ignore)
    "void client.query('SELECT 1')",
    
    // Short-circuit, ternary and sequence expressions are TRANSPARENT: in a
    // value position whatever consumes the value owns the promise. In
    // statement position they are control flow and the promise is discarded —
    // those live in the invalid block below.
    "async function f() { return await (isValid && client.query('UPDATE ...')); }",
    "async function f() { return await (isValid ? client.query('COMMIT') : client.query('ROLLBACK')); }",
    "const p = (other(), client.query('SELECT 1')); export default p;",

    // Object/Array Definition
    "const obj = { p: client.query('SELECT 1') }",
    "const arr = [client.query('SELECT 1')]",
    
    // Template Literal
    "`Result: ${client.query('SELECT 1')}`",

    // Argument Passing
    "doSomething(client.query('SELECT 1'))",
  ]),
  invalid: pg([
    // REGRESSION LOCKS. Every case below was in the `valid` array and every
    // one of them is an unhandled rejection. They were accepted because the
    // rule returned on the PARENT NODE TYPE — a MemberExpression, a
    // VariableDeclarator, an AssignmentExpression, a LogicalExpression — without
    // ever asking whether that parent takes ownership of the promise.
    {
      // A one-argument `.then()` covers the success path only. The rejection is
      // unhandled, which is exactly what this rule is for.
      code: "client.query('SELECT 1').then(res => console.log(res));",
      errors: [{ messageId: 'noFloatingQuery' }],
    },
    {
      // `.finally()` re-throws what it is handed; it is transparent to
      // rejection handling.
      code: "client.query('SELECT 1').finally(() => cleanup());",
      errors: [{ messageId: 'noFloatingQuery' }],
    },
    {
      // Storing a promise only handles it if something reads the binding.
      code: "function f() { const p = client.query('SELECT 1'); }",
      errors: [{ messageId: 'noFloatingQuery' }],
    },
    {
      code: "function f() { let p; p = client.query('SELECT 1'); }",
      errors: [{ messageId: 'noFloatingQuery' }],
    },
    {
      // `isValid && q()` in statement position IS `if (isValid) q();`.
      code: "isValid && client.query('UPDATE ...');",
      errors: [{ messageId: 'noFloatingQuery' }],
    },
    {
      code: "isValid || client.query('LOG ...');",
      errors: [{ messageId: 'noFloatingQuery' }],
    },
    {
      code: "isValid ? client.query('COMMIT') : client.query('ROLLBACK');",
      errors: [{ messageId: 'noFloatingQuery' }, { messageId: 'noFloatingQuery' }],
    },
    {
      // A sequence expression in statement position throws its value away.
      code: "(other(), client.query('SELECT 1'));",
      errors: [{ messageId: 'noFloatingQuery' }],
    },
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
  ]),
});
