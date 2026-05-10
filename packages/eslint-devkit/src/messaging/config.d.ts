/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */
/**
 * Global configuration for AI-Native messaging
 * Manages the "Target Intelligence Class" (TIC) state
 *
 * PRIORITY ORDER:
 * 1. Environment Variable (ESLINT_AI_MODE) - Agent escape hatch
 * 2. Explicit ESLint Settings (interlace/ai-mode) - Developer override
 * 3. Auto-Detection (if enableAutoAgentDetection: true) - Opt-in magic
 * 4. Default: CLI (Human)
 */
import type { MessagingEnvironment } from './types';
/**
 * ESLint Rule Context settings interface
 * Matches the shape of `context.settings` in ESLint rules
 */
export interface InterlaceSettings {
    /** Explicit AI mode override */
    'interlace/ai-mode'?: MessagingEnvironment;
    /** Enable automatic detection of AI agent environments */
    'interlace/enableAutoAgentDetection'?: boolean;
    /** Enable token compression for smaller payloads */
    'interlace/compression'?: boolean;
}
/**
 * Minimal ESLint RuleContext interface (subset we need)
 */
export interface RuleContextLike {
    settings?: InterlaceSettings & Record<string, unknown>;
}
/**
 * Known AI Agent environments and their detection indicators
 * Each entry includes a link to documentation confirming the env var
 */
export declare const KNOWN_AGENT_ENVIRONMENTS: {
    /**
     * Cursor IDE AI Agent
     * @see https://docs.cursor.com/context/rules-for-ai#agent-specific-rules
     * @see https://forum.cursor.com/t/feature-request-env-variable-for-composer-agent-runs/49449
     */
    readonly CURSOR: {
        readonly envVar: "CURSOR_AGENT";
        readonly mode: MessagingEnvironment;
        readonly description: "Cursor IDE AI Agent";
    };
    /**
     * GitHub Copilot Workspace
     * @see https://docs.github.com/en/copilot/using-github-copilot/using-github-copilot-for-pull-requests
     * Note: Env var is convention-based, verify in your Copilot Workspace runtime
     */
    readonly GITHUB_COPILOT: {
        readonly envVar: "GITHUB_COPILOT_WORKSPACE";
        readonly mode: MessagingEnvironment;
        readonly description: "GitHub Copilot Workspace";
    };
    /**
     * Anthropic Model Context Protocol (Claude Code, etc.)
     * @see https://modelcontextprotocol.io/introduction
     * Note: Proposed convention for MCP-based agents
     */
    readonly ANTHROPIC_MCP: {
        readonly envVar: "ANTHROPIC_MCP";
        readonly mode: MessagingEnvironment;
        readonly description: "Anthropic Model Context Protocol";
    };
    /**
     * OpenAI Agent / Code Interpreter
     * @see https://platform.openai.com/docs/assistants/tools/code-interpreter
     * Note: Proposed convention for OpenAI-based agents
     */
    readonly OPENAI_AGENT: {
        readonly envVar: "OPENAI_AGENT";
        readonly mode: MessagingEnvironment;
        readonly description: "OpenAI Agent / Code Interpreter";
    };
    /**
     * Generic AI Agent flag
     * Use this when your agent framework doesn't have a specific env var
     * Set AI_AGENT=true in your agent's environment
     */
    readonly GENERIC_AI: {
        readonly envVar: "AI_AGENT";
        readonly mode: MessagingEnvironment;
        readonly description: "Generic AI Agent (set AI_AGENT=true)";
    };
};
/**
 * Detects known AI agent environments from environment variables
 * Returns the appropriate mode if a known environment is detected
 */
export declare function detectKnownAgentEnvironment(): MessagingEnvironment | null;
/**
 * Resolves the AI messaging mode based on the priority chain:
 * 1. ENV VAR (ESLINT_AI_MODE) - Highest priority
 * 2. Explicit setting (interlace/ai-mode)
 * 3. Auto-detection (if enableAutoAgentDetection: true)
 * 4. Default: CLI
 *
 * @param context - ESLint rule context (or context-like object with settings)
 * @returns The resolved messaging environment
 *
 * @example
 * ```typescript
 * // In an ESLint rule
 * create(context) {
 *   const mode = resolveAIMode(context);
 *   // mode is 'CLI' | 'CI' | 'IDE_CURSOR' | 'AGENT_JSON'
 * }
 * ```
 */
export declare function resolveAIMode(context?: RuleContextLike): MessagingEnvironment;
/**
 * Resolves whether compression is enabled
 */
export declare function resolveCompression(context?: RuleContextLike): boolean;
/** @deprecated Use resolveAIMode(context) instead */
export declare function setAIMessagingMode(mode: MessagingEnvironment): void;
/** @deprecated Use resolveAIMode(context) instead */
export declare function getAIMessagingMode(): MessagingEnvironment;
/** @deprecated Use resolveCompression(context) instead */
export declare function setTokenCompression(enabled: boolean): void;
/** @deprecated Use resolveCompression(context) instead */
export declare function isTokenCompressionEnabled(): boolean;
/** Reset config to defaults (for testing) */
export declare function resetGlobalAIConfig(): void;
