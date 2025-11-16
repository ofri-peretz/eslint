/**
 * ESLint Rule: enforce-naming
 * Enforce domain-specific naming conventions with business context
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';
import { createRule } from '../../utils/create-rule';

type MessageIds = 'wrongTerminology' | 'useDomainTerm' | 'viewGlossary';

interface DomainTerm {
  incorrect: string | RegExp;
  correct: string;
  context: string;
  examples?: string[];
}

export interface Options {
  /** Domain context for naming conventions (e.g., 'ecommerce', 'healthcare') */
  domain?: string;
  
  /** Array of domain-specific terminology rules */
  terms?: DomainTerm[];
  
  /** URL to domain glossary documentation */
  glossaryUrl?: string;
}

type RuleOptions = [Options?];

export const enforceNaming = createRule<RuleOptions, MessageIds>({
  name: 'enforce-naming',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Enforce domain-specific naming conventions with business context',
    },
    fixable: 'code',
    hasSuggestions: true,
    messages: {
      // 🎯 Token optimization: 46% reduction (56→30 tokens) - domain terminology keeps code clear
      wrongTerminology: formatLLMMessage({
        icon: MessageIcons.QUALITY,
        issueName: 'Domain terminology mismatch',
        cwe: 'CWE-216',
        description: 'Domain terminology mismatch',
        severity: 'MEDIUM',
        fix: 'Use "{{correctTerm}}" ({{context}}) for ubiquitous language alignment',
        documentationLink: 'Domain glossary',
      }),
      useDomainTerm: '✅ Replace with "{{correctTerm}}"',
      viewGlossary: '📖 View domain glossary',
    },
    schema: [
      {
        type: 'object',
        properties: {
          domain: {
            type: 'string',
            default: 'general',
          },
          terms: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                incorrect: { type: ['string', 'object'] }, // string or regex
                correct: { type: 'string' },
                context: { type: 'string' },
                examples: {
                  type: 'array',
                  items: { type: 'string' },
                },
              },
              required: ['incorrect', 'correct', 'context'],
            },
          },
          glossaryUrl: {
            type: 'string',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      domain: 'general',
      terms: [],
      glossaryUrl: undefined,
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const options = context.options[0] || {};
    const { domain = 'general', terms = [] } = options;

    // Early return if no terms configured
    if (!terms || terms.length === 0) {
      return {};
    }

    /**
     * Check if identifier violates domain terms
     */
    const checkIdentifier = (name: string): DomainTerm | null => {
      for (const term of terms) {
        if (typeof term.incorrect === 'string') {
          if (name.toLowerCase().includes(term.incorrect.toLowerCase())) {
            return term;
          }
        } else if (term.incorrect instanceof RegExp) {
          if (term.incorrect.test(name)) {
            return term;
          }
        }
      }
      return null;
    };

    /**
     * Generate replacement suggestion
     */
    const generateReplacement = (name: string, term: DomainTerm): string => {
      if (typeof term.incorrect === 'string') {
        // Simple string replacement
        return name.replace(new RegExp(term.incorrect, 'gi'), term.correct);
      }
      // For regex, just suggest the correct term
      return term.correct;
    };

    /**
     * Report violation
     */
    const reportViolation = (
      node: TSESTree.Identifier,
      violatedTerm: DomainTerm
    ) => {
      const replacement = generateReplacement(node.name, violatedTerm);

      context.report({
        node,
        messageId: 'wrongTerminology',
        data: {
          incorrectTerm: node.name,
          correctTerm: violatedTerm.correct,
          context: violatedTerm.context || domain,
          domain,
        },
        suggest: [
          {
            messageId: 'useDomainTerm',
            data: { correctTerm: violatedTerm.correct },
            fix: (fixer: TSESLint.RuleFixer) => {
              return fixer.replaceText(node, replacement);
            },
          },
        ],
      });
    };

    return {
      // Check variable declarations
      VariableDeclarator(node: TSESTree.VariableDeclarator) {
        if (node.id.type !== 'Identifier') return;

        const violatedTerm = checkIdentifier(node.id.name);
        if (violatedTerm) {
          reportViolation(node.id, violatedTerm);
        }
      },

      // Check function declarations
      FunctionDeclaration(node: TSESTree.FunctionDeclaration) {
        if (!node.id) return;

        const violatedTerm = checkIdentifier(node.id.name);
        if (violatedTerm) {
          reportViolation(node.id, violatedTerm);
        }
      },

      // Check class declarations
      ClassDeclaration(node: TSESTree.ClassDeclaration) {
        if (!node.id) return;

        const violatedTerm = checkIdentifier(node.id.name);
        if (violatedTerm) {
          reportViolation(node.id, violatedTerm);
        }
      },

      // Check property definitions
      PropertyDefinition(node: TSESTree.PropertyDefinition) {
        if (node.key.type !== 'Identifier') return;

        const violatedTerm = checkIdentifier(node.key.name);
        if (violatedTerm) {
          reportViolation(node.key, violatedTerm);
        }
      },

      // Check method definitions
      MethodDefinition(node: TSESTree.MethodDefinition) {
        if (node.key.type !== 'Identifier') return;

        const violatedTerm = checkIdentifier(node.key.name);
        if (violatedTerm) {
          reportViolation(node.key, violatedTerm);
        }
      },
    };
  },
});

