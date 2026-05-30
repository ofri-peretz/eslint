import type { Meta, StoryObj } from '@storybook/react-vite';
import { RadioGroup, RadioGroupItem } from '@interlace/ui/radio-group';
import { withDark, withRtl } from '@/decorators';

const meta: Meta<typeof RadioGroup> = {
  title: 'Primitives/RadioGroup',
  component: RadioGroup,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Exclusive-choice form group. Each item is wrapped in a native `<label>` so a click on the text focuses the radio; the group itself carries `aria-label` for the group accessible name per `FORM_PHILOSOPHY.md`.',
      },
    },
  },
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

export const Invalid: Story = {
  render: () => (
    <RadioGroup
      aria-label="Plan tier"
      aria-invalid="true"
      aria-describedby="plan-err"
      className="flex flex-col gap-2"
    >
      <label className="flex items-center gap-2 cursor-pointer">
        <RadioGroupItem value="free" aria-label="Free" />
        <span>Free</span>
      </label>
      <label className="flex items-center gap-2 cursor-pointer">
        <RadioGroupItem value="pro" aria-label="Pro" />
        <span>Pro</span>
      </label>
      <span id="plan-err" className="text-destructive text-xs">
        Pick a plan to continue.
      </span>
    </RadioGroup>
  ),
};

export const Dark: Story = {
  ...Default,
  decorators: [withDark],
};

export const RTL: Story = {
  render: () => (
    <RadioGroup
      defaultValue="short"
      aria-label="وقت القراءة"
      className="flex flex-col gap-2"
    >
      <label className="flex items-center gap-2 cursor-pointer">
        <RadioGroupItem value="short" aria-label="أقل من 5 دقائق" />
        <span>أقل من 5 دقائق</span>
      </label>
      <label className="flex items-center gap-2 cursor-pointer">
        <RadioGroupItem value="medium" aria-label="من 5 إلى 10 دقائق" />
        <span>5–10 دقائق</span>
      </label>
      <label className="flex items-center gap-2 cursor-pointer">
        <RadioGroupItem value="long" aria-label="10 دقائق أو أكثر" />
        <span>10+ دقائق</span>
      </label>
    </RadioGroup>
  ),
  decorators: [withRtl],
};
