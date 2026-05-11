import type { Meta, StoryObj } from '@storybook/react-vite';
import { RadioGroup, RadioGroupItem } from '@interlace/ui/radio-group';
import { Label } from '@interlace/ui/label';

const meta: Meta<typeof RadioGroup> = {
  title: 'Primitives/RadioGroup',
  component: RadioGroup,
};

export default meta;
type Story = StoryObj<typeof RadioGroup>;

export const Default: Story = {
  render: () => (
    <RadioGroup defaultValue="short" className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <RadioGroupItem value="short" id="short" />
        <Label htmlFor="short">&lt; 5 min</Label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="medium" id="medium" />
        <Label htmlFor="medium">5–10 min</Label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="long" id="long" />
        <Label htmlFor="long">10+ min</Label>
      </div>
    </RadioGroup>
  ),
};
