'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { HeroCosmic } from '@interlace/ui/patterns/hero-cosmic';
import { ShimmerButton } from '@interlace/ui/magicui/shimmer-button';
import { track } from '../../lib/analytics';

/**
 * Site landing hero — branded copy + CTAs over the @interlace/ui cosmic
 * preset (StarsBackground + ShootingStars + Meteors).
 *
 * CTA contract — LOCKED. See `CTA_PHILOSOPHY.md` → "Locked invariants —
 * hero CTAs" for the canonical statement, and these two test files for
 * the lock itself:
 *   - `apps/docs/src/__tests__/homepage-lock.test.tsx`        (source-text)
 *   - `apps/docs/src/__tests__/hero-section-render.test.tsx`  (rendered DOM)
 *
 * If you need to break the contract, edit CTA_PHILOSOPHY first, then the
 * tests, then this file — in that order. The lock keeps regressing here
 * otherwise.
 *
 * The contract in three lines:
 *  - Both CTAs use magicui `<ShimmerButton>` (sibling parity, #3).
 *  - Primary keeps defaults: `shimmer` + `highlight` truthy (animation
 *    budget per #8 — one animated CTA per surface).
 *  - Secondary passes `shimmer={false} highlight={false}` — same pill
 *    geometry, no decoration.
 */
/**
 * Official ESLint hexagon mark — paths verbatim from
 * `public/eslint-logo.svg`, colors untouched. The only change is theme
 * keying: the source SVG swaps to its white/grey dark variant via
 * `prefers-color-scheme`, but the site themes via the `.dark` class
 * (fumadocs), so we inline the paths and read the same official fills
 * from the `--eslint-mark-*` tokens in `global.css` (light:
 * purple pair, dark: ESLint's white/grey dark variant) — no raw color
 * literals in JSX attributes (R19). Rendered `aria-hidden` — the
 * adjacent text names it.
 */
function EslintMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 294.825 258.982" aria-hidden className={className}>
      <path
        fill="var(--eslint-mark-inner)"
        d="m97.021 99.016 48.432-27.962c1.212-.7 2.706-.7 3.918 0l48.433 27.962a3.92 3.92 0 0 1 1.959 3.393v55.924a3.924 3.924 0 0 1-1.959 3.394l-48.433 27.962c-1.212.7-2.706.7-3.918 0l-48.432-27.962a3.92 3.92 0 0 1-1.959-3.394v-55.924a3.922 3.922 0 0 1 1.959-3.393"
      />
      <path
        fill="var(--eslint-mark-outer)"
        d="M273.336 124.488 215.469 23.816c-2.102-3.64-5.985-6.325-10.188-6.325H89.545c-4.204 0-8.088 2.685-10.19 6.325l-57.867 100.45c-2.102 3.641-2.102 8.236 0 11.877l57.867 99.847c2.102 3.64 5.986 5.501 10.19 5.501H205.28c4.203 0 8.087-1.805 10.188-5.446l57.867-100.01c2.104-3.639 2.104-7.907.001-11.547m-47.917 48.41c0 1.48-.891 2.849-2.174 3.59l-73.71 42.527a4.194 4.194 0 0 1-4.17 0l-73.767-42.527c-1.282-.741-2.179-2.109-2.179-3.59V87.843c0-1.481.884-2.849 2.167-3.59l73.707-42.527a4.185 4.185 0 0 1 4.168 0l73.772 42.527c1.283.741 2.186 2.109 2.186 3.59v85.055z"
      />
    </svg>
  );
}

function formatStars(n: number): string {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(n);
}

/**
 * @param githubStars Live stargazer count (server-fetched, cached). The
 * count is only surfaced once it clears a social-proof threshold (100) —
 * below that the CTA stays a plain "Star on GitHub" ask rather than
 * advertising a low number. The click fires the `homepage:star_click`
 * funnel event (GROWTH_PHILOSOPHY.md G1/G2 — the npm→GitHub leak).
 */
export function HeroSection({ githubStars }: { githubStars?: number | null }) {
  return (
    <HeroCosmic
      eyebrow={
        <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur-sm">
          <span aria-hidden>🔒</span>
          Enterprise-Grade Security for JavaScript
        </span>
      }
      headline={
        <>
          <span className="text-white drop-shadow-lg">Secure your code,</span>
          <br />
          <span className="bg-linear-to-r from-orange-300 via-amber-300 to-orange-400 bg-clip-text text-transparent">
            your style.
          </span>
        </>
      }
      tagline={
        <>
          ESLint Interlace is a comprehensive{' '}
          <span className="font-semibold text-white">security & quality</span>{' '}
          plugin ecosystem. Built for modern JavaScript, designed for teams who
          care about code integrity.
        </>
      }
      primaryCta={{
        label: (
          <ShimmerButton
            as="span"
            shimmerColor="var(--cta-shimmer)"
            shimmerSize="0.15em"
            background="var(--cta-bg-gradient)"
          >
            Get Started
            <ArrowRight className="ml-2 size-4" />
          </ShimmerButton>
        ),
        href: '/docs/getting-started',
        // White focus-ring forced on both CTAs so WCAG 1.4.11 (3:1 non-text
        // contrast) holds against the *locked* dark cosmic gradient — the
        // hero is intentionally theme-agnostic (no `dark:` prefix in
        // hero-cosmic.tsx), but the global `--color-fd-ring` resolves to a
        // light-theme value that fails contrast on this surface.
        render: (
          <Link
            href="/docs/getting-started"
            className="rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/90"
          />
        ),
      }}
      secondaryCta={{
        label: (
          <ShimmerButton
            as="span"
            shimmer={false}
            highlight={false}
            background="var(--cta-secondary-bg)"
            // a11y on BOTH themes: the cosmic hero is hardcoded dark, but a
            // light-theme page can still flash through during hydration and
            // the docs theme can override descendant text-color via cascade
            // (e.g. `text-fd-foreground`). We force every contrast-relevant
            // surface explicitly:
            //  - text-white !important via the bracket prefix wins any
            //    cascade so the GitHub label + icon stay legible regardless
            //    of the parent theme;
            //  - border-white/50 gives ≥ 3:1 boundary contrast (WCAG 1.4.11)
            //    against the cosmic dark surface AND remains visible on a
            //    light flash during hydration;
            //  - bg at 12% opacity lifts perceptually above the
            //    orange-950→black gradient AND reads as a light translucent
            //    pill if it briefly sits on a light page background.
            className="text-white! border-white/50 hover:border-white/70 [&_svg]:text-white!"
          >
            <svg
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
              className="mr-2 size-4"
            >
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            {githubStars && githubStars >= 100
              ? `★ ${formatStars(githubStars)} · Star on GitHub`
              : 'Star on GitHub'}
          </ShimmerButton>
        ),
        href: 'https://github.com/ofri-peretz/eslint',
        // External link → new tab + rel="noopener noreferrer" (security
        // hygiene). Same white focus-ring as the primary so sibling-parity
        // (CTA_PHILOSOPHY #3) carries to the focus affordance, not just
        // the visual pill.
        render: (
          <Link
            href="https://github.com/ofri-peretz/eslint"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() =>
              track('homepage:star_click', { stars: githubStars ?? null })
            }
            className="rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/90"
          />
        ),
      }}
      // "Built for ESLint" trust badge — the ESLint hexagon's home now that
      // the top nav carries the Interlace identity alone. Subordinate to the
      // hero copy (small pill, below the CTAs), official ESLint colors via
      // <EslintMark>. Pill chrome is theme-aware: translucent light pill on
      // the daylight surface, translucent white on the cosmic surface.
      footer={
        <span className="inline-flex items-center gap-2 rounded-full border border-slate-700/20 bg-white/40 px-3 py-1.5 text-xs font-medium text-slate-700 backdrop-blur-sm dark:border-white/20 dark:bg-white/5 dark:text-white/90">
          <EslintMark className="size-4 shrink-0" />
          Built for ESLint — 8, 9, and forward
        </span>
      }
    />
  );
}
