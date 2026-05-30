'use client';

/**
 * Registry surface PostHog provider. Mirror of apps/docs.
 */
import { type ReactNode, useEffect } from 'react';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import { initPostHog, posthog } from '@/lib/posthog-init';

export function PostHogProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    initPostHog();
  }, []);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
