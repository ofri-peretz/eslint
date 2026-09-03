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

import { TSESTree, createRule, formatLLMMessage, MessageIcons, isTestFilePath } from '@interlace/eslint-devkit';
import { fileUsesVercelAi } from '../../utils/vercel-ai-evidence';

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
  create(context) {
    // Every rule in this plugin is Vercel-AI-specific, and none of them knew
    // it: over 107,384 files, 91% of this plugin's findings were in files with
    // no `ai` / `@ai-sdk` import. Registering no visitors is both the gate and
    // the cheap path — a file without the SDK does no work.
    if (!fileUsesVercelAi(context.sourceCode.ast)) return {};

    const [options = {}] = context.options;
    const allowInTests = options.allowInTests ?? true;

    const sourceCode = context.sourceCode;
    const filename = context.filename;

    // Skip test files if allowed
    if (allowInTests && isTestFilePath(filename)) {
      return {};
    }

    // Vercel AI SDK functions
    const aiSDKFunctions = ['generateText', 'streamText', 'generateObject', 'streamObject'];

    // Logging patterns
    const loggingPatterns = [
      'log', 'logger', 'console', 'winston', 'pino', 'bunyan',
      'debug', 'info', 'warn', 'error', 'trace',
    ];

    /**
     * Check if a statement is a logging call
     */
    function isLoggingStatement(node: TSESTree.Node): boolean {
      if (node.type !== 'ExpressionStatement') return false;
      if (node.expression.type !== 'CallExpression') return false;
      
      const callee = sourceCode.getText(node.expression.callee);
      return loggingPatterns.some((pattern: string) => 
        callee.toLowerCase().includes(pattern.toLowerCase())
      );
    }

    /**
     * Check if there's logging nearby (within 3 statements)
     */
    function hasNearbyLogging(node: TSESTree.CallExpression): boolean {
      const parent = node.parent;
      if (!parent) return false;

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

      const statements = block.type === 'BlockStatement' ? block.body : block.body;
      const idx = statements.indexOf(statement as TSESTree.Statement);
      if (idx === -1) return false;

      // Check 3 statements before
      for (let i = Math.max(0, idx - 3); i < idx; i++) {
        if (isLoggingStatement(statements[i])) return true;
      }

      return false;
    }

    return {
      CallExpression(node: TSESTree.CallExpression) {
        const callee = sourceCode.getText(node.callee);
        
        // Check if this is an AI SDK function
        const matchedFunction = aiSDKFunctions.find(fn => callee.includes(fn));
        if (!matchedFunction) return;

        // Check for nearby logging
        if (!hasNearbyLogging(node)) {
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
