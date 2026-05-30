/**
 * AUTO-GENERATED FILE — DO NOT EDIT DIRECTLY.
 * Source: apps/interlace-docs-baseline/ in the agents repo.
 * Edit there, then run `npm run sync` to redistribute.
 * Local edits will be overwritten on next sync (or refused without --force).
 */
"use client";

/**
 * Visitor-profile + bot classifier.
 *
 * Runs once on first client mount per browser; classifies the visitor
 * into a fixed vocabulary based on referrer + UTM + landing path, and
 * `$set_once`s the result as person properties so cohorts can filter on
 * `first_visitor_profile = 'developer'` etc.
 *
 * Vocabulary (ANALYTICS_PHILOSOPHY.md):
 *   developer | engineering_leader | recruiter | investor | founder |
 *   student | curious | unknown
 *
 * Bot detection: a user-agent regex flips `is_bot: true` on the person
 * so every saved insight can filter bots out with a single `is_bot != true`
 * condition (no per-insight regex maintenance).
 *
 * Ambiguous signals default to `unknown` rather than guessing — bad
 * inference poisons every cohort downstream.
 *
 * Mount inside `<PostHogProvider>` in the root layout. Cheap (one effect,
 * no render), idempotent (skips if `first_visitor_profile` already set on
 * the person).
 */
import posthog from "posthog-js";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

export type VisitorProfile =
  | "developer"
  | "engineering_leader"
  | "recruiter"
  | "investor"
  | "founder"
  | "student"
  | "curious"
  | "unknown";

// Bot user-agent regex. Conservative — only flips for obvious automated
// traffic (crawlers, headless browsers, link-preview fetchers, monitors).
// Real Chrome/Firefox/Safari UAs pass through cleanly.
const BOT_RE =
  /bot|crawler|spider|crawl|slurp|baiduspider|yandex|duckduckbot|googlebot|bingbot|applebot|petalbot|semrushbot|ahrefsbot|mj12bot|dotbot|rogerbot|exabot|gigabot|ia_archiver|archive\.org_bot|facebookexternalhit|twitterbot|slackbot|linkedinbot|whatsapp|telegrambot|skypeuripreview|discordbot|preview|monitor|uptimerobot|pingdom|newrelicpinger|statuscake|datadog|prerender|headless|puppeteer|playwright|selenium|phantomjs|httpclient|curl\/|wget\/|node-fetch|axios|python-requests|java\/|go-http-client/i;

const CRAWLER_HINTS = /bot|crawler|spider|googlebot|bingbot|applebot|yandex|baidu|ahrefs|semrush/i;
const PREVIEW_HINTS = /preview|facebookexternalhit|twitterbot|slackbot|linkedinbot|whatsapp|telegrambot|discordbot|skypeuripreview/i;
const HEADLESS_HINTS = /headless|puppeteer|playwright|selenium|phantomjs/i;
const MONITOR_HINTS = /monitor|uptimerobot|pingdom|statuscake|newrelicpinger|datadog/i;

function classifyBot(ua: string | null): { is_bot: boolean; bot_kind: string | null } {
  if (!ua) return { is_bot: false, bot_kind: null };
  if (!BOT_RE.test(ua)) return { is_bot: false, bot_kind: null };
  if (CRAWLER_HINTS.test(ua)) return { is_bot: true, bot_kind: "crawler" };
  if (PREVIEW_HINTS.test(ua)) return { is_bot: true, bot_kind: "preview" };
  if (HEADLESS_HINTS.test(ua)) return { is_bot: true, bot_kind: "headless" };
  if (MONITOR_HINTS.test(ua)) return { is_bot: true, bot_kind: "monitor" };
  return { is_bot: true, bot_kind: "unknown_bot" };
}

// --- inference rules ---

const DEVELOPER_REFERRER_RE =
  /(^|\.)(dev\.to|github\.com|npmjs\.com|stackoverflow\.com|news\.ycombinator\.com|gitlab\.com|bitbucket\.org|codesandbox\.io|stackblitz\.com)$/i;
const DEVELOPER_REDDIT_RE =
  /^reddit\.com\/r\/(programming|javascript|typescript|node|reactjs|nextjs|webdev|coding|learnprogramming|aws|devops|opensource|eslint|security)/i;
const INVESTOR_REFERRER_RE =
  /(^|\.)(angellist|producthunt|crunchbase|techstars|ycombinator)\.com$/i;
const CURIOUS_REFERRER_RE =
  /(^|\.)(techcrunch|theverge|wired|arstechnica|hackernoon|medium)\.com$/i;
const SEARCH_REFERRER_RE = /(^|\.)(google|bing|duckduckgo|qwant|brave|kagi)\./i;

const RECRUITER_PATH_RE = /^\/(resume|hire|about|talks|cv|contact|team)(\/|$)/i;
const ENG_LEADER_PATH_RE = /^\/(scorecard|philosophy|distribution|.*PHILOSOPHY)/i;
const ARTICLE_PATH_RE = /^\/articles\//i;
const STUDENT_PATH_RE = /^\/(learn|articles\/getting-started|articles\/intro)/i;

function inferProfileFromUtmSource(utmSource: string | null, landingPath: string): VisitorProfile | null {
  if (!utmSource) return null;
  switch (utmSource.toLowerCase()) {
    case "dev_to":
    case "dev.to":
    case "github":
    case "npm":
    case "stackoverflow":
    case "hackernews":
    case "reddit":
      return "developer";
    case "linkedin":
      if (RECRUITER_PATH_RE.test(landingPath)) return "recruiter";
      if (ARTICLE_PATH_RE.test(landingPath) || ENG_LEADER_PATH_RE.test(landingPath))
        return "developer";
      return "recruiter";
    case "producthunt":
    case "angellist":
    case "crunchbase":
      return "investor";
    case "twitter":
    case "x":
      return null; // ambiguous, fall through to referrer
  }
  return null;
}

function inferProfileFromReferrer(refDomain: string | null, refPath: string, landingPath: string): VisitorProfile | null {
  if (!refDomain) return null;
  const host = refDomain.toLowerCase();
  if (DEVELOPER_REFERRER_RE.test(host)) return "developer";
  if (host === "reddit.com" && DEVELOPER_REDDIT_RE.test(refPath)) return "developer";
  if (INVESTOR_REFERRER_RE.test(host)) return "investor";
  if (CURIOUS_REFERRER_RE.test(host)) return "curious";
  if (/(^|\.)linkedin\.com$/i.test(host)) {
    if (RECRUITER_PATH_RE.test(landingPath)) return "recruiter";
    if (ARTICLE_PATH_RE.test(landingPath) || ENG_LEADER_PATH_RE.test(landingPath))
      return "developer";
    return "recruiter";
  }
  if (SEARCH_REFERRER_RE.test(host)) return null; // path-based fallback
  return null;
}

function inferProfileFromPath(landingPath: string): VisitorProfile | null {
  if (RECRUITER_PATH_RE.test(landingPath)) return "recruiter";
  if (ENG_LEADER_PATH_RE.test(landingPath)) return "engineering_leader";
  if (STUDENT_PATH_RE.test(landingPath)) return "student";
  if (ARTICLE_PATH_RE.test(landingPath)) return "developer"; // technical articles bias developer
  return null;
}

function refDomain(): string | null {
  if (typeof document === "undefined") return null;
  if (!document.referrer) return null;
  try {
    return new URL(document.referrer).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function refPath(): string {
  if (typeof document === "undefined") return "";
  if (!document.referrer) return "";
  try {
    const u = new URL(document.referrer);
    return u.hostname.toLowerCase() + u.pathname;
  } catch {
    return "";
  }
}

function readUtm(): {
  source: string | null;
  medium: string | null;
  campaign: string | null;
  content: string | null;
  term: string | null;
} {
  if (typeof window === "undefined") {
    return { source: null, medium: null, campaign: null, content: null, term: null };
  }
  const u = new URL(window.location.href);
  return {
    source: u.searchParams.get("utm_source"),
    medium: u.searchParams.get("utm_medium"),
    campaign: u.searchParams.get("utm_campaign"),
    content: u.searchParams.get("utm_content"),
    term: u.searchParams.get("utm_term"),
  };
}

function uaString(): string | null {
  if (typeof navigator === "undefined") return null;
  return navigator.userAgent || null;
}

export function VisitorProfileTracker() {
  const pathname = usePathname();
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    if (typeof window === "undefined") return;
    if (!pathname) return;

    try {
      const utm = readUtm();
      const refHost = refDomain();
      const ua = uaString();
      const bot = classifyBot(ua);

      const profile: VisitorProfile =
        inferProfileFromUtmSource(utm.source, pathname) ??
        inferProfileFromReferrer(refHost, refPath(), pathname) ??
        inferProfileFromPath(pathname) ??
        "unknown";

      // $set_once: first-touch properties stick forever
      posthog.setPersonPropertiesForFlags?.({}); // no-op, just ensures init
      posthog.people?.set_once?.({
        first_visitor_profile: profile,
        first_referrer_domain: refHost ?? "direct",
        first_landing_path: pathname,
        first_utm_source: utm.source ?? null,
        first_utm_medium: utm.medium ?? null,
        first_utm_campaign: utm.campaign ?? null,
        first_utm_content: utm.content ?? null,
        first_utm_term: utm.term ?? null,
        // Bot flag is also $set_once — a session that started as bot stays
        // bot for cohort purposes (real users won't be misclassified later).
        is_bot: bot.is_bot,
        bot_kind: bot.bot_kind,
      });

      // $set: refresh on every classification so insights can compare
      // first-touch vs current state (a LinkedIn-referrer recruiter who
      // later read 5 articles becomes a developer in `last_visitor_profile`
      // while `first_visitor_profile` still says recruiter).
      posthog.people?.set?.({
        last_visitor_profile: profile,
      });
    } catch {
      // Analytics must never break the UI.
    }
  }, [pathname]);

  return null;
}
