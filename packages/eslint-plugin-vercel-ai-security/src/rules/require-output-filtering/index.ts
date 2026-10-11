/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Require output filtering for tool data
 * @description Detects when tools return raw data without filtering
 * @see OWASP ASI04: Data Exfiltration
 */

import { AST_NODE_TYPES, TSESTree, createRule, formatLLMMessage, MessageIcons, nameHasWord, objectKeyName } from '@interlace/eslint-devkit';
import { fileUsesVercelAi } from '../../utils/vercel-ai-evidence';
import { calleeChain, lookupVariable, unwrap } from '../../utils/sdk';

type MessageIds = 'missingOutputFilter';

export interface Options {
  /** Patterns suggesting data sources that need filtering */
  dataSourcePatterns?: string[];
  /** Function names that are considered safe filters */
  filterFunctions?: string[];
}

type RuleOptions = [Options?];

export const requireOutputFiltering = createRule<RuleOptions, MessageIds>({
  name: 'require-output-filtering',
  meta: {
    type: 'suggestion',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-vercel-ai-security/docs/rules/require-output-filtering.md',
      description: 'Require filtering of sensitive data returned by AI tools',
      cwe: 'CWE-200',
      cvss: 6.5,
    },
    messages: {
      missingOutputFilter: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Unfiltered Tool Output',
        cwe: 'CWE-200',
        owasp: 'A01:2021',
        cvss: 6.5,
        description: 'Tool "{{toolName}}" returns data from "{{source}}" without filtering. This may leak sensitive information.',
        severity: 'MEDIUM',
        compliance: ['SOC2', 'GDPR'],
        fix: 'Filter sensitive fields before returning: return filterSensitive(data)',
        documentationLink: 'https://owasp.org/www-project-top-10-for-large-language-model-applications/',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          dataSourcePatterns: {
            type: 'array',
            items: { type: 'string' },
            description: 'Patterns suggesting data sources',
          },
          filterFunctions: {
            type: 'array',
            items: { type: 'string' },
            description: 'Functions considered safe filters',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      // Whole words of a MEMBER call's path (`db.user.findUnique`,
      // `supabase.from('t').select`). `get`, `fetch`, `read` and `load` were
      // dropped: they matched `getWeather(city)`, the first tool in the SDK docs.
      dataSourcePatterns: [
        'query', 'find', 'select', 'aggregate',
        'database', 'db', 'sql', 'mongo', 'prisma', 'supabase',
      ],
      filterFunctions: [
        'filter', 'sanitize', 'redact', 'mask', 'clean',
        'filterSensitive', 'removePII', 'scrub',
      ],
    },
  ],
  create(context, [options]) {
    // Every rule in this plugin is Vercel-AI-specific, and none of them knew
    // it: over 107,384 files, 91% of this plugin's findings were in files with
    // no `ai` / `@ai-sdk` import. Registering no visitors is both the gate and
    // the cheap path — a file without the SDK does no work.
    if (!fileUsesVercelAi(context.sourceCode.ast)) return {};

    // Merged with `defaultOptions` before `create` runs.
    const { dataSourcePatterns, filterFunctions } = options as Required<Options>;

    const sourceCode = context.sourceCode;

    /** A member call into a data-access object or method — not a bare helper. */
    function isDataSourceCall(node: TSESTree.Node): string | null {
      const target = unwrap(node);
      if (target.type !== AST_NODE_TYPES.CallExpression) return null;
      if (target.callee.type !== AST_NODE_TYPES.MemberExpression) return null;
      const words = calleeChain(target.callee);
      if (!dataSourcePatterns.some((pattern: string) => nameHasWord(words, pattern))) return null;
      if (filterFunctions.some((filter: string) => nameHasWord(words, filter))) return null;
      return sourceCode.getText(target.callee);
    }

    /** `const u = await db.user.findUnique(...)`; `return u` — the binding's initialiser. */
    function boundDataSource(node: TSESTree.Node): string | null {
      if (node.type !== AST_NODE_TYPES.Identifier) return isDataSourceCall(node);
      const def = lookupVariable(node.name, sourceCode.getScope(node))?.defs[0];
      return def?.type === 'Variable' && def.node.init !== null ? isDataSourceCall(def.node.init) : null;
    }

    // oxlint-disable-next-line consistent-function-scoping
    function getToolName(node: TSESTree.Node): string {
      let current = node.parent;
      while (current) {
        if (current.type === 'Property' && current.parent?.type === 'ObjectExpression') {
          const grandparent = current.parent.parent;
          if (grandparent?.type === 'Property' &&
              grandparent.key.type === 'Identifier' &&
              grandparent.key.name === 'tools') {
            if (current.key.type === 'Identifier') {
              return current.key.name;
            }
          }
        }
        current = current.parent;
      }
      return 'unknown';
    }

    /** Is `fn` the value of an `execute` property (arrow, function, or method)? */
    function isExecute(fn: TSESTree.Node): boolean {
      const parent = fn.parent;
      return parent?.type === 'Property' && objectKeyName(parent) === 'execute';
    }

    function report(node: TSESTree.Node, fn: TSESTree.Node, source: string): void {
      context.report({
        node,
        messageId: 'missingOutputFilter',
        data: { toolName: getToolName(fn), source },
      });
    }

    return {
      // `execute: async (args) => db.query(...)`
      ArrowFunctionExpression(node: TSESTree.ArrowFunctionExpression) {
        if (!isExecute(node) || node.body.type === AST_NODE_TYPES.BlockStatement) return;
        const source = isDataSourceCall(node.body);
        if (source) report(node.body, node, source);
      },

      // `execute: async (args) => { …; return row; }` and `async execute(args) { … }`
      ReturnStatement(node: TSESTree.ReturnStatement) {
        if (!node.argument) return;
        let fn: TSESTree.Node | undefined = node.parent;
        while (
          fn &&
          fn.type !== AST_NODE_TYPES.ArrowFunctionExpression &&
          fn.type !== AST_NODE_TYPES.FunctionExpression &&
          fn.type !== AST_NODE_TYPES.FunctionDeclaration
        ) {
          fn = fn.parent;
        }
        if (!fn || !isExecute(fn)) return;
        const source = boundDataSource(unwrap(node.argument));
        if (source) report(node.argument, fn, source);
      },
    };
  },
});
