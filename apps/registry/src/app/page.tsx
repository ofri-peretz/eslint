import Link from 'next/link';

import { loadIndex } from '@/lib/registry';

export default async function HomePage() {
  const index = await loadIndex();

  return (
    <main>
      <h1>Interlace Design System Registry</h1>
      <p className="lead">
        Shadcn-compatible component registry for{' '}
        <code>@interlace/ui</code>. Pull production-grade React primitives
        directly into any project with one command.
      </p>

      <h2>Install a component</h2>
      <pre className="install-snippet">
        <code>
          npx shadcn@latest add https://ds.interlace.tools/r/button.json
        </code>
      </pre>
      <p style={{ marginTop: '1rem', color: 'var(--muted)' }}>
        Or, after configuring this registry as <code>@interlace</code> in your
        <code>components.json</code>:
      </p>
      <pre className="install-snippet">
        <code>npx shadcn@latest add @interlace/button</code>
      </pre>

      <h2>Components</h2>
      <p style={{ color: 'var(--muted)', marginBottom: '0' }}>
        {index.items.length} primitives, each documented with the rules they
        satisfy from the{' '}
        <a href="https://github.com/ofri-peretz/agents/blob/main/skills/interlace-component/SKILL.md">
          26-rule component-modeling floor
        </a>
        .
      </p>
      <div className="component-grid">
        {index.items.map((item) => (
          <Link
            key={item.name}
            href={`/c/${item.name}`}
            className="component-card"
          >
            <h3>{item.title}</h3>
            <p>
              <code>@interlace/{item.name}</code>
            </p>
          </Link>
        ))}
      </div>

      <h2>What you get</h2>
      <p>
        Every primitive follows the portable component-modeling floor:
        Tailwind + design tokens, AA contrast in light + dark, headless
        behavior from <code>@base-ui-components/react</code>,
        server-component by default, zero axe suppressions, locked visual
        invariants.
      </p>

      <footer>
        <p>
          Built from <code>packages/ui/src/primitives/</code> in the{' '}
          <a href="https://github.com/ofri-peretz/eslint">
            interlace ESLint monorepo
          </a>
          . Storybook visual showcase at{' '}
          <a href="https://storybook.interlace.tools">
            storybook.interlace.tools
          </a>
          .
        </p>
      </footer>
    </main>
  );
}
