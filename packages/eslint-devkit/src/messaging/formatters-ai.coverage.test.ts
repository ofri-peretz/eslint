/**
 * Coverage-focused tests for messaging/formatters-ai.ts
 *
 * NOTE: This file deliberately does NOT call vi.resetModules(), so the
 * statically imported ./config module instance is the same one that
 * formatters-ai reads its global state from. That makes the legacy
 * formatLLMMessageNextGen API testable here (it is describe.skip'd in
 * formatters-ai.test.ts because of module-cache pollution in that file).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  buildASTSelector,
  formatAgentMessage,
  formatMessageNextGen,
  formatLLMMessageNextGen,
  type ASTNodeLike,
} from './formatters-ai';
import {
  setAIMessagingMode,
  setTokenCompression,
  resetGlobalAIConfig,
} from './config';
import type {
  AgentMessageOptions,
  EnterpriseMessageOptions,
  OWASPCategory,
} from './types';

const baseOptions: EnterpriseMessageOptions = {
  icon: '🔒',
  issueName: 'SQL Injection',
  description: 'SQL Injection detected',
  severity: 'CRITICAL',
  fix: 'Use parameterized queries',
  documentationLink: 'https://owasp.org/sql-injection',
};

beforeEach(() => {
  resetGlobalAIConfig();
  vi.stubEnv('ESLINT_AI_MODE', '');
});

afterEach(() => {
  resetGlobalAIConfig();
  vi.unstubAllEnvs();
});

describe('buildASTSelector node selector fallbacks', () => {
  const node = (partial: Partial<ASTNodeLike> & { type: string }): ASTNodeLike =>
    partial as ASTNodeLike;

  it('CallExpression without callee names falls back to bare selector', () => {
    expect(buildASTSelector(node({ type: 'CallExpression', callee: {} }))).toBe(
      'CallExpression',
    );
  });

  it('CallExpression uses callee.property.name when present', () => {
    expect(
      buildASTSelector(
        node({ type: 'CallExpression', callee: { property: { name: 'query' } } }),
      ),
    ).toBe("CallExpression[callee.property.name='query']");
  });

  it('MethodDefinition with and without key name', () => {
    expect(
      buildASTSelector(node({ type: 'MethodDefinition', key: { name: 'getUser' } })),
    ).toBe("MethodDefinition[key.name='getUser']");
    expect(buildASTSelector(node({ type: 'MethodDefinition' }))).toBe(
      'MethodDefinition',
    );
  });

  it('FunctionDeclaration with and without id', () => {
    expect(
      buildASTSelector(node({ type: 'FunctionDeclaration', id: { name: 'fn' } })),
    ).toBe("FunctionDeclaration[id.name='fn']");
    expect(buildASTSelector(node({ type: 'FunctionDeclaration' }))).toBe(
      'FunctionDeclaration',
    );
  });

  it('ClassDeclaration with and without id', () => {
    expect(
      buildASTSelector(node({ type: 'ClassDeclaration', id: { name: 'Foo' } })),
    ).toBe("ClassDeclaration[id.name='Foo']");
    expect(buildASTSelector(node({ type: 'ClassDeclaration' }))).toBe(
      'ClassDeclaration',
    );
  });

  it('VariableDeclarator with and without id', () => {
    expect(
      buildASTSelector(node({ type: 'VariableDeclarator', id: { name: 'x' } })),
    ).toBe("VariableDeclarator[id.name='x']");
    expect(buildASTSelector(node({ type: 'VariableDeclarator' }))).toBe(
      'VariableDeclarator',
    );
  });

  it('MemberExpression renders a bare selector', () => {
    expect(buildASTSelector(node({ type: 'MemberExpression' }))).toBe(
      'MemberExpression',
    );
  });

  it('Identifier with and without a name', () => {
    expect(buildASTSelector(node({ type: 'Identifier', name: 'foo' }))).toBe(
      "Identifier[name='foo']",
    );
    expect(buildASTSelector(node({ type: 'Identifier' }))).toBe('Identifier');
  });

  it('unknown node types fall through to the raw type', () => {
    expect(buildASTSelector(node({ type: 'AwaitExpression' }))).toBe(
      'AwaitExpression',
    );
  });

  it('skips segments whose selector is empty (empty node type)', () => {
    expect(buildASTSelector(node({ type: '' }))).toBe('');
  });
});

describe('formatAgentMessage CWE enrichment fallbacks', () => {
  it('uses ruleId as id when no cwe is provided (compressed)', () => {
    const output = formatAgentMessage(
      { ...baseOptions, ruleId: 'my-rule' } as AgentMessageOptions,
      true,
    );
    const parsed = JSON.parse(output);
    expect(parsed.id).toBe('my-rule');
  });

  it('passes options through unchanged when cwe is unknown', () => {
    const output = formatAgentMessage({
      ...baseOptions,
      cwe: 'CWE-99999',
    } as AgentMessageOptions);
    const parsed = JSON.parse(output);
    expect(parsed.benchmarks.cwe).toBe('CWE-99999');
    expect(parsed.benchmarks.owasp).toBeUndefined();
  });
});

describe('formatMessageNextGen human-mode variants', () => {
  const cursorContext = {
    settings: { 'interlace/ai-mode': 'IDE_CURSOR' as const },
  };
  const ciContext = { settings: { 'interlace/ai-mode': 'CI' as const } };

  it('CI mode renders human output without AI hints', () => {
    const output = formatMessageNextGen(
      { ...baseOptions, astSelector: 'CallExpression' } as AgentMessageOptions,
      ciContext,
    );
    expect(output).toContain('SQL Injection detected');
    expect(output).not.toContain('AI_HINT');
  });

  it('renders no standards prefix when cwe/owasp/cvss are all absent', () => {
    const output = formatMessageNextGen(baseOptions, ciContext);
    expect(output.startsWith('🔒 SQL Injection detected | CRITICAL')).toBe(true);
  });

  it('renders an empty OWASP name for an unknown OWASP category', () => {
    const output = formatMessageNextGen(
      { ...baseOptions, owasp: 'A99:2021' as OWASPCategory },
      ciContext,
    );
    expect(output).toContain('OWASP:A99-');
  });

  it('omits compliance tags for an empty compliance array', () => {
    const output = formatMessageNextGen(
      { ...baseOptions, compliance: [] },
      ciContext,
    );
    expect(output).not.toContain('[');
  });

  it('IDE_CURSOR mode injects hints from aiHints alone (no astSelector)', () => {
    const output = formatMessageNextGen(
      { ...baseOptions, aiHints: ['Prefer bind params'] } as AgentMessageOptions,
      cursorContext,
    );
    expect(output).toContain('<!-- AI_HINT: Prefer bind params -->');
    expect(output).not.toContain('Target:');
  });

  it('IDE_CURSOR mode injects the Target hint from astSelector alone', () => {
    const output = formatMessageNextGen(
      { ...baseOptions, astSelector: 'CallExpression' } as AgentMessageOptions,
      cursorContext,
    );
    expect(output).toContain('<!-- AI_HINT: Target: CallExpression -->');
  });

  it('IDE_CURSOR mode omits the hint comment when no hints exist', () => {
    const output = formatMessageNextGen(baseOptions, cursorContext);
    expect(output).not.toContain('AI_HINT');
  });
});

describe('formatLLMMessageNextGen (legacy global-state API)', () => {
  it('renders agent JSON in AGENT_JSON mode', () => {
    setAIMessagingMode('AGENT_JSON');
    const output = formatLLMMessageNextGen({
      ...baseOptions,
      cwe: 'CWE-89',
    } as AgentMessageOptions);
    const parsed = JSON.parse(output);
    expect(parsed.ruleId).toBe('CWE-89');
    expect(parsed.severity).toBe('CRITICAL');
  });

  it('renders compressed agent JSON when compression is enabled', () => {
    setAIMessagingMode('AGENT_JSON');
    setTokenCompression(true);
    const output = formatLLMMessageNextGen({
      ...baseOptions,
      cwe: 'CWE-89',
    } as AgentMessageOptions);
    const parsed = JSON.parse(output);
    expect(parsed.id).toBe('CWE-89'); // compressed key
    expect(parsed.desc).toBe('SQL Injection detected');
  });

  it('renders human output with hints in IDE_CURSOR mode', () => {
    setAIMessagingMode('IDE_CURSOR');
    const output = formatLLMMessageNextGen({
      ...baseOptions,
      astSelector: 'CallExpression',
    } as AgentMessageOptions);
    expect(output).toContain('SQL Injection detected');
    expect(output).toContain('<!-- AI_HINT: Target: CallExpression -->');
  });

  it('renders plain human output in CLI mode', () => {
    setAIMessagingMode('CLI');
    const output = formatLLMMessageNextGen({
      ...baseOptions,
      astSelector: 'CallExpression',
    } as AgentMessageOptions);
    expect(output).toContain('SQL Injection detected');
    expect(output).not.toContain('AI_HINT');
  });
});
