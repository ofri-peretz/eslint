/**
 * Visitor-profile inference for apps/registry. Mirror of apps/docs.
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
const INVESTOR_REFERRER_RE = /(^|\.)(angellist|producthunt|crunchbase)\.com$/i;
const CURIOUS_REFERRER_RE =
  /(^|\.)(techcrunch|theverge|wired|arstechnica|hackernoon)\.com$/i;

function referrerHost(referrer: string | null): string | null {
  if (!referrer) return null;
  try {
    return new URL(referrer).hostname.toLowerCase();
  } catch {
    return null;
  }
}

export function inferVisitorProfile({
  utm,
  landingPath,
}: InferenceInput): VisitorProfile {
  switch (utm.source) {
    case 'devto':
    case 'dev_to': // legacy spelling — taxonomy standardized on 'devto'
    case 'github':
    case 'npm':
      return 'developer';
    case 'linkedin':
      return 'developer';
  }

  const host = referrerHost(utm.referrer);
  if (host) {
    if (DEVELOPER_REFERRER_RE.test(host)) return 'developer';
    if (INVESTOR_REFERRER_RE.test(host)) return 'investor';
    if (CURIOUS_REFERRER_RE.test(host)) return 'curious';
    if (/(^|\.)linkedin\.com$/i.test(host)) return 'developer';
  }

  // Registry is overwhelmingly a developer surface; landing-path heuristics
  // would just confirm. Default to `developer` for any non-empty referrer
  // host that didn't match above, `unknown` otherwise.
  if (host) return 'developer';
  void landingPath;
  return 'unknown';
}

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
      last_seen_app: 'ds',
    });
  } catch {
    // swallow
  }
  return profile;
}
