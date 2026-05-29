import type { Meta, StoryObj } from '@storybook/react-vite';
import { FileSearch, Inbox } from 'lucide-react';
import { Button } from '@interlace/ui/button';
import { EmptyState } from '@interlace/ui/blocks/empty-state';

const meta: Meta<typeof EmptyState> = {
  title: 'Blocks/EmptyState',
  component: EmptyState,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'The "nothing here yet" surface. First-class UX, not an afterthought — every zero-state should have one.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'No items yet',
    description: 'Items you create will appear here.',
  },
};

export const WithIcon: Story = {
  args: {
    icon: <Inbox className="size-10" />,
    title: 'Your inbox is clear',
    description: 'New notifications will appear here as they come in.',
  },
};

export const WithIconAndAction: Story = {
  args: {
    icon: <FileSearch className="size-10" />,
    title: 'No rules match these filters',
    description:
      'Try clearing the search, or browse the full catalog of 397 rules.',
    actions: <Button variant="outline">Clear filters</Button>,
  },
};
