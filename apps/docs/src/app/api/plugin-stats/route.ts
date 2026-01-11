import { NextResponse } from 'next/server';

/**
 * Dynamic plugin statistics API
 * 
 * Returns rule counts for all ESLint plugins by importing their exports.
 * This ensures the homepage and documentation always show accurate counts.
 */

// Plugin configuration with package names and fallback counts
const plugins = [
  { name: 'eslint-plugin-secure-coding', fallback: 76, category: 'security' },
  { name: 'eslint-plugin-pg', fallback: 13, category: 'security' },
  { name: 'eslint-plugin-jwt', fallback: 13, category: 'security' },
  { name: 'eslint-plugin-crypto', fallback: 24, category: 'security' },
  { name: 'eslint-plugin-browser-security', fallback: 21, category: 'security' },
  { name: 'eslint-plugin-mongodb-security', fallback: 16, category: 'security' },
  { name: 'eslint-plugin-vercel-ai-security', fallback: 19, category: 'security' },
  { name: 'eslint-plugin-express-security', fallback: 9, category: 'framework' },
  { name: 'eslint-plugin-nestjs-security', fallback: 5, category: 'framework' },
  { name: 'eslint-plugin-lambda-security', fallback: 5, category: 'framework' },
  { name: 'eslint-plugin-import-next', fallback: 56, category: 'architecture' },
] as const;

interface PluginStats {
  name: string;
  rules: number;
  category: string;
  description?: string;
}

async function getPluginRuleCount(packageName: string, fallback: number): Promise<number> {
  try {
    // Dynamic import of the plugin package
    const plugin = await import(packageName);
    
    // Handle various export patterns
    if (plugin.rules && typeof plugin.rules === 'object') {
      return Object.keys(plugin.rules).length;
    }
    if (plugin.default?.rules && typeof plugin.default.rules === 'object') {
      return Object.keys(plugin.default.rules).length;
    }
    
    return fallback;
  } catch {
    // Package not installed or import failed - use fallback
    return fallback;
  }
}

export async function GET() {
  try {
    const stats: PluginStats[] = await Promise.all(
      plugins.map(async (plugin) => ({
        name: plugin.name,
        rules: await getPluginRuleCount(plugin.name, plugin.fallback),
        category: plugin.category,
      }))
    );

    const totalRules = stats.reduce((sum, p) => sum + p.rules, 0);

    return NextResponse.json({
      plugins: stats,
      totalRules,
      totalPlugins: stats.length,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[API] Failed to get plugin stats:', error);
    return NextResponse.json(
      { error: 'Failed to get plugin statistics' },
      { status: 500 }
    );
  }
}
