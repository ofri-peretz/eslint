import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within, waitFor } from 'storybook/test';
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
import { withDark, withReducedMotion, withRtl } from '@/decorators';

const meta: Meta<typeof Dialog> = {
  title: 'Primitives/Dialog',
  component: Dialog,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Modal surface for focused tasks. Reference impl — see [dialog.tsx](packages/ui/src/primitives/dialog.tsx) for the JSDoc table mapping each R1–R26 component-floor rule to a line of code.',
      },
    },
  },
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

/**
 * Interactive test: dialog opens on trigger click, exposes title +
 * description as ARIA, closes on Escape.
 */
export const OpenCloseFlow: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger render={<Button>Open</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm</DialogTitle>
          <DialogDescription>
            Verifying open/close + focus return.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button>OK</Button>} />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole('button', { name: /open/i });

    await step('Open dialog by clicking trigger', async () => {
      await userEvent.click(trigger);
      await waitFor(() => expect(document.querySelector('[role="dialog"]')).toBeTruthy());
    });

    await step('Dialog has accessible name + description', async () => {
      const dlg = document.querySelector('[role="dialog"]') as HTMLElement;
      expect(dlg.getAttribute('aria-labelledby')).toBeTruthy();
      expect(dlg.getAttribute('aria-describedby')).toBeTruthy();
    });

    await step('Escape closes dialog', async () => {
      await userEvent.keyboard('{Escape}');
      await waitFor(() => expect(document.querySelector('[role="dialog"]')).toBeFalsy());
    });
  },
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
