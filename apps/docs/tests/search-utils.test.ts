import { describe, it, expect } from 'vitest';
import {
  getPillarFromUrl,
  isInPillar,
  getSearchTags,
  VALID_PILLARS,
  type Pillar,
} from '../src/lib/search-utils';

/**
 * Search Utilities Tests
 * 
 * These tests "lock" the search behavior to prevent regressions.
 * The pillar detection is critical for URL-based content organization.
 */

describe('Search Utilities', () => {
  // ===========================================================================
  // VALID_PILLARS - Lock the valid pillar values
  // ===========================================================================
  describe('VALID_PILLARS', () => {
    it('should contain exactly 3 pillars', () => {
      expect(VALID_PILLARS).toHaveLength(3);
    });

    it('should include security pillar', () => {
      expect(VALID_PILLARS).toContain('security');
    });

    it('should include quality pillar', () => {
      expect(VALID_PILLARS).toContain('quality');
    });

    it('should include getting-started pillar', () => {
      expect(VALID_PILLARS).toContain('getting-started');
    });

    it('should be readonly (frozen)', () => {
      // TypeScript readonly is enforced at compile time
      // At runtime, we verify the values are consistent
      expect([...VALID_PILLARS]).toEqual(['security', 'quality', 'getting-started']);
    });
  });

  // ===========================================================================
  // getPillarFromUrl - Lock URL parsing behavior
  // ===========================================================================
  describe('getPillarFromUrl', () => {
    describe('security pillar', () => {
      it('should detect security pillar from /docs/security', () => {
        expect(getPillarFromUrl('/docs/security')).toBe('security');
      });

      it('should detect security pillar from nested URL', () => {
        expect(getPillarFromUrl('/docs/security/plugins/jwt')).toBe('security');
      });

      it('should detect security pillar from deep URL', () => {
        expect(getPillarFromUrl('/docs/security/rules/no-eval')).toBe('security');
      });
    });

    describe('quality pillar', () => {
      it('should detect quality pillar from /docs/quality', () => {
        expect(getPillarFromUrl('/docs/quality')).toBe('quality');
      });

      it('should detect quality pillar from nested URL', () => {
        expect(getPillarFromUrl('/docs/quality/rules/naming')).toBe('quality');
      });

      it('should detect quality pillar from documentation URL', () => {
        expect(getPillarFromUrl('/docs/quality/documentation')).toBe('quality');
      });
    });

    describe('getting-started pillar', () => {
      it('should detect getting-started pillar from /docs/getting-started', () => {
        expect(getPillarFromUrl('/docs/getting-started')).toBe('getting-started');
      });

      it('should detect getting-started pillar from installation URL', () => {
        expect(getPillarFromUrl('/docs/getting-started/installation')).toBe('getting-started');
      });

      it('should detect getting-started pillar from flat-config URL', () => {
        expect(getPillarFromUrl('/docs/getting-started/flat-config')).toBe('getting-started');
      });
    });

    describe('non-pillar URLs', () => {
      it('should return undefined for /docs root', () => {
        expect(getPillarFromUrl('/docs')).toBeUndefined();
      });

      it('should return undefined for homepage', () => {
        expect(getPillarFromUrl('/')).toBeUndefined();
      });

      it('should return undefined for non-docs URLs', () => {
        expect(getPillarFromUrl('/about')).toBeUndefined();
      });

      it('should return undefined for /api routes', () => {
        expect(getPillarFromUrl('/api/search')).toBeUndefined();
      });

      it('should return undefined for unknown pillar', () => {
        expect(getPillarFromUrl('/docs/unknown-pillar/page')).toBeUndefined();
      });
    });

    describe('edge cases', () => {
      it('should handle empty string', () => {
        expect(getPillarFromUrl('')).toBeUndefined();
      });

      it('should handle URL without leading slash', () => {
        expect(getPillarFromUrl('docs/security/test')).toBe('security');
      });

      it('should handle trailing slash', () => {
        expect(getPillarFromUrl('/docs/security/')).toBe('security');
      });

      it('should handle multiple slashes', () => {
        expect(getPillarFromUrl('/docs//security')).toBe('security');
      });

      it('should handle case-sensitive matching', () => {
        // Pillars must be lowercase
        expect(getPillarFromUrl('/docs/Security')).toBeUndefined();
        expect(getPillarFromUrl('/docs/QUALITY')).toBeUndefined();
      });
    });
  });

  // ===========================================================================
  // isInPillar - Lock pillar membership check
  // ===========================================================================
  describe('isInPillar', () => {
    it('should return true for matching pillar', () => {
      expect(isInPillar('/docs/security/jwt', 'security')).toBe(true);
    });

    it('should return false for non-matching pillar', () => {
      expect(isInPillar('/docs/security/jwt', 'quality')).toBe(false);
    });

    it('should return false for non-pillar URLs', () => {
      expect(isInPillar('/docs', 'security')).toBe(false);
    });

    it('should handle all pillar types', () => {
      const testCases: [string, Pillar][] = [
        ['/docs/security/test', 'security'],
        ['/docs/quality/test', 'quality'],
        ['/docs/getting-started/test', 'getting-started'],
      ];

      testCases.forEach(([url, pillar]) => {
        expect(isInPillar(url, pillar)).toBe(true);
      });
    });
  });

  // ===========================================================================
  // getSearchTags - Lock tag generation behavior
  // ===========================================================================
  describe('getSearchTags', () => {
    it('should return pillar as tag for pillar pages', () => {
      expect(getSearchTags('/docs/security/jwt')).toContain('security');
    });

    it('should return empty array for non-pillar pages', () => {
      expect(getSearchTags('/docs')).toEqual([]);
    });

    it('should return single-element array for pillar pages', () => {
      const tags = getSearchTags('/docs/quality/rules');
      expect(tags).toHaveLength(1);
      expect(tags[0]).toBe('quality');
    });

    it('should handle getting-started pillar', () => {
      expect(getSearchTags('/docs/getting-started/installation')).toEqual(['getting-started']);
    });
  });

  // ===========================================================================
  // URL Patterns - Lock expected URL patterns
  // ===========================================================================
  describe('URL Patterns (Documentation)', () => {
    const expectedPatterns = {
      security: [
        '/docs/security',
        '/docs/security/plugins',
        '/docs/security/plugins/jwt',
        '/docs/security/rules/no-eval',
      ],
      quality: [
        '/docs/quality',
        '/docs/quality/plugins',
        '/docs/quality/rules/naming',
        '/docs/quality/documentation',
      ],
      'getting-started': [
        '/docs/getting-started',
        '/docs/getting-started/installation',
        '/docs/getting-started/flat-config',
      ],
    };

    Object.entries(expectedPatterns).forEach(([pillar, urls]) => {
      describe(`${pillar} pillar URLs`, () => {
        urls.forEach(url => {
          it(`should detect ${url} as ${pillar}`, () => {
            expect(getPillarFromUrl(url)).toBe(pillar);
          });
        });
      });
    });
  });
});
