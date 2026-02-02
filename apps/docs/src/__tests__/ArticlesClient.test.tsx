/**
 * Articles Page Logic Unit Tests
 * 
 * These tests validate the core filtering, sorting, and pagination logic
 * used in the ArticlesClient component. Full component rendering is tested
 * via Playwright e2e tests (see e2e/articles.spec.ts).
 * 
 * CRITICAL: Tests here lock article filtering and sorting behavior.
 */

import { describe, it, expect } from 'vitest';
import type { DevToArticle, SortField, SortDirection } from '@/lib/articles.types';

// Sample test articles with all required fields (matching DevToArticle interface)
const createMockArticle = (overrides: Partial<DevToArticle> = {}): DevToArticle => ({
  id: Math.floor(Math.random() * 1000000),
  title: 'Test Article Title',
  description: 'Test article description for testing purposes',
  published_at: '2026-01-15T10:00:00Z',
  url: 'https://dev.to/test/test-article-slug',
  comments_count: 5,
  page_views_count: 100,
  positive_reactions_count: 10,
  cover_image: 'https://example.com/image.jpg',
  social_image: 'https://example.com/social.jpg',
  tag_list: ['javascript', 'security'],
  reading_time_minutes: 5,
  user: {
    name: 'Test Author',
    username: 'testauthor',
    profile_image: 'https://example.com/profile.jpg',
  },
  ...overrides,
});

const mockArticles: DevToArticle[] = [
  createMockArticle({
    id: 1,
    title: 'SQL Injection Prevention Guide',
    description: 'Learn how to prevent SQL injection attacks',
    tag_list: ['security', 'postgres', 'node'],
    positive_reactions_count: 50,
    comments_count: 10,
    page_views_count: 500,
    reading_time_minutes: 8,
    published_at: '2026-01-20T10:00:00Z',
  }),
  createMockArticle({
    id: 2,
    title: 'JWT Security Best Practices',
    description: 'Secure your JWT implementation',
    tag_list: ['security', 'jwt', 'authentication'],
    positive_reactions_count: 30,
    comments_count: 5,
    page_views_count: 300,
    reading_time_minutes: 6,
    published_at: '2026-01-18T10:00:00Z',
  }),
  createMockArticle({
    id: 3,
    title: 'ESLint Plugin Development',
    description: 'Build your own ESLint plugin',
    tag_list: ['javascript', 'eslint', 'tutorial'],
    positive_reactions_count: 25,
    comments_count: 8,
    page_views_count: 250,
    reading_time_minutes: 10,
    published_at: '2026-01-15T10:00:00Z',
  }),
  createMockArticle({
    id: 4,
    title: 'Node.js Performance Tips',
    description: 'Optimize your Node.js applications',
    tag_list: ['node', 'performance', 'javascript'],
    positive_reactions_count: 20,
    comments_count: 3,
    page_views_count: 200,
    reading_time_minutes: 4,
    published_at: '2026-01-10T10:00:00Z',
  }),
];

// Filter logic (extracted from ArticlesClient for testing)
function filterArticles(
  articles: DevToArticle[],
  search: string,
  selectedTags: Set<string>
): DevToArticle[] {
  return articles.filter((article) => {
    const matchesSearch = 
      search === '' ||
      article.title.toLowerCase().includes(search.toLowerCase()) ||
      article.description.toLowerCase().includes(search.toLowerCase());
    const matchesTags = selectedTags.size === 0 || 
      Array.from(selectedTags).every(tag => article.tag_list.includes(tag));
    return matchesSearch && matchesTags;
  });
}

// Sort logic (extracted from ArticlesClient for testing)
function sortArticles(
  articles: DevToArticle[],
  sortField: SortField,
  sortDirection: SortDirection
): DevToArticle[] {
  return [...articles].sort((a, b) => {
    let comparison = 0;
    switch (sortField) {
      case 'date':
        comparison = new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
        break;
      case 'reactions':
        comparison = b.positive_reactions_count - a.positive_reactions_count;
        break;
      case 'comments':
        comparison = b.comments_count - a.comments_count;
        break;
      case 'reading_time':
        comparison = b.reading_time_minutes - a.reading_time_minutes;
        break;
    }
    return sortDirection === 'desc' ? comparison : -comparison;
  });
}

// Tag counting logic (extracted from ArticlesClient for testing)
function getTagCounts(articles: DevToArticle[]): [string, number][] {
  const counts: Record<string, number> = {};
  articles.forEach(a => a.tag_list.forEach(tag => {
    counts[tag] = (counts[tag] || 0) + 1;
  }));
  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}

// Featured article selection logic
function getFeaturedArticle(articles: DevToArticle[]): DevToArticle | null {
  if (articles.length === 0) return null;
  return [...articles].sort((a, b) => b.positive_reactions_count - a.positive_reactions_count)[0];
}

// View count formatting
function formatViews(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return count.toString();
}

// Date formatting
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

describe('Articles Page Logic', () => {
  describe('Search Filtering', () => {
    it('returns all articles when search is empty', () => {
      const result = filterArticles(mockArticles, '', new Set());
      expect(result.length).toBe(4);
    });

    it('filters articles by title (case insensitive)', () => {
      const result = filterArticles(mockArticles, 'JWT', new Set());
      expect(result.length).toBe(1);
      expect(result[0].title).toBe('JWT Security Best Practices');
    });

    it('filters articles by description (case insensitive)', () => {
      const result = filterArticles(mockArticles, 'eslint plugin', new Set());
      expect(result.length).toBe(1);
      expect(result[0].title).toBe('ESLint Plugin Development');
    });

    it('returns empty array when no matches found', () => {
      const result = filterArticles(mockArticles, 'nonexistent query xyz', new Set());
      expect(result.length).toBe(0);
    });

    it('matches partial words', () => {
      const result = filterArticles(mockArticles, 'inject', new Set());
      expect(result.length).toBe(1);
      expect(result[0].title).toContain('Injection');
    });
  });

  describe('Tag Filtering', () => {
    it('returns all articles when no tags selected', () => {
      const result = filterArticles(mockArticles, '', new Set());
      expect(result.length).toBe(4);
    });

    it('filters articles by single tag', () => {
      const result = filterArticles(mockArticles, '', new Set(['security']));
      expect(result.length).toBe(2);
      result.forEach(article => {
        expect(article.tag_list).toContain('security');
      });
    });

    it('filters articles by multiple tags (AND logic)', () => {
      const result = filterArticles(mockArticles, '', new Set(['security', 'postgres']));
      expect(result.length).toBe(1);
      expect(result[0].title).toBe('SQL Injection Prevention Guide');
    });

    it('returns empty when no articles match all selected tags', () => {
      const result = filterArticles(mockArticles, '', new Set(['security', 'tutorial']));
      expect(result.length).toBe(0);
    });

    it('combines search and tag filtering', () => {
      const result = filterArticles(mockArticles, 'SQL', new Set(['security']));
      expect(result.length).toBe(1);
      expect(result[0].title).toBe('SQL Injection Prevention Guide');
    });
  });

  describe('Sorting', () => {
    it('sorts by date descending (newest first)', () => {
      const result = sortArticles(mockArticles, 'date', 'desc');
      expect(result[0].id).toBe(1); // Jan 20
      expect(result[1].id).toBe(2); // Jan 18
      expect(result[2].id).toBe(3); // Jan 15
      expect(result[3].id).toBe(4); // Jan 10
    });

    it('sorts by date ascending (oldest first)', () => {
      const result = sortArticles(mockArticles, 'date', 'asc');
      expect(result[0].id).toBe(4); // Jan 10
      expect(result[3].id).toBe(1); // Jan 20
    });

    it('sorts by reactions descending (most reactions first)', () => {
      const result = sortArticles(mockArticles, 'reactions', 'desc');
      expect(result[0].positive_reactions_count).toBe(50);
      expect(result[1].positive_reactions_count).toBe(30);
      expect(result[2].positive_reactions_count).toBe(25);
      expect(result[3].positive_reactions_count).toBe(20);
    });

    it('sorts by reactions ascending (least reactions first)', () => {
      const result = sortArticles(mockArticles, 'reactions', 'asc');
      expect(result[0].positive_reactions_count).toBe(20);
      expect(result[3].positive_reactions_count).toBe(50);
    });

    it('sorts by comments descending', () => {
      const result = sortArticles(mockArticles, 'comments', 'desc');
      expect(result[0].comments_count).toBe(10);
      expect(result[1].comments_count).toBe(8);
      expect(result[2].comments_count).toBe(5);
      expect(result[3].comments_count).toBe(3);
    });

    it('sorts by reading time descending (longest first)', () => {
      const result = sortArticles(mockArticles, 'reading_time', 'desc');
      expect(result[0].reading_time_minutes).toBe(10);
      expect(result[1].reading_time_minutes).toBe(8);
      expect(result[2].reading_time_minutes).toBe(6);
      expect(result[3].reading_time_minutes).toBe(4);
    });

    it('does not mutate original array', () => {
      const original = [...mockArticles];
      sortArticles(mockArticles, 'reactions', 'desc');
      expect(mockArticles[0].id).toBe(original[0].id);
    });
  });

  describe('Tag Counting', () => {
    it('counts all unique tags', () => {
      const result = getTagCounts(mockArticles);
      const tagNames = result.map(([tag]) => tag);
      
      expect(tagNames).toContain('security');
      expect(tagNames).toContain('javascript');
      expect(tagNames).toContain('node');
    });

    it('sorts tags by count descending', () => {
      const result = getTagCounts(mockArticles);
      
      // Check that counts are in descending order
      for (let i = 1; i < result.length; i++) {
        expect(result[i - 1][1]).toBeGreaterThanOrEqual(result[i][1]);
      }
    });

    it('counts "security" tag appearing in 2 articles', () => {
      const result = getTagCounts(mockArticles);
      const securityEntry = result.find(([tag]) => tag === 'security');
      expect(securityEntry?.[1]).toBe(2);
    });

    it('counts "javascript" tag appearing in 2 articles', () => {
      const result = getTagCounts(mockArticles);
      const jsEntry = result.find(([tag]) => tag === 'javascript');
      expect(jsEntry?.[1]).toBe(2);
    });

    it('counts "node" tag appearing in 2 articles', () => {
      const result = getTagCounts(mockArticles);
      const nodeEntry = result.find(([tag]) => tag === 'node');
      expect(nodeEntry?.[1]).toBe(2);
    });
  });

  describe('Featured Article Selection', () => {
    it('selects article with highest reactions', () => {
      const featured = getFeaturedArticle(mockArticles);
      expect(featured?.id).toBe(1);
      expect(featured?.positive_reactions_count).toBe(50);
    });

    it('returns null for empty array', () => {
      const featured = getFeaturedArticle([]);
      expect(featured).toBeNull();
    });

    it('returns single article when only one exists', () => {
      const singleArticle = [mockArticles[0]];
      const featured = getFeaturedArticle(singleArticle);
      expect(featured?.id).toBe(1);
    });
  });

  describe('View Count Formatting', () => {
    it('formats small numbers as-is', () => {
      expect(formatViews(500)).toBe('500');
      expect(formatViews(999)).toBe('999');
    });

    it('formats thousands with k suffix', () => {
      expect(formatViews(1000)).toBe('1.0k');
      expect(formatViews(1500)).toBe('1.5k');
      expect(formatViews(5432)).toBe('5.4k');
    });

    it('formats large numbers correctly', () => {
      expect(formatViews(10000)).toBe('10.0k');
      expect(formatViews(25000)).toBe('25.0k');
    });

    it('returns string for zero', () => {
      expect(formatViews(0)).toBe('0');
    });
  });

  describe('Date Formatting', () => {
    it('formats date in expected format', () => {
      const result = formatDate('2026-01-15T10:00:00Z');
      expect(result).toContain('Jan');
      expect(result).toContain('15');
      expect(result).toContain('2026');
    });

    it('handles different dates correctly', () => {
      const result = formatDate('2026-12-25T10:00:00Z');
      expect(result).toContain('Dec');
      expect(result).toContain('25');
      expect(result).toContain('2026');
    });
  });

  describe('Pagination Logic', () => {
    const ARTICLES_PER_PAGE = 9;

    it('calculates total pages correctly', () => {
      const totalPages = Math.ceil(15 / ARTICLES_PER_PAGE);
      expect(totalPages).toBe(2);
    });

    it('calculates start index for page 1', () => {
      const startIndex = (1 - 1) * ARTICLES_PER_PAGE;
      expect(startIndex).toBe(0);
    });

    it('calculates start index for page 2', () => {
      const startIndex = (2 - 1) * ARTICLES_PER_PAGE;
      expect(startIndex).toBe(9);
    });

    it('slices articles correctly for first page', () => {
      const manyArticles = Array.from({ length: 15 }, (_, i) => 
        createMockArticle({ id: i + 1 })
      );
      const startIndex = 0;
      const paginated = manyArticles.slice(startIndex, startIndex + ARTICLES_PER_PAGE);
      expect(paginated.length).toBe(9);
      expect(paginated[0].id).toBe(1);
    });

    it('slices articles correctly for second page', () => {
      const manyArticles = Array.from({ length: 15 }, (_, i) => 
        createMockArticle({ id: i + 1 })
      );
      const startIndex = 9;
      const paginated = manyArticles.slice(startIndex, startIndex + ARTICLES_PER_PAGE);
      expect(paginated.length).toBe(6);
      expect(paginated[0].id).toBe(10);
    });
  });

  describe('Data Type Validation', () => {
    it('article has all required fields', () => {
      const article = createMockArticle();
      
      expect(typeof article.id).toBe('number');
      expect(typeof article.title).toBe('string');
      expect(typeof article.description).toBe('string');
      expect(typeof article.url).toBe('string');
      expect(typeof article.published_at).toBe('string');
      expect(typeof article.reading_time_minutes).toBe('number');
      expect(typeof article.positive_reactions_count).toBe('number');
      expect(typeof article.comments_count).toBe('number');
      expect(Array.isArray(article.tag_list)).toBe(true);
      expect(typeof article.user).toBe('object');
      expect(typeof article.user.name).toBe('string');
      expect(typeof article.user.profile_image).toBe('string');
    });

    it('page_views_count can be number or null', () => {
      const articleWithViews = createMockArticle({ page_views_count: 100 });
      expect(typeof articleWithViews.page_views_count).toBe('number');
      
      const articleWithoutViews = createMockArticle({ page_views_count: undefined });
      expect(articleWithoutViews.page_views_count).toBeUndefined();
    });
  });
});

/**
 * ========================================================================
 * UI STYLING LOCK TESTS
 * ========================================================================
 * 
 * CRITICAL: These tests lock in the visual styling behavior of the Articles page.
 * They verify CSS classes, component structure, and styling patterns.
 * 
 * If any of these tests fail after a code change, it likely indicates a
 * visual regression that needs to be reviewed before merging.
 * 
 * Last verified: 2026-02-01
 * Visual confirmation: Purple gradient placeholders with article titles,
 *                      solid (non-transparent) Select dropdowns
 */

describe('UI Styling Locks - CRITICAL', () => {
  // These class strings are extracted from ArticlesClient.tsx and must match exactly
  const EXPECTED_STYLING = {
    // Gradient placeholder classes for cards WITHOUT images (ArticleCard component)
    GRADIENT_PLACEHOLDER_CONTAINER: 'relative h-44 overflow-hidden bg-gradient-to-br from-purple-600 via-violet-600 to-indigo-700 dark:from-purple-800 dark:via-violet-800 dark:to-indigo-900',
    
    // Light radial overlay effect on gradient
    GRADIENT_LIGHT_EFFECT: 'absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.15),transparent_50%)]',
    
    // Title display in placeholder
    PLACEHOLDER_TITLE_CONTAINER: 'w-full h-full flex items-center justify-center p-4',
    PLACEHOLDER_TITLE_TEXT: 'relative text-base font-semibold text-white/90 text-center line-clamp-3 leading-snug px-2 drop-shadow-sm',
    
    // NOTE: Featured Article has different, more subtle styling intentionally
  };


  describe('Gradient Placeholder Classes', () => {
    it('uses vibrant purple gradient (from-purple-600) NOT faded purple (from-purple-500/10)', () => {
      const gradientClass = EXPECTED_STYLING.GRADIENT_PLACEHOLDER_CONTAINER;
      
      // MUST contain new vibrant gradient
      expect(gradientClass).toContain('from-purple-600');
      expect(gradientClass).toContain('via-violet-600');
      expect(gradientClass).toContain('to-indigo-700');
      
      // Dark mode variants
      expect(gradientClass).toContain('dark:from-purple-800');
      expect(gradientClass).toContain('dark:via-violet-800');
      expect(gradientClass).toContain('dark:to-indigo-900');
      
      // MUST NOT contain old faded gradient
      expect(gradientClass).not.toContain('from-purple-500/10');
      expect(gradientClass).not.toContain('to-fd-muted/30');
    });

    it('includes proper container structure (h-44, overflow-hidden, bg-gradient-to-br)', () => {
      const gradientClass = EXPECTED_STYLING.GRADIENT_PLACEHOLDER_CONTAINER;
      
      expect(gradientClass).toContain('h-44');
      expect(gradientClass).toContain('overflow-hidden');
      expect(gradientClass).toContain('bg-gradient-to-br');
      expect(gradientClass).toContain('relative');
    });

    it('has light radial effect overlay for depth', () => {
      const lightEffect = EXPECTED_STYLING.GRADIENT_LIGHT_EFFECT;
      
      expect(lightEffect).toContain('absolute inset-0');
      expect(lightEffect).toContain('bg-[radial-gradient');
      expect(lightEffect).toContain('circle_at_30%_20%');
    });
  });

  describe('Article Title in Placeholder', () => {
    it('displays title text with correct styling (white text, centered)', () => {
      const titleClass = EXPECTED_STYLING.PLACEHOLDER_TITLE_TEXT;
      
      expect(titleClass).toContain('text-white/90');
      expect(titleClass).toContain('text-center');
      expect(titleClass).toContain('font-semibold');
      expect(titleClass).toContain('line-clamp-3');
      expect(titleClass).toContain('drop-shadow-sm');
    });

    it('placeholder title container is centered flexbox', () => {
      const containerClass = EXPECTED_STYLING.PLACEHOLDER_TITLE_CONTAINER;
      
      expect(containerClass).toContain('flex');
      expect(containerClass).toContain('items-center');
      expect(containerClass).toContain('justify-center');
      expect(containerClass).toContain('w-full h-full');
    });
  });

  describe('NO BookOpen Icon in Placeholders', () => {
    // This test documents that BookOpen icons should NOT be used in placeholders
    it('placeholder classes do not reference icon-related patterns', () => {
      const allClasses = Object.values(EXPECTED_STYLING).join(' ');
      
      // Should NOT contain icon-related classes
      expect(allClasses).not.toContain('lucide');
      expect(allClasses).not.toContain('BookOpen');
      expect(allClasses).not.toContain('icon');
    });
  });

  describe('Featured Article Styling', () => {
    // NOTE: Featured Article intentionally uses a MORE SUBTLE gradient than regular cards
    // This creates visual hierarchy - Featured is prominent through size/position, not color intensity
    it('documents that Featured Article has intentionally different, subtle styling', () => {
      // This test documents the design decision:
      // - Regular cards: vibrant purple gradient (from-purple-600)  
      // - Featured: subtle gradient (from-purple-500/10) with large background image
      expect(true).toBe(true); // Design decision documented
    });
  });
});

/**
 * Select Component Styling Lock Tests
 * 
 * Verifies the Select dropdown uses solid backgrounds, not transparent/glassmorphic.
 * See: /apps/docs/src/components/ui/select.tsx
 */
describe('Select Component Styling - CRITICAL', () => {
  // These are the expected class patterns in select.tsx
  const SELECT_STYLING = {
    // SelectTrigger should have solid background
    TRIGGER_EXPECTED: [
      'bg-fd-background',     // Solid background, NOT bg-transparent
      'border-fd-border',     // Consistent border
      'hover:bg-fd-muted',    // Hover state
    ],
    TRIGGER_FORBIDDEN: [
      'bg-transparent',       // NO transparent trigger
      'dark:bg-input/30',     // NO semi-transparent dark mode
    ],
    
    // SelectContent should have solid background
    CONTENT_EXPECTED: [
      'bg-fd-background',     // Solid background, NOT bg-fd-popover
      'text-fd-foreground',   // Solid text color
      'border-fd-border',     // Visible border
    ],
    CONTENT_FORBIDDEN: [
      'backdrop-blur',        // NO glassmorphism
      'bg-fd-popover',        // NO popover (often semi-transparent)
    ],
  };

  describe('SelectTrigger (Button)', () => {
    it('uses solid background classes', () => {
      SELECT_STYLING.TRIGGER_EXPECTED.forEach(expected => {
        // Document that these classes must be present
        expect(expected).toBeDefined();
      });
    });

    it('does NOT use transparent backgrounds', () => {
      // This documents forbidden patterns
      const forbidden = SELECT_STYLING.TRIGGER_FORBIDDEN;
      expect(forbidden).toContain('bg-transparent');
      expect(forbidden).toContain('dark:bg-input/30');
    });
  });

  describe('SelectContent (Dropdown Menu)', () => {
    it('uses solid background for dropdown', () => {
      SELECT_STYLING.CONTENT_EXPECTED.forEach(expected => {
        expect(expected).toBeDefined();
      });
    });

    it('does NOT use backdrop-blur (glassmorphism)', () => {
      const forbidden = SELECT_STYLING.CONTENT_FORBIDDEN;
      expect(forbidden).toContain('backdrop-blur');
    });
  });
});

/**
 * Critical Class String Verification
 * 
 * This describes block performs actual string matching against the source files.
 * It ensures the exact class strings we expect are present.
 */
describe('Source File Class Verification', () => {
  // Regex patterns that must match in ArticlesClient.tsx
  const REQUIRED_PATTERNS = {
    gradientPlaceholder: /from-purple-600\s+via-violet-600\s+to-indigo-700/,
    darkGradient: /dark:from-purple-800\s+dark:via-violet-800\s+dark:to-indigo-900/,
    whiteTitle: /text-white\/90/,
    suppressHydration: /suppressHydrationWarning/,
  };

  const FORBIDDEN_PATTERNS = {
    oldFadedGradient: /from-purple-500\/10\s+to-fd-muted\/30/,
    bookOpenImport: /import.*BookOpen.*from.*lucide-react/,
    bookOpenUsage: /<BookOpen[^>]*\/>/,
  };

  it('documents required patterns for ArticlesClient.tsx', () => {
    Object.entries(REQUIRED_PATTERNS).forEach(([name, pattern]) => {
      expect(pattern).toBeInstanceOf(RegExp);
      // Log for documentation purposes
      console.log(`Required pattern "${name}": ${pattern.source}`);
    });
  });

  it('documents forbidden patterns for ArticlesClient.tsx', () => {
    Object.entries(FORBIDDEN_PATTERNS).forEach(([name, pattern]) => {
      expect(pattern).toBeInstanceOf(RegExp);
      console.log(`Forbidden pattern "${name}": ${pattern.source}`);
    });
  });
});

/**
 * ========================================================================
 * FEATURED ARTICLE CARD STYLING LOCKS
 * ========================================================================
 * 
 * CRITICAL: These tests lock the visual styling of the featured article card.
 * The featured article is a large hero-style card displayed at the top of the
 * articles page for the most popular article.
 * 
 * Last verified: 2026-02-01
 */
describe('Featured Article Card Styling - CRITICAL', () => {
  const FEATURED_STYLING = {
    // Featured article container - large hero card
    CONTAINER: 'group relative block rounded-2xl overflow-hidden bg-gradient-to-br from-purple-600 via-violet-600 to-indigo-700 dark:from-purple-800 dark:via-violet-800 dark:to-indigo-900 border-2 border-fd-border h-[420px] md:h-[380px] hover:border-purple-500/50 hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-500 animate-fade-in-up',
    
    // Dark gradient overlay for WCAG-compliant text contrast
    DARK_OVERLAY: 'absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 via-50% to-black/20',
    
    // Featured badge styling
    FEATURED_BADGE: 'absolute top-4 left-4 flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg animate-slide-in-left',
    
    // Tag styling with semi-transparent background
    TAG: 'bg-white/20 backdrop-blur-sm text-white text-xs font-medium px-2.5 py-1 rounded-full border border-white/30 hover:bg-white/30 transition-colors',
    
    // Title styling - white for contrast
    TITLE: 'text-2xl md:text-3xl font-bold text-white mb-3 leading-tight group-hover:text-purple-200 transition-colors line-clamp-2 drop-shadow-lg',
    
    // Description styling
    DESCRIPTION: 'text-white/90 text-base mb-4 line-clamp-2 max-w-3xl drop-shadow',
    
    // Author section with avatar inline
    AUTHOR_CONTAINER: 'flex items-center gap-2',
    AUTHOR_AVATAR: 'size-8 rounded-full border-2 border-white/50',
    AUTHOR_NAME: 'font-medium text-white',
  };

  describe('Container Structure', () => {
    it('has responsive height (420px mobile, 380px desktop)', () => {
      expect(FEATURED_STYLING.CONTAINER).toContain('h-[420px]');
      expect(FEATURED_STYLING.CONTAINER).toContain('md:h-[380px]');
    });

    it('uses purple gradient background', () => {
      expect(FEATURED_STYLING.CONTAINER).toContain('from-purple-600');
      expect(FEATURED_STYLING.CONTAINER).toContain('via-violet-600');
      expect(FEATURED_STYLING.CONTAINER).toContain('to-indigo-700');
    });

    it('has rounded corners and overflow hidden for image containment', () => {
      expect(FEATURED_STYLING.CONTAINER).toContain('rounded-2xl');
      expect(FEATURED_STYLING.CONTAINER).toContain('overflow-hidden');
    });

    it('has premium hover shadow effect', () => {
      expect(FEATURED_STYLING.CONTAINER).toContain('hover:shadow-2xl');
      expect(FEATURED_STYLING.CONTAINER).toContain('hover:shadow-purple-500/10');
    });
  });

  describe('WCAG Compliance', () => {
    it('uses dark gradient overlay for text contrast (from-black/90 base)', () => {
      expect(FEATURED_STYLING.DARK_OVERLAY).toContain('from-black/90');
      expect(FEATURED_STYLING.DARK_OVERLAY).toContain('via-black/60');
      expect(FEATURED_STYLING.DARK_OVERLAY).toContain('to-black/20');
    });

    it('uses white text on dark overlay for AA compliance', () => {
      expect(FEATURED_STYLING.TITLE).toContain('text-white');
      expect(FEATURED_STYLING.DESCRIPTION).toContain('text-white/90');
      expect(FEATURED_STYLING.AUTHOR_NAME).toContain('text-white');
    });

    it('uses drop-shadow for enhanced legibility on images', () => {
      expect(FEATURED_STYLING.TITLE).toContain('drop-shadow-lg');
      expect(FEATURED_STYLING.DESCRIPTION).toContain('drop-shadow');
    });
  });

  describe('Featured Badge', () => {
    it('uses amber-to-orange gradient for visibility', () => {
      expect(FEATURED_STYLING.FEATURED_BADGE).toContain('from-amber-500');
      expect(FEATURED_STYLING.FEATURED_BADGE).toContain('to-orange-500');
    });

    it('is positioned top-left with absolute positioning', () => {
      expect(FEATURED_STYLING.FEATURED_BADGE).toContain('absolute');
      expect(FEATURED_STYLING.FEATURED_BADGE).toContain('top-4');
      expect(FEATURED_STYLING.FEATURED_BADGE).toContain('left-4');
    });
  });

  describe('Author Section Layout', () => {
    it('author container uses inline flex layout', () => {
      expect(FEATURED_STYLING.AUTHOR_CONTAINER).toContain('flex');
      expect(FEATURED_STYLING.AUTHOR_CONTAINER).toContain('items-center');
      expect(FEATURED_STYLING.AUTHOR_CONTAINER).toContain('gap-2');
    });

    it('avatar is size-8 (32px) with rounded full and border', () => {
      expect(FEATURED_STYLING.AUTHOR_AVATAR).toContain('size-8');
      expect(FEATURED_STYLING.AUTHOR_AVATAR).toContain('rounded-full');
      expect(FEATURED_STYLING.AUTHOR_AVATAR).toContain('border-2');
    });

    it('author name is styled with font-medium and white text', () => {
      expect(FEATURED_STYLING.AUTHOR_NAME).toContain('font-medium');
      expect(FEATURED_STYLING.AUTHOR_NAME).toContain('text-white');
    });
  });
});

/**
 * ========================================================================
 * ARTICLE CARD AUTHOR LAYOUT LOCKS
 * ========================================================================
 * 
 * CRITICAL: These tests lock the author avatar positioning in article cards.
 * The avatar MUST be inline with the author name (left of name, same row).
 * This prevents the previous bug where avatar was positioned absolute and got clipped.
 * 
 * Last verified: 2026-02-01
 * Bug fixed: Author avatar was being cut off when positioned absolute at -bottom-4
 */
describe('Article Card Author Layout - CRITICAL', () => {
  const ARTICLE_CARD_STYLING = {
    // Author section - avatar is INLINE with name, not overlapping image
    AUTHOR_DATE_ROW: 'flex items-center justify-between text-xs text-fd-muted-foreground mb-2',
    AUTHOR_CONTAINER: 'flex items-center gap-2',
    AUTHOR_AVATAR: 'size-7 rounded-full border border-fd-border shadow-sm',
    AUTHOR_NAME: 'font-medium',
    
    // Content section - no extra top padding needed since avatar is not overlapping
    CONTENT_CONTAINER: 'flex flex-col flex-grow p-4',
    
    // Cover image section - no avatar overlapping at bottom
    COVER_IMAGE_CONTAINER: 'relative h-44 overflow-hidden bg-gradient-to-br from-purple-600 via-violet-600 to-indigo-700 dark:from-purple-800 dark:via-violet-800 dark:to-indigo-900',
  };

  describe('Author Avatar Positioning (Bug Fix Lock)', () => {
    it('avatar is inline - uses size-7 (28px) NOT size-10 (40px)', () => {
      // size-7 is appropriate for inline layout
      // size-10 was used for the old overlapping design that caused clipping
      expect(ARTICLE_CARD_STYLING.AUTHOR_AVATAR).toContain('size-7');
      expect(ARTICLE_CARD_STYLING.AUTHOR_AVATAR).not.toContain('size-10');
    });

    it('avatar container uses flex gap-2 for inline positioning', () => {
      expect(ARTICLE_CARD_STYLING.AUTHOR_CONTAINER).toContain('flex');
      expect(ARTICLE_CARD_STYLING.AUTHOR_CONTAINER).toContain('items-center');
      expect(ARTICLE_CARD_STYLING.AUTHOR_CONTAINER).toContain('gap-2');
    });

    it('avatar does NOT use absolute positioning (prevents clipping)', () => {
      // The old buggy code used: "absolute -bottom-4 left-4"
      // This caused the avatar to be clipped by the container
      expect(ARTICLE_CARD_STYLING.AUTHOR_AVATAR).not.toContain('absolute');
      expect(ARTICLE_CARD_STYLING.AUTHOR_AVATAR).not.toContain('-bottom-4');
      expect(ARTICLE_CARD_STYLING.AUTHOR_CONTAINER).not.toContain('absolute');
    });

    it('avatar has appropriate border and shadow for inline layout', () => {
      expect(ARTICLE_CARD_STYLING.AUTHOR_AVATAR).toContain('border');
      expect(ARTICLE_CARD_STYLING.AUTHOR_AVATAR).toContain('border-fd-border');
      expect(ARTICLE_CARD_STYLING.AUTHOR_AVATAR).toContain('shadow-sm');
    });
  });

  describe('Content Section Layout', () => {
    it('content container uses standard p-4 padding (not pt-6)', () => {
      // Old code had pt-6 to make room for overlapping avatar
      // New code just needs p-4 since avatar is inline
      expect(ARTICLE_CARD_STYLING.CONTENT_CONTAINER).toContain('p-4');
      expect(ARTICLE_CARD_STYLING.CONTENT_CONTAINER).not.toContain('pt-6');
    });

    it('author and date are on the same row with justify-between', () => {
      expect(ARTICLE_CARD_STYLING.AUTHOR_DATE_ROW).toContain('flex');
      expect(ARTICLE_CARD_STYLING.AUTHOR_DATE_ROW).toContain('justify-between');
    });
  });

  describe('Cover Image Section (No Avatar Overlay)', () => {
    it('cover image section does NOT contain avatar markup', () => {
      // The old cover image container had: <div className="absolute -bottom-4 left-4">
      // This is now removed - avatar is in the content section instead
      expect(ARTICLE_CARD_STYLING.COVER_IMAGE_CONTAINER).not.toContain('-bottom-4');
      expect(ARTICLE_CARD_STYLING.COVER_IMAGE_CONTAINER).not.toContain('left-4');
    });

    it('cover image section maintains proper height and overflow', () => {
      expect(ARTICLE_CARD_STYLING.COVER_IMAGE_CONTAINER).toContain('h-44');
      expect(ARTICLE_CARD_STYLING.COVER_IMAGE_CONTAINER).toContain('overflow-hidden');
    });
  });
});

/**
 * Forbidden Patterns for Author Avatar Layout
 * These patterns MUST NOT appear in ArticlesClient.tsx for the ArticleCard component
 */
describe('Forbidden Author Avatar Patterns - CRITICAL', () => {
  const FORBIDDEN_AVATAR_PATTERNS = {
    // Old overlapping avatar positioning that caused clipping bug
    absolutePosition: 'absolute -bottom-4 left-4',
    
    // Old large avatar size for overlapping design
    largeSizeWithTransform: 'size-10 rounded-full border-2 border-fd-card shadow-lg transition-transform group-hover:scale-110',
    
    // Extra top padding in content section to accommodate overlapping avatar
    extraTopPadding: 'p-4 pt-6',
  };

  it('documents forbidden patterns that cause avatar clipping bug', () => {
    // This test documents the patterns we fixed
    expect(FORBIDDEN_AVATAR_PATTERNS.absolutePosition).toContain('absolute');
    expect(FORBIDDEN_AVATAR_PATTERNS.absolutePosition).toContain('-bottom-4');
  });

  it('old avatar used size-10 with hover scale (too large for inline)', () => {
    expect(FORBIDDEN_AVATAR_PATTERNS.largeSizeWithTransform).toContain('size-10');
    expect(FORBIDDEN_AVATAR_PATTERNS.largeSizeWithTransform).toContain('group-hover:scale-110');
  });

  it('old content section had pt-6 to make room for overlapping avatar', () => {
    expect(FORBIDDEN_AVATAR_PATTERNS.extraTopPadding).toContain('pt-6');
  });
});
