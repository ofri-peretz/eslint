
import { NextResponse } from 'next/server';

import pluginData from '@/data/plugin-stats.json';

export const revalidate = 86400; // 24 hours

export async function GET() {
  // In development, always use local data for immediate feedback
  if (process.env.NODE_ENV === 'development') {
    return NextResponse.json(pluginData);
  }

  try {
    // Fetch the daily-generated stats JSON directly from GitHub to ensure fresh data
    // without requiring a full site rebuild
    const res = await fetch('https://raw.githubusercontent.com/ofri-peretz/eslint/main/apps/docs/src/data/plugin-stats.json', {
      next: { revalidate: 86400 }
    });
    
    if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data);
    }
    
    // Fallback to local data if GitHub is unreachable
    console.warn('[API] Failed to fetch plugin stats from GitHub, using local fallback');
    return NextResponse.json(pluginData);
  } catch (error) {
    console.error('[API] Error in plugin-stats:', error);
    // Silent fallback to local data
    return NextResponse.json(pluginData);
  }
}
