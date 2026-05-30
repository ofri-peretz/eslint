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
      { code: 'const s = `Hello ${name}`;' },
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
    ],
  });
});
