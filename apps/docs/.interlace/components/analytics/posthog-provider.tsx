/**
 * AUTO-GENERATED FILE — DO NOT EDIT DIRECTLY.
 * Source: apps/interlace-docs-baseline/ in the agents repo.
 * Edit there, then run `npm run sync` to redistribute.
 * Local edits will be overwritten on next sync (or refused without --force).
 */
"use client";

/**
 * PostHog client provider — wires `posthog-js` once at the app shell and
 * captures a `$pageview` event on every route change.
 *
 * One shared PostHog project (id 428927) serves all our apps; the `app`
 * prop is registered as a super-property so every event carries its
 * source. PostHog dashboards filter on `properties.app` to scope by
 * site (blog / interlace-landing / storybook) or compare across.
 *
 * Next.js App Router doesn't fire a navigation event posthog-js can
 * hook (PostHog's `capture_pageview: true` only works on hard loads +
 * popstate). The `usePathname()` effect below fills the gap so SPA
 * route transitions count.
 *
 * Required Vercel env (Production scope on each app):
 *   NEXT_PUBLIC_POSTHOG_KEY  — publishable project key, starts `phc_...`
 *                              Safe to expose client-side by design.
 *   NEXT_PUBLIC_POSTHOG_HOST — defaults to `https://us.i.posthog.com`
 *
 * If `NEXT_PUBLIC_POSTHOG_KEY` is missing the provider is a no-op — site
 * still renders, no analytics. Same defensive pattern the scorecard
 * Supabase fetchers use.
 *
 * Naming + tracking conventions live in `ANALYTICS_PHILOSOPHY.md` at the
 * agents repo root. Read it before adding new events / properties.
 */

import posthog from "posthog-js";
import { PostHogProvider as Provider } from "posthog-js/react";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

export type AppName =
  | "blog"
  | "interlace-landing"
  | "baseline-storybook"
  | "eslint-docs"
  | "serverless-docs";

export interface PostHogProviderProps {
  /**
   * App identifier — registered as a super-property so every event from
   * this app carries `properties.app = '<name>'`. Required because we
   * use ONE shared PostHog project across all sites.
   */
  app: AppName;
  children: React.ReactNode;
}

let initialized = false;
function ensureInit(app: AppName): void {
  if (initialized || typeof window === "undefined" || !POSTHOG_KEY) return;
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    person_profiles: "identified_only",
    // Manual `$pageview` capture via PageviewTracker below.
    capture_pageview: false,
    capture_pageleave: true,
    autocapture: true,
  });
  // Super-property: attached to every event from this app, persists across
  // page loads in the same browser via localStorage.
  posthog.register({ app });
  initialized = true;
}

export function PostHogProvider({ app, children }: PostHogProviderProps) {
  if (typeof window !== "undefined") ensureInit(app);
  if (!POSTHOG_KEY) return <>{children}</>;
  return (
    <Provider client={posthog}>
      <Suspense fallback={null}>
        <PageviewTracker />
      </Suspense>
      {children}
    </Provider>
  );
}

function PageviewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname) return;
    const url = searchParams?.toString()
      ? `${pathname}?${searchParams.toString()}`
      : pathname;
    posthog.capture("$pageview", { $current_url: url });
  }, [pathname, searchParams]);

  return null;
}
