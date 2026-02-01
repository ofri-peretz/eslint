/**
 * Codecov Stats API Route
 * 
 * Fetches coverage data from Codecov API with caching.
 * Uses the JSON cache policy for 4-hour TTL on coverage data.
 */

import { NextResponse } from 'next/server';
import { fetchCachedJSON, type CachedData } from '@/lib/json-cache';

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
    // Return mock data for development
    return [
      { component_id: 'browser-security', name: 'eslint-plugin-browser-security', coverage: 90.2 },
      { component_id: 'crypto', name: 'eslint-plugin-crypto', coverage: 88.5 },
      { component_id: 'jwt', name: 'eslint-plugin-jwt', coverage: 92.1 },
      { component_id: 'secure-coding', name: 'eslint-plugin-secure-coding', coverage: 85.3 },
      { component_id: 'secrets', name: 'eslint-plugin-secrets', coverage: 87.8 },
      { component_id: 'node-security', name: 'eslint-plugin-node-security', coverage: 83.4 },
      { component_id: 'pg', name: 'eslint-plugin-pg', coverage: 89.2 },
      { component_id: 'mongodb-security', name: 'eslint-plugin-mongodb-security', coverage: 86.1 },
      { component_id: 'vercel-ai-security', name: 'eslint-plugin-vercel-ai-security', coverage: 84.6 },
      { component_id: 'react-best-practices', name: 'eslint-plugin-react-best-practices', coverage: 82.3 },
      { component_id: 'react-hooks-best-practices', name: 'eslint-plugin-react-hooks-best-practices', coverage: 80.1 },
      { component_id: 'documentation', name: 'eslint-plugin-documentation', coverage: 78.5 },
    ];
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
