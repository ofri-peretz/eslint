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

import { TSESTree, createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

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
      description: 'Require validation of embeddings before storage or similarity search',
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
  create(context) {
    const [options = {}] = context.options;
    const embeddingPatterns = options.embeddingPatterns ?? [
      'embed', 'embedding', 'vector', 'encode',
    ];
    const validatorFunctions = options.validatorFunctions ?? [
      'validate', 'verify', 'check', 'sanitize',
    ];

    const sourceCode = context.sourceCode || context.getSourceCode();

    // Vector store operations
    const vectorStoreOps = ['upsert', 'insert', 'add', 'store', 'index', 'save'];

    /**
     * Check if expression is an embedding call
     */
    function isEmbeddingCall(node: TSESTree.Node): string | null {
      if (node.type !== 'CallExpression') return null;
      
      const callee = sourceCode.getText(node.callee);
      for (const pattern of embeddingPatterns) {
        if (callee.toLowerCase().includes(pattern.toLowerCase())) {
          return callee;
        }
      }
      return null;
    }

    /**
     * Check if expression is validated
     */
    function isValidated(node: TSESTree.Node): boolean {
      if (node.type !== 'CallExpression') return false;
      
      const callee = sourceCode.getText(node.callee);
      return validatorFunctions.some((fn: string) => 
        callee.toLowerCase().includes(fn.toLowerCase())
      );
    }

    /**
     * Check if call is a vector store operation
     */
    function isVectorStoreOp(node: TSESTree.CallExpression): boolean {
      const callee = sourceCode.getText(node.callee);
      return vectorStoreOps.some(op => callee.toLowerCase().includes(op.toLowerCase()));
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
              
              const keyName = prop.key.type === 'Identifier' ? prop.key.name : null;
              if (keyName === 'embedding' || keyName === 'vector' || keyName === 'values') {
                // Check if value is an unvalidated embedding call
                let valueNode = prop.value;
                if (valueNode.type === 'AwaitExpression') {
                  valueNode = valueNode.argument;
                }
                
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
      },
    };
  },
});
