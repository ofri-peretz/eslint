'use client';

/**
 * Rule-page CTA experiment: does an install offer at the top convert?
 *
 * The bottom-of-page CTA had never been clicked — not once across 477 people
 * reading rule pages in 60 days. `$pageleave` scroll data says why: median max
 * scroll on a rule page is **0%**, and only 17.7% of visitors ever reach 80% of
 * the page. The ask was placed where almost nobody goes.
 *
 * v1 of this experiment moved the same star/follow ask to the top. v2 (this)
 * changes the OFFER, because the traffic says the ask itself was wrong: rule
 * pages are search landing pages for people who have not installed anything —
 * sessions ≈ pageviews, and `install:command_click` had never fired because no
 * rule page contained an install command. Asking a first-time visitor to star a
 * repo they have never used skips a step.
 *
 * `top` variant: an install offer (RuleInstallCTA) under the rule description —
 * the adoption ask, where people actually look. The star/follow ask
 * (RuleValueCTA) stays at the bottom in BOTH arms, for the readers who scroll.
 * `control`: exactly today's page — bottom RuleValueCTA only.
 *
 * Defaults to `control` whenever the flag is unresolved — flags load
 * asynchronously, and a visitor whose flags never arrive must still get exactly
 * today's page rather than a flicker or a gap.
 */
import { useFeatureFlagVariantKey } from 'posthog-js/react';

import { RuleInstallCTA } from '@/components/docs/rule-install-cta';
import { RuleValueCTA } from '@/components/docs/rule-value-cta';

/** Must match the flag key in PostHog. */
export const RULE_CTA_FLAG = 'rule-cta-placement';

export function RuleCTAExperiment({
  plugin,
  rule,
  placement,
}: {
  plugin: string;
  rule: string;
  /** Which slot this instance occupies. */
  placement: 'top' | 'bottom';
}) {
  const variant = useFeatureFlagVariantKey(RULE_CTA_FLAG);

  // The bottom slot is the unconditional home of the support ask: identical in
  // both arms, so the experiment measures only the added install offer.
  if (placement === 'bottom') {
    return <RuleValueCTA plugin={plugin} rule={rule} placement="bottom" />;
  }

  // `variant === 'top'` only when PostHog has resolved the flag to the
  // treatment. Anything else — undefined (still loading), false (flag off),
  // 'control', or an unknown value — renders nothing here, which is exactly
  // today's page.
  if (variant !== 'top') return null;

  return <RuleInstallCTA plugin={plugin} />;
}
