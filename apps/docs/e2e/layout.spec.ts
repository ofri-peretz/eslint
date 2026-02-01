/**
 * Visual Regression Tests for Documentation Layout
 * 
 * These tests capture and compare screenshots to detect visual regressions
 * in the documentation site's layout, styling, and components.
 * 
 * CRITICAL: Tests here lock TOC styling behavior to prevent regressions.
 */

import { test, expect } from '@playwright/test';

// Breakpoints for visual testing
const BREAKPOINTS = {
  mobile: { width: 375, height: 667 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1280, height: 900 },
  largeDesktop: { width: 1920, height: 1080 },
};

test.describe('Visual Regression Tests', () => {
  test.describe('TOC Clerk Style', () => {
    test('TOC should display with purple indicator on desktop', async ({ page }) => {
      await page.setViewportSize(BREAKPOINTS.largeDesktop);
      await page.goto('/docs');
      await page.waitForLoadState('networkidle');
      
      // Scroll to trigger TOC active states
      await page.evaluate(() => window.scrollBy(0, 200));
      await page.waitForTimeout(500);

      const toc = page.locator('#nd-toc');
      await expect(toc).toBeVisible();
      await expect(toc).toHaveScreenshot('toc-clerk-style-desktop.png', {
        threshold: 0.15,
      });
    });

    test('TOC active indicator should be purple', async ({ page }) => {
      await page.setViewportSize(BREAKPOINTS.largeDesktop);
      await page.goto('/docs');
      await page.waitForLoadState('networkidle');

      // Check for active links with purple color
      const activeLink = page.locator('#nd-toc a[data-active="true"]').first();
      
      if (await activeLink.count() > 0) {
        const color = await activeLink.evaluate((el) => {
          return window.getComputedStyle(el).color;
        });
        
        // Verify it's a purple-ish color (not white/black/gray)
        expect(color).toMatch(/rgb\(\d+, \d+, \d+\)/);
        const match = color.match(/rgb\((\d+), (\d+), (\d+)\)/);
        if (match) {
          const [_, r, g, b] = match.map(Number);
          // Purple has higher R and B than G
          expect(r > g || b > g).toBe(true);
        }
      }
    });
  });

  test.describe('TOC Line Styling (Regression Lock)', () => {
    test('should NOT have visible gray rail segments (staircase lines)', async ({ page }) => {
      await page.setViewportSize(BREAKPOINTS.largeDesktop);
      await page.goto('/docs');
      await page.waitForLoadState('networkidle');

      // Check for gray rail segments - they should be hidden
      const grayLines = page.locator('#nd-toc .bg-fd-foreground\\/10');
      const count = await grayLines.count();
      
      if (count > 0) {
        // Each line should be hidden (display: none)
        for (let i = 0; i < count; i++) {
          const line = grayLines.nth(i);
          const isVisible = await line.isVisible();
          expect(isVisible, `Gray rail segment ${i} should be hidden`).toBe(false);
        }
      }
    });

    test('should NOT have visible SVG diagonal connectors', async ({ page }) => {
      await page.setViewportSize(BREAKPOINTS.largeDesktop);
      await page.goto('/docs');
      await page.waitForLoadState('networkidle');

      // Check for SVG line elements - they should be hidden
      const svgLines = page.locator('#nd-toc svg line');
      const count = await svgLines.count();
      
      if (count > 0) {
        for (let i = 0; i < count; i++) {
          const line = svgLines.nth(i);
          const isVisible = await line.isVisible();
          expect(isVisible, `SVG connector ${i} should be hidden`).toBe(false);
        }
      }
    });

    test('should have only ONE visible vertical line column (the indicator)', async ({ page }) => {
      await page.setViewportSize(BREAKPOINTS.largeDesktop);
      await page.goto('/docs');
      await page.waitForLoadState('networkidle');
      
      // Scroll to activate multiple TOC items
      await page.evaluate(() => window.scrollBy(0, 300));
      await page.waitForTimeout(500);

      // Get all visible line-like elements in TOC
      const lineInfo = await page.evaluate(() => {
        const toc = document.getElementById('nd-toc');
        if (!toc) return { error: 'TOC not found' };
        
        // Find all elements that could be lines
        const allElements = toc.querySelectorAll('*');
        const visibleLines: { x: number; width: number; className: string }[] = [];
        
        allElements.forEach(el => {
          const rect = el.getBoundingClientRect();
          const style = getComputedStyle(el);
          
          // Line-like: narrow width (1-3px) and visible
          const isNarrow = rect.width >= 1 && rect.width <= 3;
          const isVisible = style.display !== 'none' && style.visibility !== 'hidden' && rect.height > 0;
          
          // Has a background color or is the indicator
          const hasBg = style.backgroundColor !== 'rgba(0, 0, 0, 0)' && style.backgroundColor !== 'transparent';
          
          if (isNarrow && isVisible && hasBg) {
            visibleLines.push({
              x: Math.round(rect.left),
              width: Math.round(rect.width),
              className: el.className,
            });
          }
        });
        
        // Group by x position to find unique vertical columns
        const xPositions = new Set(visibleLines.map(l => l.x));
        
        return {
          visibleLineCount: visibleLines.length,
          uniqueXPositions: Array.from(xPositions).sort((a, b) => a - b),
          lines: visibleLines,
        };
      });

      if ('error' in lineInfo) {
        throw new Error(lineInfo.error);
      }

      // There should be only 1 unique x position (the purple indicator column)
      // Multiple x positions = staircase effect (regression!)
      expect(
        lineInfo.uniqueXPositions.length,
        `Expected 1 vertical line column, found ${lineInfo.uniqueXPositions.length} at positions: ${lineInfo.uniqueXPositions.join(', ')}`
      ).toBeLessThanOrEqual(1);
    });

    test('TOC indicator should have smooth transition', async ({ page }) => {
      await page.setViewportSize(BREAKPOINTS.largeDesktop);
      await page.goto('/docs');
      await page.waitForLoadState('networkidle');

      // Find the purple indicator
      const indicator = page.locator('#nd-toc .bg-fd-primary').first();
      
      if (await indicator.count() > 0) {
        const transition = await indicator.evaluate((el) => {
          return getComputedStyle(el).transitionProperty;
        });
        
        // Should have transition on top and height
        expect(transition).toMatch(/top|height|all/i);
      }
    });
  });

  test.describe('Responsive Layout', () => {
    test('Full page - mobile viewport', async ({ page }) => {
      await page.setViewportSize(BREAKPOINTS.mobile);
      await page.goto('/docs');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('docs-page-mobile.png', {
        threshold: 0.15,
        fullPage: false,
      });
    });

    test('Full page - tablet viewport', async ({ page }) => {
      await page.setViewportSize(BREAKPOINTS.tablet);
      await page.goto('/docs');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('docs-page-tablet.png', {
        threshold: 0.15,
        fullPage: false,
      });
    });

    test('Full page - desktop viewport', async ({ page }) => {
      await page.setViewportSize(BREAKPOINTS.desktop);
      await page.goto('/docs');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('docs-page-desktop.png', {
        threshold: 0.15,
        fullPage: false,
      });
    });

    test('Full page - large desktop viewport', async ({ page }) => {
      await page.setViewportSize(BREAKPOINTS.largeDesktop);
      await page.goto('/docs');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('docs-page-large-desktop.png', {
        threshold: 0.15,
        fullPage: false,
      });
    });
  });

  test.describe('Component Visibility', () => {
    test('Side TOC visible on desktop, hidden on mobile', async ({ page }) => {
      // Desktop - TOC visible
      await page.setViewportSize(BREAKPOINTS.largeDesktop);
      await page.goto('/docs');
      await page.waitForLoadState('networkidle');

      const sideToc = page.locator('#nd-toc');
      await expect(sideToc).toBeVisible();

      // Mobile - TOC hidden
      await page.setViewportSize(BREAKPOINTS.mobile);
      await page.waitForTimeout(500);
      await expect(sideToc).not.toBeVisible();
    });

    test('Sidebar visible on desktop', async ({ page }) => {
      await page.setViewportSize(BREAKPOINTS.desktop);
      await page.goto('/docs');
      await page.waitForLoadState('networkidle');

      const sidebar = page.locator('#nd-sidebar');
      await expect(sidebar).toBeAttached();
    });
  });

  test.describe('Brand Colors', () => {
    test('Primary color CSS variable is defined', async ({ page }) => {
      await page.goto('/docs');
      await page.waitForLoadState('networkidle');

      const primaryColor = await page.evaluate(() => {
        return getComputedStyle(document.documentElement)
          .getPropertyValue('--color-fd-primary').trim();
      });

      expect(primaryColor).toBeTruthy();
      expect(primaryColor.length).toBeGreaterThan(0);
      // Should contain hsl, rgb, or hex (our purple color)
      expect(primaryColor).toMatch(/hsl|rgb|#/i);
    });

    test('Foreground color CSS variable is defined', async ({ page }) => {
      await page.goto('/docs');
      await page.waitForLoadState('networkidle');

      const foregroundColor = await page.evaluate(() => {
        return getComputedStyle(document.documentElement)
          .getPropertyValue('--color-fd-foreground').trim();
      });

      expect(foregroundColor).toBeTruthy();
      expect(foregroundColor.length).toBeGreaterThan(0);
    });
  });

  test.describe('Dark Mode', () => {
    test('Dark mode styling applied correctly', async ({ page }) => {
      await page.setViewportSize(BREAKPOINTS.desktop);
      await page.goto('/docs');
      await page.waitForLoadState('networkidle');

      // Toggle to dark mode
      await page.evaluate(() => {
        document.documentElement.classList.add('dark');
      });
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('docs-page-dark-mode.png', {
        threshold: 0.15,
        fullPage: false,
      });
    });
  });
});
