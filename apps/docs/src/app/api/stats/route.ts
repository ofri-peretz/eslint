/**
 * Codecov Stats API Route
 * 
 * Fetches coverage data from Codecov API with caching.
 * Uses the JSON cache policy for 4-hour TTL on coverage data.
 */

import { NextResponse } from 'next/server';
import { fetchCachedJSON } from '@/lib/json-cache';
import { PLUGINS } from '@/lib/plugins';

// Codecov API Types
export interface CodecovTotals {
  files: number;
  lines: number;
  hits: number;
  misses: number;
  coverage: number;
}

export interface CodecovRepo {
  totals: CodecovTotals;
  name: string;
}

export interface CodecovComponent {
  component_id: string;
  name: string;
  coverage: number;
}

// Environment configuration
const CODECOV_TOKEN = process.env.CODECOV_TOKEN;
const CODECOV_OWNER = process.env.CODECOV_OWNER || 'ofri-peretz';
const CODECOV_REPO = process.env.CODECOV_REPO || 'eslint';

// Cache TTL: 4 hours (matches coverage*.json pattern in json-cache.ts)
const COVERAGE_TTL = 14400;

/**
 * Fetch repository-level coverage stats from Codecov
 */
async function fetchCodecovRepo(): Promise<CodecovRepo> {
  if (!CODECOV_TOKEN) {
    // Return mock data when token not available (development)
    return {
      name: CODECOV_REPO,
      totals: {
        files: 245,
        lines: 12500,
        hits: 10625,
        misses: 1875,
        coverage: 85.0,
      },
    };
  }

  const { data } = await fetchCachedJSON<{ data: CodecovRepo }>(
    `https://codecov.io/api/v2/gh/${CODECOV_OWNER}/repos/${CODECOV_REPO}`,
    {
      ttl: COVERAGE_TTL,
      cacheKey: 'codecov-repo',
    }
  );

  return data.data;
}

/**
 * Fetch component-level coverage breakdown
 */
async function fetchCodecovComponents(): Promise<CodecovComponent[]> {
  if (!CODECOV_TOKEN) {
    // Mock data derived from the canonical registry so dev coverage values
    // never reference packages that don't exist. Coverage figures are
    // deterministic-but-fake (85% baseline ± stable per-slug jitter).
    return PLUGINS.map((p, i) => ({
      component_id: p.slug,
      name: p.package,
      coverage: Number((85 + ((i * 7) % 13) - 6).toFixed(1)),
    }));
  }

  const { data } = await fetchCachedJSON<{ data: { components: CodecovComponent[] } }>(
    `https://codecov.io/api/v2/gh/${CODECOV_OWNER}/repos/${CODECOV_REPO}/components`,
    {
      ttl: COVERAGE_TTL,
      cacheKey: 'codecov-components',
    }
  );

  return data.data.components;
}

/**
 * GET /api/stats
 * Returns repository coverage summary
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'repo';

  try {
    if (type === 'components') {
      const components = await fetchCodecovComponents();
      return NextResponse.json({
        success: true,
        data: components,
        meta: {
          source: 'codecov',
          ttl: COVERAGE_TTL,
          fetchedAt: new Date().toISOString(),
        },
      });
    }

    const repo = await fetchCodecovRepo();
    return NextResponse.json({
      success: true,
      data: repo,
      meta: {
        source: 'codecov',
        ttl: COVERAGE_TTL,
        fetchedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[Codecov API Error]:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch coverage data',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
