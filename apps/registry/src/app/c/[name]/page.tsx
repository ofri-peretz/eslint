import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { listItemNames, loadItem } from '@/lib/registry';

interface PageProps {
  params: Promise<{ name: string }>;
}

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

  const file = item.files[0];
  const sourcePreview = file.content.length > 8000
    ? file.content.slice(0, 8000) + '\n\n…(truncated; see full source at the JSON endpoint)'
    : file.content;

  return (
    <main>
      <nav className="crumbs">
        <Link href="/">← All components</Link>
      </nav>

      <h1>{item.title}</h1>
      <p className="lead">{item.description}</p>

      <h2>Install</h2>
      <pre className="install-snippet">
        <code>
          npx shadcn@latest add https://ds.interlace.tools/r/{item.name}.json
        </code>
      </pre>
      <p style={{ marginTop: '1rem', color: 'var(--muted)' }}>
        Or with this registry configured as <code>@interlace</code>:
      </p>
      <pre className="install-snippet">
        <code>npx shadcn@latest add @interlace/{item.name}</code>
      </pre>

      <div className="detail-grid">
        <aside>
          <dl className="meta">
            <dt>Type</dt>
            <dd>
              <code>{item.type}</code>
            </dd>

            <dt>Target path</dt>
            <dd>
              <code>{file.target}</code>
            </dd>

            <dt>NPM dependencies</dt>
            <dd>
              {item.dependencies && item.dependencies.length > 0 ? (
                <ul>
                  {item.dependencies.map((d) => (
                    <li key={d}>
                      <code>{d}</code>
                    </li>
                  ))}
                </ul>
              ) : (
                <span style={{ color: 'var(--muted)' }}>none</span>
              )}
            </dd>

            <dt>Registry dependencies</dt>
            <dd>
              {item.registryDependencies &&
              item.registryDependencies.length > 0 ? (
                <ul>
                  {item.registryDependencies.map((d) => (
                    <li key={d}>
                      <Link href={`/c/${d}`}>
                        <code>@interlace/{d}</code>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <span style={{ color: 'var(--muted)' }}>none</span>
              )}
            </dd>

            <dt>JSON endpoint</dt>
            <dd>
              <a href={`/r/${item.name}.json`}>
                <code>/r/{item.name}.json</code>
              </a>
            </dd>
          </dl>
        </aside>

        <section>
          <h2 style={{ marginTop: 0 }}>Source</h2>
          <pre className="source">
            <code>{sourcePreview}</code>
          </pre>
        </section>
      </div>

      <footer>
        <p>
          Source of truth:{' '}
          <a
            href={`https://github.com/ofri-peretz/eslint/blob/main/packages/ui/src/primitives/${item.name}.tsx`}
          >
            <code>packages/ui/src/primitives/{item.name}.tsx</code>
          </a>
          . Visual showcase:{' '}
          <a href={`https://storybook.interlace.tools/?path=/story/${item.name}`}>
            storybook.interlace.tools
          </a>
          .
        </p>
      </footer>
    </main>
  );
}
