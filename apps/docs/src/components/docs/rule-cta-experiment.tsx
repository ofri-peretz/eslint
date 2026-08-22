'use client';

/**
 * Placement experiment for the rule-page CTA.
 *
 * The bottom-of-page CTA had never been clicked — not once across 477 people
 * reading rule pages in 60 days. `$pageleave` scroll data says why: median max
 * scroll on a rule page is **0%**, and only 17.7% of visitors ever reach 80% of
 * the page. The ask was placed where almost nobody goes.
 *
 * So this is not a copy test. It is a placement test, and the hypothesis is
 * blunt: a CTA people can see converts better than one they cannot. The `top`
 * variant renders it directly under the rule description; `control` leaves it
 * where it was.
 *
 * Defaults to `control` whenever the flag is unresolved — flags load
 * asynchronously, and a visitor whose flags never arrive must still get exactly
 * today's page rather than a flicker or a gap.
 */
import { useFeatureFlagVariantKey } from 'posthog-js/react';

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
  /** Which slot this instance occupies. Only the winning slot renders. */
  placement: 'top' | 'bottom';
}) {
  const variant = useFeatureFlagVariantKey(RULE_CTA_FLAG);

  // `variant === 'top'` only when PostHog has resolved the flag to the treatment.
  // Anything else — undefined (still loading), false (flag off), 'control', or
  // an unknown value — falls through to the bottom placement we ship today.
  const active = variant === 'top' ? 'top' : 'bottom';
  if (active !== placement) return null;

  return <RuleValueCTA plugin={plugin} rule={rule} placement={placement} />;
}
