/**
 * RuleNextStep — "Next step" on every rule page, after the rule summary.
 *
 * 57% of entries on these docs land on a rule page and 2.5% of those reach a
 * plugin or getting-started page (PostHog, 2026-11-20): the rule is read, then
 * the visitor leaves. This puts the plugin the rule belongs to, the install
 * line, the flat config for its recommended preset, and the way on to the
 * plugin page, npm and the source in the place they are already looking.
 * Generated from data (`lib/rule-next-step.ts`); a rule page has no copy of it.
 *
 * A server component. The two code blocks are fumadocs' own (copy button
 * included), so `config_copy` / `install_copy` fire from the same delegated
 * listener as every other block on the site (`ConversionTracker`).
 */
import Link from 'next/link';
import { CodeBlock, Pre } from 'fumadocs-ui/components/codeblock';

import { ruleNextStep } from '@/lib/rule-next-step';

export function RuleNextStep({
  plugin,
  rule,
}: {
  plugin: string;
  rule: string;
}) {
  const data = ruleNextStep(plugin);
  if (!data) return null;
  return (
    <section
      aria-label={`Next step: use ${data.pkg}`}
      data-next-step={rule}
      data-placement="next-step"
      data-plugin={data.plugin}
      className="not-prose mb-8 rounded-lg border border-fd-border bg-fd-muted/30 p-4"
    >
      <p className="text-sm font-semibold text-fd-foreground">Next step</p>
      <p className="mt-1 text-sm text-fd-muted-foreground">
        <code className="font-mono text-fd-foreground">{rule}</code> ships in{' '}
        <Link
          href={data.pluginPath}
          className="font-mono text-fd-foreground underline underline-offset-2"
        >
          {data.pkg}
        </Link>
        , with {data.recommendedCount} of its {data.ruleCount} rules in the{' '}
        <code className="font-mono">recommended</code> preset.
      </p>
      <CodeBlock
        title="Install"
        data-copy-kind="install"
        data-block-id="next-step-install"
      >
        <Pre>
          <code>{data.install}</code>
        </Pre>
      </CodeBlock>
      <CodeBlock title="eslint.config.js" data-block-id="next-step-config">
        <Pre>
          <code>{data.config}</code>
        </Pre>
      </CodeBlock>
      <p className="text-sm">
        <Link href={data.pluginPath} className="underline underline-offset-2">
          Plugin page
        </Link>
        <span aria-hidden="true" className="px-2 text-fd-muted-foreground">
          |
        </span>
        <a
          href={data.npmUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2"
        >
          npm
        </a>
        <span aria-hidden="true" className="px-2 text-fd-muted-foreground">
          |
        </span>
        <a
          href={data.repoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2"
        >
          Source on GitHub
        </a>
      </p>
    </section>
  );
}
