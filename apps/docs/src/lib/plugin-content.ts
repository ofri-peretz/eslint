/**
 * Plugin Content Loader
 * 
 * Loads documentation content from ESLint plugin packages at runtime.
 * This enables a single source of truth for rule documentation -
 * docs live in the package, website renders them dynamically.
 */

import fs from 'fs/promises';
import path from 'path';
import { compileRemoteMarkdown, type CompiledContent } from './mdx-compiler';

// =============================================================================
// Types
// =============================================================================

export interface PluginInfo {
  name: string;
  packageName: string;
  displayName: string;
  category: 'security' | 'quality';
  description: string;
  docsPath: string;
}

export interface RuleDoc {
  ruleName: string;
  plugin: PluginInfo;
  content: CompiledContent;
  filePath: string;
  slug: string;
}

export interface PluginReadme {
  plugin: PluginInfo;
  content: CompiledContent;
  filePath: string;
}

// =============================================================================
// Plugin Registry
// =============================================================================

/** All plugins in the ecosystem with their metadata */
export const PLUGINS: PluginInfo[] = [
  // ==========================================================================
  // Security Plugins
  // ==========================================================================
  {
    name: 'browser-security',
    packageName: 'eslint-plugin-browser-security',
    displayName: 'Browser Security',
    category: 'security',
    description: 'Security rules for browser-side JavaScript',
    docsPath: 'packages/eslint-plugin-browser-security/docs/rules',
  },
  {
    name: 'jwt',
    packageName: 'eslint-plugin-jwt',
    displayName: 'JWT Security',
    category: 'security',
    description: 'JSON Web Token security rules',
    docsPath: 'packages/eslint-plugin-jwt/docs/rules',
  },
  {
    name: 'express-security',
    packageName: 'eslint-plugin-express-security',
    displayName: 'Express Security',
    category: 'security',
    description: 'Security rules for Express.js applications',
    docsPath: 'packages/eslint-plugin-express-security/docs/rules',
  },
  {
    name: 'node-security',
    packageName: 'eslint-plugin-node-security',
    displayName: 'Node.js Security',
    category: 'security',
    description: 'Security rules for Node.js applications',
    docsPath: 'packages/eslint-plugin-node-security/docs/rules',
  },
  {
    name: 'mongodb-security',
    packageName: 'eslint-plugin-mongodb-security',
    displayName: 'MongoDB Security',
    category: 'security',
    description: 'Security rules for MongoDB operations',
    docsPath: 'packages/eslint-plugin-mongodb-security/docs/rules',
  },
  {
    name: 'pg',
    packageName: 'eslint-plugin-pg',
    displayName: 'PostgreSQL Security',
    category: 'security',
    description: 'Security rules for PostgreSQL operations',
    docsPath: 'packages/eslint-plugin-pg/docs/rules',
  },
  {
    name: 'nestjs-security',
    packageName: 'eslint-plugin-nestjs-security',
    displayName: 'NestJS Security',
    category: 'security',
    description: 'Security rules for NestJS applications',
    docsPath: 'packages/eslint-plugin-nestjs-security/docs/rules',
  },
  {
    name: 'lambda-security',
    packageName: 'eslint-plugin-lambda-security',
    displayName: 'AWS Lambda Security',
    category: 'security',
    description: 'Security rules for AWS Lambda functions',
    docsPath: 'packages/eslint-plugin-lambda-security/docs/rules',
  },
  {
    name: 'secure-coding',
    packageName: 'eslint-plugin-secure-coding',
    displayName: 'Secure Coding',
    category: 'security',
    description: 'General secure coding practices',
    docsPath: 'packages/eslint-plugin-secure-coding/docs/rules',
  },
  {
    name: 'vercel-ai-security',
    packageName: 'eslint-plugin-vercel-ai-security',
    displayName: 'Vercel AI Security',
    category: 'security',
    description: 'Security rules for Vercel AI SDK',
    docsPath: 'packages/eslint-plugin-vercel-ai-security/docs/rules',
  },
  {
    name: 'react-a11y',
    packageName: 'eslint-plugin-react-a11y',
    displayName: 'React Accessibility',
    category: 'security',
    description: 'Accessibility rules for React applications',
    docsPath: 'packages/eslint-plugin-react-a11y/docs/rules',
  },
  // ==========================================================================
  // Quality Plugins
  // ==========================================================================
  {
    name: 'conventions',
    packageName: 'eslint-plugin-conventions',
    displayName: 'Conventions',
    category: 'quality',
    description: 'Code style and convention rules',
    docsPath: 'packages/eslint-plugin-conventions/docs/rules',
  },
  {
    name: 'modularity',
    packageName: 'eslint-plugin-modularity',
    displayName: 'Modularity',
    category: 'quality',
    description: 'Module architecture and organization rules',
    docsPath: 'packages/eslint-plugin-modularity/docs/rules',
  },
  {
    name: 'modernization',
    packageName: 'eslint-plugin-modernization',
    displayName: 'Modernization',
    category: 'quality',
    description: 'Modern JavaScript best practices',
    docsPath: 'packages/eslint-plugin-modernization/docs/rules',
  },
  {
    name: 'reliability',
    packageName: 'eslint-plugin-reliability',
    displayName: 'Reliability',
    category: 'quality',
    description: 'Error handling and reliability rules',
    docsPath: 'packages/eslint-plugin-reliability/docs/rules',
  },
  {
    name: 'operability',
    packageName: 'eslint-plugin-operability',
    displayName: 'Operability',
    category: 'quality',
    description: 'Logging, metrics, and observability rules',
    docsPath: 'packages/eslint-plugin-operability/docs/rules',
  },
  {
    name: 'maintainability',
    packageName: 'eslint-plugin-maintainability',
    displayName: 'Maintainability',
    category: 'quality',
    description: 'Code maintainability and readability rules',
    docsPath: 'packages/eslint-plugin-maintainability/docs/rules',
  },
  {
    name: 'import-next',
    packageName: 'eslint-plugin-import-next',
    displayName: 'Import/Next',
    category: 'quality',
    description: 'Import organization and Next.js rules',
    docsPath: 'packages/eslint-plugin-import-next/docs/rules',
  },
  {
    name: 'react-features',
    packageName: 'eslint-plugin-react-features',
    displayName: 'React Features',
    category: 'quality',
    description: 'React best practices and patterns',
    docsPath: 'packages/eslint-plugin-react-features/docs/rules',
  },
];

// =============================================================================
// Content Loading
// =============================================================================

/** Get the monorepo root (two levels up from apps/docs) */
function getMonorepoRoot(): string {
  // In Next.js, process.cwd() is the app directory
  return path.resolve(process.cwd(), '../..');
}

/**
 * Get a plugin by name
 */
export function getPlugin(name: string): PluginInfo | undefined {
  return PLUGINS.find(p => p.name === name);
}

/**
 * Get all plugins in a category
 */
export function getPluginsByCategory(category: 'security' | 'quality'): PluginInfo[] {
  return PLUGINS.filter(p => p.category === category);
}

/**
 * List all rule documentation files for a plugin
 */
export async function listPluginRules(plugin: PluginInfo): Promise<string[]> {
  const monorepoRoot = getMonorepoRoot();
  const docsDir = path.join(monorepoRoot, plugin.docsPath);
  
  try {
    const files = await fs.readdir(docsDir);
    return files
      .filter(f => f.endsWith('.md'))
      .map(f => f.replace('.md', ''));
  } catch {
    // Directory doesn't exist or is empty
    return [];
  }
}

/**
 * Load a single rule's documentation
 */
export async function loadRuleDoc(
  plugin: PluginInfo,
  ruleName: string
): Promise<RuleDoc | null> {
  const monorepoRoot = getMonorepoRoot();
  const filePath = path.join(monorepoRoot, plugin.docsPath, `${ruleName}.md`);
  
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const compiled = await compileRemoteMarkdown(content);
    
    return {
      ruleName,
      plugin,
      content: compiled,
      filePath,
      slug: `${plugin.name}/${ruleName}`,
    };
  } catch {
    return null;
  }
}

/**
 * Load plugin README (for plugin overview pages)
 */
export async function loadPluginReadme(
  plugin: PluginInfo
): Promise<PluginReadme | null> {
  const monorepoRoot = getMonorepoRoot();
  // README is one level up from docs/rules
  const filePath = path.join(
    monorepoRoot,
    plugin.docsPath.replace('/docs/rules', ''),
    'README.md'
  );
  
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const compiled = await compileRemoteMarkdown(content);
    
    return {
      plugin,
      content: compiled,
      filePath,
    };
  } catch {
    return null;
  }
}

/**
 * Get all rules for all plugins (for static generation)
 */
export async function getAllRuleSlugs(): Promise<Array<{
  plugin: string;
  rule: string;
}>> {
  const slugs: Array<{ plugin: string; rule: string }> = [];
  
  for (const plugin of PLUGINS) {
    const rules = await listPluginRules(plugin);
    for (const rule of rules) {
      slugs.push({ plugin: plugin.name, rule });
    }
  }
  
  return slugs;
}

/**
 * Get rule counts per plugin (for dashboard/stats)
 */
export async function getPluginRuleCounts(): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  
  for (const plugin of PLUGINS) {
    const rules = await listPluginRules(plugin);
    counts[plugin.name] = rules.length;
  }
  
  return counts;
}
