import type { Meta, StoryObj } from '@storybook/react-vite';
import { Checkbox } from '@interlace/ui/checkbox';
import { withDark, withRtl } from '@/decorators';

const meta: Meta<typeof Checkbox> = {
  title: 'Primitives/Checkbox',
  component: Checkbox,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Binary boolean form control. Supports indeterminate state. Per `FORM_PHILOSOPHY.md` pair with a `<label>` for accessible name; the `Invalid` story shows the `aria-invalid` styling contract.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Checkbox>;

// Base UI's Checkbox renders its own internal id on the role="checkbox" span,
// so `<Label htmlFor>` doesn't reach the interactive element. Wrap in a
// native `<label>` (DOM-nested association) and add `aria-label` as the
// accessible-name source axe can detect on the role node itself.
export const Default: Story = {
  render: () => (
    <label className="flex items-center gap-2 cursor-pointer">
      <Checkbox aria-label="Include type-aware rules" defaultChecked />
      <span>Include type-aware rules</span>
    </label>
  ),
};
export const Disabled: Story = {
  render: () => (
    <label className="flex items-center gap-2 cursor-pointer">
      <Checkbox aria-label="Type-aware (disabled)" disabled />
      <span>Type-aware (disabled)</span>
    </label>
  ),
};

export const Invalid: Story = {
  render: () => (
    <label className="flex items-center gap-2 cursor-pointer">
      <Checkbox
        aria-label="Accept terms (required)"
        aria-invalid="true"
        aria-describedby="terms-err"
      />
      <span>Accept terms</span>
      <span id="terms-err" className="text-destructive text-xs ml-2">
        Required
      </span>
    </label>
  ),
};

export const Dark: Story = {
  ...Default,
  decorators: [withDark],
};

export const RTL: Story = {
  render: () => (
    <label className="flex items-center gap-2 cursor-pointer">
      <Checkbox aria-label="تضمين القواعد المدركة للنوع" defaultChecked />
      <span>تضمين القواعد المدركة للنوع</span>
    </label>
  ),
  decorators: [withRtl],
};
