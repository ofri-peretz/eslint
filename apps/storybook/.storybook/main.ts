import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: [
    '../src/stories/**/*.mdx',
    '../src/stories/**/*.stories.@(ts|tsx)',
  ],
  addons: [
    '@storybook/addon-docs',
    '@storybook/addon-a11y',
    '@storybook/addon-themes',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  staticDirs: ['../public'],
  // Override Storybook's default pink Storybook S favicon with the
  // Interlace brand mark (violet hexagon). `public/favicon.svg` is copied
  // verbatim by `staticDirs`; this just rewrites the <link> tag in the
  // manager HTML so the browser tab + bookmark icon match the brand.
  managerHead: (head) =>
    head.replace(
      /<link rel="icon"[^>]*>/,
      '<link rel="icon" type="image/svg+xml" href="./favicon.svg" />',
    ) + '<link rel="icon" type="image/svg+xml" href="./favicon.svg" />',
  typescript: {
    reactDocgen: 'react-docgen-typescript',
  },
  core: {
    disableTelemetry: true,
  },
};

export default config;
