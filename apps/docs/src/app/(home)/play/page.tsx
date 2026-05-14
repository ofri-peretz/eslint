import type { Metadata } from 'next';
import { Section } from '@interlace/ui/section';
import { SectionHeader } from '@interlace/ui/blocks/section-header';
import { PlaygroundDemo } from '@/components/play/PlaygroundDemo';
import { PLAYGROUND_SNIPPETS, getSnippetBySlug } from '@/components/play/snippets';

export const metadata: Metadata = {
  title: 'Playground — Interlace ESLint',
  description:
    'Paste code on the left, see flagship-rule findings on the right. Try the 6 canonical examples — SQL injection, JWT alg confusion, hardcoded credentials, NoSQL injection, postMessage wildcards, and missing alt text.',
  openGraph: {
    title: 'Playground — Interlace ESLint',
    description:
      'See our flagship security and quality rules fire on canonical examples — in the browser, in under 500 ms (Phase 2).',
    type: 'website',
  },
};

/**
 * /play — the interactive playground.
 *
 * Phase 1a (this version): renders 6 canonical flagship-rule snippets with
 * a hardcoded findings list per example. Read-only code display via
 * Fumadocs `<DynamicCodeBlock>`. URL state contract is wired (`?example=`)
 * so links are shareable today even before Monaco + live linting ship.
 *
 * Phase 1b: swap the code display for a Monaco editor.
 * Phase 2: swap the hardcoded findings for live in-browser ESLint output
 *          via `eslint-linter-browserify`.
 * Phase 3: plugin-toggle strip + "copy config" button.
 *
 * Spec: PLAYGROUND_SPEC.md.
 */
export default async function PlaygroundPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const exampleParam = typeof raw.example === 'string' ? raw.example : undefined;
  const initial = getSnippetBySlug(exampleParam);

  return (
    <main>
      <Section spacing="comfortable" container="content">
        <SectionHeader
          eyebrow="Try it"
          title="Playground"
          tagline="Pick a flagship rule, read the code, see the finding. Phase 1a — static demo with verified findings; live editing arrives in Phase 1b."
        />
      </Section>

      <Section spacing="tight" container="content">
        <PlaygroundDemo initialSlug={initial.slug} />
      </Section>

      <Section spacing="tight" container="content" tone="muted" divider="top">
        <div className="flex flex-col gap-3">
          <p className="font-mono text-xs uppercase tracking-wider text-fd-muted-foreground">
            About the examples
          </p>
          <p className="text-sm text-fd-muted-foreground">
            Each of the {PLAYGROUND_SNIPPETS.length} examples corresponds to one
            of our flagship rules. The findings list shows what our rule emits
            when run against the snippet on the left — captured directly from
            the rule's test corpus, not invented for marketing. The "Read the
            rule" link takes you to the canonical docs page where you can read
            the detection logic, CWE / OWASP mapping, and configuration
            options.
          </p>
        </div>
      </Section>
    </main>
  );
}
