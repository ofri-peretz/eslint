import Link from 'next/link';

import { loadIndex } from '@/lib/registry';

const PRIMARY_INSTALL =
  'npx shadcn@latest add https://ds.interlace.tools/r/button.json';
const ALIAS_INSTALL = 'npx shadcn@latest add @interlace/button';

const STYLE_INSTALL =
  'npx shadcn@latest add https://ds.interlace.tools/r/theme.json';

const STORYBOOK_URL = 'https://storybook.interlace.tools';

export default async function HomePage() {
  const index = await loadIndex();
  const styleItem = index.items.find((i) => i.name === 'theme');
  const primitives = index.items.filter((i) => i.type === 'registry:ui');

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ─── Header ─────────────────────────────────────────────── */}
      <header className="border-b border-border bg-background/80 backdrop-blur supports-backdrop-filter:bg-background/60 sticky top-0 z-10">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span
              aria-hidden
              className="inline-block size-6 rounded-md bg-linear-to-br from-violet-500 to-violet-700"
            />
            <span>Interlace UI</span>
            <span className="text-muted-foreground text-sm font-normal">
              · shadcn registry
            </span>
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

      {/* ─── Hero ────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-border">
        <div
          aria-hidden
          className="absolute inset-0 bg-linear-to-br from-violet-950/40 via-background to-background"
        />
        <div
          aria-hidden
          className="absolute -top-32 -right-32 size-112 rounded-full bg-violet-600/20 blur-3xl"
        />
        <div
          aria-hidden
          className="absolute -bottom-32 -left-32 size-112 rounded-full bg-violet-800/15 blur-3xl"
        />

        <div className="relative mx-auto max-w-6xl px-6 py-20 sm:py-28">
          <div className="text-muted-foreground inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            {primitives.length} primitives · 1 theme bundle · WCAG 2.2 AA floor
          </div>

          <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-6xl">
            Production-grade React primitives
            <span className="bg-linear-to-r from-violet-400 to-violet-600 bg-clip-text text-transparent">
              {' '}
              for shadcn
            </span>
            .
          </h1>

          <p className="text-muted-foreground mt-5 max-w-2xl text-lg sm:text-xl">
            Drop the <code className="font-mono text-foreground">@interlace/ui</code>{' '}
            primitives into any React project with one command. Brand tokens,
            theme bridge, animation keyframes, and a portable 26-rule
            component-modeling floor — installed alongside.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <CodeBlock label="Install a primitive" code={PRIMARY_INSTALL} />
          </div>

          <p className="text-muted-foreground mt-4 text-sm">
            Or, after configuring this registry as{' '}
            <code className="font-mono">@interlace</code> in your{' '}
            <code className="font-mono">components.json</code>:{' '}
            <code className="font-mono text-foreground">{ALIAS_INSTALL}</code>
          </p>
        </div>
      </section>

      {/* ─── Theme / CSS modules — the headline section ───────────── */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-10 lg:grid-cols-[1fr_2fr]">
          <div>
            <div className="text-violet-600 dark:text-violet-400 text-xs font-semibold uppercase tracking-wider">
              CSS module export
            </div>
            <h2 className="mt-2 text-3xl font-bold tracking-tight">
              Theme + tokens, installed alongside.
            </h2>
            <p className="text-muted-foreground mt-4">
              Every primitive ships with{' '}
              <code className="text-foreground font-mono">theme</code> as a
              registry dependency. The shadcn CLI bundles the three Interlace
              stylesheets into your project — brand palette, shadcn-bare token
              bridge, animation keyframes — so primitives render the moment
              you import them.
            </p>
            {styleItem ? (
              <p className="text-muted-foreground mt-3 text-sm">
                Install separately:{' '}
                <code className="text-foreground font-mono">
                  npx shadcn@latest add @interlace/theme
                </code>
              </p>
            ) : null}
          </div>
          <div className="space-y-3">
            <CodeBlock label="Install the theme bundle" code={STYLE_INSTALL} />
            <div className="grid gap-3 sm:grid-cols-3">
              <StyleFileCard
                name="tokens.css"
                description="Animation + motion tokens (marquee, shimmer, scale-in)."
              />
              <StyleFileCard
                name="theme.css"
                description="shadcn-bare ↔ fumadocs token bridge; Shiki AAA boosts."
              />
              <StyleFileCard
                name="interlace-theme.css"
                description="Brand violet palette (light + dark), AAA contrast."
              />
            </div>
            <p className="text-muted-foreground text-xs">
              Or fetch raw:{' '}
              <code className="font-mono">
                /r/styles/&lt;tokens|theme|interlace-theme&gt;.css
              </code>
            </p>
          </div>
        </div>
      </section>

      {/* ─── Three pillars ────────────────────────────────────────── */}
      <section className="border-y border-border bg-card/30">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="grid gap-8 sm:grid-cols-3">
            <Pillar
              title="Portable floor"
              body="26-rule component-modeling floor — Tailwind + tokens, mobile-first, locked invariants, zero axe suppressions."
            />
            <Pillar
              title="Engine-agnostic"
              body="Same rules run under ESLint and Oxlint with parity gates; Biome + TSC native on the roadmap."
            />
            <Pillar
              title="Headless behavior"
              body="Built on @base-ui/react primitives. shadcn-canon-compatible source, drop-in via the shadcn CLI."
            />
          </div>
        </div>
      </section>

      {/* ─── Components list — no live previews ──────────────────── */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-violet-600 dark:text-violet-400 text-xs font-semibold uppercase tracking-wider">
              Available primitives
            </div>
            <h2 className="mt-2 text-3xl font-bold tracking-tight">
              {primitives.length} components
            </h2>
            <p className="text-muted-foreground mt-2">
              Visual previews + interactive variants live on{' '}
              <a
                href={STORYBOOK_URL}
                className="text-foreground underline-offset-4 hover:underline"
              >
                storybook.interlace.tools
              </a>
              . This registry is the source — install URLs, dependencies, and
              JSON contract only.
            </p>
          </div>
        </div>

        <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {primitives.map((item) => (
            <li key={item.name}>
              <Link
                href={`/c/${item.name}`}
                className="group border-border hover:border-violet-500/60 hover:bg-card flex h-full flex-col justify-between rounded-lg border bg-card/40 p-4 transition-all"
              >
                <div>
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="text-muted-foreground mt-1 font-mono text-xs">
                    @interlace/{item.name}
                  </p>
                </div>
                <span className="text-muted-foreground group-hover:text-violet-400 mt-3 text-xs transition-colors">
                  Install · view JSON →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* ─── Footer ─────────────────────────────────────────────── */}
      <footer className="border-t border-border">
        <div className="text-muted-foreground mx-auto flex max-w-6xl flex-col gap-2 px-6 py-10 text-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            Source of truth:{' '}
            <a
              href="https://github.com/ofri-peretz/eslint/tree/main/packages/ui/src/primitives"
              className="text-foreground underline-offset-4 hover:underline"
            >
              packages/ui/src/primitives
            </a>
          </div>
          <div className="flex gap-5">
            <a
              href={STORYBOOK_URL}
              className="hover:text-foreground transition-colors"
            >
              Storybook
            </a>
            <a
              href="https://eslint.interlace.tools"
              className="hover:text-foreground transition-colors"
            >
              Plugin docs
            </a>
            <a
              href="/r/index.json"
              className="hover:text-foreground transition-colors"
            >
              Registry index
            </a>
          </div>
        </div>
      </footer>
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

function StyleFileCard({
  name,
  description,
}: {
  name: string;
  description: string;
}) {
  return (
    <div className="border-border bg-background rounded-lg border p-3">
      <div className="font-mono text-sm font-semibold">{name}</div>
      <p className="text-muted-foreground mt-1 text-xs leading-snug">
        {description}
      </p>
    </div>
  );
}

function Pillar({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h3 className="font-semibold">{title}</h3>
      <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
        {body}
      </p>
    </div>
  );
}
