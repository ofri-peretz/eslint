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
 * Phase 1b (this version): renders 6 canonical flagship-rule snippets in
 * an editable Monaco editor with verified static findings per snippet.
 * When the user edits the code, the right pane switches to an honest
 * "edited, live linting pending" placeholder until Phase 2 ships.
 * URL state contract is wired (`?example=`) so links are shareable.
 *
 * Phase 2: swap the static findings for live in-browser ESLint output
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
          tagline="Pick a flagship rule, edit the code, toggle the plugins, copy a real eslint.config.js. Phase 1c — Monaco editor + plugin toggle strip + verified static findings; live in-browser linting (oxlint WASM) arrives in Phase 2."
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
