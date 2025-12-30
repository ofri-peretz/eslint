/**
 * Comprehensive tests for AI-Native Messaging (Next-Gen)
 *
 * These tests serve as living documentation for how the configuration system works.
 * Read through them to understand the priority order and behavior of each mode.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  formatMessageNextGen,
  formatLLMMessageNextGen,
  buildASTSelector,
  type ASTNodeLike,
} from './formatters-ai';
import {
  resolveAIMode,
  resolveCompression,
  setAIMessagingMode,
  setTokenCompression,
  resetGlobalAIConfig,
  KNOWN_AGENT_ENVIRONMENTS,
  type RuleContextLike,
} from './config';
import type { AgentMessageOptions } from './types';

// ============================================================================
// TEST FIXTURES
// ============================================================================

const mockOptions: AgentMessageOptions = {
  icon: '🔒',
  issueName: 'SQL Injection',
  cwe: 'CWE-89',
  description: 'SQL Injection detected',
  severity: 'CRITICAL',
  fix: 'Use parameterized queries',
  documentationLink: 'https://owasp.org/sql-injection',
  astSelector: "CallExpression[callee.name='query']",
  aiHints: ['Check for template literals', 'Use bind parameters'],
};

// ============================================================================
// CONFIGURATION RESOLUTION TESTS
// ============================================================================

describe('resolveAIMode - Configuration Priority Chain', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    delete process.env['ESLINT_AI_MODE'];
    delete process.env['CURSOR_AGENT'];
    delete process.env['AI_AGENT'];
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Priority 1: Environment Variable (ESLINT_AI_MODE)', () => {
    it('should use env var when set, ignoring all other settings', () => {
      process.env['ESLINT_AI_MODE'] = 'AGENT_JSON';

      // Even with explicit CLI setting, env var wins
      const context: RuleContextLike = {
        settings: { 'interlace/ai-mode': 'CLI' },
      };

      expect(resolveAIMode(context)).toBe('AGENT_JSON');
    });

    it('should allow agents to override config via env var', () => {
      // This is the "agent escape hatch" - agents can always force their mode
      process.env['ESLINT_AI_MODE'] = 'AGENT_JSON';
      expect(resolveAIMode()).toBe('AGENT_JSON');
    });
  });

  describe('Priority 2: Explicit ESLint Settings', () => {
    it('should use explicit setting when no env var is set', () => {
      const context: RuleContextLike = {
        settings: { 'interlace/ai-mode': 'IDE_CURSOR' },
      };

      expect(resolveAIMode(context)).toBe('IDE_CURSOR');
    });

    it('should allow developers to force AGENT_JSON for testing', () => {
      const context: RuleContextLike = {
        settings: { 'interlace/ai-mode': 'AGENT_JSON' },
      };

      expect(resolveAIMode(context)).toBe('AGENT_JSON');
    });
  });

  describe('Priority 3: Auto-Detection (Opt-in)', () => {
    it('should NOT auto-detect when enableAutoAgentDetection is false/undefined', () => {
      process.env['CURSOR_AGENT'] = 'true';

      // Auto-detection is OFF by default
      const context: RuleContextLike = { settings: {} };
      expect(resolveAIMode(context)).toBe('CLI');
    });

    it('should auto-detect Cursor when enableAutoAgentDetection is true', () => {
      process.env['CURSOR_AGENT'] = 'true';

      const context: RuleContextLike = {
        settings: { 'interlace/enableAutoAgentDetection': true },
      };

      expect(resolveAIMode(context)).toBe('IDE_CURSOR');
    });

    it('should auto-detect generic AI_AGENT when enabled', () => {
      process.env['AI_AGENT'] = 'true';

      const context: RuleContextLike = {
        settings: { 'interlace/enableAutoAgentDetection': true },
      };

      expect(resolveAIMode(context)).toBe('AGENT_JSON');
    });
  });

  describe('Priority 4: Default (CLI)', () => {
    it('should default to CLI when nothing is configured', () => {
      expect(resolveAIMode()).toBe('CLI');
      expect(resolveAIMode(undefined)).toBe('CLI');
      expect(resolveAIMode({})).toBe('CLI');
      expect(resolveAIMode({ settings: {} })).toBe('CLI');
    });
  });
});

// ============================================================================
// KNOWN AGENT ENVIRONMENTS
// ============================================================================

describe('KNOWN_AGENT_ENVIRONMENTS', () => {
  it('should document all supported agent environments', () => {
    // This test documents which environments are auto-detected
    expect(KNOWN_AGENT_ENVIRONMENTS).toHaveProperty('CURSOR');
    expect(KNOWN_AGENT_ENVIRONMENTS).toHaveProperty('GITHUB_COPILOT');
    expect(KNOWN_AGENT_ENVIRONMENTS).toHaveProperty('ANTHROPIC_MCP');
    expect(KNOWN_AGENT_ENVIRONMENTS).toHaveProperty('OPENAI_AGENT');
    expect(KNOWN_AGENT_ENVIRONMENTS).toHaveProperty('GENERIC_AI');
  });

  it('should map Cursor to IDE_CURSOR mode', () => {
    expect(KNOWN_AGENT_ENVIRONMENTS.CURSOR.mode).toBe('IDE_CURSOR');
    expect(KNOWN_AGENT_ENVIRONMENTS.CURSOR.envVar).toBe('CURSOR_AGENT');
  });

  it('should map other agents to AGENT_JSON mode', () => {
    expect(KNOWN_AGENT_ENVIRONMENTS.GITHUB_COPILOT.mode).toBe('AGENT_JSON');
    expect(KNOWN_AGENT_ENVIRONMENTS.ANTHROPIC_MCP.mode).toBe('AGENT_JSON');
    expect(KNOWN_AGENT_ENVIRONMENTS.OPENAI_AGENT.mode).toBe('AGENT_JSON');
  });
});

// ============================================================================
// AST SELECTOR BUILDER
// ============================================================================

describe('buildASTSelector', () => {
  it('should build selector for simple CallExpression', () => {
    const node: ASTNodeLike = {
      type: 'CallExpression',
      callee: { name: 'eval' },
    };

    expect(buildASTSelector(node)).toBe("CallExpression[callee.name='eval']");
  });

  it('should build selector for method call (MemberExpression)', () => {
    const node: ASTNodeLike = {
      type: 'CallExpression',
      callee: { property: { name: 'query' } },
    };

    expect(buildASTSelector(node)).toBe("CallExpression[callee.property.name='query']");
  });

  it('should include parent context up to anchor node', () => {
    const methodNode: ASTNodeLike = {
      type: 'MethodDefinition',
      key: { name: 'getUser' },
    };

    const callNode: ASTNodeLike = {
      type: 'CallExpression',
      callee: { name: 'eval' },
      parent: methodNode,
    };

    expect(buildASTSelector(callNode)).toBe(
      "MethodDefinition[key.name='getUser'] CallExpression[callee.name='eval']"
    );
  });

  it('should stop at function anchors', () => {
    const funcNode: ASTNodeLike = {
      type: 'FunctionDeclaration',
      id: { name: 'processData' },
    };

    const callNode: ASTNodeLike = {
      type: 'CallExpression',
      callee: { name: 'eval' },
      parent: funcNode,
    };

    expect(buildASTSelector(callNode)).toBe(
      "FunctionDeclaration[id.name='processData'] CallExpression[callee.name='eval']"
    );
  });

  it('should respect maxDepth parameter', () => {
    const grandparent: ASTNodeLike = { type: 'ClassDeclaration', id: { name: 'UserService' } };
    const parent: ASTNodeLike = { type: 'MethodDefinition', key: { name: 'getUser' }, parent: grandparent };
    const node: ASTNodeLike = { type: 'CallExpression', callee: { name: 'eval' }, parent };

    // With maxDepth=1, should only include the node itself
    expect(buildASTSelector(node, 1)).toBe("CallExpression[callee.name='eval']");
  });
});

// ============================================================================
// FORMAT MESSAGE OUTPUT
// ============================================================================

describe('formatMessageNextGen - Output Formats', () => {
  beforeEach(() => {
    resetGlobalAIConfig();
  });

  describe('CLI Mode (Human Readable)', () => {
    it('should output emoji + prose for humans', () => {
      const context: RuleContextLike = { settings: { 'interlace/ai-mode': 'CLI' } };
      const output = formatMessageNextGen(mockOptions, context);

      expect(output).toContain('🔒');
      expect(output).toContain('CWE-89');
      expect(output).toContain('SQL Injection detected');
      expect(output).toContain('Fix: Use parameterized queries');
      expect(output).not.toContain('AI_HINT');
      expect(output).not.toContain('{');
    });
  });

  describe('AGENT_JSON Mode (Structured JSON)', () => {
    it('should output structured JSON for agents', () => {
      const context: RuleContextLike = { settings: { 'interlace/ai-mode': 'AGENT_JSON' } };
      const output = formatMessageNextGen(mockOptions, context);

      expect(output.startsWith('{')).toBe(true);
      const parsed = JSON.parse(output);

      expect(parsed.ruleId).toBe('CWE-89');
      expect(parsed.severity).toBe('CRITICAL');
      expect(parsed.astTarget).toBe("CallExpression[callee.name='query']");
      expect(parsed.hints).toEqual(['Check for template literals', 'Use bind parameters']);
    });

    it('should output compressed JSON when compression is enabled', () => {
      const context: RuleContextLike = {
        settings: {
          'interlace/ai-mode': 'AGENT_JSON',
          'interlace/compression': true,
        },
      };

      const output = formatMessageNextGen(mockOptions, context);
      const parsed = JSON.parse(output);

      // Compressed uses short keys
      expect(parsed.id).toBe('CWE-89');
      expect(parsed.desc).toBe('SQL Injection detected');
      expect(parsed.s).toBeDefined(); // CVSS score
      expect(parsed.ruleId).toBeUndefined(); // Full key not present
    });
  });

  describe('IDE_CURSOR Mode (Hybrid)', () => {
    it('should output human text with hidden AI hints', () => {
      const context: RuleContextLike = { settings: { 'interlace/ai-mode': 'IDE_CURSOR' } };
      const output = formatMessageNextGen(mockOptions, context);

      // Human readable part
      expect(output).toContain('🔒');
      expect(output).toContain('SQL Injection detected');

      // Hidden AI hint (visible to LLM, invisible to human)
      expect(output).toContain('<!-- AI_HINT:');
      expect(output).toContain("Target: CallExpression[callee.name='query']");
      expect(output).toContain('Check for template literals');
    });
  });
});

// ============================================================================
// LEGACY API TESTS
// ============================================================================

describe('Legacy API (Backward Compatibility)', () => {
  beforeEach(() => {
    resetGlobalAIConfig();
  });

  it('should still work with setAIMessagingMode', () => {
    setAIMessagingMode('AGENT_JSON');
    const output = formatLLMMessageNextGen(mockOptions);

    expect(output.startsWith('{')).toBe(true);
  });

  it('should still work with setTokenCompression', () => {
    setAIMessagingMode('AGENT_JSON');
    setTokenCompression(true);
    const output = formatLLMMessageNextGen(mockOptions);

    const parsed = JSON.parse(output);
    expect(parsed.id).toBe('CWE-89'); // Compressed key
  });
});

// ============================================================================
// COMPRESSION RESOLUTION
// ============================================================================

describe('resolveCompression', () => {
  beforeEach(() => {
    resetGlobalAIConfig();
  });

  it('should default to false', () => {
    expect(resolveCompression()).toBe(false);
    expect(resolveCompression({})).toBe(false);
  });

  it('should use explicit setting when provided', () => {
    const context: RuleContextLike = {
      settings: { 'interlace/compression': true },
    };
    expect(resolveCompression(context)).toBe(true);
  });
});
