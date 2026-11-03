/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * The claims each path of the rule makes, one case per claim.
 *
 * The older suite exercised the safe-caller exemption only with templates that
 * carry no interpolation — strings the rule would never report anyway — so the
 * exemption could be deleted without a test noticing. Every exemption case
 * here interpolates, and every boundary case sits exactly on its boundary.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { noGraphqlInjection } from './index';

const ruleTester = new RuleTester();

const QUERY = '`query { user(id: "${id}") { name } }`';

ruleTester.run(
  'no-graphql-injection — what reaches the scan',
  noGraphqlInjection,
  {
    valid: [
      // ── safe callers: the template is a message, not a document ──────────
      {
        name: 'an interpolated query logged to the console is a log message',
        code: `console.log(${QUERY});`,
      },
      {
        name: 'a logger method spelled with a quoted key is the same safe caller',
        code: `logger['error'](${QUERY});`,
      },
      {
        name: 'a template inside an object logged to the console is still the log message',
        code: `console.log({ q: ${QUERY} });`,
      },
      {
        name: 'an interpolated query in an Error message is a message',
        code: `throw new Error(${QUERY});`,
      },
      {
        name: 'an interpolated query in a RangeError message is a message',
        code: `throw new RangeError(${QUERY});`,
      },
      {
        name: 'safeTemplateLiteralCallers: a dotted entry exempts that member call',
        code: `myLog.debug(${QUERY});`,
        options: [{ safeTemplateLiteralCallers: ['myLog.debug'] }],
      },
      {
        name: 'safeTemplateLiteralCallers: a bare entry exempts that constructor',
        code: `throw new MyCustomError(${QUERY});`,
        options: [{ safeTemplateLiteralCallers: ['MyCustomError'] }],
      },

      // ── execution calls: only a GraphQL client's operations are judged ──
      {
        name: 'a Redux store subscription is not a GraphQL execution',
        code: 'const unsubscribe = store.subscribe(listener);',
      },
      {
        name: 'a subscribe method reached through a property chain is not a GraphQL library',
        code: 'export class View { mount() { return this.store.subscribe(listener); } }',
      },
      {
        name: 'graphql(schema, source) is a plain call, not a member execution',
        code: 'export function run(schema, source) { return graphql(schema, source); }',
      },
      {
        name: 'graphql.execute with an arguments object passes no bare input',
        code: 'export function run(schema, document) { return graphql.execute({ schema, document }); }',
      },

      // ── introspection: a GraphQL document must be present first ─────────
      {
        name: 'a string that only names the __type discriminator is not a query',
        code: "const TYPE_KEY = '__type';",
      },
      {
        name: 'a field whose name merely ends in __type is not introspection',
        code: "const q = 'query { item { owner__type } }';",
      },

      // ── depth: nesting, not brace count, and only beyond the limit ──────
      {
        name: 'a string query exactly at maxQueryDepth is allowed',
        code: "const q = 'query { a { b } }';",
        options: [{ maxQueryDepth: 2 }],
      },
      {
        name: 'sibling selections in a string query do not add depth',
        code: "const q = 'query { a { b } c { d } e { f } }';",
        options: [{ maxQueryDepth: 2 }],
      },
      {
        name: 'sibling selections in a template query do not add depth',
        code: 'const q = `query { a { b } c { d } e { f } }`;',
        options: [{ maxQueryDepth: 2 }],
      },

      // ── selection sets: a nested brace block that IS the whole string ────
      {
        name: 'a single-level brace template is an object shape, not a selection set',
        code: 'const s = `{ id: ${id} }`;',
      },
      {
        name: 'two sibling single-level blocks are not a selection set',
        code: 'const s = `{ ${a} } { ${b} }`;',
      },
      {
        name: 'a JSON key with a space before its colon is still JSON',
        code: 'const s = `{ "user" : { "id" : ${id} } }`;',
      },
      {
        name: 'a sentence starting "fragment X only" is not a fragment definition',
        code: 'const s = `fragment cache ${size} only`;',
      },

      {
        name: 'generated object code ending in a semicolon is not a selection set',
        code: 'const src = `{ a: { b: ${x} } };`;',
      },
      {
        name: 'a log line that starts with the word Query is not an operation',
        code: 'const m = `Query timed out after ${ms}ms`;',
      },
      {
        name: 'a sentence starting "fragment cache is" is not a fragment definition',
        code: 'const m = `fragment cache is ${state}`;',
      },
      {
        name: 'a message bound to a schema-named variable is not SDL without a body',
        code: 'const schemaHelp = `input ${field} must be a string`;',
      },

      // ── composition ──────────────────────────────────────────────────────
      // @found Stryker mutation-survivor triage, 2026-11-03
      {
        // BUG (FP): only a TEMPLATE initialiser counted as a composed document,
        // so the same fragment held in a string constant was reported.
        name: 'FP: a fragment held in a plain string constant composes like a template one',
        code: [
          "const USER_FIELDS = 'fragment UserFields on User { name }';",
          'const q = `query { me { ...UserFields } } ${USER_FIELDS}`;',
        ].join('\n'),
      },
    ],
    invalid: [
      {
        name: 'an interpolated global binding declares nothing to compose',
        code: 'const q = `query { users(first: ${Infinity}) { name } }`;',
        errors: [{ messageId: 'unsafeVariableInterpolation' }],
      },
      {
        name: 'an interpolated member read is not a composed document',
        code: 'export const q = (o) => `query { user(id: "${o.id}") { name } }`;',
        errors: [{ messageId: 'unsafeVariableInterpolation' }],
      },
      {
        name: 'a function handed to a logger is not the logged string: its template is judged',
        code: `logger.debug(() => ${QUERY});`,
        errors: [{ messageId: 'unsafeVariableInterpolation' }],
      },
      {
        name: 'a function expression handed to a logger is judged the same way',
        code: `logger.debug(function () { return ${QUERY}; });`,
        errors: [{ messageId: 'unsafeVariableInterpolation' }],
      },
      {
        name: 'a selection set may start after leading whitespace and newlines',
        code: 'const q = `\n  {\n    user(id: "${id}") { name }\n  }\n`;',
        errors: [{ messageId: 'unsafeVariableInterpolation' }],
      },
      {
        name: 'one composed fragment does not clear a raw interpolation beside it',
        code: [
          'const FRAG = `fragment F on User { name }`;',
          'export const q = (id) => `query { user(id: "${id}") { ...F } } ${FRAG}`;',
        ].join('\n'),
        errors: [{ messageId: 'unsafeVariableInterpolation' }],
      },
      {
        name: 'a template inside a concatenation contributes its literal parts',
        code: 'export const q = (fragments, id) => fragments + `\nquery { user(id: ${id}) { name } }`;',
        errors: [
          { messageId: 'graphqlInjection' },
          { messageId: 'unsafeVariableInterpolation' },
        ],
      },
      {
        name: 'a numeric coercion inside a concatenated query is part of the concatenation',
        code: "export const q = (id) => 'query Q { user(id: ' + +id + ') { name } }';",
        errors: [
          { messageId: 'graphqlInjection' },
          { messageId: 'graphqlInjection' },
        ],
      },
      // @found Stryker mutation-survivor triage, 2026-11-03
      {
        // BUG (FN): the string scan read only the FIRST occurrence of each
        // operation keyword; a mid-line mention before the operation hid it.
        name: 'FN: a comment that mentions query before the operation does not hide it',
        code: "export const q = (id) => '# the user query\\nquery GetUser { user(id: ' + id + ') { name } }';",
        errors: [
          { messageId: 'graphqlInjection' },
          { messageId: 'graphqlInjection' },
        ],
      },
      // @found Stryker mutation-survivor triage, 2026-11-03
      {
        // BUG (FN): a template's `query {` had to be followed by a literal field
        // even when a gql tag already said it is GraphQL.
        name: 'FN: a gql-tagged operation whose only selection is interpolated',
        code: 'export const q = (field) => gql`query { ${field} }`;',
        errors: [{ messageId: 'unsafeVariableInterpolation' }],
      },
    ],
  },
);
