"use strict";
/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.KNOWN_AGENT_ENVIRONMENTS = void 0;
exports.detectKnownAgentEnvironment = detectKnownAgentEnvironment;
exports.resolveAIMode = resolveAIMode;
exports.resolveCompression = resolveCompression;
exports.setAIMessagingMode = setAIMessagingMode;
exports.getAIMessagingMode = getAIMessagingMode;
exports.setTokenCompression = setTokenCompression;
exports.isTokenCompressionEnabled = isTokenCompressionEnabled;
exports.resetGlobalAIConfig = resetGlobalAIConfig;
/**
 * Known AI Agent environments and their detection indicators
 * Each entry includes a link to documentation confirming the env var
 */
exports.KNOWN_AGENT_ENVIRONMENTS = {
    /**
     * Cursor IDE AI Agent
     * @see https://docs.cursor.com/context/rules-for-ai#agent-specific-rules
     * @see https://forum.cursor.com/t/feature-request-env-variable-for-composer-agent-runs/49449
     */
    CURSOR: {
        envVar: 'CURSOR_AGENT',
        mode: 'IDE_CURSOR',
        description: 'Cursor IDE AI Agent',
    },
    /**
     * GitHub Copilot Workspace
     * @see https://docs.github.com/en/copilot/using-github-copilot/using-github-copilot-for-pull-requests
     * Note: Env var is convention-based, verify in your Copilot Workspace runtime
     */
    GITHUB_COPILOT: {
        envVar: 'GITHUB_COPILOT_WORKSPACE',
        mode: 'AGENT_JSON',
        description: 'GitHub Copilot Workspace',
    },
    /**
     * Anthropic Model Context Protocol (Claude Code, etc.)
     * @see https://modelcontextprotocol.io/introduction
     * Note: Proposed convention for MCP-based agents
     */
    ANTHROPIC_MCP: {
        envVar: 'ANTHROPIC_MCP',
        mode: 'AGENT_JSON',
        description: 'Anthropic Model Context Protocol',
    },
    /**
     * OpenAI Agent / Code Interpreter
     * @see https://platform.openai.com/docs/assistants/tools/code-interpreter
     * Note: Proposed convention for OpenAI-based agents
     */
    OPENAI_AGENT: {
        envVar: 'OPENAI_AGENT',
        mode: 'AGENT_JSON',
        description: 'OpenAI Agent / Code Interpreter',
    },
    /**
     * Generic AI Agent flag
     * Use this when your agent framework doesn't have a specific env var
     * Set AI_AGENT=true in your agent's environment
     */
    GENERIC_AI: {
        envVar: 'AI_AGENT',
        mode: 'AGENT_JSON',
        description: 'Generic AI Agent (set AI_AGENT=true)',
    },
};
const GLOBAL_AI_CONFIG = {
    mode: 'CLI',
    compression: false,
};
// ============================================================================
// DETECTION FUNCTIONS
// ============================================================================
/**
 * Detects known AI agent environments from environment variables
 * Returns the appropriate mode if a known environment is detected
 */
function detectKnownAgentEnvironment() {
    for (const env of Object.values(exports.KNOWN_AGENT_ENVIRONMENTS)) {
        if (process.env[env.envVar]) {
            return env.mode;
        }
    }
    return null;
}
/**
 * Detects environment from env vars (simple detection)
 */
function detectEnvironmentFromEnv() {
    // Explicit override via env var
    if (process.env['ESLINT_AI_MODE']) {
        return process.env['ESLINT_AI_MODE'];
    }
    // Known agent detection
    const detected = detectKnownAgentEnvironment();
    if (detected)
        return detected;
    // CI detection
    if (process.env['CI'])
        return 'CI';
    // Default
    return 'CLI';
}
// Auto-initialize on import
GLOBAL_AI_CONFIG.mode = detectEnvironmentFromEnv();
// ============================================================================
// CONTEXT-AWARE RESOLUTION (Next-Gen)
// ============================================================================
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
function resolveAIMode(context) {
    // 1. ENV VAR (Highest priority - agent escape hatch)
    if (process.env['ESLINT_AI_MODE']) {
        return process.env['ESLINT_AI_MODE'];
    }
    // 2. EXPLICIT CONFIG (Developer override via settings)
    if (context?.settings?.['interlace/ai-mode']) {
        return context.settings['interlace/ai-mode'];
    }
    // 3. AUTO-DETECTION (Only if opted-in)
    if (context?.settings?.['interlace/enableAutoAgentDetection'] === true) {
        const detected = detectKnownAgentEnvironment();
        if (detected)
            return detected;
    }
    // 4. DEFAULT: Human CLI
    return 'CLI';
}
/**
 * Resolves whether compression is enabled
 */
function resolveCompression(context) {
    // Explicit setting takes priority
    if (context?.settings?.['interlace/compression'] !== undefined) {
        return context.settings['interlace/compression'];
    }
    // Fall back to global config
    return GLOBAL_AI_CONFIG.compression;
}
// ============================================================================
// LEGACY API (Backward compatibility)
// ============================================================================
/** @deprecated Use resolveAIMode(context) instead */
function setAIMessagingMode(mode) {
    GLOBAL_AI_CONFIG.mode = mode;
}
/** @deprecated Use resolveAIMode(context) instead */
function getAIMessagingMode() {
    return GLOBAL_AI_CONFIG.mode;
}
/** @deprecated Use resolveCompression(context) instead */
function setTokenCompression(enabled) {
    GLOBAL_AI_CONFIG.compression = enabled;
}
/** @deprecated Use resolveCompression(context) instead */
function isTokenCompressionEnabled() {
    return GLOBAL_AI_CONFIG.compression;
}
/** Reset config to defaults (for testing) */
function resetGlobalAIConfig() {
    GLOBAL_AI_CONFIG.mode = 'CLI';
    GLOBAL_AI_CONFIG.compression = false;
}
