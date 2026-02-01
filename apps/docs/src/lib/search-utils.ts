/**
 * Search Utilities
 * 
 * Provides helpers for search functionality including
 * pillar detection and tag extraction.
 */

/** Valid pillar types for the documentation */
export type Pillar = 'security' | 'quality' | 'getting-started';

/** All valid pillars */
export const VALID_PILLARS: readonly Pillar[] = [
  'security',
  'quality', 
  'getting-started',
] as const;

/**
 * Extract pillar from a documentation URL
 * 
 * @param url - The page URL (e.g., "/docs/security/plugins/jwt")
 * @returns The pillar tag or undefined if not a pillar page
 * 
 * @example
 * getPillarFromUrl('/docs/security/plugins/jwt') // 'security'
 * getPillarFromUrl('/docs/quality/rules') // 'quality'
 * getPillarFromUrl('/docs/getting-started/installation') // 'getting-started'
 * getPillarFromUrl('/docs') // undefined
 * getPillarFromUrl('/about') // undefined
 */
export function getPillarFromUrl(url: string): Pillar | undefined {
  // Split URL into segments, filtering empty strings
  const segments = url.split('/').filter(Boolean);
  
  // Expected structure: /docs/[pillar]/...
  // segments[0] = 'docs', segments[1] = pillar
  if (segments.length < 2 || segments[0] !== 'docs') {
    return undefined;
  }
  
  const potentialPillar = segments[1];
  
  if (VALID_PILLARS.includes(potentialPillar as Pillar)) {
    return potentialPillar as Pillar;
  }
  
  return undefined;
}

/**
 * Check if a URL belongs to a specific pillar
 */
export function isInPillar(url: string, pillar: Pillar): boolean {
  return getPillarFromUrl(url) === pillar;
}

/**
 * Get all search tags for a page based on its URL
 * Can be extended to include more metadata-based tags
 */
export function getSearchTags(url: string): string[] {
  const tags: string[] = [];
  
  const pillar = getPillarFromUrl(url);
  if (pillar) {
    tags.push(pillar);
  }
  
  return tags;
}
