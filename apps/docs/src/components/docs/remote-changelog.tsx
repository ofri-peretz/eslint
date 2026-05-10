/**
 * RemoteChangelog — fetches and renders a plugin's CHANGELOG.md from GitHub.
 * Thin wrapper over @interlace/ui/fumadocs/remote-markdown.
 */

import { RemoteMarkdown } from '@interlace/ui/fumadocs/remote-markdown';
import { compileRemoteMDX } from '@/lib/mdx-compiler';

const GITHUB_RAW_BASE =
  'https://raw.githubusercontent.com/ofri-peretz/eslint/main/packages';

interface RemoteChangelogProps {
  /** Plugin slug (e.g., 'import-next', 'browser-security') */
  plugin: string;
  /** Maximum number of entries to show (0 = all) */
  limit?: number;
}

function cleanChangelog(markdown: string, limit = 0): string {
  let cleaned = markdown
    .replace(/^\s*\n+/, '')
    .replace(/^#\s+[^\n]+\n+/, '');

  if (limit > 0) {
    const lines = cleaned.split('\n');
    const newLines: string[] = [];
    let versionCount = 0;
    for (const line of lines) {
      if (/^##\s+\[?\d+\.\d+\.\d+/.test(line)) {
        versionCount++;
        if (versionCount > limit) break;
      }
      newLines.push(line);
    }
    cleaned = newLines.join('\n');
  }

  return cleaned.replace(/\n{3,}/g, '\n\n');
}

export async function RemoteChangelog({
  plugin,
  limit = 0,
}: RemoteChangelogProps) {
  const url = `${GITHUB_RAW_BASE}/eslint-plugin-${plugin}/CHANGELOG.md`;

  const fallback = (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
      <p className="text-sm text-amber-600 dark:text-amber-400">
        Unable to load changelog from GitHub. Please check the{' '}
        <a
          data-testid="remote-changelog-fallback-link"
          href={`https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-${plugin}/CHANGELOG.md`}
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          source repository
        </a>
        .
      </p>
    </div>
  );

  return (
    <RemoteMarkdown
      url={url}
      revalidate={7200}
      fallback={fallback}
      className="remote-changelog"
      source={{
        variant: 'changelog',
        label: `eslint-plugin-${plugin}/CHANGELOG.md`,
        sourceUrl: `https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-${plugin}/CHANGELOG.md`,
        cacheWindowLabel: '2 hours',
      }}
      preprocess={(source) => cleanChangelog(source, limit)}
      compile={(source) => compileRemoteMDX(source, { pluginName: plugin })}
    />
  );
}

export default RemoteChangelog;
