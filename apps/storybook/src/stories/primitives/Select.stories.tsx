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
import { withReducedMotion, withRtl } from '@/decorators';

const meta: Meta<typeof Select> = {
  title: 'Primitives/Select',
  component: Select,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Drop-down single-select. Supports grouped items, separators, and `aria-invalid` styling per `FORM_PHILOSOPHY.md`. Open/close transition is killed under `prefers-reduced-motion` (see `ReducedMotion` story).',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Select>;

export const Default: Story = {
  render: () => (
    <Select defaultValue="date">
      <SelectTrigger className="w-[180px]" aria-label="Sort by">
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
      <SelectTrigger className="w-[220px]" aria-label="Choose plugin">
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
      <SelectTrigger className="w-[180px]" aria-label="Disabled select">
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
        <SelectTrigger className="w-[180px]" aria-label="Sort by">
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

export const Invalid: Story = {
  render: () => (
    <div className="flex flex-col gap-1">
      <Select>
        <SelectTrigger
          className="w-[180px]"
          aria-label="Choose plan"
          aria-invalid="true"
          aria-describedby="plan-err-sel"
        >
          <SelectValue placeholder="Pick a plan" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="free">Free</SelectItem>
          <SelectItem value="pro">Pro</SelectItem>
        </SelectContent>
      </Select>
      <span id="plan-err-sel" className="text-destructive text-xs">
        Plan is required.
      </span>
    </div>
  ),
};

export const RTL: Story = {
  render: () => (
    <Select defaultValue="date">
      <SelectTrigger className="w-[180px]" aria-label="رتب حسب">
        <SelectValue placeholder="رتب حسب" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="date">الأحدث</SelectItem>
        <SelectItem value="reactions">الأكثر شعبية</SelectItem>
      </SelectContent>
    </Select>
  ),
  decorators: [withRtl],
};

export const ReducedMotion: Story = {
  ...Default,
  decorators: [withReducedMotion],
};
