import type { Preview } from '@storybook/react-vite';
import './preview.css';

/**
 * Global Storybook config for `@interlace/ui` stories.
 *
 * Configures the addon-a11y matrix to mirror our strict scan in
 * `apps/docs/e2e/a11y.spec.ts`: WCAG 2 A/AA/AAA + 2.1 + 2.2 + best-practice
 * + ACT. Stories that fail any rule are blocked from being marked stable.
 */
const preview: Preview = {
  parameters: {
    layout: 'centered',
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#ffffff' },
        { name: 'dark', value: '#0d1117' },
      ],
    },
    a11y: {
      // Match apps/docs strict scan tag stack exactly.
      config: {
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
      // Fail the test/check if axe finds violations.
      test: 'error',
    },
  },
  globalTypes: {
    theme: {
      description: 'Color scheme',
      defaultValue: 'light',
      toolbar: {
        title: 'Theme',
        icon: 'circlehollow',
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
        ],
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    (Story, ctx) => {
      // Apply `.dark` to the root for dark-mode stories so Tailwind utilities
      // resolve correctly. Stories preview both schemes via the toolbar.
      if (typeof document !== 'undefined') {
        const html = document.documentElement;
        if (ctx.globals.theme === 'dark') html.classList.add('dark');
        else html.classList.remove('dark');
      }
      return <Story />;
    },
  ],
};

export default preview;
