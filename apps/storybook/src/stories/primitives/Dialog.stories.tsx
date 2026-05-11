import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@interlace/ui/dialog';
import { Button } from '@interlace/ui/button';

const meta: Meta<typeof Dialog> = {
  title: 'Primitives/Dialog',
  component: Dialog,
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj<typeof Dialog>;

export const Default: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" />}>Edit Profile</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Subscribe to Interlace</DialogTitle>
          <DialogDescription>
            Get a weekly note when we publish a new deep-dive article.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button type="submit" />}>Save changes</DialogClose>
          <Button>Subscribe</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};
