/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * AI-Native Runtime functions for LLM message formatting (Next-Gen)
 *
 * Contains the "Dual-Hertz" formatting engine for Agentic workflows
 * This module provides context-aware message formatting that automatically
 * routes between Human (CLI), Agent (JSON), and Hybrid (Cursor) modes.
 */

import type {
  Severity,
  LLMMessageOptions,
  EnterpriseMessageOptions,
  AgentMessageOptions,
} from './types';
import {
  CWE_MAPPING,
  CWE_COMPLIANCE_MAPPING,
  OWASP_DETAILS,
  severityToCVSS,
} from './constants';
import {
  resolveAIMode,
  resolveCompression,
  getAIMessagingMode,
  isTokenCompressionEnabled,
  type RuleContextLike,
} from './config';

// ============================================================================
// AST SELECTOR BUILDER
// ============================================================================

/**
 * Node-like interface for AST selector building
 * Compatible with TSESTree nodes
 */
export interface ASTNodeLike {
  type: string;
  parent?: ASTNodeLike;
  callee?: { name?: string; property?: { name?: string } };
  key?: { name?: string };
  id?: { name?: string };
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
export function buildASTSelector(node: ASTNodeLike, maxDepth = 3): string {
  const parts: string[] = [];
  let current: ASTNodeLike | undefined = node;
  let depth = 0;

  while (current && depth < maxDepth) {
    const selector = buildNodeSelector(current);
    if (selector) {
      parts.unshift(selector);
    }

    // Stop at anchor nodes (stable reference points)
    if (isAnchorNode(current.type)) {
      break;
    }

    current = current.parent;
    depth++;
  }

  return parts.join(' ');
}

/**
 * Builds a selector for a single node
 */
function buildNodeSelector(node: ASTNodeLike): string | null {
  switch (node.type) {
    case 'CallExpression':
      if (node.callee?.name) {
        return `CallExpression[callee.name='${node.callee.name}']`;
      }
      if (node.callee?.property?.name) {
        return `CallExpression[callee.property.name='${node.callee.property.name}']`;
      }
      return 'CallExpression';

    case 'MethodDefinition':
      if (node.key?.name) {
        return `MethodDefinition[key.name='${node.key.name}']`;
      }
      return 'MethodDefinition';

    case 'FunctionDeclaration':
      if (node.id?.name) {
        return `FunctionDeclaration[id.name='${node.id.name}']`;
      }
      return 'FunctionDeclaration';

    case 'ClassDeclaration':
      if (node.id?.name) {
        return `ClassDeclaration[id.name='${node.id.name}']`;
      }
      return 'ClassDeclaration';

    case 'VariableDeclarator':
      if (node.id?.name) {
        return `VariableDeclarator[id.name='${node.id.name}']`;
      }
      return 'VariableDeclarator';

    case 'MemberExpression':
      return 'MemberExpression';

    case 'Identifier':
      if (node.name) {
        return `Identifier[name='${node.name}']`;
      }
      return 'Identifier';

    default:
      return node.type;
  }
}

/**
 * Checks if a node type is an "anchor" (stable reference point)
 */
function isAnchorNode(type: string): boolean {
  return [
    'FunctionDeclaration',
    'FunctionExpression',
    'ArrowFunctionExpression',
    'MethodDefinition',
    'ClassDeclaration',
    'ClassExpression',
    'Program',
  ].includes(type);
}

// ============================================================================
// CWE ENRICHMENT
// ============================================================================

/**
 * Auto-enriches options with security benchmark data based on CWE
 */
function enrichFromCWE(
  options: EnterpriseMessageOptions,
): EnterpriseMessageOptions {
  if (!options.cwe) return options;

  const cweData = CWE_MAPPING[options.cwe];
  if (!cweData) return options;

  return {
    ...options,
    owasp: options.owasp ?? cweData.owasp,
    cvss: options.cvss ?? cweData.cvss,
    compliance: options.compliance ?? CWE_COMPLIANCE_MAPPING[options.cwe],
  };
}

// ============================================================================
// FORMATTERS
// ============================================================================

/**
 * Formats a message as structured JSON for AI Agents
 * Minimizes token usage while retaining strict semantic targeting
 */
export function formatAgentMessage(
  options: AgentMessageOptions,
  compress = false,
): string {
  const enriched = enrichFromCWE(options);

  // Compressed keys if enabled (Token Economy)
  if (compress) {
    return JSON.stringify({
      id: enriched.cwe ?? enriched.ruleId,
      s: severityToCVSS(enriched.severity as Severity),
      desc: enriched.description,
      fix: enriched.fix,
      ast: options.astSelector,
      refs: [enriched.documentationLink],
    });
  }

  // Verbose structured JSON (Standard Agent Schema)
  return JSON.stringify({
    ruleId: enriched.ruleId ?? enriched.cwe,
    severity: enriched.severity,
    description: enriched.description,
    fixInstruction: enriched.fix,
    astTarget: options.astSelector,
    hints: options.aiHints,
    benchmarks: {
      cwe: enriched.cwe,
      owasp: enriched.owasp,
      cvss: enriched.cvss,
    },
    documentation: enriched.documentationLink,
  });
}

/**
 * Formats a human-readable message with optional hidden AI hints
 */
function formatHumanMessage(
  options: EnterpriseMessageOptions,
  includeHints = false,
): string {
  const enriched = enrichFromCWE(options);
  const { icon, cwe, description, severity, fix, documentationLink } = enriched;
  const owasp = enriched.owasp;
  const cvss = enriched.cvss;
  const compliance = enriched.compliance;

  // Build standards reference string
  const standards: string[] = [];
  if (cwe) standards.push(cwe);
  if (owasp) {
    const owaspCode = owasp.split(':')[0];
    const owaspDetails = OWASP_DETAILS[owasp];
    const owaspName = owaspDetails?.name?.split(' ')[0] || '';
    standards.push(`OWASP:${owaspCode}-${owaspName}`);
  }
  if (cvss !== undefined) standards.push(`CVSS:${cvss}`);

  const standardsPart = standards.length > 0 ? `${standards.join(' ')} | ` : '';
  const compliancePart =
    compliance && compliance.length > 0
      ? ` [${compliance.slice(0, 4).join(',')}]`
      : '';

  const firstLine = `${icon} ${standardsPart}${description} | ${severity}${compliancePart}`;
  let secondLine = `   Fix: ${fix} | ${documentationLink}`;

  // Inject hidden AI hints for Cursor/Copilot (Hybrid Mode)
  if (includeHints) {
    const agentOptions = options as AgentMessageOptions;
    if (agentOptions.astSelector || agentOptions.aiHints) {
      const hints = [
        agentOptions.astSelector ? `Target: ${agentOptions.astSelector}` : '',
        ...(agentOptions.aiHints ?? []),
      ]
        .filter(Boolean)
        .join('; ');
      secondLine += ` <!-- AI_HINT: ${hints} -->`;
    }
  }

  return `${firstLine}\n${secondLine}`;
}

// ============================================================================
// MAIN ENTRY POINT (Context-Aware)
// ============================================================================

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
export function formatMessageNextGen(
  options: LLMMessageOptions | EnterpriseMessageOptions | AgentMessageOptions,
  context?: RuleContextLike,
): string {
  const mode = resolveAIMode(context);
  const compress = resolveCompression(context);

  switch (mode) {
    case 'AGENT_JSON':
      return formatAgentMessage(options as AgentMessageOptions, compress);

    case 'IDE_CURSOR':
      return formatHumanMessage(options as EnterpriseMessageOptions, true);

    case 'CI':
    case 'CLI':
    default:
      return formatHumanMessage(options as EnterpriseMessageOptions, false);
  }
}

// ============================================================================
// LEGACY API (Backward compatibility)
// ============================================================================

/**
 * @deprecated Use formatMessageNextGen(options, context) instead
 * Legacy formatter that uses global state instead of context
 */
export function formatLLMMessageNextGen(
  options: LLMMessageOptions | EnterpriseMessageOptions | AgentMessageOptions,
): string {
  const mode = getAIMessagingMode();
  const compress = isTokenCompressionEnabled();

  if (mode === 'AGENT_JSON') {
    return formatAgentMessage(options as AgentMessageOptions, compress);
  }

  return formatHumanMessage(
    options as EnterpriseMessageOptions,
    mode === 'IDE_CURSOR',
  );
}
