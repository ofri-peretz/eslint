/**
 * UTM helpers for apps/registry. Mirror of apps/docs/src/lib/utm.ts.
 * Duplicated per UTM_PHILOSOPHY.md.
 */
import { posthog } from './posthog-init';

export type UtmSource =
  | 'ofriperetz_dev'
  | 'interlace'
  | 'eslint_docs'
  | 'serverless_docs'
  | 'ds'
  | 'storybook'
  | 'devto'
  | 'github'
  | 'npm'
  | 'x'
  | 'linkedin'
  | 'email';

export type UtmMedium =
  | 'article'
  | 'blog'
  | 'docs'
  | 'landing'
  | 'social'
  | 'email'
  | 'referral'
  | 'cli';

export interface UtmOptions {
  source: UtmSource;
  medium: UtmMedium;
  campaign?: string;
  content?: string;
  term?: string;
}

const CROSS_ETLD_HOSTS = new Set(['ofriperetz.dev']);

function isCrossEtldOutbound(host: string): boolean {
  return CROSS_ETLD_HOSTS.has(host);
}

export function buildUtmHref(href: string, opts: UtmOptions): string {
  try {
    const url = new URL(href);
    url.searchParams.set('utm_source', opts.source);
    url.searchParams.set('utm_medium', opts.medium);
    if (opts.campaign) url.searchParams.set('utm_campaign', opts.campaign);
    if (opts.content) url.searchParams.set('utm_content', opts.content);
    if (opts.term) url.searchParams.set('utm_term', opts.term);
    if (
      typeof window !== 'undefined' &&
      isCrossEtldOutbound(url.hostname.toLowerCase())
    ) {
      try {
        const id = posthog.get_distinct_id?.();
        if (id) url.searchParams.set('ph_distinct_id', id);
      } catch {
        // pre-init — skip
      }
    }
    return url.toString();
  } catch {
    return href;
  }
}

export interface LandingUtm {
  source: string | null;
  medium: string | null;
  campaign: string | null;
  content: string | null;
  term: string | null;
  phDistinctId: string | null;
  referrer: string | null;
}

export function consumeLandingUtm(): LandingUtm {
  if (typeof window === 'undefined') {
    return {
      source: null,
      medium: null,
      campaign: null,
      content: null,
      term: null,
      phDistinctId: null,
      referrer: null,
    };
  }
  try {
    const u = new URL(window.location.href);
    const result: LandingUtm = {
      source: u.searchParams.get('utm_source'),
      medium: u.searchParams.get('utm_medium'),
      campaign: u.searchParams.get('utm_campaign'),
      content: u.searchParams.get('utm_content'),
      term: u.searchParams.get('utm_term'),
      phDistinctId: u.searchParams.get('ph_distinct_id'),
      referrer: document.referrer || null,
    };
    const anyStripped =
      result.source ||
      result.medium ||
      result.campaign ||
      result.content ||
      result.term ||
      result.phDistinctId;
    if (!anyStripped) return result;
    for (const k of [
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_content',
      'utm_term',
      'ph_distinct_id',
    ]) {
      u.searchParams.delete(k);
    }
    const clean = u.pathname + (u.search || '') + (u.hash || '');
    window.history.replaceState(window.history.state, '', clean);
    return result;
  } catch {
    return {
      source: null,
      medium: null,
      campaign: null,
      content: null,
      term: null,
      phDistinctId: null,
      referrer: null,
    };
  }
}

export function isPlausibleDistinctId(id: string | null): id is string {
  if (!id) return false;
  if (id.length < 8 || id.length > 64) return false;
  return /^[a-zA-Z0-9_-]+$/.test(id);
}
