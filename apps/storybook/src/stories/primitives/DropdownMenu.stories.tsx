import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@interlace/ui/dropdown-menu';
import { Button } from '@interlace/ui/button';

const meta: Meta<typeof DropdownMenu> = {
  title: 'Primitives/DropdownMenu',
  component: DropdownMenu,
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj<typeof DropdownMenu>;

export const Default: Story = {
  render: () => (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" />}>
        Open
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>Sort articles</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>Latest</DropdownMenuItem>
        <DropdownMenuItem>Popular</DropdownMenuItem>
        <DropdownMenuItem>Most discussed</DropdownMenuItem>
        <DropdownMenuItem>Long reads</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
};
