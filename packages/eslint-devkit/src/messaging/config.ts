/**
 * Global configuration for AI-Native messaging
 * Manages the "Target Intelligence Class" (TIC) state
 */

import type { MessagingEnvironment } from './types';

/**
 * Global configuration state interface
 */
interface GlobalAIConfig {
  mode: MessagingEnvironment;
  compression: boolean; // Enable token optimization (short codes)
}

/**
 * Singleton configuration instance
 * Default to CLI (Human) mode
 */
const GLOBAL_AI_CONFIG: GlobalAIConfig = {
  mode: 'CLI',
  compression: false,
};

/**
 * Unsafe global context detection
 * Checks environment variables to auto-detect AI context
 */
function detectEnvironment(): MessagingEnvironment {
  if (process.env['ESLINT_AI_MODE']) {
    return process.env['ESLINT_AI_MODE'] as MessagingEnvironment;
  }
  if (process.env['CURSOR_AGENT']) {
    return 'IDE_CURSOR';
  }
  if (process.env['CI']) {
    return 'CI';
  }
  return 'CLI';
}

// Auto-initialize on import
GLOBAL_AI_CONFIG.mode = detectEnvironment();

/**
 * Set the global messaging mode
 * Useful for plugins to force a mode based on their own config
 */
export function setAIMessagingMode(mode: MessagingEnvironment): void {
  GLOBAL_AI_CONFIG.mode = mode;
}

/**
 * Get the current messaging mode
 */
export function getAIMessagingMode(): MessagingEnvironment {
  return GLOBAL_AI_CONFIG.mode;
}

/**
 * Enable/Disable token compression
 */
export function setTokenCompression(enabled: boolean): void {
  GLOBAL_AI_CONFIG.compression = enabled;
}

/**
 * Get current compression state
 */
export function isTokenCompressionEnabled(): boolean {
  return GLOBAL_AI_CONFIG.compression;
}

/**
 * Reset config to defaults (mostly for testing)
 */
export function resetGlobalAIConfig(): void {
  GLOBAL_AI_CONFIG.mode = detectEnvironment();
  GLOBAL_AI_CONFIG.compression = false;
}
