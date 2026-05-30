import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { Switch } from '@interlace/ui/switch';
import { withDark, withRtl } from '@/decorators';

const meta: Meta<typeof Switch> = {
  title: 'Primitives/Switch',
  component: Switch,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'On/off toggle. Use for instant-effect settings; use Checkbox for pending form changes per `FORM_PHILOSOPHY.md`. Wrap in a native `<label>` so a click on the text toggles the switch.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Switch>;

// Base UI's Switch renders its own internal id on the role="switch" span,
// so `<Label htmlFor>` doesn't reach the interactive element. All stories
// use the native-label wrap pattern + `aria-label` (see KeyboardToggle below
// for the rationale).
export const Default: Story = {
  render: () => (
    <label className="flex items-center gap-3 cursor-pointer">
      <Switch aria-label="Respect reduced motion" />
      <span>Respect reduced motion</span>
    </label>
  ),
};
export const Checked: Story = {
  render: () => (
    <label className="flex items-center gap-3 cursor-pointer">
      <Switch aria-label="Reduced motion (on)" defaultChecked />
      <span>Reduced motion (on)</span>
    </label>
  ),
};

// Base UI's Switch renders its own internal id on the role="switch" span,
// so `<Label htmlFor>` doesn't reach the interactive element. Wrap in a
// native `<label>` (DOM-nested association) + add `aria-label` as a
// belt-and-suspenders accessible-name source for axe.
export const KeyboardToggle: Story = {
  render: () => (
    <label className="flex items-center gap-2 cursor-pointer">
      <Switch aria-label="Keyboard-operable" />
      <span>Keyboard-operable</span>
    </label>
  ),
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const sw = canvas.getByRole('switch');
    await expect(sw).toHaveAttribute('aria-checked', 'false');
    await step('Toggle via mouse click', async () => {
      await userEvent.click(sw);
      await expect(sw).toHaveAttribute('aria-checked', 'true');
    });
    await step('Toggle back via keyboard Space', async () => {
      sw.focus();
      await userEvent.keyboard(' ');
      await expect(sw).toHaveAttribute('aria-checked', 'false');
    });
  },
};

export const Invalid: Story = {
  render: () => (
    <div className="flex flex-col gap-1">
      <label className="flex items-center gap-3 cursor-pointer">
        <Switch
          aria-label="Accept policy"
          aria-invalid="true"
          aria-describedby="policy-err"
        />
        <span>Accept policy</span>
      </label>
      <span id="policy-err" className="text-destructive text-xs">
        You must accept to continue.
      </span>
    </div>
  ),
};

export const Dark: Story = {
  ...Default,
  decorators: [withDark],
};

export const RTL: Story = {
  render: () => (
    <label className="flex items-center gap-3 cursor-pointer">
      <Switch aria-label="احترام تقليل الحركة" defaultChecked />
      <span>احترام تقليل الحركة</span>
    </label>
  ),
  decorators: [withRtl],
};
