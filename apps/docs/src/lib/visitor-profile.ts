/**
 * Visitor-profile inference for apps/docs.
 *
 * Classifies the visitor into one of a fixed vocabulary on their first
 * pageview, based on UTM source + HTTP referrer + landing path. Stored
 * as `$set_once` so the first-touch profile sticks; refined later by
 * depth signals (3+ rule pages = confirmed developer, 3+ philosophy
 * pages = confirmed engineering_leader).
 *
 * Inference is intentionally simple — string match on referrer host,
 * exact-equal on `utm_source`. Anything ambiguous falls back to
 * `unknown` rather than guessing wrong (don't poison the data).
 *
 * See ANALYTICS_PHILOSOPHY.md principle 5 (person properties).
 */
import type { LandingUtm } from './utm';
import { posthog } from './posthog-init';

export type VisitorProfile =
  | 'developer'
  | 'engineering_leader'
  | 'recruiter'
  | 'investor'
  | 'founder'
  | 'student'
  | 'curious'
  | 'unknown';

interface InferenceInput {
  utm: LandingUtm;
  landingPath: string;
}

const DEVELOPER_REFERRER_RE =
  /(^|\.)(dev\.to|github\.com|npmjs\.com|stackoverflow\.com|news\.ycombinator\.com)$/i;
const DEVELOPER_REDDIT_RE =
  /^reddit\.com\/r\/(programming|javascript|typescript|node|reactjs)/i;
const INVESTOR_REFERRER_RE = /(^|\.)(angellist|producthunt|crunchbase)\.com$/i;
const CURIOUS_REFERRER_RE =
  /(^|\.)(techcrunch|theverge|wired|arstechnica|hackernoon)\.com$/i;

const RECRUITER_PATH_RE = /^\/(resume|hire|about|talks)(\/|$)/i;
const PHILOSOPHY_PATH_RE = /^\/docs\/design(\/|$)/i;
const STUDENT_PATH_RE =
  /^\/docs\/(getting-started|installation|guide)(\/|$)/i;
const RULE_PATH_RE = /^\/docs\/(eslint-plugin-[^/]+|[^/]+)\/rules\//i;

function referrerHost(referrer: string | null): string | null {
  if (!referrer) return null;
  try {
    return new URL(referrer).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function referrerPath(referrer: string | null): string {
  if (!referrer) return '';
  try {
    const u = new URL(referrer);
    return u.hostname.toLowerCase() + u.pathname;
  } catch {
    return '';
  }
}

export function inferVisitorProfile({
  utm,
  landingPath,
}: InferenceInput): VisitorProfile {
  // Highest precedence: explicit UTM source.
  switch (utm.source) {
    case 'dev_to':
    case 'github':
    case 'npm':
      return 'developer';
    case 'linkedin':
      if (RECRUITER_PATH_RE.test(landingPath)) return 'recruiter';
      if (landingPath.startsWith('/docs')) return 'developer';
      return 'recruiter';
  }

  // Next: referrer host.
  const host = referrerHost(utm.referrer);
  const path = referrerPath(utm.referrer);
  if (host) {
    if (DEVELOPER_REFERRER_RE.test(host)) return 'developer';
    if (host === 'reddit.com' && DEVELOPER_REDDIT_RE.test(path))
      return 'developer';
    if (INVESTOR_REFERRER_RE.test(host)) return 'investor';
    if (CURIOUS_REFERRER_RE.test(host)) return 'curious';
    if (/(^|\.)linkedin\.com$/i.test(host)) {
      if (RECRUITER_PATH_RE.test(landingPath)) return 'recruiter';
      if (landingPath.startsWith('/docs')) return 'developer';
      return 'recruiter';
    }
  }

  // Next: landing path heuristics.
  if (RECRUITER_PATH_RE.test(landingPath)) return 'recruiter';
  if (PHILOSOPHY_PATH_RE.test(landingPath)) return 'engineering_leader';
  if (STUDENT_PATH_RE.test(landingPath)) return 'student';

  // Direct + no signal = unknown. Don't guess.
  return 'unknown';
}

/**
 * Increment depth counters for the current pageview path. When the
 * counter crosses the confirmation threshold, set `confirmed_profile`.
 * Safe to call on every pageview — the underlying $set is idempotent.
 */
export function updateDepthSignals(landingPath: string): void {
  if (typeof window === 'undefined') return;
  try {
    const ruleHit = RULE_PATH_RE.test(landingPath);
    const philosophyHit = PHILOSOPHY_PATH_RE.test(landingPath);
    if (!ruleHit && !philosophyHit) return;

    const KEY_RULES = 'interlace_ruleViews';
    const KEY_PHIL = 'interlace_philViews';
    const rules = ruleHit
      ? Number(localStorage.getItem(KEY_RULES) ?? '0') + 1
      : Number(localStorage.getItem(KEY_RULES) ?? '0');
    const phil = philosophyHit
      ? Number(localStorage.getItem(KEY_PHIL) ?? '0') + 1
      : Number(localStorage.getItem(KEY_PHIL) ?? '0');
    if (ruleHit) localStorage.setItem(KEY_RULES, String(rules));
    if (philosophyHit) localStorage.setItem(KEY_PHIL, String(phil));

    if (rules >= 3) {
      posthog.people?.set?.({
        confirmed_profile: 'developer',
        rule_pages_viewed_count: rules,
      });
    } else if (philosophyHit) {
      posthog.people?.set?.({
        rule_pages_viewed_count: rules,
      });
    }

    if (phil >= 3) {
      posthog.people?.set?.({
        confirmed_profile: 'engineering_leader',
        philosophy_pages_viewed_count: phil,
      });
    } else if (philosophyHit) {
      posthog.people?.set?.({
        philosophy_pages_viewed_count: phil,
      });
    }
  } catch {
    // Never throw from analytics.
  }
}

/**
 * Set the first-touch person properties on the landing pageview. Idempotent
 * — `$set_once` only writes if the property isn't already set. Always
 * follows with a `$set` of the same on `last_*` so we can analyse first
 * vs current profile across sessions.
 */
export function setVisitorProfileOnFirstPageview(
  input: InferenceInput,
): VisitorProfile {
  const profile = inferVisitorProfile(input);
  if (typeof window === 'undefined') return profile;
  try {
    const refHost = referrerHost(input.utm.referrer);
    posthog.people?.set_once?.({
      first_visitor_profile: profile,
      first_referrer_domain: refHost ?? 'direct',
      first_landing_path: input.landingPath,
      first_utm_source: input.utm.source ?? null,
      first_utm_medium: input.utm.medium ?? null,
      first_utm_campaign: input.utm.campaign ?? null,
    });
    posthog.people?.set?.({
      last_visitor_profile: profile,
      last_seen_app: 'eslint_docs',
    });
  } catch {
    // swallow
  }
  return profile;
}
