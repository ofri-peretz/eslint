
import { NextResponse } from 'next/server';

export const runtime = 'edge';
export const revalidate = 3600; // 1 hour

export async function GET() {
  try {
    // Fetch the daily-generated stats JSON directly from GitHub to ensure fresh data
    // without requiring a full site rebuild
    const res = await fetch('https://raw.githubusercontent.com/ofri-peretz/eslint/main/apps/docs/src/data/plugin-stats.json', {
      next: { revalidate: 3600 }
    });
    
    if (!res.ok) {
        console.error('[API] Failed to fetch plugin stats from GitHub');
        return NextResponse.json({ error: 'Failed to fetch upstream stats' }, { status: 502 });
    }
    
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[API] Error in plugin-stats:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
