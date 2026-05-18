import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@interlace/ui/sheet';
import { Button } from '@interlace/ui/button';
import { Badge } from '@interlace/ui/badge';
import { withDark, withReducedMotion, withRtl } from '@/decorators';

const meta: Meta<typeof Sheet> = {
  title: 'Primitives/Sheet',
  component: Sheet,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Side-anchored Dialog variant — top, right, bottom, or left. Inherits Dialog\'s focus trap + Escape-to-close; the slide animation is killed under `prefers-reduced-motion` (see `ReducedMotion`).',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Sheet>;

export const Default: Story = {
  render: () => (
    <Sheet>
      <SheetTrigger render={<Button variant="outline" />}>
        Open
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Filter articles</SheetTitle>
          <SheetDescription>
            Narrow the list by topic, reading time, or recency.
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-wrap gap-2 p-4">
          {['security', 'eslint', 'nodejs', 'typescript', 'jwt'].map((t) => (
            <Badge key={t} variant="outline">
              #{t}
            </Badge>
          ))}
        </div>
      </SheetContent>
    </Sheet>
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

export const ReducedMotion: Story = {
  ...Default,
  decorators: [withReducedMotion],
};
