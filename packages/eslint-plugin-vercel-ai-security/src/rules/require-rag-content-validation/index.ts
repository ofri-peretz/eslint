/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Require validation of RAG content before use in prompts
 * @description Detects when retrieved documents are used directly without sanitization
 * @see OWASP ASI07: Poisoned RAG Pipeline
 */

import { AST_NODE_TYPES, TSESTree, createRule, formatLLMMessage, MessageIcons, nameHasWord } from '@interlace/eslint-devkit';
import { isSystemPromptProp, getStaticPropName } from '../../utils/prompt-props';
import { fileUsesVercelAi } from '../../utils/vercel-ai-evidence';
import { calleeChain, sdkCallName } from '../../utils/sdk';
import { derivesFrom, isDerivationCall } from '../../utils/flow';

type MessageIds = 'unsanitizedRagContent';

export interface Options {
  /** Patterns suggesting RAG/retrieval operations */
  ragPatterns?: string[];
  /** Functions considered safe for RAG content validation */
  validatorFunctions?: string[];
}

type RuleOptions = [Options?];

export const requireRagContentValidation = createRule<RuleOptions, MessageIds>({
  name: 'require-rag-content-validation',
  meta: {
    type: 'suggestion',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-vercel-ai-security/docs/rules/require-rag-content-validation.md',
      description: 'Require validation of RAG content before including in AI prompts',
      cwe: 'CWE-74',
      cvss: 6,
    },
    messages: {
      unsanitizedRagContent: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Unsanitized RAG Content',
        cwe: 'CWE-74',
        owasp: 'A03:2021',
        cvss: 6.0,
        description: 'RAG content from "{{source}}" used directly in prompt without validation. Poisoned documents can inject malicious instructions.',
        severity: 'MEDIUM',
        compliance: ['SOC2'],
        fix: 'Validate RAG content: prompt: buildPrompt(validateRagContent(docs))',
        documentationLink: 'https://owasp.org/www-project-top-10-for-large-language-model-applications/',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          ragPatterns: {
            type: 'array',
            items: { type: 'string' },
            description: 'Patterns suggesting RAG operations',
          },
          validatorFunctions: {
            type: 'array',
            items: { type: 'string' },
            description: 'Functions that validate RAG content',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      ragPatterns: [
        'search', 'retrieve', 'query', 'vectorStore', 'embeddings',
        'similaritySearch', 'findSimilar', 'getDocuments', 'fetchDocs',
        // `context` was dropped: `getRequestContext()`, `createContext()` and
        // friends retrieve no documents, and with the defaults finally applied
        // (they never were — see the audit) it would have tracked them as RAG.
        'documents', 'chunks', 'passages',
      ],
      validatorFunctions: [
        'validate', 'sanitize', 'filter', 'clean', 'verify',
        'validateRag', 'sanitizeContent', 'filterDocs',
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
    const { ragPatterns, validatorFunctions } = options as Required<Options>;

    const sourceCode = context.sourceCode;

    /**
     * A retrieval call: its call chain has a RAG word (`similaritySearch`,
     * `retrieve`, `index.query`) and no validator word. An array / string
     * derivation (`.map`, `.join`) is followed instead of matched.
     */
    function isRagCall(node: TSESTree.Node): boolean {
      if (node.type !== 'CallExpression' || isDerivationCall(node)) return false;
      const chain = calleeChain(node.callee);
      return (
        ragPatterns.some((pattern: string) => nameHasWord(chain, pattern)) && !isValidated(node)
      );
    }

    /** A configured validator — `validateDocs(docs)`, `sanitize(x)` — cleans the value. */
    function isValidated(node: TSESTree.CallExpression): boolean {
      const chain = calleeChain(node.callee);
      return validatorFunctions.some((fn: string) => nameHasWord(chain, fn));
    }

    const ragFlow = {
      sourceCode,
      isSource: isRagCall,
      isBarrier: (node: TSESTree.Node) =>
        node.type === 'CallExpression' && !isDerivationCall(node) && isValidated(node),
    };

    /**
     * The part of a prompt value made of retrieved content, followed through
     * declarations, `.map/.filter/.join/.slice`, templates and the returns of
     * same-file helpers — or `null`.
     */
    function containsRagContent(node: TSESTree.Node): string | null {
      const parts = node.type === 'TemplateLiteral' ? node.expressions : [node];
      const found = parts.find((part) => derivesFrom(part, ragFlow));
      return found ? sourceCode.getText(found) : null;
    }

    return {
      CallExpression(node: TSESTree.CallExpression) {
        // Check if this is an AI SDK function (exact name, not a substring)
        if (!sdkCallName(node)) return;

        // Check first argument (options object)
        const optionsArg = node.arguments[0];
        if (!optionsArg || optionsArg.type !== 'ObjectExpression') return;

        // Check prompt property
        for (const prop of optionsArg.properties) {
          if (prop.type !== AST_NODE_TYPES.Property) continue;

          const keyName = getStaticPropName(prop);
          if (keyName !== 'prompt' && !isSystemPromptProp(keyName)) continue;

          const ragSource = containsRagContent(prop.value);
          if (ragSource) {
            context.report({
              node: prop.value,
              messageId: 'unsanitizedRagContent',
              data: { source: ragSource },
            });
          }
        }
      },
    };
  },
});
