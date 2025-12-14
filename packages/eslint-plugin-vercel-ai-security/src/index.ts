/**
 * eslint-plugin-vercel-ai-security
 * 
 * Security-focused ESLint plugin for Vercel AI SDK.
 * SDK-aware rules with full type knowledge for generateText, streamText, tools, and streaming.
 * 
 * Covers OWASP Top 10 for LLM Applications 2025 and OWASP Agentic Top 10 2026.
 * 
 * @see https://sdk.vercel.ai/docs
 * @see https://owasp.org/www-project-top-10-for-large-language-model-applications/
 */

import type { TSESLint } from '@interlace/eslint-devkit';

// Import rules - LLM01: Prompt Injection
import { requireValidatedPrompt } from './rules/require-validated-prompt';
// LLM02: Sensitive Information Disclosure
import { noSensitiveInPrompt } from './rules/no-sensitive-in-prompt';
// LLM03: Training Data Poisoning
import { noTrainingDataExposure } from './rules/no-training-data-exposure';
// LLM04: Model Denial of Service
import { requireRequestTimeout } from './rules/require-request-timeout';
// LLM05/ASI05: Improper Output Handling / Unexpected Code Execution
import { noUnsafeOutputHandling } from './rules/no-unsafe-output-handling';
// LLM06/ASI09: Excessive Agency / Human-Agent Trust
import { requireToolConfirmation } from './rules/require-tool-confirmation';
// LLM07: System Prompt Leakage
import { noSystemPromptLeak } from './rules/no-system-prompt-leak';
// LLM08: Vector & Embedding Weaknesses
import { requireEmbeddingValidation } from './rules/require-embedding-validation';
// LLM09: Misinformation
import { requireOutputValidation } from './rules/require-output-validation';
// LLM10: Unbounded Consumption
import { requireMaxTokens } from './rules/require-max-tokens';
import { requireMaxSteps } from './rules/require-max-steps';
import { requireAbortSignal } from './rules/require-abort-signal';
// ASI01: Agent Confusion
import { noDynamicSystemPrompt } from './rules/no-dynamic-system-prompt';
// ASI02: Tool Misuse & Exploitation
import { requireToolSchema } from './rules/require-tool-schema';
// ASI03: Identity & Privilege Abuse
import { noHardcodedApiKeys } from './rules/no-hardcoded-api-keys';
// ASI04: Data Exfiltration
import { requireOutputFiltering } from './rules/require-output-filtering';
// ASI07: Poisoned RAG Pipeline
import { requireRagContentValidation } from './rules/require-rag-content-validation';
// ASI08: Cascading Failures
import { requireErrorHandling } from './rules/require-error-handling';
// ASI10: Logging & Monitoring
import { requireAuditLogging } from './rules/require-audit-logging';

// Re-export all rules
export { requireValidatedPrompt } from './rules/require-validated-prompt';
export { noSensitiveInPrompt } from './rules/no-sensitive-in-prompt';
export { noTrainingDataExposure } from './rules/no-training-data-exposure';
export { requireRequestTimeout } from './rules/require-request-timeout';
export { noUnsafeOutputHandling } from './rules/no-unsafe-output-handling';
export { requireToolConfirmation } from './rules/require-tool-confirmation';
export { noSystemPromptLeak } from './rules/no-system-prompt-leak';
export { requireEmbeddingValidation } from './rules/require-embedding-validation';
export { requireOutputValidation } from './rules/require-output-validation';
export { requireMaxTokens } from './rules/require-max-tokens';
export { requireMaxSteps } from './rules/require-max-steps';
export { requireAbortSignal } from './rules/require-abort-signal';
export { noDynamicSystemPrompt } from './rules/no-dynamic-system-prompt';
export { requireToolSchema } from './rules/require-tool-schema';
export { noHardcodedApiKeys } from './rules/no-hardcoded-api-keys';
export { requireOutputFiltering } from './rules/require-output-filtering';
export { requireRagContentValidation } from './rules/require-rag-content-validation';
export { requireErrorHandling } from './rules/require-error-handling';
export { requireAuditLogging } from './rules/require-audit-logging';

/**
 * Collection of all Vercel AI SDK security ESLint rules (19 total)
 * 
 * OWASP Top 10 for LLM Applications 2025 (10/10):
 * - LLM01: Prompt Injection → require-validated-prompt
 * - LLM02: Sensitive Info Disclosure → no-sensitive-in-prompt
 * - LLM03: Training Data Poisoning → no-training-data-exposure
 * - LLM04: Model Denial of Service → require-request-timeout
 * - LLM05: Improper Output Handling → no-unsafe-output-handling
 * - LLM06: Excessive Agency → require-tool-confirmation
 * - LLM07: System Prompt Leakage → no-system-prompt-leak
 * - LLM08: Vector & Embedding Weaknesses → require-embedding-validation
 * - LLM09: Misinformation → require-output-validation
 * - LLM10: Unbounded Consumption → require-max-tokens, require-max-steps, require-abort-signal
 * 
 * OWASP Agentic Top 10 2026 (9/10 - ASI06 N/A for TypeScript):
 * - ASI01: Agent Confusion → no-dynamic-system-prompt
 * - ASI02: Tool Misuse → require-tool-schema
 * - ASI03: Identity Abuse → no-hardcoded-api-keys
 * - ASI04: Data Exfiltration → require-output-filtering
 * - ASI05: Unexpected Code Execution → no-unsafe-output-handling
 * - ASI06: Memory Corruption → N/A (TypeScript is memory-safe)
 * - ASI07: Poisoned RAG → require-rag-content-validation
 * - ASI08: Cascading Failures → require-error-handling
 * - ASI09: Human-Agent Trust → require-tool-confirmation
 * - ASI10: Logging & Monitoring → require-audit-logging
 */
export const rules: Record<string, TSESLint.RuleModule<string, readonly unknown[]>> = {
  // OWASP LLM01: Prompt Injection
  'require-validated-prompt': requireValidatedPrompt,
  
  // OWASP LLM02: Sensitive Information Disclosure
  'no-sensitive-in-prompt': noSensitiveInPrompt,
  
  // OWASP LLM03: Training Data Poisoning
  'no-training-data-exposure': noTrainingDataExposure,
  
  // OWASP LLM04: Model Denial of Service
  'require-request-timeout': requireRequestTimeout,
  
  // OWASP LLM05: Improper Output Handling / ASI05: Code Execution
  'no-unsafe-output-handling': noUnsafeOutputHandling,
  
  // OWASP LLM06: Excessive Agency / ASI09: Human-Agent Trust
  'require-tool-confirmation': requireToolConfirmation,
  
  // OWASP LLM07: System Prompt Leakage
  'no-system-prompt-leak': noSystemPromptLeak,
  
  // OWASP LLM08: Vector & Embedding Weaknesses
  'require-embedding-validation': requireEmbeddingValidation,
  
  // OWASP LLM09: Misinformation
  'require-output-validation': requireOutputValidation,
  
  // OWASP LLM10: Unbounded Consumption
  'require-max-tokens': requireMaxTokens,
  'require-max-steps': requireMaxSteps,
  'require-abort-signal': requireAbortSignal,
  
  // OWASP ASI01: Agent Confusion
  'no-dynamic-system-prompt': noDynamicSystemPrompt,
  
  // OWASP ASI02: Tool Misuse & Exploitation
  'require-tool-schema': requireToolSchema,
  
  // OWASP ASI03: Identity & Privilege Abuse
  'no-hardcoded-api-keys': noHardcodedApiKeys,
  
  // OWASP ASI04: Data Exfiltration
  'require-output-filtering': requireOutputFiltering,
  
  // OWASP ASI07: Poisoned RAG Pipeline
  'require-rag-content-validation': requireRagContentValidation,
  
  // OWASP ASI08: Cascading Failures
  'require-error-handling': requireErrorHandling,
  
  // OWASP ASI10: Logging & Monitoring
  'require-audit-logging': requireAuditLogging,
} satisfies Record<string, TSESLint.RuleModule<string, readonly unknown[]>>;

/**
 * ESLint plugin object
 */
export const plugin: TSESLint.FlatConfig.Plugin = {
  meta: {
    name: 'eslint-plugin-vercel-ai-security',
    version: '0.3.0',
  },
  rules,
} satisfies TSESLint.FlatConfig.Plugin;

/**
 * Minimal configuration - for gradual adoption
 * Only the 2 most critical rules
 */
const minimalConfig: TSESLint.FlatConfig.Config = {
  plugins: {
    'vercel-ai-security': plugin,
  },
  rules: {
    'vercel-ai-security/require-validated-prompt': 'error',
    'vercel-ai-security/no-hardcoded-api-keys': 'error',
  },
} satisfies TSESLint.FlatConfig.Config;

/**
 * Recommended configuration - balanced security
 * Critical rules as errors, high-priority as warnings
 */
const recommendedConfig: TSESLint.FlatConfig.Config = {
  plugins: {
    'vercel-ai-security': plugin,
  },
  rules: {
    // Critical - always enabled as errors (LLM01-02, LLM05-07)
    'vercel-ai-security/require-validated-prompt': 'error',
    'vercel-ai-security/no-hardcoded-api-keys': 'error',
    'vercel-ai-security/no-unsafe-output-handling': 'error',
    'vercel-ai-security/no-sensitive-in-prompt': 'error',
    'vercel-ai-security/no-system-prompt-leak': 'error',
    'vercel-ai-security/no-dynamic-system-prompt': 'error',
    'vercel-ai-security/require-tool-confirmation': 'error',
    
    // High - enabled as warnings
    'vercel-ai-security/require-tool-schema': 'warn',
    'vercel-ai-security/require-max-tokens': 'warn',
    'vercel-ai-security/require-max-steps': 'warn',
    'vercel-ai-security/require-output-filtering': 'warn',
    'vercel-ai-security/require-rag-content-validation': 'warn',
    'vercel-ai-security/no-training-data-exposure': 'warn',
    'vercel-ai-security/require-request-timeout': 'warn',
    
    // Medium - disabled by default
    'vercel-ai-security/require-error-handling': 'off',
    'vercel-ai-security/require-abort-signal': 'off',
    'vercel-ai-security/require-audit-logging': 'off',
    'vercel-ai-security/require-embedding-validation': 'off',
    'vercel-ai-security/require-output-validation': 'off',
  },
} satisfies TSESLint.FlatConfig.Config;

/**
 * Strict configuration - maximum security
 * All rules enabled for production deployments
 */
const strictConfig: TSESLint.FlatConfig.Config = {
  plugins: {
    'vercel-ai-security': plugin,
  },
  rules: {
    // All critical and high as errors
    'vercel-ai-security/require-validated-prompt': 'error',
    'vercel-ai-security/no-hardcoded-api-keys': 'error',
    'vercel-ai-security/no-unsafe-output-handling': 'error',
    'vercel-ai-security/no-sensitive-in-prompt': 'error',
    'vercel-ai-security/no-system-prompt-leak': 'error',
    'vercel-ai-security/no-dynamic-system-prompt': 'error',
    'vercel-ai-security/require-tool-confirmation': 'error',
    'vercel-ai-security/require-tool-schema': 'error',
    'vercel-ai-security/require-max-tokens': 'error',
    'vercel-ai-security/require-max-steps': 'error',
    'vercel-ai-security/require-output-filtering': 'error',
    'vercel-ai-security/require-rag-content-validation': 'error',
    'vercel-ai-security/no-training-data-exposure': 'error',
    'vercel-ai-security/require-request-timeout': 'error',
    'vercel-ai-security/require-embedding-validation': 'error',
    'vercel-ai-security/require-output-validation': 'error',
    'vercel-ai-security/require-error-handling': 'error',
    'vercel-ai-security/require-abort-signal': 'warn',
    'vercel-ai-security/require-audit-logging': 'warn',
  },
} satisfies TSESLint.FlatConfig.Config;

/**
 * Available configurations (3 options)
 */
export const configs: Record<string, TSESLint.FlatConfig.Config> = {
  /** Minimal: 2 critical rules for gradual adoption */
  minimal: minimalConfig,
  /** Recommended: Balanced security (7 errors, 7 warnings) */
  recommended: recommendedConfig,
  /** Strict: Maximum security (17 errors, 2 warnings) */
  strict: strictConfig,
};

// Default export
export default plugin;

// Re-export types
export type * from './types/index';
