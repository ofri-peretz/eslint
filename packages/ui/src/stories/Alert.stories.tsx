import type { Meta, StoryObj } from '@storybook/react-vite';
import { Alert, AlertTitle, AlertDescription } from '../primitives/alert.js';
import { InfoIcon, AlertTriangleIcon } from 'lucide-react';

const meta: Meta<typeof Alert> = {
  title: 'Primitives/Alert',
  component: Alert,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<typeof Alert>;

export const Default: Story = {
  render: () => (
    <Alert className="w-[420px]">
      <InfoIcon aria-hidden />
      <AlertTitle>Heads up</AlertTitle>
      <AlertDescription>
        You can add components to your app using the cli.
      </AlertDescription>
    </Alert>
  ),
};

export const Destructive: Story = {
  render: () => (
    <Alert variant="destructive" className="w-[420px]">
      <AlertTriangleIcon aria-hidden />
      <AlertTitle>Something went wrong</AlertTitle>
      <AlertDescription>
        Please try again or contact support.
      </AlertDescription>
    </Alert>
  ),
};
