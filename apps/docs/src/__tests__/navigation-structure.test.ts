/**
 * Navigation Structure Tests
 * 
 * These tests verify the integrity of the documentation navigation structure.
 * They prevent:
 * - Broken sidebar links (pages listed in meta.json that don't exist)
 * - Orphaned content (MDX files not accessible via navigation)
 * - Malformed separator strings
 * - Invalid navigation hierarchy
 * 
 * CRITICAL: These tests lock navigation structure to prevent regressions.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join, basename, dirname } from 'path';

// ============================================================================
// Configuration
// ============================================================================

const CONTENT_ROOT = join(process.cwd(), 'content/docs/getting-started');

// Pattern for valid separator strings: ---Name--- or ---Name Name---
const SEPARATOR_PATTERN = /^---[A-Za-z][A-Za-z0-9\s]*---$/;

// ============================================================================
// Utility Functions
// ============================================================================

interface MetaJson {
  title: string;
  description?: string;
  pages?: string[];
  root?: boolean;
  defaultOpen?: boolean;
  icon?: string;
}

function loadMetaJson(dir: string): MetaJson | null {
  const metaPath = join(dir, 'meta.json');
  if (!existsSync(metaPath)) {
    return null;
  }
  try {
    return JSON.parse(readFileSync(metaPath, 'utf-8'));
  } catch {
    return null;
  }
}

function getAllMdxFiles(dir: string): string[] {
  const files: string[] = [];
  
  if (!existsSync(dir)) {
    return files;
  }
  
  const entries = readdirSync(dir);
  
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    
    if (stat.isDirectory()) {
      files.push(...getAllMdxFiles(fullPath));
    } else if (entry.endsWith('.mdx')) {
      // Return relative path from content root
      files.push(fullPath.replace(CONTENT_ROOT + '/', '').replace('.mdx', ''));
    }
  }
  
  return files;
}

function getAllPagesFromMeta(dir: string, prefix = ''): string[] {
  const pages: string[] = [];
  const meta = loadMetaJson(dir);
  
  if (!meta?.pages) {
    return pages;
  }
  
  for (const page of meta.pages) {
    // Skip separators
    if (page.startsWith('---') && page.endsWith('---')) {
      continue;
    }
    
    // Handle nested paths (e.g., "concepts/ai-integration")
    if (page.includes('/')) {
      pages.push(prefix ? `${prefix}/${page}` : page);
    } else {
      pages.push(prefix ? `${prefix}/${page}` : page);
    }
  }
  
  // Also check subdirectories
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    if (statSync(fullPath).isDirectory() && entry !== '.plan') {
      const subMeta = loadMetaJson(fullPath);
      if (subMeta?.pages) {
        const subPages = getAllPagesFromMeta(fullPath, prefix ? `${prefix}/${entry}` : entry);
        pages.push(...subPages);
      }
    }
  }
  
  return pages;
}

// ============================================================================
// Tests: Meta.json Structure
// ============================================================================

describe('Navigation Structure - Meta.json Validity', () => {
  describe('Getting Started meta.json', () => {
    it('should exist and be valid JSON', () => {
      const meta = loadMetaJson(CONTENT_ROOT);
      expect(meta).not.toBeNull();
      expect(meta?.title).toBe('Getting Started');
    });

    it('should have required properties', () => {
      const meta = loadMetaJson(CONTENT_ROOT);
      expect(meta).toHaveProperty('title');
      expect(meta).toHaveProperty('pages');
      expect(Array.isArray(meta?.pages)).toBe(true);
    });

    it('should have pages array with at least 5 entries', () => {
      const meta = loadMetaJson(CONTENT_ROOT);
      expect(meta?.pages?.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe('Concepts meta.json', () => {
    it('should exist and be valid JSON', () => {
      const meta = loadMetaJson(join(CONTENT_ROOT, 'concepts'));
      expect(meta).not.toBeNull();
      expect(meta?.title).toBe('Concepts');
    });
  });

  describe('Advanced meta.json', () => {
    it('should exist and be valid JSON', () => {
      const meta = loadMetaJson(join(CONTENT_ROOT, 'advanced'));
      expect(meta).not.toBeNull();
      expect(meta?.title).toBe('Advanced');
    });
  });
});

// ============================================================================
// Tests: Page Existence
// ============================================================================

describe('Navigation Structure - Page Existence', () => {
  let rootMeta: MetaJson | null;
  
  beforeAll(() => {
    rootMeta = loadMetaJson(CONTENT_ROOT);
  });

  describe('All pages in meta.json should exist as MDX files', () => {
    it('should have all root-level pages', () => {
      const missingPages: string[] = [];
      
      for (const page of rootMeta?.pages ?? []) {
        // Skip separators
        if (page.startsWith('---') && page.endsWith('---')) {
          continue;
        }
        
        // Check if file exists
        const pagePath = join(CONTENT_ROOT, `${page}.mdx`);
        if (!existsSync(pagePath)) {
          missingPages.push(page);
        }
      }
      
      expect(missingPages, `Missing MDX files: ${missingPages.join(', ')}`).toHaveLength(0);
    });

    it('should have all concept pages', () => {
      const conceptsMeta = loadMetaJson(join(CONTENT_ROOT, 'concepts'));
      const missingPages: string[] = [];
      
      for (const page of conceptsMeta?.pages ?? []) {
        if (page.startsWith('---') && page.endsWith('---')) {
          continue;
        }
        
        const pagePath = join(CONTENT_ROOT, 'concepts', `${page}.mdx`);
        if (!existsSync(pagePath)) {
          missingPages.push(`concepts/${page}`);
        }
      }
      
      expect(missingPages, `Missing MDX files: ${missingPages.join(', ')}`).toHaveLength(0);
    });

    it('should have all advanced pages', () => {
      const advancedMeta = loadMetaJson(join(CONTENT_ROOT, 'advanced'));
      const missingPages: string[] = [];
      
      for (const page of advancedMeta?.pages ?? []) {
        if (page.startsWith('---') && page.endsWith('---')) {
          continue;
        }
        
        const pagePath = join(CONTENT_ROOT, 'advanced', `${page}.mdx`);
        if (!existsSync(pagePath)) {
          missingPages.push(`advanced/${page}`);
        }
      }
      
      expect(missingPages, `Missing MDX files: ${missingPages.join(', ')}`).toHaveLength(0);
    });
  });
});

// ============================================================================
// Tests: No Orphaned Content
// ============================================================================

describe('Navigation Structure - No Orphaned Content', () => {
  it('should have all MDX files listed in some meta.json', () => {
    const allMdxFiles = getAllMdxFiles(CONTENT_ROOT);
    const allPagesInMeta = getAllPagesFromMeta(CONTENT_ROOT);
    
    // Index files are implicitly included
    const normalizedMeta = allPagesInMeta.map(p => p === 'index' ? 'index' : p);
    
    const orphanedFiles: string[] = [];
    
    for (const mdxFile of allMdxFiles) {
      // Normalize the path for comparison
      const normalized = mdxFile.replace(/\/index$/, '');
      
      // Check various forms of the path
      const isListed = normalizedMeta.some(metaPage => {
        const normalizedMeta = metaPage.replace(/\/index$/, '');
        return normalizedMeta === mdxFile || 
               normalizedMeta === normalized ||
               `${normalizedMeta}/index` === mdxFile;
      });
      
      if (!isListed) {
        // Allow index files in subdirectories
        if (mdxFile.endsWith('/index') || mdxFile === 'index') {
          continue;
        }
        orphanedFiles.push(mdxFile);
      }
    }
    
    expect(
      orphanedFiles,
      `Orphaned MDX files (not in navigation): ${orphanedFiles.join(', ')}`
    ).toHaveLength(0);
  });
});

// ============================================================================
// Tests: Separator Validation
// ============================================================================

describe('Navigation Structure - Separator Strings', () => {
  it('should have valid separator format in root meta.json', () => {
    const meta = loadMetaJson(CONTENT_ROOT);
    const invalidSeparators: string[] = [];
    
    for (const page of meta?.pages ?? []) {
      if (page.startsWith('---') || page.endsWith('---')) {
        if (!SEPARATOR_PATTERN.test(page)) {
          invalidSeparators.push(page);
        }
      }
    }
    
    expect(
      invalidSeparators,
      `Invalid separators: ${invalidSeparators.join(', ')}. Expected format: ---Name---`
    ).toHaveLength(0);
  });

  it('should have valid separator format in concepts meta.json', () => {
    const meta = loadMetaJson(join(CONTENT_ROOT, 'concepts'));
    const invalidSeparators: string[] = [];
    
    for (const page of meta?.pages ?? []) {
      if (page.startsWith('---') || page.endsWith('---')) {
        if (!SEPARATOR_PATTERN.test(page)) {
          invalidSeparators.push(page);
        }
      }
    }
    
    expect(
      invalidSeparators,
      `Invalid separators: ${invalidSeparators.join(', ')}. Expected format: ---Name---`
    ).toHaveLength(0);
  });
});

// ============================================================================
// Tests: Expected Core Pages
// ============================================================================

describe('Navigation Structure - Required Pages', () => {
  it('should include all essential setup pages', () => {
    const meta = loadMetaJson(CONTENT_ROOT);
    const pages = meta?.pages ?? [];
    
    const essentialPages = [
      'index',
      'installation',
      'configuration',
      'editor-integration',
      'troubleshooting',
    ];
    
    for (const essential of essentialPages) {
      expect(pages, `Missing essential page: ${essential}`).toContain(essential);
    }
  });

  it('should include concept pages', () => {
    const meta = loadMetaJson(CONTENT_ROOT);
    const pages = meta?.pages ?? [];
    
    const conceptPages = [
      'concepts/ai-integration',
      'concepts/ast-fundamentals',
      'concepts/security-metadata',
    ];
    
    for (const concept of conceptPages) {
      expect(pages, `Missing concept page: ${concept}`).toContain(concept);
    }
  });

  it('should include advanced pages', () => {
    const meta = loadMetaJson(CONTENT_ROOT);
    const pages = meta?.pages ?? [];
    
    expect(pages).toContain('advanced/ci-cd');
  });
});
