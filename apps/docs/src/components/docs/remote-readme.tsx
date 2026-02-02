/**
 * RemoteReadme - Fetches and renders README.md from GitHub
 * 
 * Uses mdx-compiler to render with full MDX support.
 * Caches for 1 hour via Next.js ISR.
 */

import { compileRemoteMDX } from '@/lib/mdx-compiler';
import { RemoteTocProvider } from './remote-toc-provider';

const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/ofri-peretz/eslint/main/packages';

interface RemoteReadmeProps {
  /** Plugin slug (e.g., 'import-next', 'browser-security') */
  plugin: string;
  /** Optional: Show only specific sections */
  sections?: ('introduction' | 'installation' | 'why' | 'full')[];
}

/**
 * Fetch README from GitHub with ISR caching
 */
async function fetchReadme(plugin: string): Promise<string | null> {
  const packageName = `eslint-plugin-${plugin}`;
  const url = `${GITHUB_RAW_BASE}/${packageName}/README.md`;
  
  try {
    const res = await fetch(url, {
      next: { revalidate: 3600 }, // 1 hour ISR cache
    });
    
    if (!res.ok) {
      console.error(`[RemoteReadme] Failed to fetch ${plugin}: ${res.status}`);
      return null;
    }
    
    return res.text();
  } catch (error) {
    console.error(`[RemoteReadme] Error fetching ${plugin}:`, error);
    return null;
  }
}

/**
 * Extract introduction section from README (up to first ## heading)
 */
function extractIntroduction(markdown: string): string {
  const lines = markdown.split('\n');
  let foundHeader = false;
  let intro: string[] = [];
  
  for (const line of lines) {
    // Skip badges at start
    if (line.startsWith('[![')) continue;
    
    // Found the main title
    if (line.startsWith('# ')) {
      foundHeader = true;
      continue;
    }
    
    // Stop at next major section
    if (line.startsWith('## ') && foundHeader) {
      break;
    }
    
    // Collect content after header
    if (foundHeader) {
      intro.push(line);
    }
  }
  
  return intro.join('\n').trim();
}

/**
 * Extract "Why This Plugin?" or similar motivational section
 */
function extractWhySection(markdown: string): string {
  const patterns = [
    /## 🎯 Why This Plugin\?\n\n([\s\S]*?)(?=\n## )/,
    /## Why .*?\n\n([\s\S]*?)(?=\n## )/,
    /## Motivation\n\n([\s\S]*?)(?=\n## )/,
  ];
  
  for (const pattern of patterns) {
    const match = markdown.match(pattern);
    if (match) return match[1].trim();
  }
  
  return '';
}

/**
 * Strip badges and clean up markdown for better rendering
 */
function cleanMarkdown(markdown: string): string {
  // Transform <p align="...">content</p> blocks to <div align="...">content</div>
  // to prevent invalid HTML nesting (p elements cannot contain block elements)
  let cleaned = markdown.replace(
    /<p(\s+align="[^"]*")>([\s\S]*?)<\/p>/gi,
    '<div$1>$2</div>'
  );
  
  return cleaned
    // Remove badge images
    .replace(/\[!\[.*?\]\(.*?\)\]\(.*?\)/g, '')
    // Remove standalone badge images  
    .replace(/!\[.*?badge.*?\]\(.*?\)/gi, '')
    // Remove empty lines at start
    .replace(/^\s*\n+/, '')
    // Limit consecutive empty lines
    .replace(/\n{3,}/g, '\n\n');
}

export async function RemoteReadme({ plugin, sections = ['full'] }: RemoteReadmeProps) {
  const markdown = await fetchReadme(plugin);
  
  if (!markdown) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
        <p className="text-sm text-amber-600 dark:text-amber-400">
          Unable to load README from GitHub. Please check the{' '}
          <a 
            href={`https://github.com/ofri-peretz/eslint/tree/main/packages/eslint-plugin-${plugin}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            source repository
          </a>.
        </p>
      </div>
    );
  }
  
  // Determine what content to compile
  let contentToCompile = markdown;
  
  if (sections.includes('introduction') && !sections.includes('full')) {
    contentToCompile = extractIntroduction(markdown);
  } else if (sections.includes('why') && !sections.includes('full')) {
    contentToCompile = extractWhySection(markdown) || extractIntroduction(markdown);
  }
  
  // Clean up the markdown
  contentToCompile = cleanMarkdown(contentToCompile);
  
  // If empty, show fallback
  if (!contentToCompile.trim()) {
    return (
      <div className="rounded-lg border border-fd-border bg-fd-muted/50 p-4">
        <p className="text-sm text-fd-muted-foreground">
          No content found in the README.
        </p>
      </div>
    );
  }
  
  // Compile with MDX
  let compiledContent: Awaited<ReturnType<typeof compileRemoteMDX>> | null = null;
  let compilationError: Error | null = null;
  
  try {
    compiledContent = await compileRemoteMDX(contentToCompile, {
      pluginName: plugin,
    });
  } catch (error) {
    console.error(`[RemoteReadme] Compilation error for ${plugin}:`, error);
    compilationError = error instanceof Error ? error : new Error(String(error));
  }
    
  // Fallback - show raw markdown on compilation error
  if (compilationError || !compiledContent) {
    return (
      <div className="prose prose-neutral dark:prose-invert max-w-none">
        <pre className="whitespace-pre-wrap text-sm bg-fd-muted p-4 rounded-lg overflow-auto">
          {contentToCompile}
        </pre>
      </div>
    );
  }
  
  const { Body, toc } = compiledContent;
    
  return (
    <RemoteTocProvider toc={toc}>
      <div className="remote-readme">
        <Body />
      </div>
    </RemoteTocProvider>
  );
}

export default RemoteReadme;
