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
