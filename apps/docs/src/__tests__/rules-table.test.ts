/**
 * Unit tests for RulesTable utility functions
 * 
 * These tests lock the behavior of the rules table parsing and link generation
 * to prevent regressions when modifying the component.
 * 
 * Uses shared schema from: @/lib/rule-metadata-schema
 */

import { describe, it, expect } from 'vitest';
import {
  SECURITY_PLUGINS,
  QUALITY_PLUGINS,
  getPluginCategory,
  getAnchorPattern,
  CONTENT_ANCHORS,
  validateMetadata,
  validateDescription,
  isSecurityMetadata,
  type SecurityRuleMetadata,
  type QualityRuleMetadata,
} from '../lib/rule-metadata-schema';

// ============================================================================
// Test Data
// ============================================================================

const MOCK_FRONTMATTER_WITH_DESCRIPTION = `---
title: no-unsafe-query
description: Prevents SQL injection by detecting unsafe patterns
tags: ['security', 'sql', 'postgres']
category: security
severity: critical
cwe: CWE-89
---

> Keywords: SQL, injection, security

This rule detects potentially unsafe SQL query construction.
`;

const MOCK_FRONTMATTER_NO_DESCRIPTION = `---
title: no-unsafe-query
description: no-unsafe-query
category: security
---

<!-- @rule-summary -->
Detects string concatenation in SQL queries which can lead to injection.
<!-- @/rule-summary -->

This is the main content.
`;

const MOCK_FALLBACK_CONTENT = `---
title: some-rule
description: some-rule
---

> Keywords: foo, bar

Some meaningful description that should be used as fallback.

## Details
...
`;

const MOCK_README_TABLE = `
## Rules

| Rule | Description | 💼 | 🔧 | 💡 | ⚠️ |
| :-- | :-- | :-: | :-: | :-: | :-: |
| [no-unsafe-query](./docs/rules/no-unsafe-query.md) | Prevents SQL injection | 💼 |  | 💡 |  |
| [no-insecure-ssl](./docs/rules/no-insecure-ssl.md) | SSL validation | 💼 |  | 💡 | ⚠️ |
| [check-query-params](./docs/rules/check-query-params.md) | Query params | 💼 | 🔧 |  |  |
`;

// ============================================================================
// Utility Functions for Testing (mirror rules-table.tsx logic)
// ============================================================================

function stripMarkdown(text: string): string {
  if (!text) return '';
  let result = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  result = result.replace(/[`*~_]/g, '');
  result = result.replace(/\(\.\/[^)]+\)/g, '');
  result = result.replace(/https?:\/\/[^\s]+/g, '');
  return result.trim();
}

function extractDescriptionFromContent(content: string, ruleName: string): string | null {
  // 1. Try frontmatter description
  const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (frontmatterMatch) {
    const frontmatter = frontmatterMatch[1];
    const descMatch = frontmatter.match(/^description:\s*["']?(.+?)["']?\s*$/m);
    if (descMatch && descMatch[1] && descMatch[1] !== ruleName && descMatch[1].length > 15) {
      return descMatch[1].trim();
    }
  }
  
  // 2. Try @rule-summary anchor (using shared pattern)
  const anchorPattern = getAnchorPattern('rule-summary');
  const anchorMatch = content.match(anchorPattern);
  if (anchorMatch && anchorMatch[1]) {
    const desc = anchorMatch[1].replace(/[`*~_]/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').trim();
    if (desc && desc.length > 10) {
      const firstSentence = desc.split(/\.\s/)[0];
      return firstSentence.length < 150 ? firstSentence : desc.slice(0, 147) + '...';
    }
  }
  
  // 3. Fallback: Find first paragraph
  const frontmatterEnd = content.indexOf('---', 3);
  if (frontmatterEnd !== -1) {
    const afterFrontmatter = content.slice(frontmatterEnd + 3).trim();
    const lines = afterFrontmatter.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('>') || trimmed.startsWith('#') || 
          trimmed.startsWith('*') || trimmed.startsWith('|') || trimmed.startsWith('<!--') ||
          trimmed.toLowerCase().includes('keywords:')) {
        continue;
      }
      const desc = trimmed.replace(/[`*~_]/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').trim();
      if (desc && desc.length > 20 && !desc.includes('🚨') && !desc.includes('💡')) {
        return desc.length < 150 ? desc : desc.slice(0, 147) + '...';
      }
    }
  }
  
  return null;
}

interface ParsedRule {
  name: string;
  recommended: boolean;
  fixable: boolean;
  hasSuggestions: boolean;
  warns: boolean;
  href: string;
}

function parseRulesFromReadme(markdown: string, plugin: string, category: 'security' | 'quality'): ParsedRule[] {
  const rules: ParsedRule[] = [];
  const tableRegex = /(\|[^\n]+\|)\n(\|[-:\s|]+\|)\n((?:\|[^\n]+\|\n?)+)/g;
  let tableMatch;
  
  while ((tableMatch = tableRegex.exec(markdown)) !== null) {
    const headerRow = tableMatch[1];
    const dataRowsContent = tableMatch[3];
    
    const headerCells = headerRow.split('|').map(cell => cell.trim()).filter(c => c !== '');
    const ruleIdx = headerCells.findIndex(h => h.toLowerCase().includes('rule'));
    
    if (ruleIdx === -1) continue;
    
    const dataRows = dataRowsContent.split('\n').filter(row => row.trim().startsWith('|'));
    
    for (const row of dataRows) {
      const cells = row.split('|').map(cell => cell.trim()).filter((_, i, arr) => i > 0 && i < arr.length - 1);
      
      if (cells.length < headerCells.length) continue;
      
      const ruleCell = cells[ruleIdx];
      if (!ruleCell || ruleCell.startsWith('**A') || ruleCell === '') continue;
      
      const ruleNameMatch = ruleCell.match(/\[([^\]]+)\]\(([^)]+)\)/);
      const ruleName = (ruleNameMatch ? ruleNameMatch[1] : ruleCell).replace(/[`*~]/g, '');
      
      if (!ruleName || ruleName.includes('|') || ruleName.length < 2) continue;
      
      rules.push({
        name: ruleName,
        recommended: row.includes('💼'),
        warns: row.includes('⚠️'),
        fixable: row.includes('🔧'),
        hasSuggestions: row.includes('💡'),
        href: `/docs/${category}/plugin-${plugin}/rules/${ruleName}`,
      });
    }
  }
  
  return rules;
}

// ============================================================================
// Tests: Plugin Classification (from shared schema)
// ============================================================================

describe('Plugin Classification (Shared Schema)', () => {
  describe('SECURITY_PLUGINS constant', () => {
    it('should include all expected security plugins', () => {
      expect(SECURITY_PLUGINS).toContain('browser-security');
      expect(SECURITY_PLUGINS).toContain('secure-coding');
      expect(SECURITY_PLUGINS).toContain('jwt');
      expect(SECURITY_PLUGINS).toContain('node-security');
      expect(SECURITY_PLUGINS).toContain('crypto');
      expect(SECURITY_PLUGINS).toContain('mongodb-security');
      expect(SECURITY_PLUGINS).toContain('pg');
      expect(SECURITY_PLUGINS).toContain('express-security');
      expect(SECURITY_PLUGINS).toContain('nestjs-security');
      expect(SECURITY_PLUGINS).toContain('lambda-security');
      expect(SECURITY_PLUGINS).toContain('vercel-ai-security');
    });
    
    it('should have exactly 11 security plugins', () => {
      expect(SECURITY_PLUGINS.length).toBe(11);
    });
  });
  
  describe('QUALITY_PLUGINS constant', () => {
    it('should include expected quality plugins', () => {
      expect(QUALITY_PLUGINS).toContain('import-next');
      expect(QUALITY_PLUGINS).toContain('maintainability');
      expect(QUALITY_PLUGINS).toContain('react-performance');
    });
  });
  
  describe('getPluginCategory', () => {
    it('should categorize all SECURITY_PLUGINS as security', () => {
      for (const plugin of SECURITY_PLUGINS) {
        expect(getPluginCategory(plugin)).toBe('security');
      }
    });
    
    it('should categorize all QUALITY_PLUGINS as quality', () => {
      for (const plugin of QUALITY_PLUGINS) {
        expect(getPluginCategory(plugin)).toBe('quality');
      }
    });
    
    it('should default unknown plugins to quality', () => {
      expect(getPluginCategory('unknown-plugin')).toBe('quality');
      expect(getPluginCategory('some-new-plugin')).toBe('quality');
    });
  });
});

// ============================================================================
// Tests: Metadata Validation (from shared schema)
// ============================================================================

describe('Metadata Validation (Shared Schema)', () => {
  describe('validateMetadata', () => {
    it('should validate complete security metadata', () => {
      const metadata: SecurityRuleMetadata = {
        title: 'no-unsafe-query',
        description: 'Prevents SQL injection attacks',
        tags: ['security', 'sql'],
        category: 'security',
        severity: 'critical',
      };
      
      const result = validateMetadata(metadata);
      expect(result.valid).toBe(true);
      expect(result.missing).toHaveLength(0);
    });
    
    it('should detect missing required fields for security rules', () => {
      const metadata = {
        title: 'test-rule',
        category: 'security' as const,
        // Missing: description, tags, severity
      };
      
      const result = validateMetadata(metadata);
      expect(result.valid).toBe(false);
      expect(result.missing).toContain('description');
      expect(result.missing).toContain('tags');
      expect(result.missing).toContain('severity');
    });
    
    it('should validate quality metadata without severity', () => {
      const metadata: QualityRuleMetadata = {
        title: 'no-nested-ternary',
        description: 'Prevents deeply nested ternary expressions',
        tags: ['quality', 'readability'],
        category: 'quality',
      };
      
      const result = validateMetadata(metadata);
      expect(result.valid).toBe(true);
    });
  });
  
  describe('validateDescription', () => {
    it('should accept valid descriptions (20-200 chars)', () => {
      expect(validateDescription('Prevents SQL injection attacks').valid).toBe(true);
      expect(validateDescription('A'.repeat(100)).valid).toBe(true);
    });
    
    it('should reject too short descriptions', () => {
      const result = validateDescription('Short');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('too short');
    });
    
    it('should reject too long descriptions', () => {
      const result = validateDescription('A'.repeat(250));
      expect(result.valid).toBe(false);
      expect(result.message).toContain('too long');
    });
    
    it('should reject empty descriptions', () => {
      expect(validateDescription('').valid).toBe(false);
    });
  });
  
  describe('isSecurityMetadata', () => {
    it('should return true for security category', () => {
      const metadata: SecurityRuleMetadata = {
        title: 'test',
        description: 'Test description here',
        tags: ['test'],
        category: 'security',
        severity: 'high',
      };
      expect(isSecurityMetadata(metadata)).toBe(true);
    });
    
    it('should return false for quality category', () => {
      const metadata: QualityRuleMetadata = {
        title: 'test',
        description: 'Test description here',
        tags: ['test'],
        category: 'quality',
      };
      expect(isSecurityMetadata(metadata)).toBe(false);
    });
  });
});

// ============================================================================
// Tests: Content Anchors (from shared schema)
// ============================================================================

describe('Content Anchors (Shared Schema)', () => {
  describe('CONTENT_ANCHORS constant', () => {
    it('should define required anchors', () => {
      expect(CONTENT_ANCHORS.RULE_SUMMARY).toBe('@rule-summary');
    });
    
    it('should define optional anchors', () => {
      expect(CONTENT_ANCHORS.RULE_RATIONALE).toBe('@rule-rationale');
      expect(CONTENT_ANCHORS.RULE_EXAMPLES).toBe('@rule-examples');
      expect(CONTENT_ANCHORS.RULE_OPTIONS).toBe('@rule-options');
      expect(CONTENT_ANCHORS.RULE_EXCEPTIONS).toBe('@rule-exceptions');
    });
  });
  
  describe('getAnchorPattern', () => {
    it('should generate correct regex for rule-summary', () => {
      const pattern = getAnchorPattern('rule-summary');
      const content = `<!-- @rule-summary -->Test content<!-- @/rule-summary -->`;
      const match = content.match(pattern);
      
      expect(match).toBeTruthy();
      expect(match![1]).toBe('Test content');
    });
    
    it('should handle whitespace variations', () => {
      const pattern = getAnchorPattern('rule-summary');
      const variations = [
        '<!-- @rule-summary -->content<!-- @/rule-summary -->',
        '<!--@rule-summary-->content<!--@/rule-summary-->',
        '<!--  @rule-summary  -->content<!--  @/rule-summary  -->',
      ];
      
      for (const v of variations) {
        expect(v.match(pattern)).toBeTruthy();
      }
    });
  });
});

// ============================================================================
// Tests: RulesTable Utility Functions
// ============================================================================

describe('RulesTable Utility Functions', () => {
  describe('stripMarkdown', () => {
    it('should remove markdown links keeping text', () => {
      expect(stripMarkdown('[link text](./path/to/file.md)')).toBe('link text');
      expect(stripMarkdown('[CWE-89](https://cwe.mitre.org/)')).toBe('CWE-89');
    });
    
    it('should remove formatting characters', () => {
      expect(stripMarkdown('**bold** text')).toBe('bold text');
      expect(stripMarkdown('`code` here')).toBe('code here');
      expect(stripMarkdown('*italic* text')).toBe('italic text');
    });
    
    it('should remove URLs', () => {
      expect(stripMarkdown('Visit https://example.com for more')).toBe('Visit  for more');
    });
    
    it('should handle empty strings', () => {
      expect(stripMarkdown('')).toBe('');
      expect(stripMarkdown(null as any)).toBe('');
    });
  });
  
  describe('extractDescriptionFromContent', () => {
    it('should prioritize frontmatter description over other sources', () => {
      const result = extractDescriptionFromContent(MOCK_FRONTMATTER_WITH_DESCRIPTION, 'no-unsafe-query');
      expect(result).toBe('Prevents SQL injection by detecting unsafe patterns');
    });
    
    it('should skip frontmatter description if it equals rule name', () => {
      const result = extractDescriptionFromContent(MOCK_FRONTMATTER_NO_DESCRIPTION, 'no-unsafe-query');
      expect(result).toContain('Detects string concatenation in SQL queries');
    });
    
    it('should extract from @rule-summary anchor if frontmatter has no description', () => {
      const result = extractDescriptionFromContent(MOCK_FRONTMATTER_NO_DESCRIPTION, 'no-unsafe-query');
      expect(result).toContain('string concatenation');
    });
    
    it('should fall back to first meaningful paragraph', () => {
      const result = extractDescriptionFromContent(MOCK_FALLBACK_CONTENT, 'some-rule');
      expect(result).toContain('Some meaningful description');
    });
    
    it('should skip blockquotes and keywords lines', () => {
      const content = `---
title: test
description: test
---

> Keywords: foo, bar

> This is a blockquote that should be skipped

Actual description here.
`;
      const result = extractDescriptionFromContent(content, 'test');
      expect(result).toContain('Actual description');
    });
    
    it('should skip badge lines with emojis', () => {
      const content = `---
title: test
description: test
---

**🚨 Security rule** | **💡 Provides guidance**

Real description starts here.
`;
      const result = extractDescriptionFromContent(content, 'test');
      expect(result).toContain('Real description starts');
    });
  });
  
  describe('parseRulesFromReadme', () => {
    it('should parse rules from markdown table', () => {
      const rules = parseRulesFromReadme(MOCK_README_TABLE, 'pg', 'security');
      
      expect(rules).toHaveLength(3);
      expect(rules[0].name).toBe('no-unsafe-query');
      expect(rules[1].name).toBe('no-insecure-ssl');
      expect(rules[2].name).toBe('check-query-params');
    });
    
    it('should correctly parse recommended (💼) status', () => {
      const rules = parseRulesFromReadme(MOCK_README_TABLE, 'pg', 'security');
      expect(rules.every(r => r.recommended)).toBe(true);
    });
    
    it('should correctly parse fixable (🔧) status', () => {
      const rules = parseRulesFromReadme(MOCK_README_TABLE, 'pg', 'security');
      
      expect(rules[0].fixable).toBe(false);
      expect(rules[1].fixable).toBe(false);
      expect(rules[2].fixable).toBe(true);
    });
    
    it('should correctly parse suggestions (💡) status', () => {
      const rules = parseRulesFromReadme(MOCK_README_TABLE, 'pg', 'security');
      
      expect(rules[0].hasSuggestions).toBe(true);
      expect(rules[1].hasSuggestions).toBe(true);
      expect(rules[2].hasSuggestions).toBe(false);
    });
    
    it('should correctly parse warns (⚠️) status', () => {
      const rules = parseRulesFromReadme(MOCK_README_TABLE, 'pg', 'security');
      
      expect(rules[0].warns).toBe(false);
      expect(rules[1].warns).toBe(true);
      expect(rules[2].warns).toBe(false);
    });
    
    it('should generate correct hrefs for security plugins', () => {
      const rules = parseRulesFromReadme(MOCK_README_TABLE, 'pg', 'security');
      
      expect(rules[0].href).toBe('/docs/security/plugin-pg/rules/no-unsafe-query');
      expect(rules[1].href).toBe('/docs/security/plugin-pg/rules/no-insecure-ssl');
    });
    
    it('should generate correct hrefs for quality plugins', () => {
      const rules = parseRulesFromReadme(MOCK_README_TABLE, 'maintainability', 'quality');
      
      expect(rules[0].href).toBe('/docs/quality/plugin-maintainability/rules/no-unsafe-query');
    });
    
    it('should handle empty tables gracefully', () => {
      const rules = parseRulesFromReadme('## No table here\n\nJust text.', 'pg', 'security');
      expect(rules).toHaveLength(0);
    });
    
    it('should skip tables without Rule column', () => {
      const noRuleTable = `
| Name | Value |
| :-- | :-- |
| foo | bar |
`;
      const rules = parseRulesFromReadme(noRuleTable, 'pg', 'security');
      expect(rules).toHaveLength(0);
    });
  });
  
  describe('Link Generation Patterns', () => {
    it('should use /docs/security/ for all security plugins', () => {
      for (const plugin of SECURITY_PLUGINS) {
        const category = getPluginCategory(plugin);
        expect(category).toBe('security');
        expect(`/docs/${category}/plugin-${plugin}/rules/test-rule`).toBe(
          `/docs/security/plugin-${plugin}/rules/test-rule`
        );
      }
    });
    
    it('should use /docs/quality/ for quality plugins', () => {
      for (const plugin of QUALITY_PLUGINS) {
        const category = getPluginCategory(plugin);
        expect(category).toBe('quality');
        expect(`/docs/${category}/plugin-${plugin}/rules/test-rule`).toBe(
          `/docs/quality/plugin-${plugin}/rules/test-rule`
        );
      }
    });
  });
});
