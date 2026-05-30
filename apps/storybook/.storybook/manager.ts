/**
 * Storybook manager-side customizations.
 *
 * The *preview* side (per-story renders) lives in `preview.ts`. This file
 * configures the *manager* — the surrounding Storybook chrome: brand
 * logo + wordmark, sidebar/toolbar colors, manager toolbar visibility.
 *
 * Analytics: PostHog is initialised on the manager only, never inside the
 * preview iframe (per-story renders would blow up event volume — see
 * ANALYTICS_PHILOSOPHY principle 6). We capture a manager `$pageview` on
 * mount and a `storybook:story_view` whenever a story finishes rendering.
 */
import { addons } from 'storybook/manager-api';
import { STORY_RENDERED } from 'storybook/internal/core-events';

import theme from './theme';
import {
  initStorybookPostHog,
  trackManagerEvent,
  trackManagerPageview,
} from './posthog';

addons.setConfig({
  theme,
  showToolbar: true,
  sidebar: {
    showRoots: true,
  },
});

// Defer until the manager has finished its first render cycle.
if (typeof window !== 'undefined') {
  try {
    const ph = initStorybookPostHog();
    if (ph) {
      trackManagerPageview();
      const channel = addons.getChannel();
      channel.on(STORY_RENDERED, (storyId: string) => {
        trackManagerEvent('storybook:story_view', { storyId });
      });
    }
  } catch {
    // Never let analytics break the manager boot.
  }
}
