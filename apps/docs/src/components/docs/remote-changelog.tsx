/**
 * RemoteChangelog - Fetches and renders CHANGELOG.md from GitHub
 * 
 * Uses mdx-compiler to render with full MDX support (same as RemoteReadme).
 * Caches for 2 hours via Next.js ISR.
 */

import { compileRemoteMDX } from '@/lib/mdx-compiler';
import { RemoteTocProvider } from './remote-toc-provider';

const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/ofri-peretz/eslint/main/packages';

interface RemoteChangelogProps {
  /** Plugin slug (e.g., 'import-next', 'browser-security') */
  plugin: string;
  /** Maximum number of entries to show (0 = all) */
  limit?: number;
}

/**
 * Fetch CHANGELOG from GitHub with ISR caching
 */
async function fetchChangelog(plugin: string): Promise<string | null> {
  const packageName = `eslint-plugin-${plugin}`;
  const url = `${GITHUB_RAW_BASE}/${packageName}/CHANGELOG.md`;
  
  try {
    const res = await fetch(url, {
      next: { revalidate: 7200 }, // 2 hour ISR cache
    });
    
    if (!res.ok) {
      console.error(`[RemoteChangelog] Failed to fetch ${plugin}: ${res.status}`);
      return null;
    }
    
    return res.text();
  } catch (error) {
    console.error(`[RemoteChangelog] Error fetching ${plugin}:`, error);
    return null;
  }
}

/**
 * Clean up changelog markdown for better rendering
 */
function cleanChangelog(markdown: string, limit: number = 0): string {
  // Remove any leading whitespace/blank lines
  let cleaned = markdown.replace(/^\s*\n+/, '');
  
  // Remove the first H1 heading (page already has title from frontmatter)
  cleaned = cleaned.replace(/^#\s+[^\n]+\n+/, '');
  
  // If limit is set, only show first N version entries
  if (limit > 0) {
    const lines = cleaned.split('\n');
    const newLines: string[] = [];
    let versionCount = 0;
    
    for (const line of lines) {
      // Count version headers: ## [x.x.x] or ## x.x.x
      if (/^##\s+\[?\d+\.\d+\.\d+/.test(line)) {
        versionCount++;
        if (versionCount > limit) break;
      }
      newLines.push(line);
    }
    
    cleaned = newLines.join('\n');
  }
  
  // Limit consecutive empty lines
  return cleaned.replace(/\n{3,}/g, '\n\n');
}

export async function RemoteChangelog({ plugin, limit = 0 }: RemoteChangelogProps) {
  const markdown = await fetchChangelog(plugin);
  
  if (!markdown) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
        <p className="text-sm text-amber-600 dark:text-amber-400">
          Unable to load changelog from GitHub. Please check the{' '}
          <a 
            href={`https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-${plugin}/CHANGELOG.md`}
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
  
  // Clean and optionally limit the changelog
  const contentToCompile = cleanChangelog(markdown, limit);
  
  // If empty, show fallback
  if (!contentToCompile.trim()) {
    return (
      <div className="rounded-lg border border-fd-border bg-fd-muted/50 p-4">
        <p className="text-sm text-fd-muted-foreground">
          No changelog content found.
        </p>
      </div>
    );
  }
  
  // Compile with MDX (same as RemoteReadme)
  let compiledContent: Awaited<ReturnType<typeof compileRemoteMDX>> | null = null;
  let compilationError: Error | null = null;
  
  try {
    compiledContent = await compileRemoteMDX(contentToCompile, {
      pluginName: plugin,
    });
  } catch (error) {
    console.error(`[RemoteChangelog] Compilation error for ${plugin}:`, error);
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
      <div className="remote-changelog">
        <Body />
      </div>
    </RemoteTocProvider>
  );
}

export default RemoteChangelog;
