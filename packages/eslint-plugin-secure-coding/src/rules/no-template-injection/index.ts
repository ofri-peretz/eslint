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
 * Detection: structural-api.
 *   Handlebars.compile(userInput)  — fires (dynamic first arg)
 *   Handlebars.compile('<h1>{{t}}</h1>')  — silent (string literal)
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

export const noTemplateInjection = createRule<[], MessageIds>({
  name: 'no-template-injection',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-secure-coding/docs/rules/no-template-injection.md',
      description:
        'Disallow dynamic strings as template arguments to server-side template engines (CWE-94)',
      cwe: 'CWE-94',
      cvss: 9.1,
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

        // String literal → safe (static template, no injection surface)
        if (
          firstArg.type === AST_NODE_TYPES.Literal &&
          typeof (firstArg as TSESTree.Literal).value === 'string'
        ) return;

        // Template literal with NO expressions → safe (equivalent to a string literal)
        if (
          firstArg.type === AST_NODE_TYPES.TemplateLiteral &&
          (firstArg as TSESTree.TemplateLiteral).expressions.length === 0
        ) return;

        context.report({
          node: firstArg,
          messageId: 'templateInjection',
          data: { engine: engineName, method: methodName },
        });
      },
    };
  },
});
