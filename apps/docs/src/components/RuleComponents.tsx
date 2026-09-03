'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import React from 'react';

const FalseNegativeCTAContent = dynamic(
  () => import('./RuleComponentsContent').then((m) => m.FalseNegativeCTA),
  {
    ssr: false,
    loading: () => <div className="h-20 bg-fd-card/10 rounded-lg animate-pulse my-6" />
  }
);

const WhenNotToUseContent = dynamic(
  () => import('./RuleComponentsContent').then((m) => m.WhenNotToUse),
  {
    ssr: false,
    loading: () => <div className="h-32 bg-fd-card/10 rounded-lg animate-pulse my-8" />
  }
);

export function FalseNegativeCTA() {
  return <FalseNegativeCTAContent />;
}

export function WhenNotToUse(props: any) {
  return <WhenNotToUseContent {...props} />;
}

export type RuleBadgesTypeStatus = 'unaware' | 'optional' | 'aware';

export interface RuleBadgesProps {
  typeAware: boolean;
  typeAwareStatus?: RuleBadgesTypeStatus;
}

const TYPE_BADGE_COPY: Record<RuleBadgesTypeStatus, { glyph: string; label: string; help: string }> = {
  unaware: {
    glyph: '🟢',
    label: 'Type-unaware',
    help: 'AST-only — runs in the oxlint JS-plugin tier and on plain JavaScript.',
  },
  optional: {
    glyph: '🟡',
    label: 'Type-aware (refining)',
    help: 'Pure-AST primary path; type information refines precision when available.',
  },
  aware: {
    glyph: '🟠',
    label: 'Type-aware (graceful)',
    help: 'Calls `getParserServices()` and exits early when the TypeScript program is not configured.',
  },
};

/**
 * Renders the type-awareness badge for a rule documentation page. Emitted by
 * `sync-rules-docs.ts` directly under the MDX imports so it sits at the very
 * top of every rule page. Sources its data from
 * `.agent/type-awareness-scan.tsv` via that generator.
 */
export function RuleBadges({ typeAware, typeAwareStatus }: RuleBadgesProps) {
  const status: RuleBadgesTypeStatus =
    typeAwareStatus ?? (typeAware ? 'optional' : 'unaware');
  const copy = TYPE_BADGE_COPY[status];
  return (
    <div
      data-rule-badges
      data-type-aware={typeAware}
      data-type-aware-status={status}
      className="not-prose flex flex-wrap items-center gap-2 my-4"
    >
      <Link
        href="/docs/getting-started/concepts/runtime-portability"
        title={copy.help}
        className="inline-flex items-center gap-1.5 rounded-full border border-fd-border bg-fd-card/40 px-3 py-1 text-xs font-medium text-fd-foreground/80 hover:bg-fd-card/80 hover:text-fd-foreground transition-colors"
      >
        <span aria-hidden>{copy.glyph}</span>
        <span>{copy.label}</span>
      </Link>
    </div>
  );
}
