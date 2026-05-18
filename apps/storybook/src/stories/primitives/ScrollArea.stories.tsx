import type { Meta, StoryObj } from '@storybook/react-vite';
import { ScrollArea } from '@interlace/ui/scroll-area';
import { Separator } from '@interlace/ui/separator';
import { withDark, withRtl } from '@/decorators';

const meta: Meta<typeof ScrollArea> = {
  title: 'Primitives/ScrollArea',
  component: ScrollArea,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-browser scrollable region with token-styled scrollbars. Keeps overflow content discoverable without the platform-default scrollbar variance.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof ScrollArea>;

const tags = Array.from({ length: 30 }, (_, i) => `topic-${i + 1}`);

export const Default: Story = {
  render: () => (
    <ScrollArea className="border-border h-72 w-60 rounded-md border p-3">
      <h3 className="mb-2 text-sm font-semibold">Topics</h3>
      {tags.map((t) => (
        <div key={t}>
          <p className="text-sm">#{t}</p>
          <Separator className="my-1" />
        </div>
      ))}
    </ScrollArea>
  ),
};

export const Dark: Story = {
  ...Default,
  decorators: [withDark],
};

export const RTL: Story = {
  ...Default,
  decorators: [withRtl],
};
