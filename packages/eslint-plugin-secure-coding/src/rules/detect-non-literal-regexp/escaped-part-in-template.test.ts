/**
 * An escaped value interpolated into a written pattern is neutralised.
 *
 * nestjs/config builds `new RegExp(`^${name}=`)` from a `name` escaped with the
 * canonical `.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')` one line up, and the rule
 * reported it: the escape was only recognised when it was the WHOLE pattern.
 * The input adds text, never an operator. The invalid half keeps one raw part,
 * a half-escape, and a fake escaper reporting.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { detectNonLiteralRegexp } from './index';

const ruleTester = new RuleTester();

// The canonical escape, as source text: .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const ESC = ".replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')";

ruleTester.run(
  'detect-non-literal-regexp — escaped part in a template',
  detectNonLiteralRegexp,
  {
    valid: [
      {
        name: 'nestjs/config: an escaped binding inside a template',
        code: `export function f(key) { const name = key${ESC}; return new RegExp(\`^\${name}=(.*)$\`, 'm'); }`,
      },
      {
        name: 'the escape written in place inside the template',
        code: `export function f(key) { return new RegExp(\`^\${key${ESC}}$\`); }`,
      },
      {
        name: 'an escaped binding concatenated with literals',
        code: `export function f(key) { const name = key${ESC}; return new RegExp('^' + name + '$'); }`,
      },
      {
        name: 'an escaped part beside a module constant',
        code: `const SEP = '='; export function f(key) { const name = key${ESC}; return new RegExp(\`\${name}\${SEP}\`); }`,
      },
    ],
    invalid: [
      {
        name: 'one raw part beside an escaped one still reports',
        code: `export function f(key, raw) { const name = key${ESC}; return new RegExp(\`\${name}|\${raw}\`); }`,
        errors: [{ messageId: 'runtimeDecidedPattern' }],
      },
      {
        name: 'a raw part in a concatenation still reports',
        code: `export function f(raw) { return new RegExp('^' + raw); }`,
        errors: [{ messageId: 'runtimeDecidedPattern' }],
      },
      {
        name: 'a fake escaper inside a template still reports',
        code: `export function f(key) { const name = key.replace(/foo/g, 'bar'); return new RegExp(\`^\${name}$\`); }`,
        errors: [{ messageId: 'runtimeDecidedPattern' }],
      },
      {
        name: 'a non-+ binary pattern is not a concatenation',
        code: `export function f(a, b) { return new RegExp(a - b); }`,
        errors: [{ messageId: 'runtimeDecidedPattern' }],
      },
    ],
  },
);
