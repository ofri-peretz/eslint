import type { Meta, StoryObj } from '@storybook/react-vite';
import { ScrollArea } from '@interlace/ui/scroll-area';
import { Separator } from '@interlace/ui/separator';

const meta: Meta<typeof ScrollArea> = {
  title: 'Primitives/ScrollArea',
  component: ScrollArea,
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
