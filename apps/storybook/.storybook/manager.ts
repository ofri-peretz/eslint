/**
 * Storybook manager-side customizations.
 *
 * The *preview* side (per-story renders) lives in `preview.ts`. This file
 * configures the *manager* — the surrounding Storybook chrome: brand
 * logo + wordmark, sidebar/toolbar colors, manager toolbar visibility.
 *
 * Without this file, the manager ships Storybook's factory defaults
 * (pink S-logo, generic dark monochrome) — which made the deployed
 * storybook feel half-done despite shipping 134 brand-themed stories.
 */
import { addons } from 'storybook/manager-api';

import theme from './theme';

addons.setConfig({
  theme,
  showToolbar: true,
  sidebar: {
    showRoots: true,
  },
});
