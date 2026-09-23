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
      {
        name: 'a template literal already',
        code: 'const s = `Hello ${name}`;',
      },
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
      // --- Left-side arithmetic sweep (2026-09-17) -------------------------
      // The right branch already refused to flatten a non-string `+`; the left
      // recursion did not, so `eslint --fix` silently turned addition into
      // concatenation and CHANGED RUNTIME VALUES. Measured with i=5, w=10,
      // h=20, f() === 4, o.n === 8 — each case below produced a different
      // string after the fix than before it.
      {
        // Was: `${i}${1}px` — "6px" became "51px".
        name: 'a numeric addition on the left stays one placeholder, not two',
        code: 'const a = i + 1 + "px";',
        errors: [{ messageId: 'preferTemplateLiteral' }],
        output: 'const a = `${i + 1}px`;',
      },
      {
        // Explicit parentheses were ignored too: `${i}${1}px` — "6px" -> "51px".
        name: 'an explicitly parenthesised addition on the left is preserved',
        code: 'const a = (i + 1) + "px";',
        errors: [{ messageId: 'preferTemplateLiteral' }],
        output: 'const a = `${i + 1}px`;',
      },
      {
        // Was: `${w}${h} total` — "30 total" became "1020 total".
        name: 'the sum of two variables on the left is not split into two interpolations',
        code: 'const a = w + h + " total";',
        errors: [{ messageId: 'preferTemplateLiteral' }],
        output: 'const a = `${w + h} total`;',
      },
      {
        // Was: `${i}${1}` — "6" became "51". Empty tail string, same defect.
        name: 'an empty string tail does not license flattening the arithmetic before it',
        code: 'const a = i + 1 + "";',
        errors: [{ messageId: 'preferTemplateLiteral' }],
        output: 'const a = `${i + 1}`;',
      },
      {
        // Was: `${f()}${1}px` — "4px" became "31px".
        name: 'a call expression added to a number on the left stays a single addition',
        code: 'const a = f() + 1 + "px";',
        errors: [{ messageId: 'preferTemplateLiteral' }],
        output: 'const a = `${f() + 1}px`;',
      },
      {
        // Was: `${o.n}${1}px` — "8px" became "71px".
        name: 'a member expression added to a number on the left stays a single addition',
        code: 'const a = o.n + 1 + "px";',
        errors: [{ messageId: 'preferTemplateLiteral' }],
        output: 'const a = `${o.n + 1}px`;',
      },
    ],
  });
});
