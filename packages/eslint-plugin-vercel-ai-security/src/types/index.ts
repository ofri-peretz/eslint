/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Types for eslint-plugin-vercel-ai-security
 * 
 * SDK-aware types for Vercel AI SDK security rules.
 */

/**
 * Common rule options for Vercel AI SDK rules
 */
export interface VercelAIRuleOptions {
  /** Whether to allow unsafe patterns in test files */
  allowInTests?: boolean;
  
  /** Custom function names to treat as AI SDK calls */
  customAIFunctions?: string[];
}

/**
 * Tool definition security options
 */
export interface ToolSecurityOptions extends VercelAIRuleOptions {
  /** Required fields in tool parameter schemas */
  requiredSchemaFields?: string[];
  
  /** Dangerous tool names that require extra validation */
  dangerousToolNames?: string[];
}

/**
 * Streaming security options
 */
export interface StreamSecurityOptions extends VercelAIRuleOptions {
  /** Require AbortSignal for streaming responses */
  requireAbortSignal?: boolean;
  
  /** Maximum allowed stream timeout in ms */
  maxStreamTimeout?: number;
}
