import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@interlace/ui/accordion';
import { withDark, withReducedMotion, withRtl } from '@/decorators';

const meta: Meta<typeof Accordion> = {
  title: 'Primitives/Accordion',
  component: Accordion,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Vertical disclosure for FAQ, settings, or progressive content reveal. Each item opens its panel on click. Per `MOTION_PHILOSOPHY.md` the open/close transition is killed under `prefers-reduced-motion`.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Accordion>;

export const Default: Story = {
  // AccordionTrigger is `py-4` (32px tall) on a full-width container.
  // Suppression for `target-size` was removed 2026-05-18 — the trigger
  // is well above WCAG 2.2's 24×24 threshold and the explicit `w-[420px]`
  // container makes the button's bounding box something axe can measure
  // without ambiguity.
  render: () => (
    <Accordion className="w-[420px]">
      <AccordionItem value="a">
        <AccordionTrigger>What does eslint-plugin-jwt detect?</AccordionTrigger>
        <AccordionContent>
          Hardcoded JWT secrets, weak algorithms (none/HS256 with short keys),
          and missing expiry validation.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="b">
        <AccordionTrigger>Is it type-aware?</AccordionTrigger>
        <AccordionContent>
          No — the default config is type-unaware. A type-aware tier exists for
          callers who already pay TS-program startup cost.
        </AccordionContent>
      </AccordionItem>
    </Accordion>
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

export const ReducedMotion: Story = {
  ...Default,
  decorators: [withReducedMotion],
};
