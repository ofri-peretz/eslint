import type { Preview } from '@storybook/react-vite';
import { withThemeByClassName } from '@storybook/addon-themes';

import './preview.css';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#ffffff' },
        { name: 'dark', value: '#09090b' },
        { name: 'card', value: '#fafafa' },
      ],
    },
    a11y: {
      // Strict tag stack — matches apps/docs/e2e/a11y.spec.ts and the
      // test-runner gate. Keep these in sync: any tag added here must also
      // be added to apps/storybook/.storybook/test-runner.ts STRICT_TAGS.
      element: '#storybook-root',
      config: {
        rules: [
          // AAA-only rules get pulled in by their `ACT` tag (see
          // test-runner.ts AAA_RULES_DISABLED). Floor is WCAG 2.2 AA.
          { id: 'color-contrast-enhanced', enabled: false },
          // Per-story overrides go in `parameters.a11y.config.rules`.
        ],
      },
      options: {
        runOnly: {
          type: 'tag',
          values: [
            'wcag2a',
            'wcag2aa',
            'wcag21a',
            'wcag21aa',
            'wcag22aa',
            'best-practice',
            'ACT',
          ],
        },
      },
      test: 'error',
      manual: false,
    },
    layout: 'centered',
    options: {
      storySort: {
        // `Welcome` first so the root URL deep-links to the landing page
        // instead of `Tokens/Color Contrast/Docs` (alphabetic default).
        order: [
          'Welcome',
          'Philosophy',
          'Tokens',
          ['Color Contrast'],
          'Primitives',
          'Blocks',
          'Pages',
          'Fumadocs',
          'MagicUI',
        ],
      },
    },
  },
  decorators: [
    withThemeByClassName({
      themes: {
        light: '',
        dark: 'dark',
      },
      defaultTheme: 'light',
    }),
  ],
  // No global `autodocs` tag. With autodocs on, every component's sidebar
  // entry becomes "Docs" as the default child, and the Docs view doesn't
  // render the Controls / Actions / Interactions / Accessibility bottom
  // panels — those are Canvas-only. Removing the tag means clicking a
  // component takes the user straight to its first story (Canvas view)
  // where every addon panel + populated Controls table is visible.
  // Stories that genuinely want an auto-generated docs page can opt in
  // per-meta via `tags: ['autodocs']`. MDX-driven docs (Welcome.mdx,
  // tokens/ColorContrast.stories.tsx) remain unaffected.
};

export default preview;
