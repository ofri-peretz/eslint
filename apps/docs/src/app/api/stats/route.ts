import { NextResponse } from 'next/server';

export async function GET() {
  const fallbackData = {
    totals: {
      files: 0,
      lines: 0,
      hits: 0,
      misses: 0,
      coverage: 81.65
    },
    name: 'eslint'
  };

  try {
    const response = await fetch('https://codecov.io/api/v2/github/ofri-peretz/repos/eslint', {
      next: { revalidate: 3600 } // Cache for 1 hour
    });
    
    if (!response.ok) {
      console.warn(`[API PROXY WARNING] Codecov API returned ${response.status}. Using fallback stats.`);
      return NextResponse.json(fallbackData);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[API PROXY ERROR] Failed to fetch Codecov stats, using fallback:', error);
    return NextResponse.json(fallbackData);
  }
}

