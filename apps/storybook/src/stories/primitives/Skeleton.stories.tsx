import type { Meta, StoryObj } from '@storybook/react-vite';
import { Skeleton } from '@interlace/ui/skeleton';
import { withDark, withReducedMotion, withRtl } from '@/decorators';

const meta: Meta<typeof Skeleton> = {
  title: 'Primitives/Skeleton',
  component: Skeleton,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Loading placeholder per `LOADING_PHILOSOPHY.md`. Pulse-animated shape that matches the eventual content footprint — CLS=0 once data arrives. The pulse is killed under `prefers-reduced-motion`.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Skeleton>;

export const ArticleCardLoading: Story = {
  render: () => (
    <div className="border-border flex w-[360px] flex-col gap-3 rounded-xl border p-4">
      <Skeleton className="h-44 w-full rounded-md" />
      <div className="flex items-center gap-2">
        <Skeleton className="size-7 rounded-full" />
        <Skeleton className="h-4 w-28" />
      </div>
      <Skeleton className="h-5 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <div className="flex gap-2">
        <Skeleton className="h-5 w-14 rounded-full" />
        <Skeleton className="h-5 w-14 rounded-full" />
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>
    </div>
  ),
};

export const Dark: Story = {
  ...ArticleCardLoading,
  decorators: [withDark],
};

export const RTL: Story = {
  ...ArticleCardLoading,
  decorators: [withRtl],
};

export const ReducedMotion: Story = {
  ...ArticleCardLoading,
  decorators: [withReducedMotion],
};
