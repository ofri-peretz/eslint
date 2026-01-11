import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const response = await fetch('https://codecov.io/api/v2/github/ofri-peretz/repos/eslint');
    
    if (!response.ok) {
      return NextResponse.json(
        { error: `Codecov API error: ${response.status} ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[API PROXY ERROR] Failed to fetch Codecov stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch external stats' },
      { status: 500 }
    );
  }
}
