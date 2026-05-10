/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */
/**
 * Constants and mappings for LLM message formatting
 *
 * Contains all static data, severity mappings, CWE definitions, and icon constants
 */
import type { Severity, OWASP2025Category, OWASP2021Category, OWASPCategory, OWASPServerlessCategory, ComplianceFramework } from './types';
/**
 * CVSS 3.1 Score mapping per NIST guidelines
 * @see https://nvd.nist.gov/vuln-metrics/cvss
 */
export declare const CVSS_RANGES: Record<Severity, {
    min: number;
    max: number;
    label: string;
}>;
/**
 * Convert severity to representative CVSS score
 */
export declare function severityToCVSS(severity: Severity): number;
/**
 * OWASP Top 10 2025 Categories (Latest)
 * @see https://owasp.org/Top10/2025/
 *
 * Key changes from 2021:
 * - A03: NEW "Software Supply Chain Failures" (consolidates A06:2021 + A08:2021)
 * - A10: NEW "Mishandling of Exceptional Conditions" (replaces SSRF)
 * - Categories reordered based on 2025 threat landscape
 */
/**
 * OWASP 2025 category details (PRIMARY)
 *
 * NOTE: OWASP Top 10 2025 URLs use a projected format. If links are broken,
 * the system falls back to equivalent 2021 categories via OWASP_2021_TO_2025 mapping.
 * Monitor https://owasp.org/Top10/ for official 2025 release URLs.
 */
export declare const OWASP_2025_DETAILS: Record<OWASP2025Category, {
    name: string;
    description: string;
    link: string;
    fallbackLink?: string;
}>;
/**
 * OWASP 2021 category details (legacy support)
 */
export declare const OWASP_2021_DETAILS: Record<OWASP2021Category, {
    name: string;
    description: string;
    link: string;
}>;
/**
 * OWASP Serverless Top 10 (SAS) category details
 * @see https://owasp.org/www-project-serverless-top-10/
 */
export declare const OWASP_SERVERLESS_DETAILS: Record<OWASPServerlessCategory, {
    name: string;
    description: string;
    link: string;
}>;
/**
 * Combined OWASP details (2025 + 2021 + Serverless)
 */
export declare const OWASP_DETAILS: Record<OWASPCategory, {
    name: string;
    description: string;
    link: string;
}>;
/**
 * Maps 2021 categories to 2025 equivalents
 */
export declare const OWASP_2021_TO_2025: Record<OWASP2021Category, OWASP2025Category>;
/**
 * Maps common CWE IDs to OWASP 2025 categories and typical CVSS scores
 * This enables automatic enrichment of security rules
 *
 * @see https://owasp.org/Top10/2025/
 */
export declare const CWE_MAPPING: Record<string, {
    owasp: OWASPCategory;
    cvss: number;
    severity: Severity;
    name: string;
}>;
/**
 * Maps CWE categories to relevant compliance frameworks
 */
export declare const CWE_COMPLIANCE_MAPPING: Record<string, ComplianceFramework[]>;
/**
 * Common icon constants for consistency
 */
export declare const MessageIcons: {
    /** Security issues */
    readonly SECURITY: "🔒";
    /** Warnings */
    readonly WARNING: "⚠️";
    /** Package/dependency issues */
    readonly PACKAGE: "📦";
    /** Development practices */
    readonly DEVELOPMENT: "🔧";
    /** Performance issues */
    readonly PERFORMANCE: "⚡";
    /** Accessibility issues */
    readonly ACCESSIBILITY: "♿";
    /** Code quality */
    readonly QUALITY: "📚";
    /** Architecture issues */
    readonly ARCHITECTURE: "🏗️";
    /** Migration/refactoring */
    readonly MIGRATION: "🔄";
    /** Deprecation */
    readonly DEPRECATION: "❌";
    /** Domain/DDD */
    readonly DOMAIN: "📖";
    /** Complexity */
    readonly COMPLEXITY: "🧠";
    /** Duplication */
    readonly DUPLICATION: "📋";
    /** Information/suggestions */
    readonly INFO: "ℹ️";
    /** Success/fix applied */
    readonly SUCCESS: "✅";
    /** Strategy/approach */
    readonly STRATEGY: "🎯";
    /** Authentication */
    readonly AUTH: "🔐";
    /** Data protection */
    readonly DATA: "🛡️";
    /** Compliance */
    readonly COMPLIANCE: "📋";
};
