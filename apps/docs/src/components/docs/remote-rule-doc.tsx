/**
 * RemoteRuleDoc — fetches and renders a rule's `.md` from GitHub. Thin
 * wrapper over @interlace/ui/fumadocs/remote-markdown that wires in the
 * app's MDX compiler and renders the "live from GitHub" callout.
 */

import { RemoteMarkdown } from '@interlace/ui/fumadocs/remote-markdown';
import { compileRemoteMDX } from '@/lib/mdx-compiler';
import { RuleValueCTA } from './rule-value-cta';

const GITHUB_RAW_BASE =
  'https://raw.githubusercontent.com/ofri-peretz/eslint/main/packages';

interface RemoteRuleDocProps {
  /** Plugin slug (e.g., 'import-next', 'secure-coding') */
  plugin: string;
  /** Rule name (e.g., 'no-cycle', 'no-sql-injection') */
  rule: string;
}

function cleanRuleDoc(markdown: string): string {
  // Loop the comment strip until stable — a single pass leaves nested
  // `<!-- a <!-- b --> c -->` partially intact, which CodeQL flagged as
  // "Incomplete multi-character sanitization".
  let stripped = markdown;
  let prev: string;
  do {
    prev = stripped;
    stripped = stripped.replace(/<!--[\s\S]*?-->/g, '');
  } while (stripped !== prev);

  return stripped
    .replace(/^#\s+[^\n]+\n+/, '')
    .replace(/\[!\[.*?\]\(.*?\)\]\(.*?\)/g, '')
    .replace(/!\[.*?badge.*?\]\(.*?\)/gi, '')
    .replace(/^\s*\n+/, '')
    .replace(/\n{3,}/g, '\n\n');
}

export async function RemoteRuleDoc({ plugin, rule }: RemoteRuleDocProps) {
  const url = `${GITHUB_RAW_BASE}/eslint-plugin-${plugin}/docs/rules/${rule}.md`;
  const githubUrl = `https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-${plugin}/docs/rules/${rule}.md`;

  const fallback = (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
      <p className="text-sm text-amber-600 dark:text-amber-400">
        Unable to load rule documentation from GitHub. Please check the{' '}
        <a
          data-testid="remote-rule-doc-fallback-link"
          href={githubUrl}
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
    <>
      <RemoteMarkdown
        url={url}
        revalidate={21600}
        fallback={fallback}
        className="remote-rule-doc"
        source={{
          variant: 'rule',
          label: `${rule}.md`,
          sourceUrl: githubUrl,
          cacheWindowLabel: '6 hours',
        }}
        preprocess={cleanRuleDoc}
        compile={(source) => compileRemoteMDX(source, { pluginName: plugin })}
      />
      <RuleValueCTA plugin={plugin} rule={rule} />
    </>
  );
}

export default RemoteRuleDoc;
