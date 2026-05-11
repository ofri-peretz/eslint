'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { HeroCosmic } from '@interlace/ui/patterns/hero-cosmic';
import { ShimmerButton } from '@interlace/ui/magicui/shimmer-button';

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
export function HeroSection() {
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
          <span className="bg-linear-to-r from-purple-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
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
            shimmerColor="#c084fc"
            shimmerSize="0.15em"
            background="linear-gradient(135deg, #6d28d9 0%, #5b21b6 100%)"
          >
            Get Started
            <ArrowRight className="ml-2 size-4" />
          </ShimmerButton>
        ),
        href: '/docs/getting-started',
        render: <Link href="/docs/getting-started" />,
      }}
      secondaryCta={{
        label: (
          <ShimmerButton
            as="span"
            shimmer={false}
            highlight={false}
            background="rgba(255, 255, 255, 0.12)"
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
            //    purple-950→black gradient AND reads as a light translucent
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
            GitHub
          </ShimmerButton>
        ),
        href: 'https://github.com/ofri-peretz/eslint',
        render: <Link href="https://github.com/ofri-peretz/eslint" />,
      }}
    />
  );
}
