import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { preferTemplateLiteral } from '../rules/prefer-template-literal';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

describe('prefer-template-literal', () => {
  ruleTester.run('prefer-template-literal', preferTemplateLiteral, {
    valid: [
      // Template literals already used
      { name: 'a template literal already', code: 'const s = `Hello ${name}`;' },
      { code: 'const url = `https://example.com/${path}`;' },
      // Pure string literal concat (no runtime value — fine as-is)
      { code: 'const s = "a" + "b";' },
      { code: 'const s = "Hello " + "World";' },
      // Numeric addition — not string concat
      { code: 'const n = a + b;' },
      { code: 'const n = 1 + 2;' },
    ],
    invalid: [
      {
        name: 'string concatenation where a template reads better',
        code: 'const s = "Hello " + name;',
        errors: [{ messageId: 'preferTemplateLiteral' }],
        output: 'const s = `Hello ${name}`;',
      },
      {
        code: 'const url = "https://example.com/" + path + "?q=" + q;',
        errors: [{ messageId: 'preferTemplateLiteral' }],
        output: 'const url = `https://example.com/${path}?q=${q}`;',
      },
      {
        code: 'console.log("Error: " + err.message);',
        errors: [{ messageId: 'preferTemplateLiteral' }],
        output: 'console.log(`Error: ${err.message}`);',
      },
      {
        code: 'const msg = prefix + " " + value;',
        errors: [{ messageId: 'preferTemplateLiteral' }],
        output: 'const msg = `${prefix} ${value}`;',
      },
      {
        // A parenthesised `+` on the right is its own expression, not more of
        // the concat chain. Flattening it changes the value: at i=0 the old
        // fix turned "row 1" into "row 01".
        name: 'a parenthesised addition on the right survives the rewrite intact',
        code: 'const label = "row " + (i + 1);',
        errors: [{ messageId: 'preferTemplateLiteral' }],
        output: 'const label = `row ${i + 1}`;',
      },
      {
        // Same shape with both operands dynamic — the sum must stay a sum.
        name: 'a parenthesised sum of two variables stays one placeholder',
        code: 'const t = "sum: " + (a + b);',
        errors: [{ messageId: 'preferTemplateLiteral' }],
        output: 'const t = `sum: ${a + b}`;',
      },
      {
        // The left-associative chain is genuinely one concatenation, so it
        // still flattens — `"a" + b + c` is `("a" + b) + c`, all string.
        name: 'an unparenthesised left-associative chain still flattens',
        code: 'const s = "n" + a + b;',
        errors: [{ messageId: 'preferTemplateLiteral' }],
        output: 'const s = `n${a}${b}`;',
      },
    ],
  });
});
