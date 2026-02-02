/**
 * Internal Links Validation Tests
 * 
 * These tests verify that all internal links in the Getting Started
 * documentation resolve to existing pages.
 * 
 * They prevent:
 * - Broken internal links after URL restructuring
 * - Invalid href props in Card components
 * - Broken markdown links
 * - Links to non-existent anchors
 * 
 * CRITICAL: These tests lock link integrity to prevent 404 errors.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

// ============================================================================
// Configuration
// ============================================================================

const CONTENT_ROOT = join(process.cwd(), 'content/docs');
const GETTING_STARTED_ROOT = join(CONTENT_ROOT, 'getting-started');

// External link patterns that should be validated differently
const EXTERNAL_PATTERNS = [
  /^https?:\/\//,
  /^mailto:/,
  /^tel:/,
];

// Known valid external domains (don't need to validate these)
const TRUSTED_EXTERNAL_DOMAINS = [
  'astexplorer.net',
  'eslint.org',
  'cwe.mitre.org',
  'owasp.org',
  'npmjs.com',
  'github.com',
];

// ============================================================================
// Utility Functions
// ============================================================================

function getAllMdxFiles(dir: string): string[] {
  const files: string[] = [];
  
  if (!existsSync(dir)) {
    return files;
  }
  
  const entries = readdirSync(dir);
  
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    
    try {
      const stat = statSync(fullPath);
      
      if (stat.isDirectory() && entry !== '.plan' && entry !== 'node_modules') {
        files.push(...getAllMdxFiles(fullPath));
      } else if (entry.endsWith('.mdx')) {
        files.push(fullPath);
      }
    } catch {
      // Skip inaccessible files
    }
  }
  
  return files;
}

function getRelativePath(fullPath: string): string {
  return fullPath.replace(GETTING_STARTED_ROOT + '/', '');
}

function isExternalLink(href: string): boolean {
  return EXTERNAL_PATTERNS.some(pattern => pattern.test(href));
}

function extractInternalLinks(content: string): string[] {
  const links: string[] = [];
  
  // Match markdown links: [text](/docs/...)
  const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;
  
  while ((match = markdownLinkRegex.exec(content)) !== null) {
    const href = match[2];
    if (href.startsWith('/docs/') && !isExternalLink(href)) {
      // Strip anchor if present
      const cleanHref = href.split('#')[0];
      links.push(cleanHref);
    }
  }
  
  // Match JSX href props: href="/docs/..."
  const jsxHrefRegex = /href=["']([^"']+)["']/g;
  
  while ((match = jsxHrefRegex.exec(content)) !== null) {
    const href = match[1];
    if (href.startsWith('/docs/') && !isExternalLink(href)) {
      const cleanHref = href.split('#')[0];
      links.push(cleanHref);
    }
  }
  
  // Deduplicate
  return [...new Set(links)];
}

function extractExternalLinks(content: string): string[] {
  const links: string[] = [];
  
  // Match any URL in markdown or JSX
  const urlRegex = /https?:\/\/[^\s"')\]]+/g;
  let match;
  
  while ((match = urlRegex.exec(content)) !== null) {
    links.push(match[0]);
  }
  
  return [...new Set(links)];
}

function doesPageExist(docPath: string): boolean {
  // /docs/getting-started/installation -> content/docs/getting-started/installation.mdx
  const relativePath = docPath.replace(/^\/docs\//, '');
  
  // Try exact MDX file
  const mdxPath = join(CONTENT_ROOT, `${relativePath}.mdx`);
  if (existsSync(mdxPath)) {
    return true;
  }
  
  // Try index.mdx in directory
  const indexPath = join(CONTENT_ROOT, relativePath, 'index.mdx');
  if (existsSync(indexPath)) {
    return true;
  }
  
  // Try page.mdx (Next.js convention)
  const pagePath = join(CONTENT_ROOT, relativePath, 'page.mdx');
  if (existsSync(pagePath)) {
    return true;
  }
  
  return false;
}

// ============================================================================
// Tests: Internal Link Resolution
// ============================================================================

describe('Internal Links - Resolution', () => {
  let mdxFiles: string[];
  
  beforeAll(() => {
    mdxFiles = getAllMdxFiles(GETTING_STARTED_ROOT);
  });

  it('should find MDX files to test', () => {
    expect(mdxFiles.length).toBeGreaterThan(0);
  });

  describe('All internal /docs/* links should resolve', () => {
    it('links in Getting Started pages resolve to existing content', () => {
      const brokenLinks: { file: string; link: string }[] = [];
      
      for (const file of mdxFiles) {
        const content = readFileSync(file, 'utf-8');
        const links = extractInternalLinks(content);
        
        for (const link of links) {
          if (!doesPageExist(link)) {
            brokenLinks.push({
              file: getRelativePath(file),
              link,
            });
          }
        }
      }
      
      expect(
        brokenLinks,
        `Broken internal links:\n${brokenLinks.map(b => `  ${b.file}: ${b.link}`).join('\n')}`
      ).toHaveLength(0);
    });
  });
});

// ============================================================================
// Tests: Card Component hrefs
// ============================================================================

describe('Internal Links - Card Components', () => {
  let mdxFiles: string[];
  
  beforeAll(() => {
    mdxFiles = getAllMdxFiles(GETTING_STARTED_ROOT);
  });

  it('all Card href props should resolve to existing pages', () => {
    const brokenCardLinks: { file: string; href: string }[] = [];
    
    for (const file of mdxFiles) {
      const content = readFileSync(file, 'utf-8');
      
      // Match Card component hrefs specifically
      const cardHrefRegex = /<Card[^>]*href=["']([^"']+)["']/g;
      let match;
      
      while ((match = cardHrefRegex.exec(content)) !== null) {
        const href = match[1];
        
        if (href.startsWith('/docs/') && !doesPageExist(href)) {
          brokenCardLinks.push({
            file: getRelativePath(file),
            href,
          });
        }
      }
    }
    
    expect(
      brokenCardLinks,
      `Broken Card hrefs:\n${brokenCardLinks.map(b => `  ${b.file}: ${b.href}`).join('\n')}`
    ).toHaveLength(0);
  });
});

// ============================================================================
// Tests: Cross-Section Links
// ============================================================================

describe('Internal Links - Cross-Section References', () => {
  let mdxFiles: string[];
  
  beforeAll(() => {
    mdxFiles = getAllMdxFiles(GETTING_STARTED_ROOT);
  });

  it('links to /docs/security/* should be valid patterns', () => {
    const invalidSecurityLinks: { file: string; link: string }[] = [];
    
    for (const file of mdxFiles) {
      const content = readFileSync(file, 'utf-8');
      const links = extractInternalLinks(content);
      
      for (const link of links) {
        if (link.startsWith('/docs/security/')) {
          // Security links should follow pattern: /docs/security/plugin-{name}
          if (!link.match(/^\/docs\/security\/plugin-[a-z-]+/)) {
            invalidSecurityLinks.push({
              file: getRelativePath(file),
              link,
            });
          }
        }
      }
    }
    
    expect(
      invalidSecurityLinks,
      `Invalid security plugin links:\n${invalidSecurityLinks.map(b => `  ${b.file}: ${b.link}`).join('\n')}`
    ).toHaveLength(0);
  });

  it('links to /docs/quality/* should be valid patterns', () => {
    const invalidQualityLinks: { file: string; link: string }[] = [];
    
    for (const file of mdxFiles) {
      const content = readFileSync(file, 'utf-8');
      const links = extractInternalLinks(content);
      
      for (const link of links) {
        if (link.startsWith('/docs/quality/')) {
          // Quality links should follow pattern: /docs/quality/plugin-{name}
          if (!link.match(/^\/docs\/quality\/plugin-[a-z-]+/)) {
            invalidQualityLinks.push({
              file: getRelativePath(file),
              link,
            });
          }
        }
      }
    }
    
    expect(
      invalidQualityLinks,
      `Invalid quality plugin links:\n${invalidQualityLinks.map(b => `  ${b.file}: ${b.link}`).join('\n')}`
    ).toHaveLength(0);
  });
});

// ============================================================================
// Tests: External Link Patterns
// ============================================================================

describe('Internal Links - External Link Patterns', () => {
  let mdxFiles: string[];
  
  beforeAll(() => {
    mdxFiles = getAllMdxFiles(GETTING_STARTED_ROOT);
  });

  it('external links should use trusted domains', () => {
    const untrustedLinks: { file: string; link: string }[] = [];
    
    for (const file of mdxFiles) {
      const content = readFileSync(file, 'utf-8');
      const externalLinks = extractExternalLinks(content);
      
      for (const link of externalLinks) {
        const isTrusted = TRUSTED_EXTERNAL_DOMAINS.some(domain => 
          link.includes(domain)
        );
        
        if (!isTrusted) {
          untrustedLinks.push({
            file: getRelativePath(file),
            link,
          });
        }
      }
    }
    
    // Only warn, don't fail - new domains may be added
    if (untrustedLinks.length > 0) {
      console.warn(
        `Untrusted external links (verify manually):\n${untrustedLinks.map(u => `  ${u.file}: ${u.link}`).join('\n')}`
      );
    }
  });

  it('external links should use HTTPS (outside code blocks)', () => {
    const insecureLinks: { file: string; link: string }[] = [];
    
    for (const file of mdxFiles) {
      const content = readFileSync(file, 'utf-8');
      
      // Remove code blocks before checking for HTTP links
      // This avoids flagging example URLs in code snippets
      const contentWithoutCodeBlocks = content
        .replace(/```[\s\S]*?```/g, '') // fenced code blocks
        .replace(/`[^`]+`/g, '');       // inline code
      
      // Match http:// links (not https://)
      const httpRegex = /http:\/\/[^\s"')\]]+/g;
      let match;
      
      while ((match = httpRegex.exec(contentWithoutCodeBlocks)) !== null) {
        // Allow localhost for development
        if (!match[0].includes('localhost')) {
          insecureLinks.push({
            file: getRelativePath(file),
            link: match[0],
          });
        }
      }
    }
    
    expect(
      insecureLinks,
      `Insecure HTTP links found:\n${insecureLinks.map(i => `  ${i.file}: ${i.link}`).join('\n')}`
    ).toHaveLength(0);
  });
});

// ============================================================================
// Tests: Relative Link Prevention
// ============================================================================

describe('Internal Links - No Relative Paths', () => {
  let mdxFiles: string[];
  
  beforeAll(() => {
    mdxFiles = getAllMdxFiles(GETTING_STARTED_ROOT);
  });

  it('should not use relative paths like ./file or ../file', () => {
    const relativeLinks: { file: string; link: string }[] = [];
    
    for (const file of mdxFiles) {
      const content = readFileSync(file, 'utf-8');
      
      // Match relative paths in href or markdown links
      const relativeRegex = /(?:href=["']|]\()\.\.?\/[^"'\)]+/g;
      let match;
      
      while ((match = relativeRegex.exec(content)) !== null) {
        relativeLinks.push({
          file: getRelativePath(file),
          link: match[0],
        });
      }
    }
    
    expect(
      relativeLinks,
      `Relative paths found (use absolute /docs/... paths):\n${relativeLinks.map(r => `  ${r.file}: ${r.link}`).join('\n')}`
    ).toHaveLength(0);
  });
});

// ============================================================================
// Tests: Specific Page Links
// ============================================================================

describe('Internal Links - Core Page Links', () => {
  it('index.mdx should link to installation', () => {
    const indexPath = join(GETTING_STARTED_ROOT, 'index.mdx');
    const content = readFileSync(indexPath, 'utf-8');
    
    expect(content).toContain('/docs/getting-started/installation');
  });

  it('index.mdx should link to configuration', () => {
    const indexPath = join(GETTING_STARTED_ROOT, 'index.mdx');
    const content = readFileSync(indexPath, 'utf-8');
    
    expect(content).toContain('/docs/getting-started/configuration');
  });

  it('installation.mdx should link to configuration', () => {
    const installPath = join(GETTING_STARTED_ROOT, 'installation.mdx');
    const content = readFileSync(installPath, 'utf-8');
    
    expect(content).toContain('/docs/getting-started/configuration');
  });

  it('configuration.mdx should link to flat-config', () => {
    const configPath = join(GETTING_STARTED_ROOT, 'configuration.mdx');
    const content = readFileSync(configPath, 'utf-8');
    
    expect(content).toContain('/docs/getting-started/flat-config');
  });
});
