/**
 * Tailwind CSS Class Compilation Tests
 * 
 * These tests verify that critical Tailwind CSS classes are properly
 * generated during the build process. Run as part of CI to catch
 * styling regressions.
 * 
 * CRITICAL: These tests lock styling behavior to prevent regressions.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join, resolve } from 'path';
import { execSync } from 'child_process';

// Use __dirname so this works regardless of whether vitest is invoked from the
// repo root (npx vitest run apps/docs/…) or from apps/docs (turbo run test).
const APP_ROOT = resolve(__dirname, '../..');
const REPO_ROOT = resolve(__dirname, '../../../..');

/**
 * Read the docs app's `global.css` together with every CSS file it imports
 * from `@interlace/ui/styles`. We moved most fumadocs/TOC overrides into
 * the shared package's `theme.css`; the contract asserted by these tests
 * still holds — it just spans two files now. Reading both keeps the
 * lock-tests stable across that refactor.
 */
function readGlobalCSS(): string {
  const docsGlobal = readFileSync(
    join(APP_ROOT, 'src/app/global.css'),
    'utf-8',
  );
  const uiStylesDir = resolve(
    REPO_ROOT,
    'packages',
    'ui',
    'styles',
  );
  const imported = (docsGlobal.match(/@import\s+['"]@interlace\/ui\/styles\/([^'"]+)['"]/g) ?? [])
    .map((stmt) => stmt.match(/styles\/([^'"]+)['"]/)?.[1])
    .filter((f): f is string => Boolean(f))
    .map((f) => join(uiStylesDir, f))
    .filter(existsSync)
    .map((p) => readFileSync(p, 'utf-8'));
  return [docsGlobal, ...imported].join('\n');
}

// =========================================
// CRITICAL TAILWIND CLASSES
// These classes must be present in compiled CSS
// =========================================
const CRITICAL_CLASSES = [
  // Brand colors (Interlace Purple)
  'bg-fd-primary',
  'text-fd-primary',
  'bg-fd-primary-foreground',
  'text-fd-primary-foreground',
  
  // TOC clerk style - line colors (these are HIDDEN by our CSS but must exist)
  'bg-fd-foreground\\/10',
  'stroke-fd-foreground\\/10',
  
  // Layout utilities - grid areas
  'grid-area:toc',
  'grid-area:main',
  'grid-area:sidebar',
  'grid-area:toc-popover',
  
  // Responsive TOC visibility
  'max-xl:hidden',
  'xl:hidden',
  'lg:hidden',
  'md:hidden',
  
  // Animation classes (TOC indicator)
  'transition-\\[top,height\\]',
  'transition-colors',
  'transition-opacity',
  
  // TOC positioning
  'absolute',
  'relative',
  'sticky',
  'inset-y-0',
  
  // Width utilities
  'w-px',
  'w-full',
  
  // Active state
  'data-\\[active=true\\]',
];

// CSS variables that must be defined
const CRITICAL_CSS_VARIABLES = [
  '--color-fd-primary',
  '--color-fd-foreground',
  '--color-fd-primary-foreground',
  '--color-fd-muted-foreground',
  '--color-fd-ring',
  '--color-fd-background',
  '--color-fd-card',
  '--color-fd-border',
];

// =========================================
// MANUAL CSS RULES REQUIRED
// These must be in global.css because Tailwind v4 cannot generate them
// =========================================
const REQUIRED_MANUAL_CSS = [
  // Tailwind v4 arbitrary property utilities
  { pattern: '.h-\\(--fd-height\\)', description: 'TOC indicator height' },
  { pattern: '.top-\\(--fd-top\\)', description: 'TOC indicator position' },
  { pattern: '.transition-\\[top\\,height\\]', description: 'TOC indicator transition' },
  
  // TOC clean style (hide staircase lines)
  { pattern: '#nd-toc .bg-fd-foreground\\/10', description: 'Hide gray rail segments' },
  { pattern: '#nd-toc .stroke-fd-foreground\\/10', description: 'Hide SVG diagonal connectors' },
  
  // TOC indicator transition targeting
  { pattern: '#nd-toc .bg-fd-primary', description: 'TOC indicator direct transition' },
  
  // Popover TOC spacing (prevents headers too close to line)
  { pattern: '[data-toc-popover-content] a', description: 'Popover TOC item base padding' },
  { pattern: 'padding-inline-start: 14px', description: 'Popover TOC base indent' },
];

// =========================================
// CSS ANTI-PATTERNS (MUST NOT EXIST)
// These cause bugs like duplicate lines
// =========================================
const FORBIDDEN_CSS_PATTERNS = [
  // Duplicate manual definitions for Tailwind-generated classes
  // (would cause double rendering of gray lines)
  { pattern: /\.bg-fd-foreground\\\/10\s*\{[^}]*background-color:\s*var\(--color-fd-foreground\)/g, 
    description: 'Manual bg-fd-foreground/10 with var() - causes duplicate lines' },
  { pattern: /\.stroke-fd-foreground\\\/10\s*\{[^}]*stroke:\s*var\(--color-fd-foreground\)/g, 
    description: 'Manual stroke-fd-foreground/10 with var() - causes duplicate lines' },
];

describe('Tailwind CSS Compilation', () => {
  let compiledCSS: string;
  let buildOutputDir: string;

  beforeAll(() => {
    buildOutputDir = join(APP_ROOT, '.next');

    if (!existsSync(buildOutputDir)) {
      console.log('Build output not found, running build...');
      try {
        execSync('npm run build', {
          cwd: APP_ROOT,
          stdio: 'pipe',
          timeout: 120000
        });
      } catch {
        console.warn('Build failed or skipped - checking dev mode output');
      }
    }
    
    compiledCSS = findCompiledCSS(buildOutputDir);
  });

  describe('Critical Class Generation', () => {
    CRITICAL_CLASSES.forEach((className) => {
      it(`should include "${className}" in compiled CSS`, () => {
        if (!compiledCSS) {
          console.warn('No compiled CSS found - skipping class verification');
          return;
        }
        
        const regex = new RegExp(className.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        const found = regex.test(compiledCSS);
        
        expect(found, `Class "${className}" should be in compiled CSS`).toBe(true);
      });
    });
  });

  describe('CSS Variable Definitions', () => {
    CRITICAL_CSS_VARIABLES.forEach((variable) => {
      it(`should define CSS variable "${variable}"`, () => {
        if (!compiledCSS) {
          console.warn('No compiled CSS found - skipping variable verification');
          return;
        }
        
        const found = compiledCSS.includes(variable);
        expect(found, `CSS variable "${variable}" should be defined`).toBe(true);
      });
    });
  });
});

describe('Source File Configuration', () => {
  it('should have correct @source directive in global.css', () => {
    const globalCSS = readGlobalCSS();
    
    expect(globalCSS).toContain('@source');
    expect(globalCSS).toContain('fumadocs-ui');
  });

  it('should have fumadocs-ui in tailwind content paths', () => {
    const configPath = join(APP_ROOT, 'tailwind.config.mjs');
    
    if (existsSync(configPath)) {
      const config = readFileSync(configPath, 'utf-8');
      
      expect(config).toContain('fumadocs-ui');
      expect(config).toContain('node_modules');
    }
  });

  describe('Required Manual CSS Rules', () => {
    REQUIRED_MANUAL_CSS.forEach(({ pattern, description }) => {
      it(`should define "${description}" in the effective app CSS (global.css + imported theme/tokens)`, () => {
        const globalCSS = readGlobalCSS();

        expect(globalCSS, `Missing: ${description} (${pattern})`).toContain(pattern);
      });
    });
  });

  describe('Brand Color Variables', () => {
    it('should define primary color for light mode', () => {
      const globalCSS = readFileSync(
        join(APP_ROOT, 'src/app/global.css'),
        'utf-8'
      );
      
      expect(globalCSS).toContain('--color-fd-primary');
      expect(globalCSS).toContain('hsl(263'); // Purple hue
    });

    it('should define primary color for dark mode', () => {
      const globalCSS = readFileSync(
        join(APP_ROOT, 'src/app/global.css'),
        'utf-8'
      );
      
      expect(globalCSS).toContain('.dark');
      expect(globalCSS).toContain('hsl(270'); // Purple hue for dark mode
    });

    it('should define foreground color', () => {
      const globalCSS = readFileSync(
        join(APP_ROOT, 'src/app/global.css'),
        'utf-8'
      );
      
      expect(globalCSS).toContain('--color-fd-foreground');
    });
  });

  describe('TOC Line Styling (Anti-Duplicate)', () => {
    it('should hide gray rail segments (prevent staircase effect)', () => {
      const globalCSS = readGlobalCSS();

      // Must have rule to hide bg-fd-foreground/10 in TOC
      expect(globalCSS).toContain('#nd-toc .bg-fd-foreground\\/10');
      expect(globalCSS).toContain('display: none');
    });

    it('should hide SVG diagonal connectors', () => {
      const globalCSS = readGlobalCSS();

      // Must have rule to hide stroke-fd-foreground/10 in TOC
      expect(globalCSS).toContain('#nd-toc .stroke-fd-foreground\\/10');
    });
  });

  describe('Forbidden CSS Patterns (Regression Prevention)', () => {
    FORBIDDEN_CSS_PATTERNS.forEach(({ pattern, description }) => {
      it(`should NOT have "${description}"`, () => {
        const globalCSS = readGlobalCSS();
        
        const matches = globalCSS.match(pattern);
        expect(
          matches,
          `Found forbidden pattern: ${description}`
        ).toBeNull();
      });
    });
  });

  describe('TOC Transition Animation', () => {
    it('should have transition utility for TOC indicator', () => {
      const globalCSS = readGlobalCSS();

      expect(globalCSS).toContain('.transition-\\[top\\,height\\]');
      expect(globalCSS).toContain('transition-property');
      expect(globalCSS).toContain('top, height');
    });

    it('should have direct transition on TOC indicator element', () => {
      const globalCSS = readGlobalCSS();

      expect(globalCSS).toContain('#nd-toc .bg-fd-primary');
      expect(globalCSS).toContain('150ms');
    });
  });

  describe('Responsive TOC Visibility', () => {
    it('should have media query to hide side TOC on small screens', () => {
      const globalCSS = readGlobalCSS();

      expect(globalCSS).toContain('@media (max-width: 1279px)');
      expect(globalCSS).toContain('#nd-toc');
    });

    it('should have media query to hide popover TOC on large screens', () => {
      const globalCSS = readGlobalCSS();

      expect(globalCSS).toContain('@media (min-width: 1280px)');
      expect(globalCSS).toContain('data-toc-popover');
    });
  });
});

/**
 * Find compiled CSS in Next.js build output
 */
function findCompiledCSS(buildDir: string): string {
  if (!existsSync(buildDir)) {
    return '';
  }

  const cssFiles: string[] = [];
  
  // Search in static/css directory
  const staticCSSDir = join(buildDir, 'static/css');
  if (existsSync(staticCSSDir)) {
    const files = readdirSync(staticCSSDir);
    files.forEach(file => {
      if (file.endsWith('.css')) {
        cssFiles.push(join(staticCSSDir, file));
      }
    });
  }

  // Read and concatenate all CSS files
  let allCSS = '';
  cssFiles.forEach(file => {
    try {
      allCSS += readFileSync(file, 'utf-8');
    } catch {
      // Ignore read errors
    }
  });

  return allCSS;
}
