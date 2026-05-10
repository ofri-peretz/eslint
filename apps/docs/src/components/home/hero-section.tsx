'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { HeroCosmic } from '@interlace/ui/patterns/hero-cosmic';
import { buttonVariants } from '@interlace/ui/button';

/**
 * Site landing hero — branded copy + CTAs over the @interlace/ui cosmic
 * preset (StarsBackground + ShootingStars + Meteors). Both CTAs route
 * through the canonical Button's `hero` size so primary and secondary share
 * geometry (CTA_PHILOSOPHY.md #3, #5). Color overrides re-tint for the dark
 * cosmic surface; geometry stays in the size token.
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
          <span className="bg-gradient-to-r from-purple-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
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
          <>
            Get Started
            <ArrowRight />
          </>
        ),
        href: '/docs/getting-started',
        render: (
          <Link
            href="/docs/getting-started"
            className={buttonVariants({
              size: 'hero',
              variant: 'default',
              className:
                'bg-violet-600 text-white shadow-lg shadow-violet-600/30 hover:bg-violet-700',
            })}
          />
        ),
      }}
      secondaryCta={{
        label: (
          <>
            <svg
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            GitHub
          </>
        ),
        href: 'https://github.com/ofri-peretz/eslint',
        render: (
          <Link
            href="https://github.com/ofri-peretz/eslint"
            className={buttonVariants({
              size: 'hero',
              variant: 'outline',
              className:
                'border-white/30 bg-white/5 text-white backdrop-blur-sm hover:bg-white/10 hover:text-white dark:border-white/30 dark:bg-white/5 dark:hover:bg-white/10',
            })}
          />
        ),
      }}
    />
  );
}
