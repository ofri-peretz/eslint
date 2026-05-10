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
      // Run axe against wcag2a, wcag2aa, wcag21aa, plus best-practice. The CI
      // gate (test-runner.ts) reuses these tags; keep them in sync.
      element: '#storybook-root',
      config: {
        rules: [
          // Skip color-contrast in primitive stories whose Default state is a
          // disabled control (axe flags 50%-opacity disabled buttons even
          // though they're spec-compliant). Override per-story when needed.
        ],
      },
      options: {
        runOnly: {
          type: 'tag',
          values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice'],
        },
      },
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
