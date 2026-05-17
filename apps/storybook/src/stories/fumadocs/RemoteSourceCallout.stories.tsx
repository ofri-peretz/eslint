import type { Meta, StoryObj } from '@storybook/react-vite';
import { RemoteSourceCallout } from '@interlace/ui/fumadocs/remote-source-callout';

const meta: Meta<typeof RemoteSourceCallout> = {
  title: 'Fumadocs/RemoteSourceCallout',
  component: RemoteSourceCallout,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<typeof RemoteSourceCallout>;

export const RuleVariant: Story = {
  args: {
    variant: 'rule',
    label: 'no-sha1-hash.md',
    sourceUrl:
      'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-node-security/docs/rules/no-sha1-hash.md',
    cacheWindowLabel: '6 hours',
  },
};

export const ReadmeVariant: Story = {
  args: {
    variant: 'readme',
    label: 'eslint-plugin-node-security/README.md',
    sourceUrl:
      'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-node-security/README.md',
    cacheWindowLabel: '1 hour',
  },
};

export const ChangelogVariant: Story = {
  args: {
    variant: 'changelog',
    label: 'eslint-plugin-node-security/CHANGELOG.md',
    sourceUrl:
      'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-node-security/CHANGELOG.md',
    cacheWindowLabel: '2 hours',
  },
};
