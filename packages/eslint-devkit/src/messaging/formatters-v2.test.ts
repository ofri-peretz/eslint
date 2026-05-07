/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

import { describe, it, expect } from 'vitest';
import {
  formatSecurityMessage,
  formatCodeQualityMessage,
  formatPerformanceMessage,
} from './formatters-v2';

describe('formatters-v2', () => {
  // ==========================================================================
  // formatSecurityMessage — Human Mode
  // ==========================================================================

  describe('formatSecurityMessage (human)', () => {
    it('should format basic security message with CWE enrichment', () => {
      const result = formatSecurityMessage({
        cwe: 'CWE-89',
        severity: 'CRITICAL',
        description: 'SQL injection via string concatenation',
        fix: 'Use parameterized queries ($1, $2)',
        docs: 'https://node-postgres.com/features/queries',
      });

      expect(result).toContain('🔒');
      expect(result).toContain('CWE-89');
      expect(result).toContain('OWASP:A05-Injection');
      expect(result).toContain('CVSS:9.8');
      expect(result).toContain('SQL injection via string concatenation');
      expect(result).toContain('CRITICAL');
      expect(result).toContain('Fix: Use parameterized queries ($1, $2)');
      expect(result).toContain('https://node-postgres.com/features/queries');
    });

    it('should include why field when provided', () => {
      const result = formatSecurityMessage({
        cwe: 'CWE-89',
        severity: 'CRITICAL',
        description: 'SQL injection detected',
        why: 'Attackers can modify the query structure to access unauthorized data',
        fix: 'Use parameterized queries',
      });

      expect(result).toContain('Why: Attackers can modify the query structure');
    });

    it('should include vulnerable/safe code examples', () => {
      const result = formatSecurityMessage({
        severity: 'HIGH',
        description: 'Hardcoded credentials',
        fix: 'Use environment variables',
        vulnerable: "const password = 'admin123';",
        safe: "const password = process.env.DB_PASSWORD;",
      });

      expect(result).toContain("✗ const password = 'admin123';");
      expect(result).toContain('✓ const password = process.env.DB_PASSWORD;');
    });

    it('should produce full multi-line output with all fields', () => {
      const result = formatSecurityMessage({
        cwe: 'CWE-89',
        severity: 'CRITICAL',
        description: 'SQL injection via string concatenation',
        why: 'Attackers can modify the query to exfiltrate data',
        fix: 'Use parameterized queries ($1, $2)',
        docs: 'https://example.com/docs',
        vulnerable: "db.query('SELECT * FROM users WHERE id=' + id)",
        safe: "db.query('SELECT * FROM users WHERE id=$1', [id])",
      });

      const lines = result.split('\n');
      expect(lines[0]).toContain('🔒');
      expect(lines[0]).toContain('CWE-89');
      expect(lines[0]).toContain('CRITICAL');
      expect(lines[1]).toContain('Why:');
      expect(lines[2]).toContain('Fix:');
      expect(lines[2]).toContain('https://example.com/docs');
      expect(lines[3]).toContain('✗');
      expect(lines[4]).toContain('✓');
    });

    it('should work without optional fields', () => {
      const result = formatSecurityMessage({
        severity: 'LOW',
        description: 'Minor issue',
        fix: 'Fix it',
      });

      expect(result).toContain('🔒');
      expect(result).toContain('Minor issue');
      expect(result).toContain('LOW');
      expect(result).toContain('Fix: Fix it');
      expect(result).not.toContain('CWE-');
      expect(result).not.toContain('OWASP:');
      expect(result).not.toContain('CVSS:');
    });

    it('should include compliance tags from CWE enrichment', () => {
      const result = formatSecurityMessage({
        cwe: 'CWE-89',
        severity: 'CRITICAL',
        description: 'SQL injection',
        fix: 'Use parameterized queries',
      });

      expect(result).toMatch(/\[.*SOC2.*\]/);
    });

    it('should respect explicit owasp/cvss over auto-enrichment', () => {
      const result = formatSecurityMessage({
        cwe: 'CWE-89',
        severity: 'CRITICAL',
        description: 'Custom mapped',
        fix: 'Fix it',
        owasp: 'A01:2025',
        cvss: 5.0,
      });

      expect(result).toContain('OWASP:A01-Broken');
      expect(result).toContain('CVSS:5');
      expect(result).not.toContain('CVSS:9.8');
    });
  });

  // ==========================================================================
  // formatSecurityMessage — Compact Mode
  // ==========================================================================

  describe('formatSecurityMessage (compact)', () => {
    it('should produce abbreviated severity', () => {
      const result = formatSecurityMessage({
        cwe: 'CWE-89',
        severity: 'CRITICAL',
        description: 'SQLi via concat',
        fix: 'Use $1,$2 params',
      }, 'compact');

      expect(result).toContain('CRIT');
      expect(result).not.toContain('CRITICAL');
    });

    it('should drop OWASP display (token savings)', () => {
      const result = formatSecurityMessage({
        cwe: 'CWE-89',
        severity: 'CRITICAL',
        description: 'SQLi',
        fix: 'Fix',
      }, 'compact');

      expect(result).toContain('CWE-89');
      expect(result).toContain('9.8');
      expect(result).not.toContain('OWASP');
    });

    it('should drop compliance tags', () => {
      const result = formatSecurityMessage({
        cwe: 'CWE-89',
        severity: 'CRITICAL',
        description: 'SQLi',
        fix: 'Fix',
      }, 'compact');

      expect(result).not.toContain('SOC2');
      expect(result).not.toContain('[');
    });

    it('should inline examples on fix line', () => {
      const result = formatSecurityMessage({
        severity: 'HIGH',
        description: 'Bad code',
        fix: 'Fix it',
        vulnerable: 'bad()',
        safe: 'good()',
      }, 'compact');

      // Examples should be on same line as fix
      const lines = result.split('\n');
      expect(lines[1]).toContain('Fix: Fix it');
      expect(lines[1]).toContain('✗ bad()');
      expect(lines[1]).toContain('✓ good()');
    });

    it('should be fewer tokens than human mode', () => {
      const opts = {
        cwe: 'CWE-89' as const,
        severity: 'CRITICAL' as const,
        description: 'SQL injection via string concatenation',
        fix: 'Use parameterized queries ($1, $2)',
        vulnerable: "db.query('SELECT...' + userId)",
        safe: "db.query('SELECT...$1', [userId])",
      };

      const human = formatSecurityMessage(opts, 'human');
      const compact = formatSecurityMessage(opts, 'compact');

      expect(compact.length).toBeLessThan(human.length);
    });
  });

  // ==========================================================================
  // formatSecurityMessage — Agent Mode
  // ==========================================================================

  describe('formatSecurityMessage (agent)', () => {
    it('should produce valid JSON', () => {
      const result = formatSecurityMessage({
        cwe: 'CWE-89',
        severity: 'CRITICAL',
        description: 'SQLi',
        fix: 'Use params',
      }, 'agent');

      const parsed = JSON.parse(result);
      expect(parsed).toBeTruthy();
    });

    it('should use self-describing keys', () => {
      const result = formatSecurityMessage({
        cwe: 'CWE-89',
        severity: 'CRITICAL',
        description: 'SQL injection',
        fix: 'Use params',
        vulnerable: 'bad()',
        safe: 'good()',
      }, 'agent');

      const parsed = JSON.parse(result);
      expect(parsed.id).toBe('CWE-89');
      expect(parsed.cvss).toBe(9.8); // Auto-enriched CVSS
      expect(parsed.description).toBe('SQL injection');
      expect(parsed.fix).toBe('Use params');
      expect(parsed.bad).toBe('bad()');
      expect(parsed.good).toBe('good()');
    });

    it('should omit optional fields when not provided', () => {
      const result = formatSecurityMessage({
        severity: 'HIGH',
        description: 'Issue',
        fix: 'Fix',
      }, 'agent');

      const parsed = JSON.parse(result);
      expect(parsed.bad).toBeUndefined();
      expect(parsed.good).toBeUndefined();
    });

    it('should be more compact than human mode', () => {
      const opts = {
        cwe: 'CWE-89' as const,
        severity: 'CRITICAL' as const,
        description: 'SQL injection via string concatenation in pg query call',
        fix: 'Use parameterized queries ($1, $2) instead of concatenation',
        vulnerable: "db.query('SELECT * FROM users WHERE id=' + userId)",
        safe: "db.query('SELECT * FROM users WHERE id=$1', [userId])",
      };

      const human = formatSecurityMessage(opts, 'human');
      const agent = formatSecurityMessage(opts, 'agent');

      // Agent mode drops OWASP, compliance, icons — always shorter than human
      expect(agent.length).toBeLessThan(human.length);
    });
  });

  // ==========================================================================
  // formatCodeQualityMessage
  // ==========================================================================

  describe('formatCodeQualityMessage (human)', () => {
    it('should format circular dependency message with cycle path', () => {
      const result = formatCodeQualityMessage({
        category: 'circular-dependency',
        severity: 'MEDIUM',
        description: 'Circular import detected: A → B → C → A',
        fix: 'Extract shared types to a separate module',
        cycle: ['src/A.ts', 'src/B.ts', 'src/C.ts', 'src/A.ts'],
      });

      expect(result).toContain('🔄');
      expect(result).toContain('Circular import detected');
      expect(result).toContain('Cycle: src/A.ts → src/B.ts → src/C.ts → src/A.ts');
    });

    it('should use category-specific icons', () => {
      const unused = formatCodeQualityMessage({
        category: 'unused-import',
        severity: 'LOW',
        description: 'Unused import',
        fix: 'Remove it',
      });
      expect(unused).toContain('🧹');

      const barrel = formatCodeQualityMessage({
        category: 'barrel-file',
        severity: 'LOW',
        description: 'Barrel file detected',
        fix: 'Use direct imports',
      });
      expect(barrel).toContain('📦');
    });

    it('should use fallback icon for unknown categories', () => {
      const result = formatCodeQualityMessage({
        category: 'custom-category',
        severity: 'INFO',
        description: 'Custom issue',
        fix: 'Fix it',
      });

      expect(result).toContain('📐');
    });

    it('should not include security metadata', () => {
      const result = formatCodeQualityMessage({
        category: 'circular-dependency',
        severity: 'MEDIUM',
        description: 'Cycle detected',
        fix: 'Break the cycle',
      });

      expect(result).not.toContain('CWE-');
      expect(result).not.toContain('OWASP:');
      expect(result).not.toContain('CVSS:');
    });
  });

  describe('formatCodeQualityMessage (compact)', () => {
    it('should abbreviate severity', () => {
      const result = formatCodeQualityMessage({
        category: 'circular-dependency',
        severity: 'MEDIUM',
        description: 'Cycle detected',
        fix: 'Break cycle',
      }, 'compact');

      expect(result).toContain('MED');
    });

    it('should render cycle as abbreviated file names', () => {
      const result = formatCodeQualityMessage({
        category: 'circular-dependency',
        severity: 'MEDIUM',
        description: 'Cycle',
        fix: 'Fix',
        cycle: ['src/A.ts', 'src/B.ts', 'src/C.ts'],
      }, 'compact');

      expect(result).toContain('A.ts→B.ts→C.ts');
    });

    it('should inline bad/good examples on fix line', () => {
      const result = formatCodeQualityMessage({
        category: 'unused-import',
        severity: 'LOW',
        description: 'Unused import',
        fix: 'Remove it',
        vulnerable: "import { foo } from 'lib';",
        safe: "// import removed",
      }, 'compact');

      expect(result).toContain("✗ import { foo } from 'lib';");
      expect(result).toContain('✓ // import removed');
    });
  });

  describe('formatCodeQualityMessage (agent)', () => {
    it('should produce valid JSON with category', () => {
      const result = formatCodeQualityMessage({
        category: 'circular-dependency',
        severity: 'MEDIUM',
        description: 'Cycle detected',
        fix: 'Break it',
        cycle: ['a.ts', 'b.ts', 'a.ts'],
      }, 'agent');

      const parsed = JSON.parse(result);
      expect(parsed.category).toBe('circular-dependency');
      expect(parsed.description).toBe('Cycle detected');
      expect(parsed.fix).toBe('Break it');
      expect(parsed.cycle).toEqual(['a.ts', 'b.ts', 'a.ts']);
    });

    it('should include bad/good when provided and omit cycle when not', () => {
      const result = formatCodeQualityMessage({
        category: 'unused-import',
        severity: 'LOW',
        description: 'Unused import',
        fix: 'Remove it',
        vulnerable: "import { foo } from 'lib';",
        safe: "// removed",
      }, 'agent');

      const parsed = JSON.parse(result);
      expect(parsed.bad).toBe("import { foo } from 'lib';");
      expect(parsed.good).toBe('// removed');
      expect(parsed.cycle).toBeUndefined();
    });
  });

  // ==========================================================================
  // formatPerformanceMessage
  // ==========================================================================

  describe('formatPerformanceMessage (human)', () => {
    it('should format performance message with impact metrics', () => {
      const result = formatPerformanceMessage({
        severity: 'MEDIUM',
        description: 'Loop-based INSERT detected — O(n) database calls',
        fix: 'Use bulk INSERT with a single VALUES clause',
        impact: { current: 'O(n) queries', optimized: 'O(1) query' },
      });

      expect(result).toContain('⚡');
      expect(result).toContain('Loop-based INSERT detected');
      expect(result).toContain('Impact: O(n) queries → O(1) query');
    });

    it('should render why, docs, vulnerable, safe and omit impact when not provided', () => {
      const result = formatPerformanceMessage({
        severity: 'HIGH',
        description: 'N+1 query pattern',
        why: 'Each row triggers a follow-up query',
        fix: 'Eager-load with JOIN',
        docs: 'https://example.com/n-plus-one',
        vulnerable: 'rows.forEach(r => db.fetch(r.id))',
        safe: 'db.fetchAll(rows.map(r => r.id))',
      });

      expect(result).toContain('Why: Each row triggers');
      expect(result).toContain('https://example.com/n-plus-one');
      expect(result).toContain('✗ rows.forEach');
      expect(result).toContain('✓ db.fetchAll');
      expect(result).not.toContain('Impact:');
    });
  });

  describe('formatPerformanceMessage (compact)', () => {
    it('should inline impact in parentheses', () => {
      const result = formatPerformanceMessage({
        severity: 'MEDIUM',
        description: 'Loop INSERT',
        fix: 'Bulk insert',
        impact: { current: 'O(n)', optimized: 'O(1)' },
      }, 'compact');

      expect(result).toContain('(O(n)→O(1))');
      expect(result).toContain('MED');
    });

    it('should omit impact suffix and inline examples when impact is missing', () => {
      const result = formatPerformanceMessage({
        severity: 'LOW',
        description: 'Suboptimal pattern',
        fix: 'Refactor',
        vulnerable: 'oldFn',
        safe: 'newFn',
      }, 'compact');

      // Impact suffix would render as ` (current→optimized)` after severity.
      expect(result).not.toMatch(/LOW \(/);
      expect(result).toContain('✗ oldFn');
      expect(result).toContain('✓ newFn');
    });
  });

  describe('formatPerformanceMessage (agent)', () => {
    it('should produce valid JSON with impact', () => {
      const result = formatPerformanceMessage({
        severity: 'MEDIUM',
        description: 'Loop',
        fix: 'Bulk',
        impact: { current: 'O(n)', optimized: 'O(1)' },
        vulnerable: 'for loop',
        safe: 'bulk insert',
      }, 'agent');

      const parsed = JSON.parse(result);
      expect(parsed.description).toBe('Loop');
      expect(parsed.fix).toBe('Bulk');
      expect(parsed.impact).toEqual({ current: 'O(n)', optimized: 'O(1)' });
      expect(parsed.bad).toBe('for loop');
      expect(parsed.good).toBe('bulk insert');
    });

    it('should omit impact, bad, good when not provided', () => {
      const result = formatPerformanceMessage({
        severity: 'LOW',
        description: 'Slow path',
        fix: 'Cache result',
      }, 'agent');

      const parsed = JSON.parse(result);
      expect(parsed.description).toBe('Slow path');
      expect(parsed.fix).toBe('Cache result');
      expect(parsed.impact).toBeUndefined();
      expect(parsed.bad).toBeUndefined();
      expect(parsed.good).toBeUndefined();
    });
  });

  // ==========================================================================
  // CROSS-CUTTING: Token Efficiency Hierarchy
  // ==========================================================================

  describe('token efficiency hierarchy', () => {
    it('compact < human for all formatters', () => {
      const secOpts = {
        cwe: 'CWE-89' as const,
        severity: 'CRITICAL' as const,
        description: 'SQL injection via string concatenation in pg query',
        fix: 'Use parameterized queries ($1, $2) instead of concatenation',
        vulnerable: "db.query('SELECT * FROM users WHERE id=' + userId)",
        safe: "db.query('SELECT * FROM users WHERE id=$1', [userId])",
      };
      const secH = formatSecurityMessage(secOpts, 'human');
      const secC = formatSecurityMessage(secOpts, 'compact');
      expect(secC.length).toBeLessThan(secH.length);

      const qualOpts = {
        category: 'circular-dependency' as const,
        severity: 'MEDIUM' as const,
        description: 'Circular import detected: A → B → C → A',
        why: 'Circular imports cause undefined values at import time',
        fix: 'Extract shared types to a separate module',
        cycle: ['src/A.ts', 'src/B.ts', 'src/C.ts', 'src/A.ts'],
      };
      const qualH = formatCodeQualityMessage(qualOpts, 'human');
      const qualC = formatCodeQualityMessage(qualOpts, 'compact');
      expect(qualC.length).toBeLessThan(qualH.length);
    });

    it('agent JSON should be shorter than human for realistic messages', () => {
      const opts = {
        cwe: 'CWE-89' as const,
        severity: 'CRITICAL' as const,
        description: 'SQL injection via string concatenation in pg query',
        fix: 'Use parameterized queries ($1, $2) instead of concatenation',
        vulnerable: "db.query('SELECT * FROM users WHERE id=' + userId)",
        safe: "db.query('SELECT * FROM users WHERE id=$1', [userId])",
      };

      const human = formatSecurityMessage(opts, 'human');
      const agent = formatSecurityMessage(opts, 'agent');

      // Agent mode drops icons, OWASP, compliance, prose labels
      expect(agent.length).toBeLessThan(human.length);
    });

    it('effort field should not appear in output (metadata only)', () => {
      const result = formatSecurityMessage({
        severity: 'HIGH',
        description: 'Issue',
        fix: 'Fix',
        effort: 'high',
      });

      expect(result).not.toContain('effort');
    });
  });
});
