#!/bin/bash

# OWASP LLM 2025 Rules - Batch Implementation Script
# This script generates stub implementations for all remaining OWASP LLM 2025 rules

set -e

RULES_DIR="/Users/ofri/repos/ofriperetz.dev/eslint/packages/eslint-plugin-secure-coding/src/rules/security"

# Array of rules to implement (format: "rule-name|CWE|Description|Severity")
declare -a RULES=(
  # LLM01: Prompt Injection (remaining)
  "detect-indirect-prompt-injection-vectors|CWE-74|Identifies code where external content reaches LLM|CRITICAL"
  "require-input-sanitization-for-llm|CWE-20|Enforces sanitization on all inputs to LLM APIs|HIGH"
  "detect-rag-injection-risks|CWE-74|Flags RAG/document inputs reaching LLM without scanning|HIGH"
  "no-user-controlled-prompt-instructions|CWE-73|Flags user input directly controlling LLM behavior|HIGH"
  
  # LLM02: Sensitive Information Disclosure
  "no-pii-in-llm-training-data|CWE-359|Detects potential PII exposure in fine-tuning APIs|CRITICAL"
  "require-llm-output-redaction|CWE-200|Enforces redaction of LLM responses before display|CRITICAL"
  "no-credentials-in-llm-context|CWE-522|Flags API keys/tokens in LLM context/memory|CRITICAL"
  "detect-overly-permissive-llm-data-access|CWE-732|Identifies LLM tools with excessive data access|CRITICAL"
  
  # LLM03: Supply Chain Vulnerabilities
  "require-model-provenance-verification|CWE-494|Enforces verification of model origins|CRITICAL"
  "no-unverified-model-downloads|CWE-494|Flags dynamic model loading without verification|CRITICAL"
  "require-training-data-validation|CWE-20|Enforces dataset validation before fine-tuning|CRITICAL"
  "detect-model-serving-infrastructure-risks|CWE-306|Identifies unsafe model deployment|CRITICAL"
  
  # LLM04: Data and Model Poisoning
  "require-training-data-provenance|CWE-346|Enforces metadata tracking for datasets|CRITICAL"
  "detect-user-supplied-training-data|CWE-20|Flags user content in training sets|CRITICAL"
  "no-auto-model-retraining-on-user-feedback|CWE-754|Requires human review for model updates|CRITICAL"
  "require-training-data-integrity-checks|CWE-354|Enforces hash verification of datasets|CRITICAL"
  
  # LLM05: Improper Output Handling
  "require-llm-output-validation|CWE-20|Requires validation before using LLM responses|CRITICAL"
  "no-direct-llm-output-execution|CWE-94|Flags eval/exec with LLM-generated code|CRITICAL"
  "require-llm-output-encoding|CWE-116|Enforces encoding based on usage context|CRITICAL"
  "detect-llm-generated-sql|CWE-89|Identifies dangerous LLM-to-SQL patterns|CRITICAL"
  
  # LLM06: Excessive Agency
  "enforce-llm-tool-least-privilege|CWE-250|Ensures tools have minimal permissions|CRITICAL"
  "require-human-approval-for-critical-actions|CWE-284|Requires confirmation for critical actions|CRITICAL"
  "no-auto-approved-llm-tools|CWE-862|Flags tools that auto-execute without policy checks|CRITICAL"
  "detect-llm-unrestricted-tool-access|CWE-732|Identifies LLM agents with access to all tools|CRITICAL"
  
  # LLM07: System Prompt Leakage
  "no-system-prompt-in-output|CWE-200|Detects code echoing system prompts to users|CRITICAL"
  "require-system-prompt-isolation|CWE-552|Ensures system prompts aren't accessible via queries|CRITICAL"
  "detect-prompt-extraction-vulnerabilities|CWE-200|Identifies patterns revealing instructions|CRITICAL"
  
  # LLM08: Vector and Embedding Weaknesses
  "require-vector-db-access-control|CWE-862|Requires auth for vector DB operations|CRITICAL"
  "detect-embedding-poisoning-risks|CWE-20|Identifies untrusted embedding inputs|CRITICAL"
  "require-vector-namespace-isolation|CWE-668|Requires multi-tenant separation|CRITICAL"
  "no-unvalidated-embeddings|CWE-20|Requires validation before storage/retrieval|CRITICAL"
  
  # LLM09: Misinformation
  "require-llm-fact-checking|CWE-754|Requires fact-checking for critical assertions|MEDIUM"
  "require-llm-confidence-scoring|CWE-754|Enforces confidence scores for outputs|MEDIUM"
  "detect-unverified-llm-assertions|CWE-754|Flags LLM outputs used as facts|MEDIUM"
  
  # LLM10: Unbounded Consumption
  "require-llm-rate-limiting|CWE-770|Enforces rate limiting for LLM API calls|CRITICAL"
  "require-llm-token-budget|CWE-770|Requires token usage caps|CRITICAL"
  "detect-llm-infinite-loops|CWE-834|Identifies potential infinite reasoning loops|CRITICAL"
)

echo "Generating ${#RULES[@]} OWASP LLM 2025 rules..."

for rule in "${RULES[@]}"; do
  IFS='|' read -r name cwe description severity <<< "$rule"
  
  filename="${RULES_DIR}/${name}.ts"
  
  # Skip if file already exists
  if [ -f "$filename" ]; then
    echo "⏭️  Skipping $name (already exists)"
    continue
  fi
  
  echo "📝 Creating $name..."
  
  cat > "$filename" << EOF
/**
 * ESLint Rule: ${name}
 * ${description}
 * 
 * OWASP LLM Top 10 2025
 * ${cwe}: $(get_cwe_description "${cwe}")
 */

import type { TSESLint } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { type SecurityRuleOptions } from '@interlace/eslint-devkit';

type MessageIds = '$(echo $name | tr '-' '_' | sed 's/_\([a-z]\)/\U\1/g')' | 'suggestion1' | 'suggestion2';

export interface Options extends SecurityRuleOptions {}

type RuleOptions = [Options?];

export const $(echo $name | tr '-' 'A' | sed 's/-\([a-z]\)/\U\1/g' | sed 's/^./\L&/') = createRule<RuleOptions, MessageIds>({
  name: '${name}',
  meta: {
    type: 'problem',
    docs: {
      description: '${description}',
    },
    hasSuggestions: true,
    messages: {
      $(echo $name | tr '-' '_' | sed 's/_\([a-z]\)/\U\1/g'): formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: '$(echo $name | tr '-' ' ' | sed 's/\b\(.\)/\u\1/g')',
        cwe: '${cwe}',
        description: '${description}',
        severity: '${severity}',
        fix: 'TODO: Add fix guidance',
        documentationLink: 'https://owasp.org/www-project-top-10-for-large-language-model-applications/',
      }),
      suggestion1: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Suggestion 1',
        description: 'TODO: Add suggestion',
        severity: 'LOW',
        fix: 'TODO',
        documentationLink: 'https://owasp.org/',
      }),
      suggestion2: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Suggestion 2',
        description: 'TODO: Add suggestion',
        severity: 'LOW',
        fix: 'TODO',
        documentationLink: 'https://owasp.org/',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          trustedSanitizers: {
            type: 'array',
            items: { type: 'string' },
            default: [],
          },
          trustedAnnotations: {
            type: 'array',
            items: { type: 'string' },
            default: [],
          },
          strictMode: {
            type: 'boolean',
            default: false,
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      trustedSanitizers: [],
      trustedAnnotations: [],
      strictMode: false,
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const sourceCode = context.sourceCode || context.sourceCode;
    const filename = context.filename || context.getFilename();

    // TODO: Implement rule logic
    return {
      // Add AST visitors here
      Program(node) {
        // Placeholder implementation
        // TODO: Add actual detection logic
      },
    };
  },
});
EOF

  echo "✅ Created $name"
done

echo ""
echo "✨ Generation complete! Created $(ls -1 ${RULES_DIR}/*.ts | wc -l) rule files"
echo "⚠️  Note: These are stub implementations. Each rule needs proper detection logic."
EOF
