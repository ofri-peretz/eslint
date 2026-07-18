/**
 * AUTO-GENERATED FILE — DO NOT EDIT DIRECTLY.
 * Source: apps/interlace-docs-baseline/ in the agents repo.
 * Edit there, then run `npm run sync` to redistribute.
 * Local edits will be overwritten on next sync (or refused without --force).
 */
/**
 * Standard Interlace landing-page hero.
 *
 * Composition: badge → title → optional rotating words → tagline → CTAs →
 * optional install snippet.
 *
 * The hero is intentionally configuration-driven (no slots/render-props) so
 * every consumer site has the same shape — only copy and links differ.
 *
 * @example
 * ```tsx
 * import { Hero } from '#interlace/components/home/hero';
 * import { Code2 } from 'lucide-react';
 *
 * <Hero
 *   badge={{ icon: <Package className="h-3.5 w-3.5" />, text: 'Now available — v0.1.0' }}
 *   title="Serverless plugins that"
 *   flipWords={['clean up', 'deploy safely', 'just work']}
 *   tagline="TypeScript-native replacements. Zero dependencies. No ghost billing."
 *   primaryCta={{ href: '/docs/getting-started', label: 'Get started' }}
 *   secondaryCta={{ href: 'https://github.com/foo/bar', label: 'GitHub', icon: <Code2 className="h-4 w-4" /> }}
 *   installCommand="npm install @interlace/serverless-api-gateway-caching"
 * />
 * ```
 */

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Spotlight } from '../ui/spotlight';
import { FlipWords } from '../ui/flip-words';
import { BorderBeam } from '../ui/border-beam';

export interface HeroBadge {
  icon?: ReactNode;
  text: string;
}

export interface HeroCta {
  href: string;
  label: string;
  icon?: ReactNode;
  /** Open in new tab. Default: true for absolute URLs, false otherwise. */
  external?: boolean;
}

export interface HeroProps {
  /** Small pill rendered above the title. Often used for version / status. */
  badge?: HeroBadge;
  /** Main heading text — rendered before the rotating words (if any). */
  title: string;
  /** Rotating gradient words. If omitted, the title stands alone. */
  flipWords?: string[];
  /** Sub-heading paragraph. */
  tagline: string;
  /** Primary call-to-action button. */
  primaryCta: HeroCta;
  /** Optional secondary CTA. */
  secondaryCta?: HeroCta;
  /** Optional install command shown in a code-styled box with a border beam. */
  installCommand?: string;
  /** Spotlight color (CSS color expr). Defaults to brand purple. */
  spotlightColor?: string;
  /** Border-beam start color. Defaults to brand purple. */
  beamColorFrom?: string;
  /** Border-beam end color. Defaults to brand purple. */
  beamColorTo?: string;
}

const DEFAULT_SPOTLIGHT = 'hsl(250 95% 64%)';
const DEFAULT_BEAM_FROM = 'hsl(250 95% 64%)';
const DEFAULT_BEAM_TO = 'hsl(280 80% 60%)';

function isAbsoluteUrl(href: string): boolean {
  return /^https?:\/\//.test(href);
}

function CtaLink({ cta, primary }: { cta: HeroCta; primary: boolean }) {
  const external = cta.external ?? isAbsoluteUrl(cta.href);
  const baseClasses =
    'inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-medium transition-all';
  const variantClasses = primary
    ? 'bg-fd-primary text-fd-primary-foreground hover:bg-fd-primary/90 hover:shadow-lg hover:shadow-fd-primary/25'
    : 'border border-fd-border bg-fd-card text-fd-foreground hover:bg-fd-accent';

  return (
    <Link
      href={cta.href}
      className={`${baseClasses} ${variantClasses}`}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {cta.icon}
      {cta.label}
      {primary && !cta.icon ? <ArrowRight className="h-4 w-4" /> : null}
    </Link>
  );
}

export function Hero({
  badge,
  title,
  flipWords,
  tagline,
  primaryCta,
  secondaryCta,
  installCommand,
  spotlightColor = DEFAULT_SPOTLIGHT,
  beamColorFrom = DEFAULT_BEAM_FROM,
  beamColorTo = DEFAULT_BEAM_TO,
}: HeroProps) {
  return (
    <section className="relative flex flex-col items-center justify-center gap-6 overflow-hidden px-6 py-24 text-center md:py-36">
      <Spotlight
        className="-top-40 left-0 md:-top-20 md:left-60"
        fill={spotlightColor}
      />

      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-fd-background via-fd-background to-fd-accent/5" />
      <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-fd-primary/8 blur-[120px]" />

      {badge ? (
        <div className="inline-flex items-center gap-2 rounded-full border border-fd-border bg-fd-card px-4 py-1.5 text-sm text-fd-muted-foreground">
          {badge.icon}
          <span>{badge.text}</span>
        </div>
      ) : null}

      <h1 className="max-w-4xl text-4xl font-bold tracking-tight md:text-6xl">
        {title}
        {flipWords && flipWords.length > 0 ? (
          <>
            <br />
            <FlipWords
              words={flipWords}
              className="bg-gradient-to-r from-fd-primary to-purple-400 bg-clip-text text-transparent"
            />
          </>
        ) : null}
      </h1>

      <p className="max-w-3xl text-lg text-fd-muted-foreground md:text-xl">{tagline}</p>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-4">
        <CtaLink cta={primaryCta} primary />
        {secondaryCta ? <CtaLink cta={secondaryCta} primary={false} /> : null}
      </div>

      {installCommand ? (
        <div className="relative mt-8 overflow-hidden rounded-lg border border-fd-border bg-fd-card px-6 py-3 font-mono text-sm text-fd-muted-foreground">
          {installCommand}
          <BorderBeam
            size={80}
            duration={8}
            colorFrom={beamColorFrom}
            colorTo={beamColorTo}
            borderWidth={1}
          />
        </div>
      ) : null}
    </section>
  );
}
