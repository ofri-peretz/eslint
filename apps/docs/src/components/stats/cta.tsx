'use client';

// Client CTA islands for the static /stats and /scorecard server pages.
//
// Design (CTA_PHILOSOPHY.md + the scorecard plan): proof first, ask second.
// These are quiet, never pushy — a star link backed by its live count, and a
// per-row install affordance that lives where the interest already is. Each
// click fires a typed analytics event so we can measure scorecard/stats →
// adoption conversion.

import { useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Check, Copy, Star } from 'lucide-react';
import { Button } from '@interlace/ui/button';

import { track } from '@/lib/analytics';

const REPO_URL = 'https://github.com/ofri-peretz/eslint';

const compact = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

type Surface = 'stats' | 'flagship';

function trackStar(surface: Surface): void {
  if (surface === 'stats') track('stats:cta_click', { action: 'star' });
  else track('flagship:cta_click', { action: 'star' });
}

/**
 * A quiet "⭐ {count} · Star on GitHub" link. The live star count doubles as
 * the social-proof nudge, so the ask never needs to shout. External link —
 * left bare (we don't own GitHub's analytics); the click is still captured.
 */
export function StarButton({
  stars,
  surface,
}: {
  stars: number;
  surface: Surface;
}) {
  return (
    <Button
      render={
        <Link
          href={REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackStar(surface)}
        />
      }
      variant="outline"
      size="sm"
    >
      <Star className="fill-amber-400 text-amber-500" />
      {stars > 0
        ? `${compact.format(stars)} · Star on GitHub`
        : 'Star on GitHub'}
    </Button>
  );
}

/**
 * Per-row install affordance: copy `npm i <pkg>` + a docs link. On /stats the
 * docs link is internal nav (no UTM); on the blog scorecard the page passes a
 * pre-built cross-property UTM href. Fires install / docs events with the
 * plugin (stats) or rule (flagship) that produced the interest.
 */
export function InstallCell({
  pkg,
  docsHref,
  surface,
  rule,
  docsExternal = false,
}: {
  pkg: string;
  docsHref: string;
  surface: Surface;
  /** Flagship rule id, when this cell sits on a per-rule benchmark row. */
  rule?: string;
  /** True when docsHref points to another property (blog → docs). */
  docsExternal?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const command = `npm i ${pkg}`;

  function onCopy(): void {
    if (surface === 'stats') {
      track('stats:cta_click', { action: 'plugin_install', plugin: pkg });
    } else {
      track('flagship:cta_click', {
        action: 'rule_install',
        rule: rule ?? pkg,
      });
    }
    void navigator.clipboard?.writeText(command).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      },
      () => {
        /* clipboard denied — no-op, command is still visible */
      },
    );
  }

  function onDocs(): void {
    if (surface === 'stats') {
      track('stats:cta_click', { action: 'plugin_docs', plugin: pkg });
    } else {
      track('flagship:cta_click', { action: 'rule_docs', rule: rule ?? pkg });
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={onCopy}
        aria-label={copied ? 'Copied install command' : `Copy ${command}`}
        className="inline-flex items-center gap-1 rounded-md border border-fd-border bg-fd-card px-2 py-1 font-mono text-xs text-fd-muted-foreground transition-colors hover:text-fd-foreground focus-visible:ring-2 focus-visible:ring-fd-ring focus-visible:outline-none"
      >
        {copied ? (
          <Check className="size-3 text-emerald-600" aria-hidden />
        ) : (
          <Copy className="size-3" aria-hidden />
        )}
        {copied ? 'Copied' : 'npm i'}
      </button>
      <Link
        href={docsHref}
        onClick={onDocs}
        {...(docsExternal
          ? { target: '_blank', rel: 'noopener noreferrer' }
          : {})}
        className="inline-flex items-center gap-0.5 text-xs text-fd-primary underline-offset-4 hover:underline"
      >
        docs
        <ArrowUpRight className="size-3" aria-hidden />
      </Link>
    </span>
  );
}

/**
 * Flagship-config CTA: copy `npm i -D eslint-config-interlace` + a Get-started
 * link. The natural conversion off the flagship benchmark is adopting the whole
 * config, not a single rule. Fires `flagship:cta_click { action: 'install_config' }`.
 */
export function ConfigCta({ docsHref = '/docs' }: { docsHref?: string }) {
  const [copied, setCopied] = useState(false);
  const command = 'npm i -D eslint-config-interlace';

  function onCopy(): void {
    track('flagship:cta_click', { action: 'install_config' });
    void navigator.clipboard?.writeText(command).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      },
      () => {},
    );
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={onCopy}
        aria-label={copied ? 'Copied install command' : `Copy ${command}`}
        className="inline-flex items-center gap-2 rounded-md border border-fd-border bg-fd-card px-3 py-1.5 font-mono text-xs text-fd-foreground transition-colors hover:bg-fd-accent focus-visible:ring-2 focus-visible:ring-fd-ring focus-visible:outline-none"
      >
        {copied ? (
          <Check className="size-3.5 text-emerald-600" aria-hidden />
        ) : (
          <Copy className="size-3.5" aria-hidden />
        )}
        {copied ? 'Copied' : command}
      </button>
      <Link
        href={docsHref}
        className="inline-flex items-center gap-0.5 text-sm text-fd-primary underline-offset-4 hover:underline"
      >
        Get started
        <ArrowUpRight className="size-3.5" aria-hidden />
      </Link>
    </span>
  );
}
