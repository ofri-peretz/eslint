"use strict";
/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatSecurityMessage = formatSecurityMessage;
exports.formatCodeQualityMessage = formatCodeQualityMessage;
exports.formatPerformanceMessage = formatPerformanceMessage;
const constants_1 = require("./constants");
// ============================================================================
// SHARED UTILITIES
// ============================================================================
/** Icons for each category */
const CATEGORY_ICONS = {
    security: '🔒',
    'circular-dependency': '🔄',
    'unused-import': '🧹',
    'barrel-file': '📦',
    'dependency-boundary': '🚧',
    'import-order': '📋',
    'naming-convention': '✏️',
    'dead-code': '💀',
    performance: '⚡',
};
/**
 * Compact-mode severity strings. Measured against `tiktoken` o200k_base:
 *   CRITICAL → CRIT  saves 0 tokens (both 2)
 *   MEDIUM   → MED   saves 1 token  (2 → 1)
 *   HIGH/LOW/INFO    already 1 token
 * The abbreviations are kept primarily for visual width consistency in
 * compact mode, not for measurable token savings.
 */
const SEVERITY_SHORT = {
    CRITICAL: 'CRIT',
    HIGH: 'HIGH',
    MEDIUM: 'MED',
    LOW: 'LOW',
    INFO: 'INFO',
};
/**
 * Renders the optional `why` line.
 */
function renderWhy(why) {
    return why ? `\n   Why: ${why}` : '';
}
/**
 * Renders the optional vulnerable/safe code examples.
 */
function renderExamples(vulnerable, safe) {
    const parts = [];
    if (vulnerable)
        parts.push(`   ✗ ${vulnerable}`);
    if (safe)
        parts.push(`   ✓ ${safe}`);
    return parts.length > 0 ? '\n' + parts.join('\n') : '';
}
/**
 * Renders inline examples for compact mode (same line as fix).
 */
function renderInlineExamples(vulnerable, safe) {
    const parts = [];
    if (vulnerable)
        parts.push(`✗ ${vulnerable}`);
    if (safe)
        parts.push(`✓ ${safe}`);
    return parts.length > 0 ? ' | ' + parts.join(' ') : '';
}
/**
 * Renders the optional docs link suffix.
 */
function renderDocs(docs) {
    return docs ? ` | ${docs}` : '';
}
// ============================================================================
// SECURITY FORMATTER
// ============================================================================
/**
 * Auto-enriches security options with CWE benchmark data.
 */
function enrichSecurity(options) {
    if (!options.cwe)
        return options;
    const cweData = constants_1.CWE_MAPPING[options.cwe];
    if (!cweData)
        return options;
    return {
        ...options,
        owasp: options.owasp ?? cweData.owasp,
        cvss: options.cvss ?? cweData.cvss,
        compliance: options.compliance ?? constants_1.CWE_COMPLIANCE_MAPPING[options.cwe],
    };
}
/**
 * Builds the standards reference string (CWE, OWASP, CVSS).
 */
function buildStandards(cwe, owasp, cvss) {
    const parts = [];
    if (cwe)
        parts.push(cwe);
    if (owasp) {
        const owaspCode = owasp.split(':')[0];
        const owaspDetails = constants_1.OWASP_DETAILS[owasp];
        const owaspName = owaspDetails?.name?.split(' ')[0] || '';
        parts.push(`OWASP:${owaspCode}-${owaspName}`);
    }
    if (cvss !== undefined)
        parts.push(`CVSS:${cvss}`);
    return parts.length > 0 ? `${parts.join(' ')} | ` : '';
}
/**
 * Builds compact standards (CWE + CVSS only). Drops OWASP and compliance,
 * which together cost ~27 tokens in a typical SQLi rule (measured with
 * `tiktoken` o200k_base). LLMs already know what `CWE-89` means; the
 * spelled-out `OWASP:A05-Injection [SOC2,PCI-DSS,HIPAA,ISO27001]` block
 * is GRC-dashboard ergonomics, not agent fuel.
 */
function buildCompactStandards(cwe, cvss) {
    const parts = [];
    if (cwe)
        parts.push(cwe);
    if (cvss !== undefined)
        parts.push(`${cvss}`);
    return parts.length > 0 ? `${parts.join(' ')} ` : '';
}
/**
 * Builds the compliance tag string.
 */
function buildCompliance(compliance) {
    return compliance && compliance.length > 0
        ? ` [${compliance.slice(0, 4).join(',')}]`
        : '';
}
/**
 * Formats a security-focused rule message.
 *
 * Supports three output modes:
 * - `'human'` (default): Rich multi-line with OWASP, compliance, examples
 * - `'compact'`: Token-optimized two-line (CWE+CVSS, inline examples)
 * - `'agent'`: Minified JSON with self-describing keys
 *
 * Tokens measured with `tiktoken` o200k_base on the example below:
 * human=120, compact=65, agent=72. (V1 baseline for the same content
 * minus `why`/`vulnerable`/`safe`: 69 tokens.)
 *
 * @example
 * ```typescript
 * // Human mode (~120 tokens)
 * formatSecurityMessage({
 *   cwe: 'CWE-89', severity: 'CRITICAL',
 *   description: 'SQL injection via string concatenation',
 *   why: 'Attackers can modify the query structure',
 *   vulnerable: "db.query('SELECT...' + userId)",
 *   safe: "db.query('SELECT...$1', [userId])",
 *   fix: 'Use parameterized queries ($1, $2)',
 *   docs: 'https://node-postgres.com/...',
 * });
 *
 * // Compact mode (~65 tokens — actually cheaper than V1)
 * formatSecurityMessage({ ...same... }, 'compact');
 *
 * // Agent mode (~72 tokens)
 * formatSecurityMessage({ ...same... }, 'agent');
 * ```
 */
function formatSecurityMessage(options, mode = 'human') {
    const enriched = enrichSecurity(options);
    if (mode === 'agent') {
        return securityToAgentJSON(enriched);
    }
    if (mode === 'compact') {
        return securityToCompact(enriched);
    }
    return securityToHuman(enriched);
}
/** Human mode: rich, multi-line */
function securityToHuman(enriched) {
    const { cwe, owasp, cvss, compliance, description, severity, fix, docs, why, vulnerable, safe } = enriched;
    const icon = CATEGORY_ICONS['security'];
    const standardsPart = buildStandards(cwe, owasp, cvss);
    const compliancePart = buildCompliance(compliance);
    const line1 = `${icon} ${standardsPart}${description} | ${severity}${compliancePart}`;
    const whyLine = renderWhy(why);
    const fixLine = `\n   Fix: ${fix}${renderDocs(docs)}`;
    const examples = renderExamples(vulnerable, safe);
    return `${line1}${whyLine}${fixLine}${examples}`;
}
/**
 * Compact mode: token-optimized two-line.
 * Drops OWASP display, drops compliance tags, inlines examples.
 * Target: ~45 tokens (vs 72 for v1, 124 for full v2).
 */
function securityToCompact(enriched) {
    const { cwe, cvss, description, severity, fix, vulnerable, safe } = enriched;
    const sev = SEVERITY_SHORT[severity] || severity;
    const std = buildCompactStandards(cwe, cvss);
    const examples = renderInlineExamples(vulnerable, safe);
    return `${std}${description} | ${sev}\n   Fix: ${fix}${examples}`;
}
/**
 * Agent mode: minified JSON with self-describing keys.
 * Schema: { id, cvss, description, fix, bad?, good? }
 *
 * Measured with `tiktoken` o200k_base on a realistic SQLi payload, full
 * keys cost only +1 token vs single-letter abbreviations (72 → 73). The
 * interpretability win for cold-start agents (no system-prompt key
 * dictionary) is worth that token.
 */
function securityToAgentJSON(enriched) {
    const obj = {
        id: enriched.cwe,
        cvss: enriched.cvss ?? (0, constants_1.severityToCVSS)(enriched.severity),
        description: enriched.description,
        fix: enriched.fix,
    };
    if (enriched.vulnerable)
        obj['bad'] = enriched.vulnerable;
    if (enriched.safe)
        obj['good'] = enriched.safe;
    return JSON.stringify(obj);
}
// ============================================================================
// CODE QUALITY FORMATTER
// ============================================================================
/**
 * Formats a code quality / structural rule message.
 *
 * No CWE/OWASP/CVSS — these are architecture concerns, not vulnerabilities.
 * Supports cycle path rendering for circular dependency rules.
 *
 * @example
 * ```typescript
 * formatCodeQualityMessage({
 *   category: 'circular-dependency',
 *   severity: 'WARNING',
 *   description: 'Circular import detected: A → B → C → A',
 *   why: 'Circular imports cause undefined values at import time',
 *   cycle: ['src/A.ts', 'src/B.ts', 'src/C.ts', 'src/A.ts'],
 *   fix: 'Extract shared types to a separate module',
 * });
 * ```
 */
function formatCodeQualityMessage(options, mode = 'human') {
    if (mode === 'agent') {
        return codeQualityToAgentJSON(options);
    }
    if (mode === 'compact') {
        return codeQualityToCompact(options);
    }
    return codeQualityToHuman(options);
}
/** Human mode: rich output with cycle path */
function codeQualityToHuman(options) {
    const { category, description, severity, fix, docs, why, cycle, vulnerable, safe } = options;
    const icon = CATEGORY_ICONS[category] || '📐';
    const line1 = `${icon} ${description} | ${severity}`;
    const whyLine = renderWhy(why);
    const fixLine = `\n   Fix: ${fix}${renderDocs(docs)}`;
    const examples = renderExamples(vulnerable, safe);
    const cycleLine = cycle && cycle.length > 0
        ? `\n   Cycle: ${cycle.join(' → ')}`
        : '';
    return `${line1}${whyLine}${fixLine}${examples}${cycleLine}`;
}
/** Compact mode: inlined examples, abbreviated severity */
function codeQualityToCompact(options) {
    const { description, severity, fix, vulnerable, safe, cycle } = options;
    const sev = SEVERITY_SHORT[severity] || severity;
    const examples = renderInlineExamples(vulnerable, safe);
    const cycleSuffix = cycle && cycle.length > 0
        ? ` [${cycle.map(f => f.split('/').pop()).join('→')}]`
        : '';
    return `${description} | ${sev}\n   Fix: ${fix}${examples}${cycleSuffix}`;
}
/**
 * Agent mode: compact JSON with self-describing keys.
 * Schema: { category, description, fix, cycle?, bad?, good? }
 * Measured: full keys cost 0 extra tokens vs `cat/d/f/cy/b/g` (both 70).
 */
function codeQualityToAgentJSON(options) {
    const obj = {
        category: options.category,
        description: options.description,
        fix: options.fix,
    };
    if (options.cycle)
        obj['cycle'] = options.cycle;
    if (options.vulnerable)
        obj['bad'] = options.vulnerable;
    if (options.safe)
        obj['good'] = options.safe;
    return JSON.stringify(obj);
}
// ============================================================================
// PERFORMANCE FORMATTER
// ============================================================================
/**
 * Formats a performance-focused rule message.
 *
 * Uses complexity metrics instead of security metadata.
 *
 * @example
 * ```typescript
 * formatPerformanceMessage({
 *   severity: 'MEDIUM',
 *   description: 'Loop-based INSERT detected — O(n) database calls',
 *   why: 'Each iteration opens a new round-trip, causing N×latency',
 *   vulnerable: 'for (const row of rows) { await db.query("INSERT...", row); }',
 *   safe: 'await db.query("INSERT INTO t VALUES " + values.join(","), flat)',
 *   impact: { current: 'O(n) queries', optimized: 'O(1) query' },
 *   fix: 'Use bulk INSERT with a single VALUES clause',
 * });
 * ```
 */
function formatPerformanceMessage(options, mode = 'human') {
    if (mode === 'agent') {
        return performanceToAgentJSON(options);
    }
    if (mode === 'compact') {
        return performanceToCompact(options);
    }
    return performanceToHuman(options);
}
/** Human mode: rich with impact metrics */
function performanceToHuman(options) {
    const { description, severity, fix, docs, why, vulnerable, safe, impact } = options;
    const icon = CATEGORY_ICONS['performance'];
    const line1 = `${icon} ${description} | ${severity}`;
    const whyLine = renderWhy(why);
    const fixLine = `\n   Fix: ${fix}${renderDocs(docs)}`;
    const impactLine = impact
        ? `\n   Impact: ${impact.current} → ${impact.optimized}`
        : '';
    const examples = renderExamples(vulnerable, safe);
    return `${line1}${whyLine}${fixLine}${impactLine}${examples}`;
}
/** Compact mode: inline impact and examples */
function performanceToCompact(options) {
    const { description, severity, fix, vulnerable, safe, impact } = options;
    const sev = SEVERITY_SHORT[severity] || severity;
    const impactSuffix = impact ? ` (${impact.current}→${impact.optimized})` : '';
    const examples = renderInlineExamples(vulnerable, safe);
    return `${description} | ${sev}${impactSuffix}\n   Fix: ${fix}${examples}`;
}
/**
 * Agent mode: compact JSON with self-describing keys.
 * Schema: { description, fix, impact?: { current, optimized }, bad?, good? }
 * Measured: full keys cost 0 extra tokens vs `d/f/imp{c,o}/b/g` (both 75).
 */
function performanceToAgentJSON(options) {
    const obj = {
        description: options.description,
        fix: options.fix,
    };
    if (options.impact)
        obj['impact'] = { current: options.impact.current, optimized: options.impact.optimized };
    if (options.vulnerable)
        obj['bad'] = options.vulnerable;
    if (options.safe)
        obj['good'] = options.safe;
    return JSON.stringify(obj);
}
