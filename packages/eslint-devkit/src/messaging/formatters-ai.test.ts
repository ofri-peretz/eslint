import { describe, it, expect, beforeEach } from 'vitest';
import {
  formatLLMMessageNextGen,
  formatAgentMessage,
} from './formatters-ai';
import {
  setAIMessagingMode,
  setTokenCompression,
  resetGlobalAIConfig,
} from './config';
import type { AgentMessageOptions } from './types';

describe('AI-Native Messaging (Next-Gen)', () => {
  const mockOptions: AgentMessageOptions = {
    icon: '🔒',
    issueName: 'SQL Injection',
    cwe: 'CWE-89',
    description: 'SQL Injection detected',
    severity: 'CRITICAL',
    fix: 'Use parameterized queries',
    documentationLink: 'https://owasp.org/sql-injection',
    astSelector: "CallExpression[callee.name='query']",
    aiHints: ['Check for template literals in query string'],
  };

  beforeEach(() => {
    resetGlobalAIConfig();
  });

  describe('formatAgentMessage', () => {
    it('should output verbose JSON by default', () => {
      const output = formatAgentMessage(mockOptions);
      const parsed = JSON.parse(output);

      expect(parsed.ruleId).toBe('CWE-89');
      expect(parsed.severity).toBe('CRITICAL');
      expect(parsed.astTarget).toBe("CallExpression[callee.name='query']");
    });

    it('should output compressed JSON when enabled', () => {
      setTokenCompression(true);
      const output = formatAgentMessage(mockOptions);
      const parsed = JSON.parse(output);

      expect(parsed.id).toBe('CWE-89');
      expect(parsed.desc).toBe('SQL Injection detected');
      expect(parsed.s).toBeDefined();
    });
  });

  describe('formatLLMMessageNextGen (Mode Switching)', () => {
    it('should return human text in CLI mode (default)', () => {
      const output = formatLLMMessageNextGen(mockOptions);
      expect(output).toContain('🔒 CWE-89');
      expect(output).not.toContain('<!-- AI_HINT');
    });

    it('should return JSON in AGENT_JSON mode', () => {
      setAIMessagingMode('AGENT_JSON');
      const output = formatLLMMessageNextGen(mockOptions);
      expect(output.startsWith('{')).toBe(true);
    });

    it('should return Hybrid text in IDE_CURSOR mode', () => {
      setAIMessagingMode('IDE_CURSOR');
      const output = formatLLMMessageNextGen(mockOptions);
      
      expect(output).toContain('🔒 CWE-89'); // Human readable
      expect(output).toContain('<!-- AI_HINT: Target: CallExpression'); // Hidden AI hint
    });
  });
});
