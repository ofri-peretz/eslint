import type { Meta, StoryObj } from '@storybook/react-vite';
import { EditOnGitHub } from '../fumadocs/edit-on-github.js';

const meta: Meta<typeof EditOnGitHub> = {
  title: 'Fumadocs/EditOnGitHub',
  component: EditOnGitHub,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<typeof EditOnGitHub>;

export const Default: Story = {
  args: {
    url: 'https://github.com/ofri-peretz/eslint/edit/main/README.md',
  },
};

export const CustomLabel: Story = {
  args: {
    url: 'https://github.com/ofri-peretz/eslint/edit/main/README.md',
    label: 'Suggest a change',
  },
};
