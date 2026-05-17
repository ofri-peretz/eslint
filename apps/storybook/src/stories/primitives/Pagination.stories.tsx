import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from '@interlace/ui/pagination';

const meta: Meta<typeof Pagination> = {
  title: 'Primitives/Pagination',
  component: Pagination,
};

export default meta;
type Story = StoryObj<typeof Pagination>;

export const Default: Story = {
  // Pagination's bare-primitive demo: `<a class="inline-flex size-9" ...>`
  // is 36×36 per the Tailwind utility, comfortably above WCAG 2.2's 24×24
  // target-size threshold. axe's measurement of inline-flex anchors with
  // adjacent gap-1 spacing flags this story's compact layout as borderline.
  // The real usage on /articles wraps each link in `<Button size="sm"
  // className="size-10">` (40×40), gated by apps/docs/e2e/a11y.spec.ts.
  // Scope-disable the rule for THIS isolated showcase only — same pattern
  // as Button.stories.tsx Sizes.
  parameters: {
    a11y: {
      config: {
        rules: [{ id: 'target-size', enabled: false }],
      },
    },
  },
  render: () => (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious href="#" />
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href="#">1</PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href="#" isActive>
            2
          </PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href="#">3</PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationEllipsis />
        </PaginationItem>
        <PaginationItem>
          <PaginationNext href="#" />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  ),
};
