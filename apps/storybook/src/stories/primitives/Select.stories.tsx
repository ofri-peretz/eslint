import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectGroupLabel,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@interlace/ui/select';

const meta: Meta<typeof Select> = {
  title: 'Primitives/Select',
  component: Select,
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj<typeof Select>;

export const Default: Story = {
  render: () => (
    <Select defaultValue="date">
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Sort by" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="date">Latest</SelectItem>
        <SelectItem value="reactions">Popular</SelectItem>
        <SelectItem value="comments">Most discussed</SelectItem>
        <SelectItem value="reading_time">Long reads</SelectItem>
      </SelectContent>
    </Select>
  ),
};

export const Grouped: Story = {
  render: () => (
    <Select defaultValue="security">
      <SelectTrigger className="w-[220px]">
        <SelectValue placeholder="Choose plugin" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectGroupLabel>Security</SelectGroupLabel>
          <SelectItem value="security">eslint-plugin-secure-coding</SelectItem>
          <SelectItem value="jwt">eslint-plugin-jwt</SelectItem>
          <SelectItem value="crypto">eslint-plugin-crypto</SelectItem>
        </SelectGroup>
        <SelectSeparator />
        <SelectGroup>
          <SelectGroupLabel>Quality</SelectGroupLabel>
          <SelectItem value="reliability">eslint-plugin-reliability</SelectItem>
          <SelectItem value="conventions">eslint-plugin-conventions</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  ),
};

export const Disabled: Story = {
  render: () => (
    <Select disabled>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Disabled" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="x">Unreachable</SelectItem>
      </SelectContent>
    </Select>
  ),
};

export const Dark: Story = {
  globals: { theme: 'dark' },
  parameters: { backgrounds: { default: 'dark' } },
  render: () => (
    <div className="dark">
      <Select defaultValue="date">
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="date">Latest</SelectItem>
          <SelectItem value="reactions">Popular</SelectItem>
        </SelectContent>
      </Select>
    </div>
  ),
};
