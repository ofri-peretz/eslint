import type { Meta, StoryObj } from '@storybook/react-vite';
import { Checkbox } from '@interlace/ui/checkbox';

const meta: Meta<typeof Checkbox> = {
  title: 'Primitives/Checkbox',
  component: Checkbox,
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
