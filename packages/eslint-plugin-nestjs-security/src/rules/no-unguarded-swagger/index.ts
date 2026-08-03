/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Detect `SwaggerModule.setup()` running unconditionally in an
 * application bootstrap
 *
 * Swagger UI publishes every route, every DTO shape, every example payload and
 * the declared auth schemes. In development that is the point; served from
 * production it is a free map of the attack surface, at a fixed path, to
 * anonymous callers.
 *
 * Measured across ten high-star NestJS codebases: 9 of 16 `SwaggerModule.setup`
 * calls are straight-line in `bootstrap()` with no environment check, across 4
 * repositories. One of them is a code generator's `main.template.ts`, so the
 * shape is emitted into every service it produces.
 *
 * Scope note: the rule reports only where it can see the whole bootstrap — a
 * function that also calls `NestFactory.create`. Projects that factor Swagger
 * into `setupSwagger(app)` guard it at the *call site*, which this file cannot
 * see, so those are abstained rather than accused. That distinction is what
 * separates the 9 reportable sites from the 7 that are already correct.
 *
 * CWE-200: Exposure of Sensitive Information to an Unauthorized Actor
 */

import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';
import type { TSESTree } from '@interlace/eslint-devkit';
import { expressionName, isTestFile } from '../../utils/nest-ast';

type MessageIds = 'unguardedSwagger';

export interface Options {
  /** Allow in test files. Default: true */
  allowInTests?: boolean;
}

type RuleOptions = [Options?];

/** Nodes that make the call conditional, whatever the condition tests. */
const BRANCHING = new Set<string>([
  AST_NODE_TYPES.IfStatement,
  AST_NODE_TYPES.ConditionalExpression,
  AST_NODE_TYPES.LogicalExpression,
  AST_NODE_TYPES.SwitchStatement,
  AST_NODE_TYPES.SwitchCase,
]);

/** Function-like nodes, used to find the enclosing bootstrap. */
const FUNCTIONS = new Set<string>([
  AST_NODE_TYPES.FunctionDeclaration,
  AST_NODE_TYPES.FunctionExpression,
  AST_NODE_TYPES.ArrowFunctionExpression,
]);

export const noUnguardedSwagger = createRule<RuleOptions, MessageIds>({
  name: 'no-unguarded-swagger',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-nestjs-security/docs/rules/no-unguarded-swagger.md',
      description:
        'Detect SwaggerModule.setup running unconditionally in an application bootstrap',
      cwe: 'CWE-200',
      cvss: 5.3,
    },
    messages: {
      unguardedSwagger: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Swagger UI Served Unconditionally',
        cwe: 'CWE-200',
        cvss: 5.3,
        description:
          'SwaggerModule.setup() runs on every boot, publishing every route, DTO and auth scheme to anonymous callers in production',
        severity: 'MEDIUM',
        fix: 'Wrap it in an environment check, e.g. if (process.env.NODE_ENV !== "production") { … }',
        documentationLink: 'https://cwe.mitre.org/data/definitions/200.html',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: { type: 'boolean', default: true },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{}],
  create(context, [options = {}]) {
    const { allowInTests = true } = options;
    if (allowInTests && isTestFile(context.filename)) return {};

    /**
     * The nearest enclosing function, and whether anything on the way there
     * branches.
     *
     * Presence of *any* condition is enough to abstain. Proving the condition
     * is environment-related would mean evaluating it, and a project that
     * gates Swagger on `config.swagger.enabled` is as correct as one gating on
     * `NODE_ENV` — the rule has no business arguing about which.
     */
    function enclosing(node: TSESTree.Node): {
      fn: TSESTree.Node | null;
      branched: boolean;
    } {
      let branched = false;
      let current: TSESTree.Node | undefined = node.parent;
      while (current) {
        if (BRANCHING.has(current.type)) branched = true;
        if (FUNCTIONS.has(current.type)) return { fn: current, branched };
        current = current.parent;
      }
      return { fn: null, branched };
    }

    /** Whether this function also builds the app — i.e. it is the bootstrap. */
    function createsTheApp(fn: TSESTree.Node): boolean {
      let found = false;
      const visit = (node: TSESTree.Node): void => {
        if (found) return;
        if (
          node.type === AST_NODE_TYPES.CallExpression &&
          node.callee.type === AST_NODE_TYPES.MemberExpression &&
          expressionName(node.callee.object) === 'NestFactory'
        ) {
          found = true;
          return;
        }
        for (const key of Object.keys(node) as (keyof TSESTree.Node)[]) {
          if (key === 'parent') continue;
          const value = node[key] as unknown;
          if (Array.isArray(value)) {
            for (const child of value) {
              if (child && typeof child === 'object' && 'type' in child) {
                visit(child as TSESTree.Node);
              }
            }
          } else if (value && typeof value === 'object' && 'type' in value) {
            visit(value as TSESTree.Node);
          }
        }
      };
      visit(fn);
      return found;
    }

    return {
      CallExpression(node: TSESTree.CallExpression) {
        if (node.callee.type !== AST_NODE_TYPES.MemberExpression) return;
        if (expressionName(node.callee.object) !== 'SwaggerModule') return;
        if (expressionName(node.callee) !== 'setup') return;

        const { fn, branched } = enclosing(node);
        // Already conditional — the author decided when to serve it.
        if (branched) return;
        // Not inside a function we can reason about.
        if (!fn) return;
        // A helper taking `app` as a parameter is guarded at its call site,
        // which lives in another file. Reporting it accuses correct code:
        // immich, awesome-nest-boilerplate and novu all do exactly this.
        if (!createsTheApp(fn)) return;

        context.report({ node, messageId: 'unguardedSwagger' });
      },
    };
  },
});
