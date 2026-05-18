import type { Meta, StoryObj } from '@storybook/react-vite';
import { Label } from '@interlace/ui/label';
import { Input } from '@interlace/ui/input';
import { withDark, withRtl } from '@/decorators';

const meta: Meta<typeof Label> = {
  title: 'Primitives/Label',
  component: Label,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Form-control label — shadcn-canon lower-level alternative to Base UI `Field.Label`. Always pair via `htmlFor` per `FORM_PHILOSOPHY.md` so a click on the label focuses the control.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Label>;

export const Default: Story = {
  render: () => (
    <div className="flex w-[260px] flex-col gap-2">
      <Label htmlFor="email">Email</Label>
      <Input id="email" type="email" placeholder="you@example.com" />
    </div>
  ),
};

export const Dark: Story = {
  ...Default,
  decorators: [withDark],
};

export const RTL: Story = {
  render: () => (
    <div className="flex w-[260px] flex-col gap-2">
      <Label htmlFor="email-rtl">البريد الإلكتروني</Label>
      <Input id="email-rtl" type="email" placeholder="you@example.com" />
    </div>
  ),
  decorators: [withRtl],
};
