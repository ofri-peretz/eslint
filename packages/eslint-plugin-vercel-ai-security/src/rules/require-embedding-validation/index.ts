/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Require validation of embeddings before storage or search
 * @description Detects when embeddings are used without validation
 * @see OWASP LLM08: Vector & Embedding Weaknesses
 */

import { TSESTree, createRule, formatLLMMessage, MessageIcons, nameHasWord, objectKeyName } from '@interlace/eslint-devkit';
import { fileUsesVercelAi } from '../../utils/vercel-ai-evidence';
import { calleeChain } from '../../utils/sdk';

type MessageIds = 'unvalidatedEmbedding';

export interface Options {
  /** Patterns suggesting embedding operations */
  embeddingPatterns?: string[];
  /** Functions that validate embeddings */
  validatorFunctions?: string[];
}

type RuleOptions = [Options?];

export const requireEmbeddingValidation = createRule<RuleOptions, MessageIds>({
  name: 'require-embedding-validation',
  meta: {
    type: 'suggestion',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-vercel-ai-security/docs/rules/require-embedding-validation.md',
      description: 'Require validation of embeddings before storage or similarity search',
      cwe: 'CWE-20',
      cvss: 5.5,
    },
    messages: {
      unvalidatedEmbedding: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Unvalidated Embedding',
        cwe: 'CWE-20',
        owasp: 'A03:2021',
        cvss: 5.5,
        description: 'Embedding from "{{source}}" used without validation. Malicious embeddings can poison vector stores.',
        severity: 'MEDIUM',
        compliance: ['SOC2'],
        fix: 'Validate embeddings before use: const validated = validateEmbedding(embedding)',
        documentationLink: 'https://owasp.org/www-project-top-10-for-large-language-model-applications/',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          embeddingPatterns: {
            type: 'array',
            items: { type: 'string' },
            description: 'Patterns suggesting embedding operations',
          },
          validatorFunctions: {
            type: 'array',
            items: { type: 'string' },
            description: 'Functions that validate embeddings',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      embeddingPatterns: [
        'embed', 'embedding', 'embeddings', 'vector', 'encode',
        'createEmbedding', 'getEmbedding', 'generateEmbedding',
      ],
      validatorFunctions: [
        'validate', 'verify', 'check', 'sanitize', 'normalize',
        'validateEmbedding', 'verifyVector',
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
    const { embeddingPatterns, validatorFunctions } = options as Required<Options>;

    const sourceCode = context.sourceCode;

    // Vector store operations
    const vectorStoreOps = ['upsert', 'insert', 'add', 'store', 'index', 'save'];

    /**
     * Check if expression is an embedding call
     */
    function isEmbeddingCall(node: TSESTree.CallExpression): string | null {
      // Whole words of the call chain, not substrings.
      const chain = calleeChain(node.callee);
      return embeddingPatterns.some((pattern: string) => nameHasWord(chain, pattern))
        ? sourceCode.getText(node.callee)
        : null;
    }

    /**
     * Check if expression is validated
     */
    function isValidated(node: TSESTree.CallExpression): boolean {
      const chain = calleeChain(node.callee);
      return validatorFunctions.some((fn: string) => nameHasWord(chain, fn));
    }

    /**
     * Check if call is a vector store operation
     */
    function isVectorStoreOp(node: TSESTree.CallExpression): boolean {
      const chain = calleeChain(node.callee);
      return vectorStoreOps.some((op) => nameHasWord(chain, op));
    }

    return {
      CallExpression(node: TSESTree.CallExpression) {
        // Check if this is a vector store operation
        if (!isVectorStoreOp(node)) return;

        // Check arguments for unvalidated embeddings
        for (const arg of node.arguments) {
          if (arg.type === 'ObjectExpression') {
            for (const prop of arg.properties) {
              if (prop.type !== 'Property') continue;
              
              const keyName = objectKeyName(prop);
              if (keyName === 'embedding' || keyName === 'vector' || keyName === 'values') {
                // Check if value is an unvalidated embedding call
                let valueNode = prop.value;
                if (valueNode.type === 'AwaitExpression') {
                  valueNode = valueNode.argument;
                }

                if (valueNode.type === 'CallExpression') {
                  const embeddingSource = isEmbeddingCall(valueNode);
                  if (embeddingSource && !isValidated(valueNode)) {
                    context.report({
                      node: prop.value,
                      messageId: 'unvalidatedEmbedding',
                      data: { source: embeddingSource },
                    });
                  }
                }
              }
            }
          }
        }
      },
    };
  },
});
