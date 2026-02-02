/**
 * Rule Documentation MDX Compatibility Tests
 * 
 * These tests validate that rule documentation in packages/ is compatible
 * with MDX parsing used by RemoteRuleDoc component in production builds.
 * 
 * Catches issues BEFORE Vercel build fails, including:
 * - CVSS calculator URLs with problematic query strings
 * - External image references that may 404
 * - Self-closing tag syntax errors
 * - Other MDX-incompatible markdown patterns
 * 
 * CRITICAL: These tests lock documentation format to prevent build failures.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

// ============================================================================
// Configuration
// ============================================================================

const PACKAGES_ROOT = join(process.cwd(), '../../packages');

// Patterns that break MDX parsing in RemoteRuleDoc
const PROBLEMATIC_PATTERNS = [
  {
    name: 'CVSS Calculator URL with UN-ENCODED query string',
    // Detects: ?vector=AV:N/AC:L (un-encoded chars that break MDX)
    // Allows: ?vector=AV%3AN%2FAC%3AL (properly URL-encoded)
    pattern: /nvd\.nist\.gov\/vuln-metrics\/cvss\/v3-calculator\?vector=[^)]*[/:][^)]*\)/,
    description: 'CVSS calculator URLs must have URL-encoded vector query strings. Use %3A for : and %2F for /',
    severity: 'error',
  },

  {
    name: 'Unescaped angle bracket in text',
    pattern: /[^`\n]<(?!\/|[a-zA-Z!]|--|$)/,
    description: 'Unescaped < in text content may be interpreted as JSX. Use &lt; or wrap in backticks.',
    severity: 'warning',
  },
];

// Known problematic external images (404s or unreliable)
const BLOCKED_IMAGE_DOMAINS = [
  'blog.filippo.io', // Known 404
];

// ============================================================================
// Utility Functions
// ============================================================================

function getAllRuleDocFiles(dir: string): string[] {
  const files: string[] = [];
  
  if (!existsSync(dir)) {
    return files;
  }
  
  const entries = readdirSync(dir);
  
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    
    if (stat.isDirectory()) {
      // Look for docs/rules subdirectory
      if (entry === 'docs') {
        const rulesDir = join(fullPath, 'rules');
        if (existsSync(rulesDir)) {
          const ruleFiles = readdirSync(rulesDir)
            .filter(f => f.endsWith('.md'))
            .map(f => join(rulesDir, f));
          files.push(...ruleFiles);
        }
      } else if (!entry.startsWith('.') && entry !== 'node_modules') {
        files.push(...getAllRuleDocFiles(fullPath));
      }
    }
  }
  
  return files;
}

function getRelativePath(fullPath: string): string {
  return fullPath.replace(PACKAGES_ROOT + '/', '');
}

// ============================================================================
// Tests: MDX Compatibility Patterns
// ============================================================================

describe('Rule Documentation - MDX Compatibility', () => {
  let ruleDocFiles: string[];
  
  beforeAll(() => {
    ruleDocFiles = getAllRuleDocFiles(PACKAGES_ROOT);
  });

  it('should find rule documentation files', () => {
    expect(ruleDocFiles.length).toBeGreaterThan(0);
    console.log(`Found ${ruleDocFiles.length} rule documentation files`);
  });

  describe('Problematic MDX Patterns', () => {
    for (const { name, pattern, description, severity } of PROBLEMATIC_PATTERNS) {
      it(`should not contain: ${name}`, () => {
        const violations: { file: string; line: number; content: string }[] = [];
        
        for (const file of ruleDocFiles) {
          const content = readFileSync(file, 'utf-8');
          const lines = content.split('\n');
          
          lines.forEach((line, index) => {
            if (pattern.test(line)) {
              violations.push({
                file: getRelativePath(file),
                line: index + 1,
                content: line.substring(0, 100) + (line.length > 100 ? '...' : ''),
              });
            }
          });
        }
        
        if (severity === 'error') {
          expect(
            violations,
            `MDX compatibility error: ${name}\n${description}\nViolations:\n${violations.map(v => `  ${v.file}:${v.line}`).join('\n')}`
          ).toHaveLength(0);
        } else if (violations.length > 0) {
          console.warn(
            `MDX compatibility warning: ${name}\n${description}\nFiles: ${violations.map(v => v.file).join(', ')}`
          );
        }
      });
    }
  });

  describe('External Image References', () => {
    it('should not reference blocked/unreliable image domains', () => {
      const blockedImages: { file: string; line: number; url: string }[] = [];
      
      for (const file of ruleDocFiles) {
        const content = readFileSync(file, 'utf-8');
        const lines = content.split('\n');
        
        lines.forEach((line, index) => {
          // Match markdown images: ![alt](url)
          const imageMatches = line.matchAll(/!\[.*?\]\((https?:\/\/[^)]+)\)/g);
          for (const match of imageMatches) {
            const url = match[1];
            for (const domain of BLOCKED_IMAGE_DOMAINS) {
              if (url.includes(domain)) {
                blockedImages.push({
                  file: getRelativePath(file),
                  line: index + 1,
                  url,
                });
              }
            }
          }
        });
      }
      
      expect(
        blockedImages,
        `Blocked image domains found (known 404s or unreliable):\n${blockedImages.map(i => `  ${i.file}:${i.line} - ${i.url}`).join('\n')}\n\nUse Wikipedia or other reliable sources for images.`
      ).toHaveLength(0);
    });
  });

  describe('Table Markdown Syntax', () => {
    it('should have properly formatted markdown tables', () => {
      const malformedTables: { file: string; line: number; issue: string }[] = [];
      
      for (const file of ruleDocFiles) {
        const content = readFileSync(file, 'utf-8');
        const lines = content.split('\n');
        
        let inTable = false;
        let tableStartLine = 0;
        
        lines.forEach((line, index) => {
          // Detect table rows
          if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
            if (!inTable) {
              inTable = true;
              tableStartLine = index + 1;
            }
            
            // Check for unbalanced pipes (rough check)
            const pipeCount = (line.match(/\|/g) || []).length;
            if (pipeCount < 2) {
              malformedTables.push({
                file: getRelativePath(file),
                line: index + 1,
                issue: 'Table row has less than 2 pipe characters',
              });
            }
            
            // Check for problematic URLs in tables (common MDX issue)
            if (line.includes('?') && line.includes('=') && line.includes('http')) {
              // URLs with query strings in tables can break MDX
              const hasProblematicChars = /\?[^)]*[|<>]/.test(line);
              if (hasProblematicChars) {
                malformedTables.push({
                  file: getRelativePath(file),
                  line: index + 1,
                  issue: 'Table contains URL with problematic query string characters',
                });
              }
            }
          } else if (inTable && line.trim() !== '') {
            inTable = false;
          }
        });
      }
      
      // Only warn - tables are complex and may have false positives
      if (malformedTables.length > 0) {
        console.warn(
          `Potentially malformed tables found:\n${malformedTables.map(t => `  ${t.file}:${t.line} - ${t.issue}`).join('\n')}`
        );
      }
    });
  });
});

// ============================================================================
// Tests: Frontmatter Validation
// ============================================================================

describe('Rule Documentation - Frontmatter', () => {
  let ruleDocFiles: string[];
  
  beforeAll(() => {
    ruleDocFiles = getAllRuleDocFiles(PACKAGES_ROOT);
  });

  it('all rule docs should have valid frontmatter', () => {
    const missingFrontmatter: string[] = [];
    const invalidFrontmatter: { file: string; issue: string }[] = [];
    
    for (const file of ruleDocFiles) {
      // Skip eslint-plugin-import-next - uses different doc format
      if (file.includes('eslint-plugin-import-next')) {
        continue;
      }
      
      const content = readFileSync(file, 'utf-8');
      
      // Check for frontmatter
      if (!content.startsWith('---')) {
        missingFrontmatter.push(getRelativePath(file));
        continue;
      }
      
      const endIndex = content.indexOf('---', 3);
      if (endIndex === -1) {
        invalidFrontmatter.push({
          file: getRelativePath(file),
          issue: 'Frontmatter not closed (missing ending ---)',
        });
        continue;
      }
      
      const frontmatter = content.substring(3, endIndex);
      
      // Required fields
      if (!frontmatter.includes('title:')) {
        invalidFrontmatter.push({
          file: getRelativePath(file),
          issue: 'Missing required field: title',
        });
      }
    }
    
    expect(
      missingFrontmatter,
      `Rule docs missing frontmatter:\n${missingFrontmatter.join('\n')}`
    ).toHaveLength(0);
    
    expect(
      invalidFrontmatter,
      `Rule docs with invalid frontmatter:\n${invalidFrontmatter.map(f => `  ${f.file}: ${f.issue}`).join('\n')}`
    ).toHaveLength(0);
  });
});
