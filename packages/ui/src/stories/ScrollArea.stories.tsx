import type { Meta, StoryObj } from '@storybook/react-vite';
import { ScrollArea } from '../primitives/scroll-area.js';

const meta: Meta<typeof ScrollArea> = {
  title: 'Primitives/ScrollArea',
  component: ScrollArea,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<typeof ScrollArea>;

export const Default: Story = {
  render: () => (
    <ScrollArea className="h-[200px] w-[300px] rounded border p-4">
      <h4 className="mb-2 font-medium">Tags</h4>
      {Array.from({ length: 50 }).map((_, i) => (
        <div key={i} className="text-sm py-1">tag-{i}</div>
      ))}
    </ScrollArea>
  ),
};
