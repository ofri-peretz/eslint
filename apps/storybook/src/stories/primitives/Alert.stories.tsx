import type { Meta, StoryObj } from '@storybook/react-vite';
import { Alert, AlertTitle, AlertDescription } from '@interlace/ui/alert';
import { Terminal, AlertTriangle } from 'lucide-react';
import { withDark, withRtl } from '@/decorators';

const meta: Meta<typeof Alert> = {
  title: 'Primitives/Alert',
  component: Alert,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Inline notice for system, validation, or empty-state messaging. Per `ERROR_PHILOSOPHY.md` errors must be visible and recoverable — `destructive` variant signals failure without using colour alone.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Alert>;

export const Default: Story = {
  render: () => (
    <Alert className="w-[460px]">
      <Terminal className="size-4" />
      <AlertTitle>Heads up</AlertTitle>
      <AlertDescription>
        Article cache is more than 7 days old — a sync is in progress.
      </AlertDescription>
    </Alert>
  ),
};
export const Destructive: Story = {
  render: () => (
    <Alert variant="destructive" className="w-[460px]">
      <AlertTriangle className="size-4" />
      <AlertTitle>Sync failed</AlertTitle>
      <AlertDescription>
        Falling back to last cached snapshot. Showing stale article counts.
      </AlertDescription>
    </Alert>
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
