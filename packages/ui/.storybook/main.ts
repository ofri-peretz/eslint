import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: [
    '../src/stories/**/*.mdx',
    '../src/stories/**/*.stories.@(js|jsx|ts|tsx)',
  ],
  addons: [
    '@storybook/addon-essentials',
    {
      // axe addon — enforces WCAG 2 A/AA/AAA + best-practice on every story
      // (UX_PHILOSOPHY layer 4: per-component isolation).
      name: '@storybook/addon-a11y',
      options: {
        // axe runs against every story; we surface results in the toolbar.
      },
    },
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  typescript: {
    check: false,
    reactDocgen: 'react-docgen-typescript',
  },
};

export default config;
