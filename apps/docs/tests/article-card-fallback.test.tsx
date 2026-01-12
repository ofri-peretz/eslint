import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DevToArticleCard } from '@/components/DevToArticlesContent';
import type { DevToArticle } from '@/lib/api';

/**
 * Tests for DevToArticleCard fallback behavior
 * 
 * These tests ensure that the gradient space background is ALWAYS shown
 * when an article doesn't have a valid cover image.
 * 
 * This prevents regression where cards show white/gray backgrounds instead
 * of the beautiful gradient with the article title.
 */

const createMockArticle = (overrides?: Partial<DevToArticle>): DevToArticle => ({
  id: 1,
  title: 'Test Article Title',
  description: 'Test description',
  url: 'https://dev.to/test',
  cover_image: null,
  social_image: 'https://example.com/default.png',
  published_at: '2024-01-01T00:00:00Z',
  reading_time_minutes: 5,
  positive_reactions_count: 10,
  comments_count: 2,
  page_views_count: 100,
  tag_list: ['test', 'javascript'],
  user: {
    name: 'Test User',
    username: 'testuser',
    profile_image: 'https://example.com/avatar.png',
  },
  ...overrides,
});

describe('DevToArticleCard - Fallback Image Behavior', () => {
  describe('Gradient Background with Title (LOCKED BEHAVIOR)', () => {
    it('should show gradient background when cover_image is null', () => {
      const article = createMockArticle({
        cover_image: null,
        social_image: null,
      });

      const { container } = render(<DevToArticleCard article={article} />);
      
      // Find the gradient div
      const gradientDiv = container.querySelector('.bg-gradient-to-br.from-violet-900.via-slate-800.to-fuchsia-900');
      expect(gradientDiv).not.toBeNull();
      
      // Ensure title is visible in the gradient
      const titleInGradient = gradientDiv?.textContent;
      expect(titleInGradient).toBe(article.title);
    });

    it('should show gradient background when cover_image is empty string', () => {
      const article = createMockArticle({
        cover_image: '',
        social_image: '',
      });

      const { container } = render(<DevToArticleCard article={article} />);
      
      const gradientDiv = container.querySelector('.bg-gradient-to-br');
      expect(gradientDiv).not.toBeNull();
      expect(gradientDiv?.textContent).toBe(article.title);
    });

    it('should show gradient background when cover_image is whitespace only', () => {
      const article = createMockArticle({
        cover_image: '   ',
        social_image: '  \t\n  ',
      });

      const { container } = render(<DevToArticleCard article={article} />);
      
      const gradientDiv = container.querySelector('.bg-gradient-to-br');
      expect(gradientDiv).not.toBeNull();
      expect(gradientDiv?.textContent).toBe(article.title);
    });

    it('should NOT show gradient when cover_image is valid URL', () => {
      const article = createMockArticle({
        cover_image: 'https://example.com/image.jpg',
      });

      const { container } = render(<DevToArticleCard article={article} />);
      
      const gradientDiv = container.querySelector('.bg-gradient-to-br');
      const img = container.querySelector('img[alt=""]');
      
      expect(gradientDiv).toBeNull();
      expect(img).not.toBeNull();
      expect(img?.getAttribute('src')).toBe('https://example.com/image.jpg');
    });

    it('should use social_image as fallback when cover_image is invalid', () => {
      const article = createMockArticle({
        cover_image: '',
        social_image: 'https://example.com/social.jpg',
      });

      const { container } = render(<DevToArticleCard article={article} />);
      
      const img = container.querySelector('img[alt=""]');
      expect(img?.getAttribute('src')).toBe('https://example.com/social.jpg');
    });
  });

  describe('Gradient Styles (LOCKED)', () => {
    it('should have exact gradient colors: violet-900, slate-800, fuchsia-900', () => {
      const article = createMockArticle({
        cover_image: null,
        social_image: null,
      });

      const { container } = render(<DevToArticleCard article={article} />);
      
      const gradientDiv = container.querySelector('.bg-gradient-to-br.from-violet-900.via-slate-800.to-fuchsia-900');
      expect(gradientDiv).not.toBeNull();
    });

    it('should render title in gradient with proper text styling', () => {
      const article = createMockArticle({
        cover_image: null,
        title: 'This is a Long Article Title That Should Be Visible',
      });

      const { container } = render(<DevToArticleCard article={article} />);
      
      const titleSpan = container.querySelector('.text-white\\/80.text-center.line-clamp-3');
      expect(titleSpan).not.toBeNull();
      expect(titleSpan?.textContent).toBe(article.title);
    });
  });

  describe('Image Priority Logic', () => {
    it('should prioritize cover_image over social_image', () => {
      const article = createMockArticle({
        cover_image: 'https://example.com/cover.jpg',
        social_image: 'https://example.com/social.jpg',
      });

      const { container } = render(<DevToArticleCard article={article} />);
      
      const img = container.querySelector('img[alt=""]');
      expect(img?.getAttribute('src')).toBe('https://example.com/cover.jpg');
    });

    it('should fall back to gradient when both images are invalid', () => {
      const article = createMockArticle({
        cover_image: '  ',
        social_image: '',
      });

      const { container } = render(<DevToArticleCard article={article} />);
      
      const gradientDiv = container.querySelector('.bg-gradient-to-br');
      expect(gradientDiv).not.toBeNull();
    });
  });

  describe('Regression Prevention', () => {
    it('should NEVER show white/gray background for missing images', () => {
      const article = createMockArticle({
        cover_image: null,
        social_image: null,
      });

      const { container} = render(<DevToArticleCard article={article} />);
      
      // Ensure gradient exists
      const gradientDiv = container.querySelector('.bg-gradient-to-br.from-violet-900.via-slate-800.to-fuchsia-900');
      expect(gradientDiv).not.toBeNull();
      
      // Ensure no plain gray backgrounds
      const grayBackgrounds = container.querySelectorAll('.bg-gray-200, .bg-gray-300, .bg-slate-200, .bg-white');
      expect(grayBackgrounds.length).toBe(0);
    });

    it('should preserve gradient across different article lengths', () => {
      const shortTitle = createMockArticle({ cover_image: null, title: 'Short' });
      const longTitle = createMockArticle({ 
        cover_image: null, 
        title: 'This is an extremely long article title that should still be visible in the gradient background with proper line clamping'
      });

      const { container: shortContainer } = render(<DevToArticleCard article={shortTitle} />);
      const { container: longContainer } = render(<DevToArticleCard article={longTitle} />);
      
      expect(shortContainer.querySelector('.bg-gradient-to-br')).not.toBeNull();
      expect(longContainer.querySelector('.bg-gradient-to-br')).not.toBeNull();
    });
  });
});
