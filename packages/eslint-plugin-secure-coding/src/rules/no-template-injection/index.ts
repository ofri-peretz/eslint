/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License.
 */

/**
 * ESLint Rule: no-template-injection
 * CWE-94: Improper Control of Generation of Code (Code Injection via Templates)
 *
 * Detects server-side template engine calls where the template argument is
 * dynamic (not a string literal). An attacker who controls the template
 * string can execute arbitrary server-side code.
 *
 * Detection: structural-api + a NAMED untrusted source.
 *   Handlebars.compile(req.body.tpl)      — fires (request data)
 *   Handlebars.compile(userTemplate)      — fires (the name states provenance)
 *   Handlebars.compile('<h1>{{t}}</h1>')  — silent (string literal)
 *   Handlebars.compile(content)           — silent (nothing says where it came from)
 *
 * Covered engines: Handlebars, EJS, Pug/Jade, Mustache, Nunjucks, Swig,
 *   Dust, doT, and their common aliases.
 */

import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';

type MessageIds = 'templateInjection';

const TEMPLATE_COMPILE_METHODS = new Set([
  'compile', 'precompile', 'create', 'parse', 'template',
]);

const TEMPLATE_RENDER_METHODS = new Set([
  'render', 'renderFile', 'renderString', 'renderToString', 'renderTemplate',
]);

const ALL_TEMPLATE_METHODS = new Set([
  ...TEMPLATE_COMPILE_METHODS,
  ...TEMPLATE_RENDER_METHODS,
]);

const TEMPLATE_ENGINE_OBJECTS = new Set([
  'Handlebars', 'handlebars',
  'ejs',
  'pug', 'jade',
  'mustache', 'Mustache',
  'nunjucks',
  'swig',
  'dust', 'Dust',
  'doT',
  'consolidate',
]);

/** Identifier roots that denote an inbound request. */
const REQUEST_ROOTS: ReadonlySet<string> = new Set([
  'req', 'request', 'ctx', 'event', 'message',
]);

/** Properties of a request that carry caller-supplied data. */
const REQUEST_PROPERTIES: ReadonlySet<string> = new Set([
  'query', 'params', 'body', 'headers', 'url', 'path', 'cookies', 'data',
]);

/** Calls whose result is bytes from outside the program. */
const READER_METHODS: ReadonlySet<string> = new Set([
  'readFile', 'readFileSync', 'text', 'json', 'arrayBuffer', 'formData', 'blob',
]);

/**
 * Words with which an author states that a value came from outside.
 *
 * A name is weak evidence in general — `no-hardcoded-credentials` treats a
 * credential-ish name as necessary but not sufficient. Here it is the ONLY
 * evidence available at a call site, and these particular words are not
 * descriptions of a template's role (`content`, `template`, `tpl`, `source`)
 * but claims about its provenance.
 */
const UNTRUSTED_NAME_WORDS: ReadonlySet<string> = new Set([
  'user', 'untrusted', 'attacker', 'external', 'remote', 'client', 'payload',
  'input',
]);

/** Does this identifier or property name state that the value came from outside? */
function nameStatesUntrusted(name: string): boolean {
  const words = name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .split(/[^a-z0-9]+/);
  return words.some((word) => UNTRUSTED_NAME_WORDS.has(word));
}

/**
 * Name the untrusted source reaching this expression, or return null.
 *
 * The rule used to report every first argument that was not a string literal.
 * That is the shape of a dynamic template, not the meaning of an injectable
 * one, and it asserted an impact — "an attacker who controls the template can
 * execute arbitrary server-side code" — about an attacker it never located.
 * All three wild-corpus findings were build tooling compiling its own files:
 *
 *   tpl = Handlebars.compile(content)        okta-signin-widget Gruntfile.js:135, :202
 *   Handlebars.precompile(template)          …/babel-plugin-handlebars-inline-precompile/hbs.js:29
 *
 * `content` is a grunt file-processing callback parameter and `template` is a
 * babel-plugin argument. Neither is reachable by any attacker, and neither
 * could be resolved by any edit short of inlining the template.
 *
 * Same shape as `no-unsafe-regex-construction`'s `taintSource`: return the
 * NAME of the source found, so the report can say what it found.
 */
function untrustedSource(node: TSESTree.Node, depth = 0): string | null {
  if (depth > 6) return null;

  if (node.type === AST_NODE_TYPES.Identifier) {
    return nameStatesUntrusted(node.name) ? node.name : null;
  }

  if (node.type === AST_NODE_TYPES.TemplateLiteral) {
    for (const expression of node.expressions) {
      const found = untrustedSource(expression, depth + 1);
      if (found !== null) return found;
    }
    return null;
  }

  if (node.type === AST_NODE_TYPES.BinaryExpression && node.operator === '+') {
    return (
      untrustedSource(node.left as TSESTree.Node, depth + 1) ??
      untrustedSource(node.right, depth + 1)
    );
  }

  if (node.type === AST_NODE_TYPES.AwaitExpression) {
    return untrustedSource(node.argument, depth + 1);
  }

  if (node.type === AST_NODE_TYPES.MemberExpression) {
    // Walk to the root of `req.body.template` and judge the whole chain.
    let root: TSESTree.Node = node;
    const properties: string[] = [];
    while (root.type === AST_NODE_TYPES.MemberExpression) {
      if (root.property.type === AST_NODE_TYPES.Identifier) {
        properties.unshift(root.property.name);
      }
      root = root.object;
    }
    if (root.type !== AST_NODE_TYPES.Identifier) return null;
    const chain = [root.name, ...properties].join('.');
    if (
      REQUEST_ROOTS.has(root.name) &&
      properties.some((property) => REQUEST_PROPERTIES.has(property))
    ) {
      return chain;
    }
    if (root.name === 'process' && properties[0] === 'argv') return 'process.argv';
    return [root.name, ...properties].some(nameStatesUntrusted) ? chain : null;
  }

  if (node.type === AST_NODE_TYPES.CallExpression) {
    const callee = node.callee;
    // Reading a file or a response body yields bytes from outside the program.
    if (
      callee.type === AST_NODE_TYPES.MemberExpression &&
      callee.property.type === AST_NODE_TYPES.Identifier &&
      READER_METHODS.has(callee.property.name)
    ) {
      return callee.property.name;
    }
    if (
      callee.type === AST_NODE_TYPES.Identifier &&
      READER_METHODS.has(callee.name)
    ) {
      return callee.name;
    }
    for (const argument of node.arguments) {
      if (argument.type === AST_NODE_TYPES.SpreadElement) continue;
      const found = untrustedSource(argument, depth + 1);
      if (found !== null) return found;
    }
    return null;
  }

  return null;
}

export const noTemplateInjection = createRule<[], MessageIds>({
  name: 'no-template-injection',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-template-injection.md',
      description:
        'Disallow dynamic strings as template arguments to server-side template engines (CWE-94)',
      cwe: 'CWE-94',
      cvss: 9.8,
    },
    messages: {
      templateInjection: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Template Injection (CWE-94)',
        cwe: 'CWE-94',
        description:
          '{{engine}}.{{method}}() receives a dynamic string. An attacker who controls the template can execute arbitrary server-side code.',
        severity: 'CRITICAL',
        fix: 'Pass only string literals as templates. If the template must vary, load it from a trusted file system path, never from user input.',
        documentationLink:
          'https://portswigger.net/web-security/server-side-template-injection',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  create(context: TSESLint.RuleContext<MessageIds, []>) {
    return {
      CallExpression(node: TSESTree.CallExpression) {
        const { callee, arguments: args } = node;
        if (callee.type !== AST_NODE_TYPES.MemberExpression) return;

        const { object, property } = callee;
        if (object.type !== AST_NODE_TYPES.Identifier) return;
        if (property.type !== AST_NODE_TYPES.Identifier) return;

        const engineName = object.name;
        const methodName = property.name;

        if (!TEMPLATE_ENGINE_OBJECTS.has(engineName)) return;
        if (!ALL_TEMPLATE_METHODS.has(methodName)) return;

        const firstArg = args[0];
        if (!firstArg) return;

        // A literal and a zero-expression template are both static text, so
        // `untrustedSource` returns null for them anyway — but stopping here
        // keeps the common case out of the walk entirely.
        if (
          firstArg.type === AST_NODE_TYPES.Literal &&
          typeof (firstArg as TSESTree.Literal).value === 'string'
        ) return;

        // Template literal with NO expressions → safe (equivalent to a string literal)
        if (
          firstArg.type === AST_NODE_TYPES.TemplateLiteral &&
          (firstArg as TSESTree.TemplateLiteral).expressions.length === 0
        ) return;

        // Being dynamic is not being attacker-controlled. See untrustedSource.
        if (untrustedSource(firstArg) === null) return;

        context.report({
          node: firstArg,
          messageId: 'templateInjection',
          data: { engine: engineName, method: methodName },
        });
      },
    };
  },
});
