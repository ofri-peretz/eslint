import Link from 'next/link';
import { Card, Cards } from 'fumadocs-ui/components/card';
import {
  ShieldCheck,
  Code2,
  ArrowRight,
  Trophy,
  Lightbulb,
  TreeDeciduous,
  Workflow,
  GitFork,
  Gauge,
  Brain,
  GitCompare,
  FileCheck,
  Repeat,
} from 'lucide-react';
import { BorderBeam } from '@interlace/ui/magicui/border-beam';
import { NumberTicker } from '@interlace/ui/magicui/number-ticker';
import { Section } from '@interlace/ui/section';
import { SectionHeader } from '@interlace/ui/blocks/section-header';
import { TweetCard } from '#interlace/components/marketing/tweet-card';
import { DevToCard } from '#interlace/components/marketing/devto-card';
import { createTweetFetcher } from '#interlace/lib/tweet-loader';
import { createDevToFetcher } from '#interlace/lib/devto-loader';
import { ShimmerButton } from '@interlace/ui/magicui/shimmer-button';
import { getDisplayStats } from '@/lib/stats-loader';
import { HeroSection } from '@/components/home/hero-section';
import { InstallSnippet } from '@/components/mdx/install-snippet';
import cachedTweets from '@/data/cached-tweets.json';
import cachedDevToArticles from '@/data/cached-devto-articles.json';

// Cache-aware fetchers — fall back to JSON cache when Twitter / DEV.to API
// is rate-limited during Vercel builds (preserves the previous behavior).
const tweetFetcher = createTweetFetcher({ cache: cachedTweets });
const devtoFetcher = createDevToFetcher({ cache: cachedDevToArticles });

// LAYOUT_PHILOSOPHY.md adherence:
//   - No `container mx-auto px-*` in this file; <Section> owns the wrapper.
//   - No raw `max-w-*` here; <Container size> picks from prose|content|wide|full.
//   - No inline `border-y` / `bg-fd-card/*`; <Section divider|tone> owns those.
//   - SectionHeader owns the "text-center mb-12 + h2 + tagline" pattern.
//   - HOMEPAGE_LAYOUT_AUDIT.md closes once this file ships.

export default async function HomePage() {
  const stats = await getDisplayStats();

  // Note: fumadocs `HomeLayout` already provides the page-level `<main>`
  // landmark; nesting another would trip axe `landmark-no-duplicate-main`.
  // We attach `id="main-content"` to this outer wrapper so the root
  // layout's skip link (KEYBOARD_PHILOSOPHY.md #1) has a focusable target
  // INSIDE fumadocs's <main>. `tabIndex={-1}` makes the wrapper
  // programmatically focusable so `location.hash = "#main-content"`
  // actually lands focus there, without inserting it into the natural
  // Tab sequence.
  return (
    <div id="main-content" tabIndex={-1} className="relative min-h-screen outline-hidden">
      {/* HERO — full-bleed; not subject to container rules (LAYOUT §2 `full`) */}
      <HeroSection />

      {/* STATS BAR */}
      <Section
        spacing="tight"
        tone="inset"
        divider="both"
        container="content"
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 lg:gap-8">
          <StatCard value={stats.plugins} label="Plugins" />
          <StatCard value={stats.rules} label="Rules" suffix="+" />
          <StatCard value={stats.securityPlugins} label="Security" />
          <StatCard value={stats.qualityPlugins} label="Quality" />
        </div>
      </Section>

      {/* DOCS PREVIEW — Install → Configure (UX_PHILOSOPHY §1) */}
      <Section spacing="comfortable" container="content">
        <SectionHeader
          title="See it in action"
          tagline="Clean configuration, powerful protection. Works with ESLint 8 and 9, flat config or legacy."
        />

        {/* Step 1: Install — PM switcher, persisted site-wide */}
        <div className="mb-6">
          <StepLabel n={1} label="Install" />
          <InstallSnippet
            packages="eslint-plugin-browser-security eslint-plugin-jwt"
            dev
          />
        </div>

        {/* Step 2: Configure — code preview */}
        <div className="mb-3">
          <StepLabel n={2} label="Configure" />
        </div>

        <div className="relative">
          <div className="relative rounded-2xl border border-fd-border bg-fd-card overflow-hidden shadow-2xl">
            <BorderBeam size={400} duration={15} colorFrom="#a855f7" colorTo="#7c3aed" />

            {/* Terminal Header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-fd-border bg-fd-background/50">
              <div className="flex gap-1.5">
                <div className="size-3 rounded-full bg-red-500/80" aria-hidden />
                <div className="size-3 rounded-full bg-yellow-500/80" aria-hidden />
                <div className="size-3 rounded-full bg-green-500/80" aria-hidden />
              </div>
              <span className="text-xs text-fd-muted-foreground font-mono ml-2">eslint.config.js</span>
            </div>

            {/* Code Content — WCAG accessible colors for light/dark themes */}
            <pre className="p-6 text-sm md:text-base overflow-x-auto">
              <code className="font-mono">
                <span className="text-purple-600 dark:text-purple-400">import</span> <span className="text-amber-600 dark:text-yellow-400">browserSecurity</span> <span className="text-purple-600 dark:text-purple-400">from</span> <span className="text-green-600 dark:text-green-400">&apos;eslint-plugin-browser-security&apos;</span>;{'\n'}
                <span className="text-purple-600 dark:text-purple-400">import</span> <span className="text-amber-600 dark:text-yellow-400">jwt</span> <span className="text-purple-600 dark:text-purple-400">from</span> <span className="text-green-600 dark:text-green-400">&apos;eslint-plugin-jwt&apos;</span>;{'\n'}
                {'\n'}
                <span className="text-purple-600 dark:text-purple-400">export default</span> [{'\n'}
                {'  '}browserSecurity.configs.<span className="text-amber-600 dark:text-yellow-400">recommended</span>,{'\n'}
                {'  '}jwt.configs.<span className="text-amber-600 dark:text-yellow-400">recommended</span>,{'\n'}
                {'  '}<span className="text-fd-muted-foreground">{'// Start protecting your code instantly'}</span>{'\n'}
                ];
              </code>
            </pre>
          </div>

          {/* Floating badge — AAA: white-on-violet-700 ≈ 5.4:1 (passes
              AAA for large/bold text). aria-hidden + pointer-events-none
              per LAYOUT §9 (decorative chrome never displaces or steals
              focus). */}
          <div
            aria-hidden
            className="pointer-events-none absolute -top-4 -right-4 md:right-8 bg-linear-to-r from-purple-700 to-violet-800 text-white font-bold px-4 py-2 rounded-full text-sm shadow-lg"
          >
            Flat Config ✓
          </div>
        </div>
      </Section>

      {/* WHAT IT CATCHES — concrete CWEs, engineer-evaluating-adoption signal */}
      <Section
        spacing="comfortable"
        tone="muted"
        divider="both"
        container="wide"
      >
        <SectionHeader
          title="What it catches"
          tagline="Real vulnerabilities in real code. Every rule maps to a CWE so AI agents and humans can act on the same signal."
        />

        <div className="grid md:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
          <CatchCard
            cwe="CWE-89"
            title="SQL injection"
            ruleId="pg/no-unsafe-query"
            href="/docs/security/plugin-pg/rules/no-unsafe-query"
            snippet={`db.query(\n  \`SELECT * FROM users WHERE id = \${id}\`,\n)`}
          />
          <CatchCard
            cwe="CWE-347"
            title="JWT algorithm confusion"
            ruleId="jwt/no-algorithm-none"
            href="/docs/security/plugin-jwt/rules/no-algorithm-none"
            snippet={`jwt.verify(token, secret, {\n  algorithms: ['none'],\n})`}
          />
          <CatchCard
            cwe="CWE-79"
            title="XSS via innerHTML"
            ruleId="browser-security/no-innerhtml"
            href="/docs/security/plugin-browser-security/rules/no-innerhtml"
            snippet={`el.innerHTML = userInput;`}
          />
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/docs/getting-started/concepts/cwe-compatibility"
            className="inline-flex items-center gap-1 text-sm font-medium text-fd-muted-foreground hover:text-fd-foreground"
          >
            See full CWE coverage matrix
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </Section>

      {/* SOCIAL PROOF */}
      <Section spacing="comfortable" divider="top" container="wide">
        <SectionHeader
          eyebrow={
            <span className="inline-flex items-center gap-2 rounded-full border border-fd-border bg-fd-card px-3 py-1 text-xs font-medium text-fd-muted-foreground">
              <Trophy className="size-3.5 text-orange-500" aria-hidden />
              Featured in DEV Community Top 7
            </span>
          }
          title="Trusted by developers"
          tagline="Security insights from teams shipping production JavaScript."
        />

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8 items-stretch">
          {/* Async slot — min-h matches destination geometry (LAYOUT §6 reserve space) */}
          <div className="flex justify-center min-h-[420px]">
            <TweetCard id="2006790779537121585" fetcher={tweetFetcher} />
          </div>

          <div className="flex justify-center min-h-[420px]">
            <DevToCard path="devteam/top-7-featured-dev-posts-of-the-week-2cgm" fetcher={devtoFetcher} />
          </div>

          {/* Developer Testimonial Card */}
          <div className="relative flex flex-col gap-4 overflow-hidden rounded-xl border border-fd-border bg-fd-card/80 backdrop-blur-sm p-6 hover:border-fd-border/80 transition-all duration-300 h-full min-h-[420px]">
            <div className="flex items-start gap-3">
              <div className="size-10 rounded-full bg-linear-to-br from-green-500 to-emerald-600 flex items-center justify-center shrink-0" aria-hidden>
                <ShieldCheck className="size-5 text-white" />
              </div>
              <div className="flex-1">
                <blockquote className="text-fd-foreground leading-relaxed italic">
                  &ldquo;Finally, a security-focused ESLint ecosystem that catches real vulnerabilities. Found 3 XSS vectors in our React app within minutes of installing browser-security.&rdquo;
                </blockquote>
                <div className="mt-4 flex items-center gap-2">
                  <div className="h-px flex-1 bg-fd-border" aria-hidden />
                  <span className="text-xs text-fd-muted-foreground font-medium">
                    Developer Feedback
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mt-auto pt-2">
              <span className="rounded-full bg-green-500/15 px-3 py-1 text-xs font-medium text-green-900 dark:text-green-100">
                Real-time detection
              </span>
              <span className="rounded-full bg-blue-500/15 px-3 py-1 text-xs font-medium text-blue-900 dark:text-blue-100">
                Zero config
              </span>
              <span className="rounded-full bg-purple-500/15 px-3 py-1 text-xs font-medium text-purple-900 dark:text-purple-100">
                Auto-fix ready
              </span>
            </div>
          </div>
        </div>
      </Section>

      {/* TWO PILLARS */}
      <Section spacing="comfortable" container="content">
        <SectionHeader
          title="Two Pillars of Excellence"
          tagline="Comprehensive coverage organized into Security and Quality categories."
        />

        <div className="grid md:grid-cols-2 gap-4 md:gap-6 lg:gap-8">
          {/* Security Pillar */}
          <Link href="/docs/security" className="group">
            <div className="relative overflow-hidden rounded-2xl border-2 border-fd-border bg-linear-to-br from-orange-500/10 via-red-500/5 to-transparent p-8 h-full transition-all duration-300 hover:border-orange-500/50 hover:shadow-xl hover:shadow-orange-500/10 hover:-translate-y-1">
              <div aria-hidden className="pointer-events-none absolute top-0 right-0 w-32 h-32 bg-linear-to-bl from-orange-500/20 to-transparent rounded-bl-full" />

              <ShieldCheck className="size-14 text-orange-500 mb-6" aria-hidden />
              <h3 className="text-2xl font-bold mb-3">Security</h3>
              <p className="text-fd-muted-foreground mb-6">
                <span className="text-fd-foreground font-semibold">{stats.securityPlugins} plugins</span> protecting against XSS, injection, insecure tokens, and common vulnerability patterns.
              </p>

              <div className="flex flex-wrap gap-2 mb-6">
                {['Browser', 'JWT', 'Express', 'Node.js', 'MongoDB'].map(tag => (
                  <span
                    key={tag}
                    className="rounded-full bg-orange-500/15 px-3 py-1 text-xs font-medium text-orange-900 dark:text-orange-100"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div className="flex items-center text-orange-500 font-medium">
                Explore Security <ArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          </Link>

          {/* Quality Pillar */}
          <Link href="/docs/quality" className="group">
            <div className="relative overflow-hidden rounded-2xl border-2 border-fd-border bg-linear-to-br from-purple-500/10 via-blue-500/5 to-transparent p-8 h-full transition-all duration-300 hover:border-purple-500/50 hover:shadow-xl hover:shadow-purple-500/10 hover:-translate-y-1">
              <div aria-hidden className="pointer-events-none absolute top-0 right-0 w-32 h-32 bg-linear-to-bl from-purple-500/20 to-transparent rounded-bl-full" />

              <Code2 className="size-14 text-purple-500 mb-6" aria-hidden />
              <h3 className="text-2xl font-bold mb-3">Quality & Architecture</h3>
              <p className="text-fd-muted-foreground mb-6">
                <span className="text-fd-foreground font-semibold">{stats.qualityPlugins} plugins</span> enforcing conventions, modularity, reliability, and modern best practices.
              </p>

              <div className="flex flex-wrap gap-2 mb-6">
                {['Conventions', 'Modularity', 'Reliability', 'Modernization'].map(tag => (
                  <span
                    key={tag}
                    className="rounded-full bg-purple-500/15 px-3 py-1 text-xs font-medium text-purple-900 dark:text-purple-100"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div className="flex items-center text-purple-500 font-medium">
                Explore Quality <ArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          </Link>
        </div>
      </Section>

      {/* HOW IT WORKS — surface Concepts corpus (UX_PHILOSOPHY §4, §5) */}
      <Section spacing="comfortable" divider="top" container="content">
        <SectionHeader
          title="How it works"
          tagline="Three short reads that explain the model. Skim before you install — or come back when a rule surprises you."
        />

        <Cards>
          <Card
            icon={<Lightbulb className="size-6" />}
            title="Philosophy"
            description="Why an ecosystem of specialized plugins beats a single monolith."
            href="/docs/getting-started/concepts/philosophy"
          />
          <Card
            icon={<TreeDeciduous className="size-6" />}
            title="AST Fundamentals"
            description="How ESLint reads your code — and why understanding the tree unlocks every rule."
            href="/docs/getting-started/concepts/ast-fundamentals"
          />
          <Card
            icon={<Workflow className="size-6" />}
            title="Detect → Understand → Fix"
            description="The three-step workflow that defines the Interlace experience, for humans and agents."
            href="/docs/getting-started/concepts/detect-understand-fix"
          />
        </Cards>
      </Section>

      {/* OUR EDGES — Compatibility / Runtime Portability / Benchmarks / AI (UX_PHILOSOPHY §9) */}
      <Section
        spacing="comfortable"
        tone="muted"
        divider="top"
        container="content"
      >
        <SectionHeader
          title="Our edges"
          tagline="The four places where Interlace pulls ahead of the rest of the JavaScript linting ecosystem."
        />

        <Cards>
          <Card
            icon={<GitFork className="size-6" />}
            title="Compatibility"
            description="ESLint 8, 9, and forward to v10. Flat config and legacy. Type-aware where it matters, type-unaware where it doesn't — fast by default."
            href="/docs/getting-started/concepts/compatibility"
          />
          <Card
            icon={<Repeat className="size-6" />}
            title="Runtime Portability"
            description="One rule, multiple engines. Oxlint for the fast tier, ESLint for the deep tier — same diagnostics, CI-enforced parity. Your investment survives the runtime swap."
            href="/docs/getting-started/concepts/runtime-portability"
          />
          <Card
            icon={<Gauge className="size-6" />}
            title="Benchmarks"
            description="330+ rules across 18+ plugins, 100% OWASP Top 10 coverage, head-to-head data refreshed weekly from real npm download share."
            href="/docs/getting-started/concepts/benchmarks"
          />
          <Card
            icon={<Brain className="size-6" />}
            title="AI Leverage"
            description="LLM-optimized error messages, structured CWE metadata, and ESLint MCP support so coding agents fix vulnerabilities without hallucinating."
            href="/docs/getting-started/concepts/ai-integration"
          />
        </Cards>
      </Section>

      {/* FINAL CTA */}
      <Section spacing="spacious" container="wide">
        <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-purple-500/20 via-violet-500/15 to-purple-600/20 border border-purple-500/30 px-6 py-16 sm:px-10 lg:px-16 lg:py-24 text-center">
          {/* Decorative chrome — absolute + aria-hidden + pointer-events-none (LAYOUT §9) */}
          <div
            aria-hidden
            className="pointer-events-none absolute top-0 left-0 w-64 h-64 bg-linear-to-br from-purple-400/30 to-transparent rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute bottom-0 right-0 w-64 h-64 bg-linear-to-tl from-violet-500/30 to-transparent rounded-full blur-3xl translate-x-1/2 translate-y-1/2"
          />

          {/* Inner column — flex-col gives a single source of truth for
              vertical rhythm; gap-* replaces ad-hoc mb-* on each child so
              the spacing scale stays consistent across breakpoints. */}
          <div className="relative flex flex-col items-center gap-8 md:gap-10">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold">
              Ready to Level Up?
            </h2>
            <p className="text-fd-muted-foreground max-w-prose text-base md:text-lg">
              Start with one plugin, then expand your coverage. Each plugin works independently or together as a complete security & quality suite.
            </p>

            <Link href="/docs/getting-started">
              <ShimmerButton
                shimmerColor="#c084fc"
                shimmerSize="0.15em"
                background="linear-gradient(135deg, #6d28d9 0%, #5b21b6 100%)"
              >
                Start Building Safer Code
                <ArrowRight className="ml-2 size-4" />
              </ShimmerButton>
            </Link>

            {/* What's next — secondary paths for readers not yet ready to
                install (UX_PHILOSOPHY §4). The mt-/pt- combo gives a clear
                breathing band BOTH ABOVE the divider (so the primary CTA
                doesn't sit on top of the line) AND BELOW it (so the eyebrow
                caption isn't pinned to the separator). Extra pt is required
                because uppercase tracked text reads visually attached to a
                line above it without generous gap. */}
            <div className="w-full mt-10 md:mt-14 pt-14 md:pt-20 border-t border-purple-500/20">
              <p className="text-xs font-mono uppercase tracking-wider text-fd-muted-foreground mb-6">
                Not ready yet? Explore
              </p>
              <div className="grid sm:grid-cols-2 gap-4 max-w-prose mx-auto">
                <WhatsNextLink
                  icon={<GitCompare className="size-4" />}
                  label="Compare alternatives"
                  href="/docs/getting-started/concepts/compare"
                />
                <WhatsNextLink
                  icon={<FileCheck className="size-4" />}
                  label="CWE coverage matrix"
                  href="/docs/getting-started/concepts/cwe-compatibility"
                />
              </div>
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}

// ===== COMPONENTS =====

function StatCard({ value, label, suffix = '' }: { value: number; label: string; suffix?: string }) {
  return (
    <div className="text-center">
      <div className="text-4xl md:text-5xl font-bold text-fd-foreground mb-1">
        <NumberTicker value={value} className="text-fd-foreground" />
        {suffix && <span className="text-orange-500">{suffix}</span>}
      </div>
      <div className="text-sm text-fd-muted-foreground font-medium uppercase tracking-wide">
        {label}
      </div>
    </div>
  );
}

function StepLabel({ n, label }: { n: number; label: string }) {
  return (
    <div className="text-xs font-mono uppercase tracking-wider text-fd-muted-foreground">
      <span className="inline-flex items-center gap-2">
        <span
          aria-hidden
          className="size-5 rounded-full bg-purple-500/15 text-purple-700 dark:text-purple-300 inline-flex items-center justify-center text-[10px] font-bold"
        >
          {n}
        </span>
        {label}
      </span>
    </div>
  );
}

function WhatsNextLink({ icon, label, href }: { icon: React.ReactNode; label: string; href: string }) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center justify-center gap-2 rounded-lg border border-fd-border bg-fd-card/80 px-4 py-3 text-sm font-medium text-fd-foreground hover:border-purple-500/50 hover:text-purple-600 dark:hover:text-purple-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 transition-colors"
    >
      <span className="text-fd-muted-foreground group-hover:text-purple-600 dark:group-hover:text-purple-300 transition-colors" aria-hidden>
        {icon}
      </span>
      {label}
      <ArrowRight className="size-3 opacity-60 transition-transform group-hover:translate-x-0.5" aria-hidden />
    </Link>
  );
}

function CatchCard({
  cwe,
  title,
  ruleId,
  href,
  snippet,
}: {
  cwe: string;
  title: string;
  ruleId: string;
  href: string;
  snippet: string;
}) {
  return (
    <Link
      href={href}
      aria-label={`${title} — ${cwe} — open rule ${ruleId}`}
      className="group block rounded-xl border border-fd-border bg-fd-card p-6 hover:border-purple-500/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 transition-all"
    >
      <div className="flex items-baseline gap-2 mb-3 flex-wrap min-w-0">
        <span className="rounded bg-orange-500/15 px-2 py-0.5 text-xs font-mono font-medium text-orange-900 dark:text-orange-100 whitespace-nowrap shrink-0">
          {cwe}
        </span>
        <span className="text-xs text-fd-muted-foreground whitespace-nowrap shrink-0">caught by</span>
        <code className="text-xs font-mono text-fd-foreground break-all">{ruleId}</code>
      </div>
      <h3 className="text-lg font-semibold mb-3 group-hover:text-purple-600 dark:group-hover:text-purple-300 transition-colors">{title}</h3>
      <pre className="bg-fd-background/80 rounded-md p-3 text-xs font-mono overflow-x-auto border border-fd-border/50">
        <code className="text-fd-foreground">{snippet}</code>
      </pre>
      <div className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-fd-muted-foreground group-hover:text-purple-600 dark:group-hover:text-purple-300 transition-colors">
        Read the rule
        <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" aria-hidden />
      </div>
    </Link>
  );
}
