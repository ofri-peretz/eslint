/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Require validated prompts in generateText calls
 * @description Detects when user input is passed directly to generateText without validation
 * @see https://sdk.vercel.ai/docs/ai-sdk-core/generating-text
 * @see https://owasp.org/www-project-top-10-for-large-language-model-applications/
 */

import { AST_NODE_TYPES, TSESTree, createRule, formatLLMMessage, MessageIcons, isTestFilePath, memberPath, propertyName } from '@interlace/eslint-devkit';
import { isSystemPromptProp, getStaticPropName } from '../../utils/prompt-props';
import { fileUsesVercelAi } from '../../utils/vercel-ai-evidence';
import { calleeName, isRequestDerived, lookupVariable, nameEndsWithWords, sdkCallName, unwrap } from '../../utils/sdk';

type MessageIds = 'unsafePrompt' | 'unsafeSystemPrompt';

export interface Options {
  /** Function names considered as input validators */
  validatorFunctions?: string[];
  
  /** Variable patterns that suggest user input */
  userInputPatterns?: string[];
  
  /** Allow in test files */
  allowInTests?: boolean;
}

type RuleOptions = [Options?];

export const requireValidatedPrompt = createRule<RuleOptions, MessageIds>({
  name: 'require-validated-prompt',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-vercel-ai-security/docs/rules/require-validated-prompt.md',
      description: 'Require validated/sanitized prompts in generateText and streamText calls',
      cwe: 'CWE-74',
      cvss: 9,
    },
    messages: {
      unsafePrompt: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Unsafe Prompt in Vercel AI SDK',
        cwe: 'CWE-74',
        owasp: 'A03:2021',
        cvss: 9.0,
        description: 'User input "{{input}}" passed directly to {{function}} prompt without validation',
        severity: 'CRITICAL',
        compliance: ['SOC2', 'GDPR'],
        fix: 'Validate input before use: generateText({ prompt: validateInput(userInput) })',
        documentationLink: 'https://owasp.org/www-project-top-10-for-large-language-model-applications/',
      }),
      unsafeSystemPrompt: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Unsafe System Prompt',
        cwe: 'CWE-74',
        owasp: 'A03:2021',
        cvss: 8.5,
        description: 'Dynamic value in system prompt can lead to prompt injection',
        severity: 'HIGH',
        fix: 'Use static system prompts or validate dynamic content',
        documentationLink: 'https://owasp.org/www-project-top-10-for-large-language-model-applications/',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          validatorFunctions: {
            type: 'array',
            items: { type: 'string' },
            description: 'Function names considered as input validators',
          },
          userInputPatterns: {
            type: 'array',
            items: { type: 'string' },
            description: 'Variable patterns that suggest user input (regex)',
          },
          allowInTests: {
            type: 'boolean',
            description: 'Allow unsafe patterns in test files',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      validatorFunctions: [
        'validateInput',
        'sanitizeInput',
        'validatePrompt',
        'sanitizePrompt',
        'escapeInput',
        'cleanInput',
      ],
      userInputPatterns: [
        'userInput',
        'userPrompt',
        'userMessage',
        'userQuery',
        'userContent',
        'input',
        'query',
        'message',
        'req.body',
        'request.body',
      ],
      allowInTests: false,
    },
  ],
  create(context, [options]) {
    // Every rule in this plugin is Vercel-AI-specific, and none of them knew
    // it: over 107,384 files, 91% of this plugin's findings were in files with
    // no `ai` / `@ai-sdk` import. Registering no visitors is both the gate and
    // the cheap path — a file without the SDK does no work.
    if (!fileUsesVercelAi(context.sourceCode.ast)) return {};

    // Merged with `defaultOptions` before `create` runs.
    const { validatorFunctions, userInputPatterns, allowInTests } = options as Required<Options>;

    const sourceCode = context.sourceCode;

    // Skip test files if allowed
    if (allowInTests && isTestFilePath(context.filename)) {
      return {};
    }

    // `req.body` / `request.body` are member PATHS; the rest are name head nouns.
    const pathPatterns = userInputPatterns
      .filter((p: string) => p.includes('.'))
      .map((p: string) => p.split('.'));
    const namePatterns = userInputPatterns.filter((p: string) => !p.includes('.'));

    /** A configured validator, or a schema parse (`schema.parse(x)`, `safeParse`, `parseAsync`). */
    function isValidatedCall(node: TSESTree.Node): boolean {
      const target = unwrap(node);
      if (target.type !== AST_NODE_TYPES.CallExpression) return false;
      const name = calleeName(target.callee) as string;
      return validatorFunctions.includes(name) || SCHEMA_PARSERS.has(name);
    }

    /** Bound from a validator call: `const safe = validateInput(x)`, `const { q } = schema.parse(...)`. */
    function isValidatedBinding(node: TSESTree.Identifier): boolean {
      const def = lookupVariable(node.name, sourceCode.getScope(node))?.defs[0];
      return def?.type === 'Variable' && def.node.init !== null && isValidatedCall(def.node.init);
    }

    function nameLooksLikeInput(name: string): boolean {
      return namePatterns.some((pattern: string) => nameEndsWithWords(name, pattern));
    }

    function pathLooksLikeInput(node: TSESTree.MemberExpression): boolean {
      const path = memberPath(node);
      return (
        path !== null &&
        pathPatterns.some((pattern: string[]) => pattern.every((part, i) => path[i] === part))
      );
    }

    /** The user input this value carries, by shape first and by head noun second. */
    function findUserInput(node: TSESTree.Node): string | null {
      if (node.type === 'TemplateLiteral') {
        for (const expr of node.expressions) {
          const found = findUserInput(expr);
          if (found) return found;
        }
        return null;
      }
      if (node.type === 'BinaryExpression') {
        return findUserInput(node.left) ?? findUserInput(node.right);
      }
      if (node.type === 'Identifier') {
        if (isValidatedBinding(node)) return null;
        const unsafe =
          isRequestDerived(node, sourceCode) || nameLooksLikeInput(node.name);
        return unsafe ? node.name : null;
      }
      if (node.type === 'MemberExpression') {
        const unsafe =
          isRequestDerived(node, sourceCode) ||
          pathLooksLikeInput(node) ||
          nameLooksLikeInput(propertyName(node) ?? '');
        return unsafe ? sourceCode.getText(node) : null;
      }
      // Calls are not inspected: a validator makes the value safe, and any
      // other call transforms its input into something this rule cannot see.
      return null;
    }

    return {
      CallExpression(node: TSESTree.CallExpression) {
        const matchedFunction = sdkCallName(node);
        if (!matchedFunction) return;

        const optionsArg = node.arguments[0];
        if (!optionsArg || optionsArg.type !== 'ObjectExpression') return;

        for (const prop of optionsArg.properties) {
          if (prop.type !== AST_NODE_TYPES.Property) continue;
          const keyName = getStaticPropName(prop);
          const isPrompt = keyName === 'prompt';
          if (!isPrompt && !isSystemPromptProp(keyName)) continue;

          const input = findUserInput(prop.value);
          if (!input) continue;
          context.report(
            isPrompt
              ? { node: prop.value, messageId: 'unsafePrompt', data: { input, function: matchedFunction } }
              : { node: prop.value, messageId: 'unsafeSystemPrompt' },
          );
        }
      },
    };
  },
});

/** Schema-validation methods (Zod, Valibot, Yup, ArkType). */
const SCHEMA_PARSERS = new Set(['parse', 'safeParse', 'parseAsync', 'safeParseAsync', 'validateSync']);
