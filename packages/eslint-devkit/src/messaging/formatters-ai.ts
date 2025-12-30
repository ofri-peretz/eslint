/**
 * AI-Native Runtime functions for LLM message formatting (Next-Gen)
 *
 * Contains the "Dual-Hertz" formatting engine for Agentic workflows
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
  getAIMessagingMode,
  isTokenCompressionEnabled,
} from './config';

// ============================================================================
// CORE FORMATTING FUNCTIONS (AI-NATIVE)
// ============================================================================

/**
 * Auto-enriches options with security benchmark data based on CWE
 * (Duplicated helper to keep this file standalone-ish or importable if exported)
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

/**
 * Formats a message as a compressed JSON-L string for AI Agents
 * Minimizes token usage while retaining strict semantic targeting
 */
export function formatAgentMessage(options: AgentMessageOptions): string {
  const enriched = enrichFromCWE(options);
  const compress = isTokenCompressionEnabled();

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
 * Next-Gen Message Formatter
 * Routes between Human (CLI), Agent (JSON), and Hybrid (Cursor) modes
 * @param options Full message options including agent hints
 */
export function formatLLMMessageNextGen(
  options: LLMMessageOptions | EnterpriseMessageOptions | AgentMessageOptions,
): string {
  const mode = getAIMessagingMode();

  // Route to Agent Formatter if in AGENT_JSON mode
  if (mode === 'AGENT_JSON') {
    return formatAgentMessage(options as AgentMessageOptions);
  }

  // Enrich with security benchmark data from CWE
  const enriched = enrichFromCWE(options as EnterpriseMessageOptions);
  const { icon, cwe, description, severity, fix, documentationLink } = enriched;
  const owasp = (enriched as EnterpriseMessageOptions).owasp;
  const cvss = (enriched as EnterpriseMessageOptions).cvss;
  const compliance = (enriched as EnterpriseMessageOptions).compliance;

  // Build standards reference string (labeled for LLM + human clarity)
  const standards: string[] = [];
  if (cwe) standards.push(cwe);
  if (owasp) {
    // Format: "OWASP:A05-Injection" - includes category name for clarity across years
    const owaspCode = owasp.split(':')[0]; // "A05" from "A05:2025"
    const owaspDetails = OWASP_DETAILS[owasp];
    const owaspName = owaspDetails?.name?.split(' ')[0] || ''; // First word: "Injection", "Broken", etc.
    standards.push(`OWASP:${owaspCode}-${owaspName}`);
  }
  if (cvss !== undefined) standards.push(`CVSS:${cvss}`);

  const standardsPart = standards.length > 0 ? `${standards.join(' ')} | ` : '';

  // Build compliance tags (compact)
  const compliancePart =
    compliance && compliance.length > 0
      ? ` [${compliance.slice(0, 4).join(',')}]`
      : '';

  // Line 1: Icon + Standards + Description + Severity + Compliance
  const firstLine = `${icon} ${standardsPart}${description} | ${severity}${compliancePart}`;

  // Line 2: Fix instruction + documentation link
  let secondLine = `   Fix: ${fix} | ${documentationLink}`;

  // Hybrid Mode: Inject hidden AI hints for Cursor/Copilot
  if (mode === 'IDE_CURSOR') {
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
