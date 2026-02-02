/**
 * Configuration Files Lint Compliance Tests
 * 
 * These tests lock the ESLint-compliant configuration patterns.
 * Specifically, they ensure all config files use named exports
 * instead of anonymous default exports.
 * 
 * CRITICAL: These tests prevent regression of lint warnings.
 * Last verified: 2026-02-02
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const docsRoot = process.cwd();

describe('Configuration Files: ESLint Compliance', () => {
  describe('postcss.config.mjs', () => {
    const configPath = join(docsRoot, 'postcss.config.mjs');
    
    it('file exists', () => {
      expect(existsSync(configPath)).toBe(true);
    });

    it('uses named variable before default export (no anonymous export)', () => {
      const content = readFileSync(configPath, 'utf-8');
      
      // Should have a named const declaration
      expect(content).toMatch(/const\s+\w+Config\s*=/);
      
      // Should export the named variable, NOT an anonymous object
      expect(content).toMatch(/export default \w+Config/);
      
      // Should NOT have anonymous default export pattern
      expect(content).not.toMatch(/export default \{/);
    });

    it('contains required @tailwindcss/postcss plugin', () => {
      const content = readFileSync(configPath, 'utf-8');
      expect(content).toContain('@tailwindcss/postcss');
    });
  });

  describe('tailwind.config.mjs', () => {
    const configPath = join(docsRoot, 'tailwind.config.mjs');
    
    it('file exists', () => {
      expect(existsSync(configPath)).toBe(true);
    });

    it('uses named variable before default export (no anonymous export)', () => {
      const content = readFileSync(configPath, 'utf-8');
      
      // Should have a named const declaration
      expect(content).toMatch(/const\s+\w+Config\s*=/);
      
      // Should export the named variable, NOT an anonymous object
      expect(content).toMatch(/export default \w+Config/);
      
      // Should NOT have anonymous default export pattern
      expect(content).not.toMatch(/export default \{/);
    });

    it('has proper JSDoc type annotation', () => {
      const content = readFileSync(configPath, 'utf-8');
      expect(content).toContain("@type {import('tailwindcss').Config}");
    });

    it('includes content file patterns', () => {
      const content = readFileSync(configPath, 'utf-8');
      expect(content).toContain('./src/**/*.{js,jsx,ts,tsx,mdx}');
      expect(content).toContain('./content/**/*.{md,mdx}');
    });

    it('includes fumadocs-ui content paths', () => {
      const content = readFileSync(configPath, 'utf-8');
      expect(content).toContain('fumadocs-ui');
    });
  });
});

describe('Configuration Files: Named Export Pattern', () => {
  /**
   * This documents the required pattern for ESLint import/no-anonymous-default-export compliance.
   * 
   * ❌ BAD (triggers lint warning):
   * export default { ... }
   * 
   * ✅ GOOD (lint-compliant):
   * const config = { ... };
   * export default config;
   */
  
  describe('Pattern Documentation', () => {
    it('documents the correct named export pattern', () => {
      const goodPattern = `
        const config = {
          // configuration here
        };
        export default config;
      `;
      
      const badPattern = `
        export default {
          // configuration here
        };
      `;
      
      // Named pattern should match our expected structure
      expect(goodPattern).toContain('const config');
      expect(goodPattern).toContain('export default config');
      
      // Anonymous pattern is what we're avoiding
      expect(badPattern).toContain('export default {');
    });
  });
});
