/**
 * Coverage-focused tests for messaging/config.ts
 *
 * Covers the import-time environment detection (via vi.resetModules +
 * dynamic import under stubbed env vars) and the legacy global-state API.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const AGENT_ENV_VARS = [
  'CURSOR_AGENT',
  'GITHUB_COPILOT_WORKSPACE',
  'ANTHROPIC_MCP',
  'OPENAI_AGENT',
  'AI_AGENT',
];

/** Clear every env var that influences detection. */
function clearDetectionEnv() {
  vi.stubEnv('ESLINT_AI_MODE', '');
  vi.stubEnv('CI', '');
  for (const v of AGENT_ENV_VARS) vi.stubEnv(v, '');
}

describe('config.ts environment detection (module init)', () => {
  beforeEach(() => {
    vi.resetModules();
    clearDetectionEnv();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('initializes mode from ESLINT_AI_MODE when set', async () => {
    vi.stubEnv('ESLINT_AI_MODE', 'AGENT_JSON');
    const config = await import('./config');
    expect(config.getAIMessagingMode()).toBe('AGENT_JSON');
  });

  it('initializes mode from a known agent env var when ESLINT_AI_MODE is unset', async () => {
    vi.stubEnv('CURSOR_AGENT', '1');
    const config = await import('./config');
    expect(config.getAIMessagingMode()).toBe('IDE_CURSOR');
  });

  it('initializes mode to CI when only CI is set', async () => {
    vi.stubEnv('CI', 'true');
    const config = await import('./config');
    expect(config.getAIMessagingMode()).toBe('CI');
  });

  it('defaults to CLI when no relevant env vars are set', async () => {
    const config = await import('./config');
    expect(config.getAIMessagingMode()).toBe('CLI');
  });

  it('detectKnownAgentEnvironment returns null when no agent env var is set', async () => {
    const config = await import('./config');
    expect(config.detectKnownAgentEnvironment()).toBeNull();
  });

  it('detectKnownAgentEnvironment returns the mode of the detected agent', async () => {
    vi.stubEnv('AI_AGENT', 'true');
    const config = await import('./config');
    expect(config.detectKnownAgentEnvironment()).toBe('AGENT_JSON');
  });
});

describe('config.ts legacy global-state API', () => {
  beforeEach(() => {
    vi.resetModules();
    clearDetectionEnv();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('setAIMessagingMode / getAIMessagingMode round-trip', async () => {
    const config = await import('./config');
    config.setAIMessagingMode('AGENT_JSON');
    expect(config.getAIMessagingMode()).toBe('AGENT_JSON');
    config.setAIMessagingMode('CLI');
    expect(config.getAIMessagingMode()).toBe('CLI');
  });

  it('setTokenCompression / isTokenCompressionEnabled round-trip', async () => {
    const config = await import('./config');
    expect(config.isTokenCompressionEnabled()).toBe(false);
    config.setTokenCompression(true);
    expect(config.isTokenCompressionEnabled()).toBe(true);
  });

  it('resetGlobalAIConfig restores CLI mode and disables compression', async () => {
    const config = await import('./config');
    config.setAIMessagingMode('AGENT_JSON');
    config.setTokenCompression(true);
    config.resetGlobalAIConfig();
    expect(config.getAIMessagingMode()).toBe('CLI');
    expect(config.isTokenCompressionEnabled()).toBe(false);
  });

  it('resolveCompression falls back to the global config when no setting is present', async () => {
    const config = await import('./config');
    config.setTokenCompression(true);
    expect(config.resolveCompression({})).toBe(true);
    expect(config.resolveCompression({ settings: {} })).toBe(true);
    config.setTokenCompression(false);
    expect(config.resolveCompression()).toBe(false);
  });

  it('resolveAIMode falls through to CLI when auto-detection is enabled but no agent is present', async () => {
    const config = await import('./config');
    expect(
      config.resolveAIMode({
        settings: { 'interlace/enableAutoAgentDetection': true },
      }),
    ).toBe('CLI');
  });

  it('resolveCompression prefers the explicit interlace/compression setting', async () => {
    const config = await import('./config');
    config.setTokenCompression(true);
    expect(
      config.resolveCompression({ settings: { 'interlace/compression': false } }),
    ).toBe(false);
  });
});
