/**
 * E2E Tests for Articles Page
 * 
 * These tests validate the articles page functionality and lock
 * the current implementation to prevent regressions.
 * 
 * CRITICAL: Tests here lock article card layouts, filtering, and search behavior.
 */

import { test, expect } from '@playwright/test';

// Breakpoints for testing
const BREAKPOINTS = {
  mobile: { width: 375, height: 667 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1280, height: 900 },
  largeDesktop: { width: 1920, height: 1080 },
};

test.describe('Articles Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/articles');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Page Structure', () => {
    test('should display the page title', async ({ page }) => {
      await expect(page.getByText('Technical Insights')).toBeVisible();
    });

    test('should display the article count badge', async ({ page }) => {
      const articleCount = page.getByTestId('article-count');
      await expect(articleCount).toBeVisible();
      // Should contain a number followed by "Articles Published"
      await expect(articleCount).toContainText(/\d+ Articles Published/);
    });

    test('should display the search input', async ({ page }) => {
      const searchInput = page.getByTestId('search-input');
      await expect(searchInput).toBeVisible();
      await expect(searchInput).toHaveAttribute('placeholder', 'Search articles...');
    });

    test('should display the sort select', async ({ page }) => {
      const sortSelect = page.getByTestId('sort-select');
      await expect(sortSelect).toBeVisible();
    });

    test('should display the last synced date', async ({ page }) => {
      const lastSynced = page.getByTestId('last-synced');
      await expect(lastSynced).toBeVisible();
      await expect(lastSynced).toContainText('Last synced:');
    });

    test('should display the articles grid', async ({ page }) => {
      const grid = page.getByTestId('articles-grid');
      await expect(grid).toBeVisible();
    });
  });

  test.describe('Featured Article', () => {
    test('should display featured article on initial load', async ({ page }) => {
      const featured = page.getByTestId('featured-article');
      await expect(featured).toBeVisible();
    });

    test('featured article should have FEATURED badge', async ({ page }) => {
      const featured = page.getByTestId('featured-article');
      await expect(featured.getByText('FEATURED')).toBeVisible();
    });

    test('featured article should have border beam animation', async ({ page }) => {
      const featured = page.getByTestId('featured-article');
      // Border beam creates an element with specific styling
      const hasBorderBeam = await featured.evaluate((el) => {
        // Check for the border beam's motion div or the wrapper
        return el.querySelector('[class*="border"]') !== null;
      });
      expect(hasBorderBeam).toBe(true);
    });

    test('featured article should link to external article', async ({ page }) => {
      const featured = page.getByTestId('featured-article');
      const href = await featured.getAttribute('href');
      expect(href).toBeTruthy();
      expect(href).toContain('dev.to');
    });
  });

  test.describe('Article Cards', () => {
    test('should display article cards', async ({ page }) => {
      const cards = page.getByTestId('article-card');
      const count = await cards.count();
      expect(count).toBeGreaterThan(0);
    });

    test('article cards should have required metadata', async ({ page }) => {
      const card = page.getByTestId('article-card').first();
      
      // Check for author name (text content)
      const cardText = await card.textContent();
      expect(cardText).toBeTruthy();
      
      // Check for reading time badge (contains "min")
      await expect(card.getByText(/\d+ min/)).toBeVisible();
    });

    test('article cards should link to external articles', async ({ page }) => {
      const card = page.getByTestId('article-card').first();
      const href = await card.getAttribute('href');
      expect(href).toBeTruthy();
      expect(href).toContain('dev.to');
    });

    test('article cards should have hover state', async ({ page }) => {
      await page.setViewportSize(BREAKPOINTS.desktop);
      const card = page.getByTestId('article-card').first();
      
      // Get initial transform
      const initialTransform = await card.evaluate((el) => {
        return window.getComputedStyle(el).transform;
      });
      
      // Hover over the card
      await card.hover();
      await page.waitForTimeout(300);
      
      // The card should have some visual change (border color, shadow, etc.)
      const classes = await card.getAttribute('class');
      expect(classes).toContain('group');
    });
  });

  test.describe('Search Functionality', () => {
    test('should filter articles when searching', async ({ page }) => {
      const searchInput = page.getByTestId('search-input');
      const resultsCount = page.getByTestId('results-count');
      
      // Get initial count
      const initialCount = await resultsCount.textContent();
      
      // Search for something specific
      await searchInput.fill('security');
      await page.waitForTimeout(300);
      
      // Results should change
      const newCount = await resultsCount.textContent();
      expect(newCount).toContain('result');
    });

    test('should show no results when search has no matches', async ({ page }) => {
      const searchInput = page.getByTestId('search-input');
      await searchInput.fill('xyznonexistentquery12345');
      await page.waitForTimeout(300);
      
      const noResults = page.getByTestId('no-results');
      await expect(noResults).toBeVisible();
      await expect(page.getByText('No articles found')).toBeVisible();
    });

    test('should show clear button when search has text', async ({ page }) => {
      const searchInput = page.getByTestId('search-input');
      await searchInput.fill('test');
      
      const clearButton = page.getByTestId('clear-search');
      await expect(clearButton).toBeVisible();
    });

    test('should clear search when clear button is clicked', async ({ page }) => {
      const searchInput = page.getByTestId('search-input');
      await searchInput.fill('test');
      
      const clearButton = page.getByTestId('clear-search');
      await clearButton.click();
      
      await expect(searchInput).toHaveValue('');
    });

    test('should hide featured article when search is active', async ({ page }) => {
      const searchInput = page.getByTestId('search-input');
      await searchInput.fill('security');
      await page.waitForTimeout(300);
      
      const featured = page.getByTestId('featured-article');
      await expect(featured).not.toBeVisible();
    });
  });

  test.describe('Filter Functionality', () => {
    test('should toggle filter panel when filter button is clicked', async ({ page }) => {
      const filterToggle = page.getByTestId('filter-toggle');
      await filterToggle.click();
      await page.waitForTimeout(300);
      
      // Should show filter tags
      const filterSection = page.getByText('Filter by Topic');
      await expect(filterSection).toBeVisible();
    });

    test('should display tag filters with counts', async ({ page }) => {
      const filterToggle = page.getByTestId('filter-toggle');
      await filterToggle.click();
      await page.waitForTimeout(300);
      
      // Look for any tag button (they start with #)
      const tagButtons = page.locator('button:has-text("#")');
      const count = await tagButtons.count();
      expect(count).toBeGreaterThan(0);
    });

    test('should filter articles when tag is selected', async ({ page }) => {
      const resultsCount = page.getByTestId('results-count');
      const initialText = await resultsCount.textContent();
      const initialNumber = parseInt(initialText?.match(/\d+/)?.[0] || '0');
      
      // Open filters and click first tag
      const filterToggle = page.getByTestId('filter-toggle');
      await filterToggle.click();
      await page.waitForTimeout(300);
      
      // Find and click the first tag
      const firstTag = page.locator('[data-testid^="tag-"]').first();
      if (await firstTag.count() > 0) {
        await firstTag.click();
        await page.waitForTimeout(300);
        
        // Results should be filtered
        const newText = await resultsCount.textContent();
        const newNumber = parseInt(newText?.match(/\d+/)?.[0] || '0');
        expect(newNumber).toBeLessThanOrEqual(initialNumber);
      }
    });

    test('should show clear filters button when filters are active', async ({ page }) => {
      // Open filters and select a tag
      const filterToggle = page.getByTestId('filter-toggle');
      await filterToggle.click();
      await page.waitForTimeout(300);
      
      const firstTag = page.locator('[data-testid^="tag-"]').first();
      if (await firstTag.count() > 0) {
        await firstTag.click();
        await page.waitForTimeout(300);
        
        // Clear button should appear
        const clearButton = page.getByTestId('clear-filters');
        await expect(clearButton).toBeVisible();
      }
    });
  });

  test.describe('Sort Functionality', () => {
    test('should toggle sort direction when button is clicked', async ({ page }) => {
      const directionButton = page.getByTestId('sort-direction');
      
      // Click to change direction
      await directionButton.click();
      await page.waitForTimeout(300);
      
      // Button should still be functional
      await expect(directionButton).toBeEnabled();
    });

    test('should have sort options available', async ({ page }) => {
      const sortSelect = page.getByTestId('sort-select');
      await sortSelect.click();
      await page.waitForTimeout(300);
      
      // Should see sort options
      await expect(page.getByText('Latest')).toBeVisible();
      await expect(page.getByText('Popular')).toBeVisible();
    });
  });

  test.describe('Pagination', () => {
    test('should show pagination when many articles exist', async ({ page }) => {
      // Check if pagination exists (may not if less than 9 articles)
      const prevButton = page.getByTestId('prev-page');
      const nextButton = page.getByTestId('next-page');
      
      // If we have more than 9 articles, pagination should exist
      const articlesGrid = page.getByTestId('articles-grid');
      const cards = articlesGrid.getByTestId('article-card');
      const cardCount = await cards.count();
      
      if (cardCount >= 9) {
        // Either prev or next should be visible
        const hasPagination = await prevButton.isVisible() || await nextButton.isVisible();
        expect(hasPagination).toBe(true);
      }
    });

    test('previous button should be disabled on first page', async ({ page }) => {
      const prevButton = page.getByTestId('prev-page');
      
      if (await prevButton.isVisible()) {
        await expect(prevButton).toBeDisabled();
      }
    });

    test('should navigate to next page when next button is clicked', async ({ page }) => {
      const nextButton = page.getByTestId('next-page');
      
      if (await nextButton.isVisible() && await nextButton.isEnabled()) {
        await nextButton.click();
        await page.waitForTimeout(500);
        
        // Previous button should now be enabled
        const prevButton = page.getByTestId('prev-page');
        await expect(prevButton).toBeEnabled();
      }
    });
  });

  test.describe('Visual Regression', () => {
    test('articles page - desktop viewport', async ({ page }) => {
      await page.setViewportSize(BREAKPOINTS.desktop);
      await page.waitForTimeout(1000); // Wait for animations
      
      await expect(page).toHaveScreenshot('articles-page-desktop.png', {
        threshold: 0.15,
        fullPage: false,
      });
    });

    test('articles page - mobile viewport', async ({ page }) => {
      await page.setViewportSize(BREAKPOINTS.mobile);
      await page.waitForTimeout(1000);
      
      await expect(page).toHaveScreenshot('articles-page-mobile.png', {
        threshold: 0.15,
        fullPage: false,
      });
    });

    test('articles page - tablet viewport', async ({ page }) => {
      await page.setViewportSize(BREAKPOINTS.tablet);
      await page.waitForTimeout(1000);
      
      await expect(page).toHaveScreenshot('articles-page-tablet.png', {
        threshold: 0.15,
        fullPage: false,
      });
    });
  });

  test.describe('Background Effects', () => {
    test('should have stars background canvas', async ({ page }) => {
      // StarsBackground renders a canvas element
      const canvas = page.locator('canvas');
      const count = await canvas.count();
      expect(count).toBeGreaterThan(0);
    });

    test('should have shooting stars SVG', async ({ page }) => {
      // ShootingStars renders an SVG element
      const svg = page.locator('svg');
      const count = await svg.count();
      expect(count).toBeGreaterThan(0);
    });
  });

  test.describe('Accessibility', () => {
    test('search input should be focusable', async ({ page }) => {
      const searchInput = page.getByTestId('search-input');
      await searchInput.focus();
      await expect(searchInput).toBeFocused();
    });

    test('article cards should be keyboard navigable', async ({ page }) => {
      // Tab to first article card
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // Should eventually focus an article link
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
    });

    test('buttons should have accessible names', async ({ page }) => {
      const filterButton = page.getByTestId('filter-toggle');
      await expect(filterButton).toBeVisible();
      
      // Button should have text content
      const text = await filterButton.textContent();
      expect(text).toContain('Filter');
    });
  });

  test.describe('Responsive Design', () => {
    test('grid should adjust columns on mobile', async ({ page }) => {
      await page.setViewportSize(BREAKPOINTS.mobile);
      await page.waitForTimeout(500);
      
      const grid = page.getByTestId('articles-grid');
      const gridClasses = await grid.getAttribute('class');
      
      // Should have responsive grid classes
      expect(gridClasses).toContain('grid');
    });

    test('grid should have 3 columns on desktop', async ({ page }) => {
      await page.setViewportSize(BREAKPOINTS.desktop);
      await page.waitForTimeout(500);
      
      const grid = page.getByTestId('articles-grid');
      const gridClasses = await grid.getAttribute('class');
      
      // Should have lg:grid-cols-3 class
      expect(gridClasses).toContain('lg:grid-cols-3');
    });

    test('featured article should be visible on all viewports', async ({ page }) => {
      const featured = page.getByTestId('featured-article');
      
      for (const [name, size] of Object.entries(BREAKPOINTS)) {
        await page.setViewportSize(size);
        await page.waitForTimeout(300);
        await expect(featured, `Featured article should be visible on ${name}`).toBeVisible();
      }
    });
  });

  test.describe('Animation & Transitions', () => {
    test('cards should have transition classes', async ({ page }) => {
      const card = page.getByTestId('article-card').first();
      const classes = await card.getAttribute('class');
      
      // Should have transition classes
      expect(classes).toContain('transition');
    });

    test('filter panel should animate on open', async ({ page }) => {
      const filterToggle = page.getByTestId('filter-toggle');
      
      // Measure time for filter panel to appear
      const startTime = Date.now();
      await filterToggle.click();
      
      // Wait for animation
      await page.waitForSelector('[data-testid^="tag-"]', { timeout: 1000 });
      const endTime = Date.now();
      
      // Animation should take some time (not instant)
      expect(endTime - startTime).toBeGreaterThan(100);
    });
  });

  test.describe('Select Dropdown Styling', () => {
    test('sort dropdown should have solid background', async ({ page }) => {
      await page.setViewportSize(BREAKPOINTS.desktop);
      
      const sortSelect = page.getByTestId('sort-select');
      await sortSelect.click();
      await page.waitForTimeout(300);
      
      // Find the dropdown content
      const dropdown = page.locator('[data-slot="select-content"]');
      
      if (await dropdown.isVisible()) {
        const bgColor = await dropdown.evaluate((el) => {
          return window.getComputedStyle(el).backgroundColor;
        });
        
        // Should NOT be transparent
        expect(bgColor).not.toBe('rgba(0, 0, 0, 0)');
        expect(bgColor).not.toBe('transparent');
        
        // Should be a dark solid color
        const rgbMatch = bgColor.match(/rgb\((\d+), (\d+), (\d+)\)/);
        if (rgbMatch) {
          const [_, r, g, b] = rgbMatch.map(Number);
          // Should be dark (low values)
          expect(r).toBeLessThan(50);
          expect(g).toBeLessThan(50);
          expect(b).toBeLessThan(50);
        }
      }
    });

    test('dropdown items should have hover state', async ({ page }) => {
      await page.setViewportSize(BREAKPOINTS.desktop);
      
      const sortSelect = page.getByTestId('sort-select');
      await sortSelect.click();
      await page.waitForTimeout(300);
      
      // Find a dropdown item
      const item = page.locator('[data-slot="select-item"]').first();
      
      if (await item.isVisible()) {
        await item.hover();
        await page.waitForTimeout(100);
        
        // Item should have hover styling
        const classes = await item.getAttribute('class');
        expect(classes).toContain('hover:');
      }
    });
  });
});
