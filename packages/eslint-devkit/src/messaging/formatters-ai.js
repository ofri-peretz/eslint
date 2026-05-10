"use strict";
/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildASTSelector = buildASTSelector;
exports.formatAgentMessage = formatAgentMessage;
exports.formatMessageNextGen = formatMessageNextGen;
exports.formatLLMMessageNextGen = formatLLMMessageNextGen;
const constants_1 = require("./constants");
const config_1 = require("./config");
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
function buildASTSelector(node, maxDepth = 3) {
    const parts = [];
    let current = node;
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
function buildNodeSelector(node) {
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
function isAnchorNode(type) {
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
function enrichFromCWE(options) {
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
// ============================================================================
// FORMATTERS
// ============================================================================
/**
 * Formats a message as structured JSON for AI Agents
 * Minimizes token usage while retaining strict semantic targeting
 */
function formatAgentMessage(options, compress = false) {
    const enriched = enrichFromCWE(options);
    // Compressed keys if enabled (Token Economy)
    if (compress) {
        return JSON.stringify({
            id: enriched.cwe ?? enriched.ruleId,
            s: (0, constants_1.severityToCVSS)(enriched.severity),
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
function formatHumanMessage(options, includeHints = false) {
    const enriched = enrichFromCWE(options);
    const { icon, cwe, description, severity, fix, documentationLink } = enriched;
    const owasp = enriched.owasp;
    const cvss = enriched.cvss;
    const compliance = enriched.compliance;
    // Build standards reference string
    const standards = [];
    if (cwe)
        standards.push(cwe);
    if (owasp) {
        const owaspCode = owasp.split(':')[0];
        const owaspDetails = constants_1.OWASP_DETAILS[owasp];
        const owaspName = owaspDetails?.name?.split(' ')[0] || '';
        standards.push(`OWASP:${owaspCode}-${owaspName}`);
    }
    if (cvss !== undefined)
        standards.push(`CVSS:${cvss}`);
    const standardsPart = standards.length > 0 ? `${standards.join(' ')} | ` : '';
    const compliancePart = compliance && compliance.length > 0
        ? ` [${compliance.slice(0, 4).join(',')}]`
        : '';
    const firstLine = `${icon} ${standardsPart}${description} | ${severity}${compliancePart}`;
    let secondLine = `   Fix: ${fix} | ${documentationLink}`;
    // Inject hidden AI hints for Cursor/Copilot (Hybrid Mode)
    if (includeHints) {
        const agentOptions = options;
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
function formatMessageNextGen(options, context) {
    const mode = (0, config_1.resolveAIMode)(context);
    const compress = (0, config_1.resolveCompression)(context);
    switch (mode) {
        case 'AGENT_JSON':
            return formatAgentMessage(options, compress);
        case 'IDE_CURSOR':
            return formatHumanMessage(options, true);
        case 'CI':
        case 'CLI':
        default:
            return formatHumanMessage(options, false);
    }
}
// ============================================================================
// LEGACY API (Backward compatibility)
// ============================================================================
/**
 * @deprecated Use formatMessageNextGen(options, context) instead
 * Legacy formatter that uses global state instead of context
 */
function formatLLMMessageNextGen(options) {
    const mode = (0, config_1.getAIMessagingMode)();
    const compress = (0, config_1.isTokenCompressionEnabled)();
    if (mode === 'AGENT_JSON') {
        return formatAgentMessage(options, compress);
    }
    return formatHumanMessage(options, mode === 'IDE_CURSOR');
}
