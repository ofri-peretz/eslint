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

const meta: Meta<typeof Sheet> = {
  title: 'Primitives/Sheet',
  component: Sheet,
  parameters: { layout: 'centered' },
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
