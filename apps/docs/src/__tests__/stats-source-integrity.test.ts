/**
 * /stats data-shape integrity — the JSON files the page reads must match the
 * shape the helpers expect. Catches a sync script that adds/removes a field
 * without coordinating with the page (a class of bug the test suite has
 * caught before on other surfaces).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const dataDir = join(process.cwd(), 'src/data');

function readJSON<T>(file: string): T {
  return JSON.parse(readFileSync(join(dataDir, file), 'utf-8')) as T;
}

describe('Stats page: data integrity', () => {
  it('plugin-stats.json has the shape the page consumes', () => {
    const data = readJSON<{
      plugins: Array<{
        name: string;
        rules: number;
        category: string;
        version: string;
        published: boolean;
      }>;
      allPluginsCount: number;
      generatedAt: string;
    }>('plugin-stats.json');
    expect(Array.isArray(data.plugins)).toBe(true);
    expect(data.plugins.length).toBeGreaterThan(0);
    for (const p of data.plugins) {
      expect(typeof p.name).toBe('string');
      expect(typeof p.rules).toBe('number');
      expect(typeof p.category).toBe('string');
      expect(typeof p.version).toBe('string');
      expect(typeof p.published).toBe('boolean');
    }
    expect(typeof data.allPluginsCount).toBe('number');
    expect(typeof data.generatedAt).toBe('string');
  });

  it('coverage-stats.json has the shape the page consumes', () => {
    const data = readJSON<{
      plugins: {
        security: Array<{ name: string; slug: string; coverage: number }>;
        quality: Array<{ name: string; slug: string; coverage: number }>;
      };
    }>('coverage-stats.json');
    expect(data.plugins).toBeTruthy();
    expect(Array.isArray(data.plugins.security)).toBe(true);
    expect(Array.isArray(data.plugins.quality)).toBe(true);
    for (const tier of [data.plugins.security, data.plugins.quality]) {
      for (const p of tier) {
        expect(typeof p.name).toBe('string');
        expect(typeof p.slug).toBe('string');
        expect(typeof p.coverage).toBe('number');
      }
    }
  });

  it('articles.json has the shape the devto aggregator consumes', () => {
    const data = readJSON<{
      articles: Array<{
        positive_reactions_count: number;
        comments_count: number;
        page_views_count?: number;
      }>;
    }>('articles.json');
    expect(Array.isArray(data.articles)).toBe(true);
    expect(data.articles.length).toBeGreaterThan(0);
    for (const a of data.articles) {
      expect(typeof a.positive_reactions_count).toBe('number');
      expect(typeof a.comments_count).toBe('number');
      if (a.page_views_count !== undefined) {
        expect(typeof a.page_views_count).toBe('number');
      }
    }
  });
});
