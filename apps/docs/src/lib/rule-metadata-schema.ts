/**
 * Rule Documentation Metadata Schema
 * 
 * This file defines the TypeScript types and constants for rule documentation
 * metadata. It serves as the single source of truth for:
 * - Plugin classification (security vs quality)
 * - Required vs conditional metadata fields
 * - Frontmatter structure
 * - Content anchor patterns
 */

// ============================================================================
// Plugin Classification
// ============================================================================

/**
 * List of plugins classified as security plugins.
 * These plugins require additional security-specific metadata (cwe, owasp, severity).
 */
export const SECURITY_PLUGINS = [
  'browser-security',
  'secure-coding',
  'jwt',
  'node-security',
  'crypto',
  'mongodb-security',
  'pg',
  'express-security',
  'nestjs-security',
  'lambda-security',
  'vercel-ai-security',
] as const;

export type SecurityPlugin = typeof SECURITY_PLUGINS[number];

/**
 * List of plugins classified as quality plugins.
 * These plugins focus on code quality and architecture patterns.
 */
export const QUALITY_PLUGINS = [
  'import-next',
  'maintainability',
  'react-a11y',
  'react-features',
  'react-performance',
  'testing',
  'typescript-patterns',
  'vitest-rules',
] as const;

export type QualityPlugin = typeof QUALITY_PLUGINS[number];

export type PluginCategory = 'security' | 'quality' | 'governance';

/**
 * Determine the category of a plugin based on its name.
 */
export function getPluginCategory(plugin: string): PluginCategory {
  if ((SECURITY_PLUGINS as readonly string[]).includes(plugin)) {
    return 'security';
  }
  return 'quality';
}

// ============================================================================
// Metadata Types
// ============================================================================

/**
 * Severity levels for rules.
 * Security rules typically have severity, quality rules may not.
 */
export type RuleSeverity = 'critical' | 'high' | 'medium' | 'low';

/**
 * Rule categories that determine which metadata fields are required.
 */
export type RuleCategory = 'security' | 'quality' | 'governance';

/**
 * Base frontmatter fields required for ALL rule documentation files.
 */
export interface BaseRuleFrontmatter {
  /** Rule name in kebab-case (e.g., 'no-unsafe-query') */
  title: string;
  
  /** Short description (50-150 chars) for tables and SEO */
  description: string;
  
  /** Keywords for search/filtering (3-5 recommended) */
  tags: string[];
  
  /** Rule category determining additional required fields */
  category: RuleCategory;
}

/**
 * Optional frontmatter fields common to all rules.
 */
export interface OptionalRuleFrontmatter {
  /** Path or URL to OG image for social sharing */
  cover_image?: string;
  
  /** Whether the doc is ready for publishing (default: true) */
  published?: boolean;
  
  /** Whether the rule provides auto-fix */
  autofix?: boolean;
  
  /** Whether the rule provides IDE suggestions */
  has_suggestions?: boolean;
  
  /** List of related rule names */
  related_rules?: string[];
  
  /** Canonical URL for SEO */
  canonical_url?: string;
}

/**
 * Security-specific frontmatter fields.
 * REQUIRED for security rules, not applicable for quality rules.
 */
export interface SecurityRuleFrontmatter {
  /** Severity level (required for security rules) */
  severity: RuleSeverity;
  
  /** CWE reference (e.g., 'CWE-89') */
  cwe?: string;
  
  /** OWASP reference (e.g., 'A03:2021') */
  owasp?: string;
  
  /** CVSS score (0-10) */
  cvss?: number;
}

/**
 * Complete frontmatter for SECURITY rules.
 */
export interface SecurityRuleMetadata extends BaseRuleFrontmatter, OptionalRuleFrontmatter, SecurityRuleFrontmatter {
  category: 'security';
}

/**
 * Complete frontmatter for QUALITY rules.
 * Does not include security-specific fields.
 */
export interface QualityRuleMetadata extends BaseRuleFrontmatter, OptionalRuleFrontmatter {
  category: 'quality' | 'governance';
}

/**
 * Union type for all rule metadata.
 */
export type RuleMetadata = SecurityRuleMetadata | QualityRuleMetadata;

/**
 * Type guard to check if metadata is for a security rule.
 */
export function isSecurityMetadata(metadata: RuleMetadata): metadata is SecurityRuleMetadata {
  return metadata.category === 'security';
}

// ============================================================================
// Content Anchors
// ============================================================================

/**
 * Available content anchors for rule documentation.
 * These mark sections that can be extracted programmatically.
 */
export const CONTENT_ANCHORS = {
  /** One paragraph summary for rule tables (REQUIRED) */
  RULE_SUMMARY: '@rule-summary',
  
  /** Why this rule matters (optional) */
  RULE_RATIONALE: '@rule-rationale',
  
  /** Code examples section (optional) */
  RULE_EXAMPLES: '@rule-examples',
  
  /** Configuration options (optional) */
  RULE_OPTIONS: '@rule-options',
  
  /** When not to use this rule (optional) */
  RULE_EXCEPTIONS: '@rule-exceptions',
} as const;

/**
 * Regex pattern to extract content from an anchor.
 * Usage: new RegExp(getAnchorPattern('rule-summary'))
 */
export function getAnchorPattern(anchorName: string): RegExp {
  return new RegExp(`<!--\\s*@${anchorName}\\s*-->([\\s\\S]*?)<!--\\s*@/${anchorName}\\s*-->`, 'i');
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Required fields for security rules.
 */
export const SECURITY_REQUIRED_FIELDS: (keyof SecurityRuleMetadata)[] = [
  'title',
  'description', 
  'tags',
  'category',
  'severity',
];

/**
 * Required fields for quality rules.
 */
export const QUALITY_REQUIRED_FIELDS: (keyof QualityRuleMetadata)[] = [
  'title',
  'description',
  'tags', 
  'category',
];

/**
 * Validate that metadata has all required fields for its category.
 */
export function validateMetadata(metadata: Partial<RuleMetadata>): { valid: boolean; missing: string[] } {
  const requiredFields = metadata.category === 'security' 
    ? SECURITY_REQUIRED_FIELDS 
    : QUALITY_REQUIRED_FIELDS;
  
  const missing = requiredFields.filter(field => {
    const value = (metadata as Record<string, unknown>)[field];
    return value === undefined || value === null || value === '';
  });
  
  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Validate description length (50-150 chars recommended).
 */
export function validateDescription(description: string): { valid: boolean; message?: string } {
  if (!description) {
    return { valid: false, message: 'Description is required' };
  }
  
  if (description.length < 20) {
    return { valid: false, message: `Description too short (${description.length} chars, min 20)` };
  }
  
  if (description.length > 200) {
    return { valid: false, message: `Description too long (${description.length} chars, max 200)` };
  }
  
  return { valid: true };
}

// ============================================================================
// Exports for Testing
// ============================================================================

export const METADATA_SCHEMA_VERSION = '1.0.0';
