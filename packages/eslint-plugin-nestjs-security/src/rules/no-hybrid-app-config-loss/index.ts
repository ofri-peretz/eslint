/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Detect `app.connectMicroservice()` without `inheritAppConfig`
 *
 * A hybrid application serves HTTP *and* a microservice transport from one
 * process. The two do not share configuration: unless the second argument says
 * `inheritAppConfig: true`, every global pipe, guard, interceptor and filter
 * registered on the HTTP app is **silently absent** from the microservice's
 * message handlers.
 *
 * The result is an application whose HTTP routes are validated and guarded and
 * whose `@MessagePattern` handlers — reading from Kafka, RabbitMQ, Redis or
 * gRPC — are neither. Nothing in the code says so, and the failure is invisible
 * in review because both halves look correctly configured on their own.
 *
 * Measured across both corpora: **11 `connectMicroservice` call sites in real
 * application code, and `inheritAppConfig` appears zero times** — every hybrid
 * application measured is in the failing state. The only occurrences of the
 * flag anywhere are inside NestJS's own framework and its tests.
 *
 * Deliberately ungated. An earlier draft reported only where the project scan
 * found a global pipe or guard — but that silences on the *absence* of
 * evidence: a project whose layout the scan cannot read would get no findings
 * and look clean. A security rule that switches itself off scores a perfect
 * false-positive rate while protecting nothing, and it does so silently.
 *
 * The gate also bought nothing. All 11 corpus call sites are in applications
 * that do register globals, so it never changed an answer — it only added a way
 * to fail quietly. `connectMicroservice` is by definition the hybrid API: a
 * microservice-only process uses `NestFactory.createMicroservice`, so an HTTP
 * app is present by construction, and adding `inheritAppConfig: true` is
 * harmless even in the rare case it inherits nothing.
 *
 * CWE-284: Improper Access Control
 */

import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';
import type { TSESTree } from '@interlace/eslint-devkit';
import {
  expressionName,
  isTestFile,
  objectProperties,
} from '../../utils/nest-ast';

type MessageIds = 'configNotInherited';

export interface Options {
  /** Allow in test files. Default: true */
  allowInTests?: boolean;
}

type RuleOptions = [Options?];

export const noHybridAppConfigLoss = createRule<RuleOptions, MessageIds>({
  name: 'no-hybrid-app-config-loss',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-nestjs-security/docs/rules/no-hybrid-app-config-loss.md',
      description:
        'Detect connectMicroservice() without inheritAppConfig, which silently drops every global pipe and guard from the microservice transport',
      cwe: 'CWE-284',
      cvss: 7.5,
    },
    messages: {
      configNotInherited: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Hybrid Application Drops Global Configuration',
        cwe: 'CWE-284',
        owasp: 'A01:2021',
        cvss: 7.5,
        description:
          'connectMicroservice() without inheritAppConfig: true gives the microservice transport none of the global pipes, guards, interceptors or filters registered on the HTTP app — its @MessagePattern handlers run unvalidated and unguarded',
        severity: 'HIGH',
        compliance: ['SOC2'],
        fix: 'Pass the hybrid options: app.connectMicroservice(options, { inheritAppConfig: true })',
        documentationLink:
          'https://docs.nestjs.com/faq/hybrid-application#sharing-configuration',
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
     * Whether the hybrid options argument opts into inheritance.
     *
     * A spread means the flag could be in there and this cannot prove
     * otherwise, so it counts as inherited — the rule accuses only where the
     * absence is visible.
     */
    function inheritsAppConfig(argument: TSESTree.Node | undefined): boolean {
      if (argument === undefined) return false;
      if (argument.type !== AST_NODE_TYPES.ObjectExpression) {
        // An options object built elsewhere is not knowable here.
        return true;
      }
      const props = objectProperties(argument);
      if (props === null) return true;
      const flag = props.get('inheritAppConfig');
      if (flag === undefined) return false;
      // NestJS inherits on a *truthy* value, so `0`, `''` and `null` leave the
      // config behind exactly as `false` does. Only a literal is decidable;
      // anything else — a config lookup, a variable — could be true at runtime.
      if (flag.type === AST_NODE_TYPES.Literal) return Boolean(flag.value);
      return true;
    }

    return {
      CallExpression(node: TSESTree.CallExpression) {
        if (node.callee.type !== AST_NODE_TYPES.MemberExpression) return;
        if (expressionName(node.callee) !== 'connectMicroservice') return;
        // The framework's own implementation, not an application using it.
        if (node.callee.object.type === AST_NODE_TYPES.ThisExpression) return;
        // `connectMicroservice()` with no transport at all is not a real call.
        if (node.arguments.length === 0) return;

        if (inheritsAppConfig(node.arguments[1])) return;

        context.report({ node, messageId: 'configNotInherited' });
      },
    };
  },
});
