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
        order: [
          'Tokens',
          ['Color Contrast'],
          'Primitives',
          'Blocks',
          'Pages',
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
  tags: ['autodocs'],
};

export default preview;
