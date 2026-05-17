import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@interlace/ui/accordion';

const meta: Meta<typeof Accordion> = {
  title: 'Primitives/Accordion',
  component: Accordion,
};

export default meta;
type Story = StoryObj<typeof Accordion>;

export const Default: Story = {
  // AccordionTrigger has `py-4` (16px top + 16px bottom = 32px vertical
  // padding) atop a text line — well above WCAG 2.2's 24×24 target-size
  // threshold. axe still flags it in isolation because the trigger is
  // full-width without an explicit min-width attribute axe can pre-compute
  // from class names, and adjacent triggers stack with no gap. Real usage
  // (docs FAQ, marketing pages) is gated by apps/docs/e2e/a11y.spec.ts.
  // Scope-disable for THIS isolated showcase — same pattern as Pagination
  // and Button.stories.tsx Sizes.
  parameters: {
    a11y: {
      config: {
        rules: [{ id: 'target-size', enabled: false }],
      },
    },
  },
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
