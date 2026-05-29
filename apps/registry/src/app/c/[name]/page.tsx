import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { CategoryBadge } from '@/components/category-badge';
import { ClientServerBadge } from '@/components/client-server-badge';
import { MinViewportBadge } from '@/components/min-viewport-badge';
import { SourceViewer } from '@/components/source-viewer';
import { categoryFor, CATEGORIES } from '@/lib/categories';
import { listItemNames, loadEnrichedItem } from '@/lib/registry';

interface PageProps {
  params: Promise<{ name: string }>;
}

const STORYBOOK_URL = 'https://storybook.interlace.tools';

const storybookPath = (name: string, type: string): string => {
  if (type === 'registry:style') {
    return `${STORYBOOK_URL}/?path=/docs/tokens-color-contrast--docs`;
  }
  return `${STORYBOOK_URL}/?path=/docs/primitives-${name.toLowerCase()}--docs`;
};

const githubSourceUrl = (name: string) =>
  `https://github.com/ofri-peretz/eslint/blob/main/packages/ui/src/primitives/${name}.tsx`;

export const dynamicParams = false;

export async function generateStaticParams() {
  const names = await listItemNames();
  return names.map((name) => ({ name }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { name } = await params;
  const item = await loadEnrichedItem(name);
  if (!item) return { title: 'Not found' };
  return {
    title: item.title,
    description: item.description,
    openGraph: {
      title: `${item.title} — Interlace DS`,
      description: item.description,
      url: `https://ds.interlace.tools/c/${item.name}`,
    },
  };
}

export default async function ComponentPage({ params }: PageProps) {
  const { name } = await params;
  const item = await loadEnrichedItem(name);
  if (!item) notFound();

  const storybook = storybookPath(item.name, item.type);
  const file = item.files[0];
  const meta = item.metadata;
  const categoryId = categoryFor(item.name);
  const category = CATEGORIES.find((c) => c.id === categoryId);

  return (
    <div className="bg-background text-foreground min-h-screen">
      <header className="border-border bg-background/80 supports-backdrop-filter:bg-background/60 sticky top-0 z-10 border-b backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span
              aria-hidden
              className="inline-block size-6 rounded-md bg-linear-to-br from-violet-500 to-violet-700"
            />
            <span>Interlace UI</span>
          </Link>
          <nav className="flex items-center gap-5 text-sm">
            <a
              href={STORYBOOK_URL}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Storybook ↗
            </a>
            <a
              href="https://github.com/ofri-peretz/eslint"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              GitHub ↗
            </a>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-12">
        {/* ─── Breadcrumb ────────────────────────────────────────── */}
        <nav aria-label="Breadcrumb" className="text-muted-foreground text-sm">
          <Link href="/" className="hover:text-foreground transition-colors">
            ← All components
          </Link>
          {category ? (
            <>
              <span className="px-2" aria-hidden>
                /
              </span>
              <Link
                href={`/#${category.id}`}
                className="hover:text-foreground transition-colors"
              >
                {category.title}
              </Link>
            </>
          ) : null}
        </nav>

        {/* ─── Title + description + badges ──────────────────────── */}
        <div className="mt-6">
          <h1 className="text-4xl font-bold tracking-tight">{item.title}</h1>
          <p className="text-muted-foreground mt-3 max-w-2xl text-lg">
            {item.description}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <CategoryBadge categoryId={categoryId} />
            <ClientServerBadge isClient={meta.isClient} />
            {meta.minViewport !== null ? (
              <MinViewportBadge value={meta.minViewport} />
            ) : null}
            <span className="border-border text-muted-foreground rounded-full border px-3 py-1 font-mono text-xs">
              {item.type.replace('registry:', '')}
            </span>
          </div>
        </div>

        {/* ─── Storybook CTA ──────────────────────────────────────── */}
        <a
          href={storybook}
          className="border-border hover:border-violet-500/60 hover:bg-card group bg-card/40 mt-8 flex items-center justify-between gap-4 rounded-lg border p-5 transition-all"
        >
          <div>
            <div className="text-violet-600 dark:text-violet-400 text-xs font-semibold uppercase tracking-wider">
              Visual examples + interactive variants
            </div>
            <div className="mt-1 font-semibold">
              View {item.title} on Storybook
            </div>
            <div className="text-muted-foreground mt-1 text-sm">
              All states, themes, a11y assertions — rendered live.
            </div>
          </div>
          <span className="text-muted-foreground group-hover:text-violet-400 text-xl transition-colors">
            →
          </span>
        </a>

        {/* ─── Install ───────────────────────────────────────────── */}
        <section className="mt-12">
          <h2 className="text-xl font-semibold">Install</h2>
          <p className="text-muted-foreground mt-2 text-sm">
            Two equivalent paths — the URL works in any shadcn-CLI setup; the
            alias works once you&apos;ve registered{' '}
            <code className="text-foreground font-mono">@interlace</code> in
            your <code className="text-foreground font-mono">components.json</code>.
          </p>
          <div className="mt-4 space-y-3">
            <CodeBlock
              label="Via shadcn URL"
              code={`npx shadcn@latest add https://ds.interlace.tools/r/${item.name}.json`}
            />
            <CodeBlock
              label="With the @interlace alias"
              code={`npx shadcn@latest add @interlace/${item.name}`}
            />
          </div>
        </section>

        {/* ─── Import + exports ─────────────────────────────────── */}
        {meta.exports.length > 0 ? (
          <section className="mt-12">
            <h2 className="text-xl font-semibold">Import</h2>
            <p className="text-muted-foreground mt-2 text-sm">
              {meta.exports.length === 1
                ? 'Single named export.'
                : `${meta.exports.length} named exports — pull the parts you need.`}
            </p>
            <div className="mt-4">
              <CodeBlock
                label="Public API"
                code={`import { ${meta.exports.join(', ')} } from '@interlace/${item.name}';`}
              />
            </div>
          </section>
        ) : null}

        {/* ─── Anatomy ──────────────────────────────────────────── */}
        {meta.anatomy ? (
          <section className="mt-12">
            <h2 className="text-xl font-semibold">Anatomy</h2>
            <p className="text-muted-foreground mt-2 text-sm">
              Extracted from the primitive&apos;s JSDoc header. The source is
              the only documentation that can&apos;t drift.
            </p>
            <pre className="border-border bg-card mt-4 overflow-x-auto rounded-lg border px-5 py-4 text-sm leading-relaxed">
              {meta.anatomy}
            </pre>
          </section>
        ) : null}

        {/* ─── Variants ─────────────────────────────────────────── */}
        {meta.variants.length > 0 ? (
          <section className="mt-12">
            <h2 className="text-xl font-semibold">Variants</h2>
            <p className="text-muted-foreground mt-2 text-sm">
              Closed prop unions enforced by <code className="text-foreground font-mono">class-variance-authority</code>.
              See {' '}
              <a
                href={storybook}
                className="text-foreground underline-offset-4 hover:underline"
              >
                Storybook&apos;s Variants story
              </a>
              {' '} for the rendered matrix.
            </p>
            <ul className="border-border mt-4 grid grid-cols-1 gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2">
              {meta.variants.map((v) => (
                <li key={v.name} className="bg-card p-4">
                  <div className="font-mono text-sm font-semibold">{v.name}</div>
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {v.options.map((opt) => (
                      <li
                        key={opt}
                        className={
                          opt === v.defaultValue
                            ? 'bg-violet-500/10 border-violet-500/40 text-violet-600 dark:text-violet-300 rounded-md border px-2 py-0.5 font-mono text-xs'
                            : 'bg-background border-border text-muted-foreground rounded-md border px-2 py-0.5 font-mono text-xs'
                        }
                      >
                        {opt}
                        {opt === v.defaultValue ? (
                          <span className="ml-1 text-[10px] opacity-70">
                            default
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* ─── Rule compliance ──────────────────────────────────── */}
        {meta.rRules.length > 0 ? (
          <section className="mt-12">
            <h2 className="text-xl font-semibold">R-rule compliance</h2>
            <p className="text-muted-foreground mt-2 text-sm">
              Every primitive in @interlace/ui models to the portable 26-rule
              floor enforced by the{' '}
              <code className="text-foreground font-mono">
                componentApi
              </code>{' '}
              ESLint preset. The cells below pin exactly where each rule
              applies in this file.
            </p>
            <div className="border-border bg-card mt-4 overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-background/60 text-muted-foreground text-xs uppercase tracking-wider">
                  <tr>
                    <th className="border-border border-b px-4 py-2 text-left font-semibold">
                      Rule
                    </th>
                    <th className="border-border border-b px-4 py-2 text-left font-semibold">
                      Concept
                    </th>
                    <th className="border-border border-b px-4 py-2 text-left font-semibold">
                      Where
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {meta.rRules.map((r) => (
                    <tr key={r.rule} className="border-border border-b last:border-b-0">
                      <td className="px-4 py-2 font-mono text-xs font-semibold">
                        {r.rule}
                      </td>
                      <td className="px-4 py-2">{r.concept}</td>
                      <td className="text-muted-foreground px-4 py-2 font-mono text-xs">
                        {r.location}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {/* ─── Min-viewport contract ────────────────────────────── */}
        {meta.minViewport !== null ? (
          <section className="mt-12">
            <h2 className="text-xl font-semibold">Minimum viewport</h2>
            <p className="text-muted-foreground mt-2 text-sm">
              This primitive declares{' '}
              <code className="text-foreground font-mono">
                MIN_VIEWPORT = {meta.minViewport}
              </code>{' '}
              CSS px (DESIGN_PRINCIPLES #14). When mounted in a container
              narrower than this, the preflight contract draws a dev-mode
              outline so the regression is visible during local development.
            </p>
            <div className="border-border bg-card mt-4 rounded-lg border p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-400">
                Opt-in to the dev-mode warning
              </div>
              <pre className="mt-2 overflow-x-auto font-mono text-xs">
                {'<body data-interlace-dev>...</body>'}
              </pre>
              <p className="text-muted-foreground mt-3 text-xs">
                Add the <code className="text-foreground">data-interlace-dev</code>{' '}
                attribute to the body in <em>development</em> builds only —
                preflight then outlines any primitive whose container is below
                its declared <code className="text-foreground">data-min-viewport</code>.
              </p>
            </div>
          </section>
        ) : null}

        {/* ─── Dependencies ──────────────────────────────────────── */}
        <section className="mt-12">
          <h2 className="text-xl font-semibold">Dependencies</h2>
          <dl className="border-border mt-4 grid grid-cols-1 gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2">
            <MetaCell label="Base UI primitive">
              {meta.baseUiImport ? (
                <a
                  href={`https://base-ui.com/react/components/${meta.baseUiImport}`}
                  className="text-foreground font-mono text-sm underline-offset-4 hover:underline"
                >
                  @base-ui/react/{meta.baseUiImport}
                </a>
              ) : (
                <span className="text-muted-foreground text-sm">
                  Native / no Base UI dependency
                </span>
              )}
            </MetaCell>
            <MetaCell label="Lucide icons">
              {meta.lucideIcons.length > 0 ? (
                <ul className="flex flex-wrap gap-1.5">
                  {meta.lucideIcons.map((icon) => (
                    <li key={icon}>
                      <code className="bg-background border-border rounded-md border px-2 py-0.5 font-mono text-xs">
                        {icon}
                      </code>
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="text-muted-foreground text-sm">none</span>
              )}
            </MetaCell>
            <MetaCell label="NPM dependencies">
              {item.dependencies && item.dependencies.length > 0 ? (
                <ul className="flex flex-wrap gap-1.5">
                  {item.dependencies.map((d) => (
                    <li key={d}>
                      <code className="bg-background border-border rounded-md border px-2 py-0.5 font-mono text-xs">
                        {d}
                      </code>
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="text-muted-foreground text-sm">none</span>
              )}
            </MetaCell>
            <MetaCell label="Registry dependencies">
              {item.registryDependencies &&
              item.registryDependencies.length > 0 ? (
                <ul className="flex flex-wrap gap-1.5">
                  {item.registryDependencies.map((d) => (
                    <li key={d}>
                      <Link
                        href={`/c/${d}`}
                        className="bg-background border-border hover:border-violet-500/60 rounded-md border px-2 py-0.5 font-mono text-xs"
                      >
                        @interlace/{d}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="text-muted-foreground text-sm">none</span>
              )}
            </MetaCell>
          </dl>
        </section>

        {/* ─── Source ───────────────────────────────────────────── */}
        <section className="mt-12">
          <h2 className="text-xl font-semibold">Source</h2>
          <p className="text-muted-foreground mt-2 text-sm">
            The full implementation —{' '}
            <code className="text-foreground font-mono">{file.target}</code>{' '}
            once installed.
          </p>
          <SourceViewer source={file.content} githubUrl={githubSourceUrl(item.name)} />
        </section>

        {/* ─── JSON endpoint ─────────────────────────────────────── */}
        <section className="mt-12">
          <h2 className="text-xl font-semibold">Registry JSON</h2>
          <p className="text-muted-foreground mt-2 text-sm">
            The raw registry record — what the shadcn CLI fetches.
          </p>
          <div className="mt-4">
            <a
              href={`/r/${item.name}.json`}
              className="border-border bg-card hover:border-violet-500/60 inline-flex items-center gap-2 rounded-md border px-3 py-2 font-mono text-sm transition-colors"
            >
              /r/{item.name}.json
              <span aria-hidden>↗</span>
            </a>
          </div>
        </section>

        <footer className="border-border mt-16 border-t pt-8 text-sm">
          <p className="text-muted-foreground">
            Source of truth:{' '}
            <a
              href={githubSourceUrl(item.name)}
              className="text-foreground underline-offset-4 hover:underline"
            >
              packages/ui/src/primitives/{item.name}.tsx
            </a>
          </p>
        </footer>
      </main>
    </div>
  );
}

function CodeBlock({ label, code }: { label: string; code: string }) {
  return (
    <div className="border-border bg-card overflow-hidden rounded-lg border">
      <div className="text-muted-foreground border-border border-b px-4 py-2 text-xs font-medium">
        {label}
      </div>
      <pre className="overflow-x-auto px-4 py-3">
        <code className="font-mono text-sm">{code}</code>
      </pre>
    </div>
  );
}

function MetaCell({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card p-4">
      <dt className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
        {label}
      </dt>
      <dd className="mt-2">{children}</dd>
    </div>
  );
}
