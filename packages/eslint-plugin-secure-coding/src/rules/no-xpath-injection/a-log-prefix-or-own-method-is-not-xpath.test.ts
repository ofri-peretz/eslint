/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Found linting open-source Node apps, three more shapes that are not XPath:
 *
 * - a tree-walking interpreter that calls its own `this.evaluate(node, env)`;
 * - a log prefix naming a package, `[@scope/name] Subform "${name}" not found`;
 * - a usage string, `Usage: /${cmd} <nick>[!ident][@host]`.
 *
 * Each exemption has an invalid lookalike that still reports.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import parser from '@typescript-eslint/parser';
import { noXpathInjection } from './index';

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

const concat = [{ messageId: 'unsafeXpathConcatenation' as const }];
const injection = [{ messageId: 'unvalidatedXpathInput' as const }];

ruleTester.run(
  'no-xpath-injection — a log prefix, a usage string and an own method',
  noXpathInjection,
  {
    valid: [
      {
        name: 'a quoted computed method is the same declared method',
        code: `class Q { ['evaluate'](n) { return n; } run(req) { return this.evaluate(req.query.q, doc); } }`,
      },
      {
        name: 'a class calling its own evaluate method',
        code: `class Interpreter {
          evaluate(node, env, depth) { return node; }
          run(root, req) { return this.evaluate(root, req.body.env, 0); }
        }`,
      },
      {
        name: 'a class whose evaluate is a property holding a function',
        code: `class Interpreter {
          evaluate = (node, env) => node;
          run(req) { return this.evaluate(req.query.node, 0); }
        }`,
      },
      {
        name: 'a package log prefix',
        code: 'function fail(name) { throw new Error(`[@apostrophecms/settings] Subform "${name}" not found.`); }',
      },
      {
        name: 'a usage string with an angle placeholder',
        code: 'function usage(cmd) { return `Usage: /${cmd} <nick>[!ident][@host]`; }',
      },
    ],
    invalid: [
      {
        name: 'this.evaluate in a class that never declares it is still the evaluator',
        code: `class Q { constructor(doc) { this.evaluate = doc.evaluate; } run(req) { return this.evaluate(req.query.q, this.doc); } }`,
        errors: injection,
      },
      {
        name: 'a member computed from a variable is not the declared method',
        code: `class Q { [name](n) { return n; } run(req) { return this.evaluate(req.query.q, doc); } }`,
        errors: injection,
      },
      {
        name: 'a different receiver is not the own method',
        code: `class Q { evaluate(n) { return n; } run(req, doc) { return doc.evaluate(req.query.q, doc); } }`,
        errors: injection,
      },
      {
        name: 'this.evaluate outside any class',
        code: `function run(req) { return this.evaluate(req.query.q, doc); }`,
        errors: injection,
      },
      {
        name: 'a predicate with a path step after the attribute is not a package tag',
        code: 'function find(name) { return `//user[@id/x=${name}]`; }',
        errors: concat,
      },
      {
        name: 'a real attribute predicate beside a package-like tag still reports',
        code: 'function find(name) { return `[@scope/pkg] //user[@id="${name}"]`; }',
        errors: concat,
      },
      {
        name: 'an XPath predicate with no angle placeholder',
        code: 'function find(host) { return `//node[!ident][@host="${host}"]`; }',
        errors: concat,
      },
    ],
  },
);
