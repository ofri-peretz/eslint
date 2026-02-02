/**
 * RemoteRuleDoc - Fetches and renders rule documentation from GitHub
 * 
 * Fetches from: packages/eslint-plugin-{plugin}/docs/rules/{rule}.md
 * Uses mdx-compiler to render with full MDX support (same as RemoteReadme).
 * Caches for 6 hours via Next.js ISR.
 */

import { compileRemoteMDX } from '@/lib/mdx-compiler';
import { RemoteTocProvider } from './remote-toc-provider';

const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/ofri-peretz/eslint/main/packages';

interface RemoteRuleDocProps {
  /** Plugin slug (e.g., 'import-next', 'secure-coding') */
  plugin: string;
  /** Rule name (e.g., 'no-cycle', 'no-sql-injection') */
  rule: string;
}

/**
 * Fetch rule documentation from GitHub with ISR caching
 */
async function fetchRuleDoc(plugin: string, rule: string): Promise<string | null> {
  const packageName = `eslint-plugin-${plugin}`;
  const url = `${GITHUB_RAW_BASE}/${packageName}/docs/rules/${rule}.md`;
  
  try {
    const res = await fetch(url, {
      next: { revalidate: 21600 }, // 6 hour ISR cache
    });
    
    if (!res.ok) {
      console.error(`[RemoteRuleDoc] Failed to fetch ${plugin}/${rule}: ${res.status}`);
      return null;
    }
    
    return res.text();
  } catch (error) {
    console.error(`[RemoteRuleDoc] Error fetching ${plugin}/${rule}:`, error);
    return null;
  }
}

/**
 * Clean up rule markdown for better rendering
 */
function cleanRuleDoc(markdown: string): string {
  return markdown
    // Remove HTML comments (can break MDX parsing)
    .replace(/<!--[\s\S]*?-->/g, '')
    // Remove the first H1 heading (page already has title from frontmatter)
    .replace(/^#\s+[^\n]+\n+/, '')
    // Remove badge images
    .replace(/\[!\[.*?\]\(.*?\)\]\(.*?\)/g, '')
    // Remove standalone badge images  
    .replace(/!\[.*?badge.*?\]\(.*?\)/gi, '')
    // Remove empty lines at start
    .replace(/^\s*\n+/, '')
    // Limit consecutive empty lines
    .replace(/\n{3,}/g, '\n\n');
}

export async function RemoteRuleDoc({ plugin, rule }: RemoteRuleDocProps) {
  const markdown = await fetchRuleDoc(plugin, rule);
  
  if (!markdown) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
        <p className="text-sm text-amber-600 dark:text-amber-400">
          Unable to load rule documentation from GitHub. Please check the{' '}
          <a 
            href={`https://github.com/ofri-peretz/eslint/tree/main/packages/eslint-plugin-${plugin}/docs/rules/${rule}.md`}
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
  
  // Clean up the markdown
  const contentToCompile = cleanRuleDoc(markdown);
  
  // If empty, show fallback
  if (!contentToCompile.trim()) {
    return (
      <div className="rounded-lg border border-fd-border bg-fd-muted/50 p-4">
        <p className="text-sm text-fd-muted-foreground">
          No content found in the rule documentation.
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
    console.error(`[RemoteRuleDoc] Compilation error for ${plugin}/${rule}:`, error);
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
  const githubUrl = `https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-${plugin}/docs/rules/${rule}.md`;
  
  return (
    <RemoteTocProvider toc={toc}>
      <div className="remote-rule-doc">
        {/* Live from GitHub callout */}
        <div className="mb-6 rounded-lg border border-fd-info/30 bg-fd-info/10 p-4">
          <p className="text-sm text-fd-info-foreground">
            <strong>📡 Live from GitHub</strong> — This documentation is fetched directly from{' '}
            <a 
              href={githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-fd-primary"
            >
              {rule}.md
            </a>
            {' '}and cached for 6 hours.
          </p>
        </div>
        <Body />
      </div>
    </RemoteTocProvider>
  );
}

export default RemoteRuleDoc;
