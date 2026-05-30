import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { listItemNames, loadItem } from '@/lib/registry';

interface PageProps {
  params: Promise<{ name: string }>;
}

const STORYBOOK_URL = 'https://storybook.interlace.tools';

const storybookPath = (name: string, type: string): string => {
  if (type === 'registry:style') {
    return `${STORYBOOK_URL}/?path=/docs/tokens-color-contrast--docs`;
  }
  // Storybook story IDs collapse to lowercase + dash, prefixed by category.
  return `${STORYBOOK_URL}/?path=/docs/primitives-${name.toLowerCase()}--docs`;
};

export const dynamicParams = false;

export async function generateStaticParams() {
  const names = await listItemNames();
  return names.map((name) => ({ name }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { name } = await params;
  const item = await loadItem(name);
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
  const item = await loadItem(name);
  if (!item) notFound();

  const storybook = storybookPath(item.name, item.type);
  const file = item.files[0];

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
        <nav aria-label="Breadcrumb" className="text-muted-foreground text-sm">
          <Link href="/" className="hover:text-foreground transition-colors">
            ← All components
          </Link>
        </nav>

        <div className="mt-6 flex items-start justify-between gap-6">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">{item.title}</h1>
            <p className="text-muted-foreground mt-3 max-w-2xl text-lg">
              {item.description}
            </p>
          </div>
          <span className="border-border text-muted-foreground rounded-full border px-3 py-1 font-mono text-xs">
            {item.type.replace('registry:', '')}
          </span>
        </div>

        {/* ─── Storybook CTA — most prominent post-install action ───── */}
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

        {/* ─── Install ──────────────────────────────────────────────── */}
        <section className="mt-12">
          <h2 className="text-xl font-semibold">Install</h2>
          <div className="mt-4 space-y-3">
            <CodeBlock
              label="Via shadcn URL"
              code={`npx shadcn@latest add https://ds.interlace.tools/r/${item.name}.json`}
            />
            <CodeBlock
              label={`Or, with this registry aliased as @interlace`}
              code={`npx shadcn@latest add @interlace/${item.name}`}
            />
          </div>
        </section>

        {/* ─── Metadata ─────────────────────────────────────────────── */}
        <section className="mt-12">
          <h2 className="text-xl font-semibold">Details</h2>
          <dl className="border-border mt-4 grid grid-cols-1 gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2">
            <MetaCell label="Target path">
              <code className="font-mono text-sm">{file.target}</code>
            </MetaCell>
            <MetaCell label="JSON endpoint">
              <a
                href={`/r/${item.name}.json`}
                className="text-foreground font-mono text-sm underline-offset-4 hover:underline"
              >
                /r/{item.name}.json
              </a>
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

        <footer className="border-border mt-16 border-t pt-8 text-sm">
          <p className="text-muted-foreground">
            Source of truth:{' '}
            <a
              href={`https://github.com/ofri-peretz/eslint/blob/main/packages/ui/src/primitives/${item.name}.tsx`}
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
