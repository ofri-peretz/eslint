import type { Meta, StoryObj } from '@storybook/react-vite';
import { RemoteMarkdownSkeleton } from '../fumadocs/remote-markdown-skeleton.js';

const meta: Meta<typeof RemoteMarkdownSkeleton> = {
  title: 'Fumadocs/RemoteMarkdownSkeleton',
  component: RemoteMarkdownSkeleton,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<typeof RemoteMarkdownSkeleton>;

export const Default: Story = {
  args: {
    rows: 6,
    withHeading: true,
    withSourceCallout: true,
  },
};

export const Minimal: Story = {
  args: {
    rows: 3,
    withHeading: false,
    withSourceCallout: false,
  },
};
