/**
 * @fileoverview Require validation of RAG content before use in prompts
 * @description Detects when retrieved documents are used directly without sanitization
 * @see OWASP ASI07: Poisoned RAG Pipeline
 */

import { TSESTree, createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

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
      description: 'Require validation of RAG content before including in AI prompts',
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
        'documents', 'chunks', 'passages', 'context',
      ],
      validatorFunctions: [
        'validate', 'sanitize', 'filter', 'clean', 'verify',
        'validateRag', 'sanitizeContent', 'filterDocs',
      ],
    },
  ],
  create(context) {
    const [options = {}] = context.options;
    const ragPatterns = options.ragPatterns ?? [
      'search', 'retrieve', 'query', 'vectorStore', 'documents',
    ];
    const validatorFunctions = options.validatorFunctions ?? [
      'validate', 'sanitize', 'filter', 'clean',
    ];

    const sourceCode = context.sourceCode || context.getSourceCode();

    // Vercel AI SDK functions
    const aiSDKFunctions = ['generateText', 'streamText', 'generateObject', 'streamObject'];

    // Track variables that hold RAG content
    const ragVariables = new Set<string>();

    /**
     * Check if expression is a RAG retrieval call
     */
    function isRagCall(node: TSESTree.Node): string | null {
      if (node.type !== 'CallExpression') return null;
      
      const callee = sourceCode.getText(node.callee);
      for (const pattern of ragPatterns) {
        if (callee.toLowerCase().includes(pattern.toLowerCase())) {
          return callee;
        }
      }
      return null;
    }

    /**
     * Check if expression is wrapped in validation
     */
    function isValidated(node: TSESTree.Node): boolean {
      if (node.type !== 'CallExpression') return false;
      
      const callee = sourceCode.getText(node.callee);
      return validatorFunctions.some((fn: string) => 
        callee.toLowerCase().includes(fn.toLowerCase())
      );
    }

    /**
     * Check if an expression contains RAG content
     */
    function containsRagContent(node: TSESTree.Node): string | null {
      if (node.type === 'Identifier' && ragVariables.has(node.name)) {
        return node.name;
      }
      if (node.type === 'TemplateLiteral') {
        for (const expr of node.expressions) {
          const rag = containsRagContent(expr);
          if (rag) return rag;
        }
      }
      // Handle: ${await retrieve(query)}
      if (node.type === 'AwaitExpression') {
        return containsRagContent(node.argument);
      }
      if (node.type === 'CallExpression') {
        // Check if this is an unvalidated RAG call
        const ragSource = isRagCall(node);
        if (ragSource && !isValidated(node)) {
          return ragSource;
        }
      }
      return null;
    }

    return {
      // Track RAG variable assignments
      VariableDeclarator(node: TSESTree.VariableDeclarator) {
        if (node.id.type !== 'Identifier') return;
        if (!node.init) return;
        
        // Handle: const docs = await vectorStore.search(query);
        let initNode = node.init;
        if (initNode.type === 'AwaitExpression') {
          initNode = initNode.argument;
        }
        
        if (isRagCall(initNode)) {
          ragVariables.add(node.id.name);
        }
      },

      CallExpression(node: TSESTree.CallExpression) {
        const callee = sourceCode.getText(node.callee);
        
        // Check if this is an AI SDK function
        const isAIFunction = aiSDKFunctions.some(fn => callee.includes(fn));
        if (!isAIFunction) return;

        // Check first argument (options object)
        const optionsArg = node.arguments[0];
        if (!optionsArg || optionsArg.type !== 'ObjectExpression') return;

        // Check prompt property
        for (const prop of optionsArg.properties) {
          if (prop.type !== 'Property') continue;
          
          const keyName = prop.key.type === 'Identifier' ? prop.key.name : null;
          if (keyName !== 'prompt' && keyName !== 'system') continue;

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
