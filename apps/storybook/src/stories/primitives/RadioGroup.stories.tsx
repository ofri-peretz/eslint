import type { Meta, StoryObj } from '@storybook/react-vite';
import { RadioGroup, RadioGroupItem } from '@interlace/ui/radio-group';

const meta: Meta<typeof RadioGroup> = {
  title: 'Primitives/RadioGroup',
  component: RadioGroup,
};

export default meta;
type Story = StoryObj<typeof RadioGroup>;

// Base UI's RadioGroupItem renders its own internal id on the role="radio"
// span, so `<Label htmlFor>` doesn't reach the interactive element. Wrap
// each item in a native `<label>` (DOM-nested association) and add
// `aria-label` as the accessible-name source axe detects on the role node.
// Also: the group itself gets `aria-label` so the radio's container has
// the WAI-ARIA group label axe expects for `role=radio` descendants.
export const Default: Story = {
  render: () => (
    <RadioGroup
      defaultValue="short"
      aria-label="Reading time"
      className="flex flex-col gap-2"
    >
      <label className="flex items-center gap-2 cursor-pointer">
        <RadioGroupItem value="short" aria-label="Less than 5 min" />
        <span>&lt; 5 min</span>
      </label>
      <label className="flex items-center gap-2 cursor-pointer">
        <RadioGroupItem value="medium" aria-label="5 to 10 min" />
        <span>5–10 min</span>
      </label>
      <label className="flex items-center gap-2 cursor-pointer">
        <RadioGroupItem value="long" aria-label="10 min or more" />
        <span>10+ min</span>
      </label>
    </RadioGroup>
  ),
};
