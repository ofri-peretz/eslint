import { NextResponse } from 'next/server';

export async function GET() {
  const fallbackData = [
    {
      component_id: 'core',
      name: 'Core Engine',
      coverage: 85.4
    },
    {
      component_id: 'plugins',
      name: 'Security Plugins',
      coverage: 78.2
    },
    {
      component_id: 'utils',
      name: 'Common Utilities',
      coverage: 92.1
    }
  ];

  try {
    const response = await fetch('https://codecov.io/api/v2/github/ofri-peretz/repos/eslint/components/', {
      next: { revalidate: 3600 } // Cache for 1 hour
    });
    
    if (!response.ok) {
      console.warn(`[API PROXY WARNING] Codecov Components API returned ${response.status}. Using fallback data.`);
      return NextResponse.json(fallbackData);
    }

    const data = await response.json();
    // Support both direct array response or { results: [] } structure if it exists
    const components = Array.isArray(data) ? data : (data.results || fallbackData);
    return NextResponse.json(components);
  } catch (error) {
    console.error('[API PROXY ERROR] Failed to fetch Codecov components, using fallback:', error);
    return NextResponse.json(fallbackData);
  }
}
