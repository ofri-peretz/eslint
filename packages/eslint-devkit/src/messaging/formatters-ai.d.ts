/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */
/**
 * AI-Native Runtime functions for LLM message formatting (Next-Gen)
 *
 * Contains the "Dual-Hertz" formatting engine for Agentic workflows.
 * Provides context-aware message formatting that automatically routes
 * between Human (CLI), Agent (JSON), and Hybrid (Cursor) modes.
 *
 * ⚠️ For NEW rule code, prefer the V2 formatters in `./formatters-v2`:
 *   - `formatSecurityMessage`    — CWE-mapped security rules
 *   - `formatCodeQualityMessage` — structural / import / cycle rules
 *   - `formatPerformanceMessage` — performance / complexity rules
 *
 * The V2 formatters are category-specific (no force-fit security metadata
 * on quality rules), expose `why` + before/after examples for higher
 * first-fix accuracy, and support `'human' | 'compact' | 'agent'` modes.
 *
 * This file is retained for two reasons:
 *   1. `buildASTSelector` — AST-targeting precision selector that V2 does
 *      not yet replicate. Still useful for agent-mode messages that want
 *      to hand the model an esquery target instead of a file/line.
 *   2. `formatMessageNextGen` — the IDE_CURSOR mode that injects hidden
 *      `<!-- AI_HINT: ... -->` comments. Not yet ported to V2.
 *
 * Do not deprecate — downstream plugins still consume this API. New work
 * should land in `formatters-v2.ts` instead.
 */
import type { LLMMessageOptions, EnterpriseMessageOptions, AgentMessageOptions } from './types';
import { type RuleContextLike } from './config';
/**
 * Node-like interface for AST selector building
 * Compatible with TSESTree nodes
 */
export interface ASTNodeLike {
    type: string;
    parent?: ASTNodeLike;
    callee?: {
        name?: string;
        property?: {
            name?: string;
        };
    };
    key?: {
        name?: string;
    };
    id?: {
        name?: string;
    };
    name?: string;
}
/**
 * Builds a relative esquery selector from an AST node
 * Goes up to the nearest "anchor" (function, class, method) for context
 *
 * @param node - The AST node that triggered the lint error
 * @param maxDepth - Maximum levels to traverse up (default: 3)
 * @returns An esquery-compatible selector string
 *
 * @example
 * ```typescript
 * // For a node: db.query('SELECT...')
 * buildASTSelector(node)
 * // Returns: "CallExpression[callee.property.name='query']"
 *
 * // For a node inside a method:
 * buildASTSelector(node)
 * // Returns: "MethodDefinition[key.name='getUser'] CallExpression[callee.name='eval']"
 * ```
 */
export declare function buildASTSelector(node: ASTNodeLike, maxDepth?: number): string;
/**
 * Formats a message as structured JSON for AI Agents
 * Minimizes token usage while retaining strict semantic targeting
 */
export declare function formatAgentMessage(options: AgentMessageOptions, compress?: boolean): string;
/**
 * Context-aware message formatter (Next-Gen)
 *
 * Automatically routes between output formats based on the resolved AI mode:
 * - CLI: Human-readable with emojis and prose
 * - CI: Human-readable (no colors)
 * - IDE_CURSOR: Human-readable + hidden AI hints
 * - AGENT_JSON: Structured JSON for agents
 *
 * @param options - Message options including optional agent hints
 * @param context - ESLint rule context (for accessing settings)
 * @returns Formatted message string
 *
 * @example
 * ```typescript
 * // In an ESLint rule
 * context.report({
 *   node,
 *   message: formatMessageNextGen({
 *     icon: '🔒',
 *     severity: 'CRITICAL',
 *     description: 'SQL Injection',
 *     fix: 'Use parameterized queries',
 *     astSelector: buildASTSelector(node),
 *   }, context),
 * });
 * ```
 */
export declare function formatMessageNextGen(options: LLMMessageOptions | EnterpriseMessageOptions | AgentMessageOptions, context?: RuleContextLike): string;
/**
 * @deprecated Use formatMessageNextGen(options, context) instead
 * Legacy formatter that uses global state instead of context
 */
export declare function formatLLMMessageNextGen(options: LLMMessageOptions | EnterpriseMessageOptions | AgentMessageOptions): string;
