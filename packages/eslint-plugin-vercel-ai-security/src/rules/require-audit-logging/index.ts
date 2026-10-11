/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Suggest audit logging for AI operations
 * @description Detects AI calls without surrounding logging statements
 * @see OWASP ASI10: Logging & Monitoring
 */

import { TSESTree, createRule, formatLLMMessage, MessageIcons, isTestFilePath, memberPath } from '@interlace/eslint-devkit';
import { fileUsesVercelAi } from '../../utils/vercel-ai-evidence';
import { optionValue, sdkCallName } from '../../utils/sdk';

type MessageIds = 'missingAuditLogging';

export interface Options {
  /** Disable in test files */
  allowInTests?: boolean;
}

type RuleOptions = [Options?];

export const requireAuditLogging = createRule<RuleOptions, MessageIds>({
  name: 'require-audit-logging',
  meta: {
    type: 'suggestion',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-vercel-ai-security/docs/rules/require-audit-logging.md',
      description: 'Suggest audit logging for AI SDK operations',
      cwe: 'CWE-778',
      cvss: 4,
    },
    messages: {
      missingAuditLogging: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Missing Audit Logging',
        cwe: 'CWE-778',
        owasp: 'A09:2021',
        cvss: 4.0,
        description: '{{function}} call lacks audit logging. AI operations should be logged for security monitoring.',
        severity: 'LOW',
        compliance: ['SOC2', 'PCI-DSS'],
        fix: 'Add logging: logger.info("AI call", { userId }); before the call',
        documentationLink: 'https://owasp.org/www-project-top-10-for-large-language-model-applications/',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: {
            type: 'boolean',
            description: 'Allow missing logging in test files',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      allowInTests: true,
    },
  ],
  create(context, [options]) {
    // Every rule in this plugin is Vercel-AI-specific, and none of them knew
    // it: over 107,384 files, 91% of this plugin's findings were in files with
    // no `ai` / `@ai-sdk` import. Registering no visitors is both the gate and
    // the cheap path — a file without the SDK does no work.
    if (!fileUsesVercelAi(context.sourceCode.ast)) return {};

    // Merged with `defaultOptions` before `create` runs.
    const { allowInTests } = options as Required<Options>;

    // Skip test files if allowed
    if (allowInTests && isTestFilePath(context.filename)) {
      return {};
    }

    /**
     * A logging call by shape: rooted at a logger (`console.log`,
     * `logger.info`, `log(...)`), or a member call to a log-level method
     * (`this.audit.warn`). Exact segments — `showDialog()` and
     * `getUserInfo()` contain "log" and "info" but log nothing.
     */
    function isLoggingStatement(node: TSESTree.Node): boolean {
      if (node.type !== 'ExpressionStatement') return false;
      if (node.expression.type !== 'CallExpression') return false;
      const path = memberPath(node.expression.callee);
      if (path === null) return false;
      return (
        LOGGER_ROOTS.has(path[0].toLowerCase()) ||
        (path.length > 1 && LOG_LEVELS.has(path[path.length - 1]))
      );
    }

    /** OpenTelemetry tracing turned on for the call: the SDK's own audit trail. */
    function hasTelemetry(node: TSESTree.CallExpression): boolean {
      const optionsArg = node.arguments[0];
      if (optionsArg?.type !== 'ObjectExpression') return false;
      return ['experimental_telemetry', 'telemetry'].some((key) => {
        const value = optionValue(optionsArg, key);
        return (
          value?.type === 'ObjectExpression' &&
          optionValue(value, 'isEnabled')?.type === 'Literal' &&
          (optionValue(value, 'isEnabled') as TSESTree.Literal).value === true
        );
      });
    }

    function hasNearbyLogging(node: TSESTree.CallExpression): boolean {
      // Find the statement containing this call
      let statement: TSESTree.Node | null = node;
      while (statement && statement.type !== 'ExpressionStatement' &&
             statement.type !== 'VariableDeclaration' &&
             statement.type !== 'ReturnStatement') {
        statement = statement.parent ?? null;
      }
      if (!statement) return false;

      // Get the block or program containing this statement
      const block = statement.parent;
      if (!block || (block.type !== 'BlockStatement' && block.type !== 'Program')) {
        return false;
      }

      const statements = block.body;
      const idx = statements.indexOf(statement as TSESTree.Statement);

      // Check 3 statements before
      for (let i = Math.max(0, idx - 3); i < idx; i++) {
        if (isLoggingStatement(statements[i])) return true;
      }

      return false;
    }

    return {
      CallExpression(node: TSESTree.CallExpression) {
        const matchedFunction = sdkCallName(node);
        if (!matchedFunction) return;

        if (!hasTelemetry(node) && !hasNearbyLogging(node)) {
          context.report({
            node,
            messageId: 'missingAuditLogging',
            data: { function: matchedFunction },
          });
        }
      },
    };
  },
});

/** Logger objects, matched as the first segment of the callee path. */
const LOGGER_ROOTS = new Set(['log', 'logger', 'console', 'debug', 'winston', 'pino', 'bunyan', 'audit']);

/** Log-level methods, matched as the last segment of a member call. */
const LOG_LEVELS = new Set(['log', 'info', 'warn', 'error', 'debug', 'trace', 'fatal', 'audit']);
