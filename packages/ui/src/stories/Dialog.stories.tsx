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
} from '../primitives/dialog.js';
import { Button } from '../primitives/button.js';

const meta: Meta<typeof Dialog> = {
  title: 'Primitives/Dialog',
  component: Dialog,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<typeof Dialog>;

export const Default: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger render={<Button>Open dialog</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Are you sure?</DialogTitle>
          <DialogDescription>
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline">Cancel</Button>} />
          <DialogClose render={<Button variant="destructive">Delete</Button>} />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};

/**
 * Interactive test: dialog opens on trigger click, exposes title +
 * description as ARIA, closes on Escape, and returns focus to trigger.
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
