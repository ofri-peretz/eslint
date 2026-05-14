import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { ShimmerButton } from '@interlace/ui/magicui/shimmer-button';

/**
 * ShimmerButton stories
 *
 * The component ships TWO independent decorative props:
 *   - `shimmer`   → rotating conic-gradient spark animation
 *   - `highlight` → inset white glow at the bottom edge
 *
 * Each story below either renders a visual permutation of those props OR
 * runs a `play` function that exercises the contract end-to-end (click,
 * keyboard, prop-driven DOM gating). The stories also serve as the visual
 * lock — Chromatic / Storybook test-runner snapshots will catch regressions
 * to layout, color, or animation that the unit tests cannot see.
 */

const meta: Meta<typeof ShimmerButton> = {
  title: 'MagicUI/ShimmerButton',
  component: ShimmerButton,
  tags: ['autodocs'],
  parameters: {
    // ShimmerButton is designed to sit on a dark cosmic surface; render the
    // story canvas dark so the default white shimmer color reads correctly.
    backgrounds: {
      default: 'cosmic',
      values: [
        { name: 'cosmic', value: '#0b0418' },
        { name: 'light', value: '#ffffff' },
      ],
    },
  },
  argTypes: {
    shimmer: {
      control: 'boolean',
      description:
        'Render the rotating spark animation. Independent of `highlight`.',
    },
    highlight: {
      control: 'boolean',
      description:
        'Render the inset white bottom-edge glow. Independent of `shimmer`.',
    },
    background: {
      control: 'text',
      description: 'CSS background string (color, gradient, etc.).',
    },
    shimmerColor: { control: 'color' },
    shimmerSize: { control: 'text' },
    borderRadius: { control: 'text' },
    children: { control: false },
  },
};

export default meta;
type Story = StoryObj<typeof ShimmerButton>;

export const Default: Story = {
  args: {
    children: 'Get Started',
    shimmer: true,
    highlight: true,
  },
};

export const StaticPill: Story = {
  name: 'Static pill (shimmer={false} highlight={false})',
  args: {
    children: 'GitHub',
    shimmer: false,
    highlight: false,
    background: 'rgba(255, 255, 255, 0.12)',
  },
  parameters: {
    docs: {
      description: {
        story:
          'Hero secondary pattern: same pill geometry as the animated primary, no decoration. Pair with the Default story to verify sibling parity by eye.',
      },
    },
  },
};

export const SparkOnly: Story = {
  name: 'Spark on, highlight off',
  args: {
    children: 'Animated, no glow',
    shimmer: true,
    highlight: false,
    background: 'linear-gradient(135deg, #6d28d9 0%, #5b21b6 100%)',
  },
};

export const HighlightOnly: Story = {
  name: 'Spark off, highlight on',
  args: {
    children: 'Glow, no spin',
    shimmer: false,
    highlight: true,
  },
};

export const BrandPrimary: Story = {
  name: 'Brand primary (violet gradient)',
  args: {
    children: 'Get Started',
    shimmerColor: '#c084fc',
    shimmerSize: '0.15em',
    background: 'linear-gradient(135deg, #6d28d9 0%, #5b21b6 100%)',
  },
};

export const Gallery: Story = {
  name: 'Gallery — all four shimmer/highlight combos',
  parameters: { controls: { hideNoControlsWarning: true } },
  render: () => (
    <div className="flex flex-wrap items-center gap-4">
      <ShimmerButton shimmer highlight>
        On / On
      </ShimmerButton>
      <ShimmerButton shimmer highlight={false}>
        On / Off
      </ShimmerButton>
      <ShimmerButton shimmer={false} highlight>
        Off / On
      </ShimmerButton>
      <ShimmerButton
        shimmer={false}
        highlight={false}
        background="rgba(255, 255, 255, 0.12)"
      >
        Off / Off
      </ShimmerButton>
    </div>
  ),
};

export const ClickInteraction: Story = {
  name: 'Interaction — fires onClick',
  args: {
    children: 'Click me',
    onClick: fn(),
  },
  play: async ({ canvasElement, args, step }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', { name: /click me/i });

    await step('Button is in the document and enabled', async () => {
      await expect(button).toBeInTheDocument();
      await expect(button).toBeEnabled();
    });

    await step('Click triggers the onClick handler', async () => {
      await userEvent.click(button);
      await expect(args.onClick).toHaveBeenCalledTimes(1);
    });

    await step('Subsequent click increments the call count', async () => {
      await userEvent.click(button);
      await expect(args.onClick).toHaveBeenCalledTimes(2);
    });
  },
};

export const KeyboardActivation: Story = {
  name: 'Interaction — keyboard Enter / Space activate',
  args: {
    children: 'Press me',
    onClick: fn(),
  },
  play: async ({ canvasElement, args, step }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', { name: /press me/i });

    await step('Tab focuses the button', async () => {
      await userEvent.tab();
      await expect(button).toHaveFocus();
    });

    await step('Enter activates the button', async () => {
      await userEvent.keyboard('{Enter}');
      await expect(args.onClick).toHaveBeenCalledTimes(1);
    });

    await step('Space activates the button', async () => {
      await userEvent.keyboard(' ');
      await expect(args.onClick).toHaveBeenCalledTimes(2);
    });
  },
};

export const ShimmerPropGatesSpark: Story = {
  name: 'Interaction — `shimmer={false}` removes the spark from the DOM',
  args: {
    children: 'No spark',
    shimmer: false,
    highlight: true,
  },
  play: async ({ canvasElement, step }) => {
    await step(
      'No `.animate-shimmer-slide` (spark) element is mounted',
      async () => {
        await expect(
          canvasElement.querySelector('.animate-shimmer-slide'),
        ).toBeNull();
      },
    );

    await step(
      'No `.animate-spin-around` (inner conic-gradient) element is mounted',
      async () => {
        await expect(
          canvasElement.querySelector('.animate-spin-around'),
        ).toBeNull();
      },
    );

    await step(
      '`highlight` is independent — the white inset shadow IS still in the DOM',
      async () => {
        await expect(canvasElement.innerHTML).toContain(
          'shadow-[inset_0_-8px_10px_#ffffff1f]',
        );
      },
    );
  },
};

export const HighlightPropGatesGlow: Story = {
  name: 'Interaction — `highlight={false}` removes the white inset glow',
  args: {
    children: 'No glow',
    shimmer: true,
    highlight: false,
  },
  play: async ({ canvasElement, step }) => {
    await step('No inset white shadow class is in the rendered HTML', async () => {
      await expect(canvasElement.innerHTML).not.toContain(
        'shadow-[inset_0_-8px_10px_#ffffff1f]',
      );
    });

    await step(
      '`shimmer` is independent — the spark IS still in the DOM',
      async () => {
        await expect(
          canvasElement.querySelector('.animate-shimmer-slide'),
        ).not.toBeNull();
      },
    );
  },
};

export const StaticPillHasNoEffects: Story = {
  name: 'Interaction — both off → clean ShimmerButton-shaped pill, no decoration',
  args: {
    children: 'Geometry only',
    shimmer: false,
    highlight: false,
    background: 'rgba(255, 255, 255, 0.12)',
  },
  play: async ({ canvasElement, step }) => {
    await step('Neither decorative effect is in the DOM', async () => {
      await expect(
        canvasElement.querySelector('.animate-shimmer-slide'),
      ).toBeNull();
      await expect(
        canvasElement.querySelector('.animate-spin-around'),
      ).toBeNull();
      await expect(canvasElement.innerHTML).not.toContain(
        'shadow-[inset_0_-8px_10px_#ffffff1f]',
      );
    });

    await step('Pill geometry survives — px-6 py-3 + border-radius var', async () => {
      await expect(canvasElement.innerHTML).toContain('px-6');
      await expect(canvasElement.innerHTML).toContain('py-3');
      await expect(canvasElement.innerHTML).toContain(
        '[border-radius:var(--radius)]',
      );
    });

    await step('--bg CSS variable carries the consumer background', async () => {
      const root = canvasElement.querySelector(
        '[style*="--bg"]',
      ) as HTMLElement | null;
      await expect(root).not.toBeNull();
      await expect(root!.style.getPropertyValue('--bg')).toBe(
        'rgba(255, 255, 255, 0.12)',
      );
    });
  },
};

export const DisabledIsNotClickable: Story = {
  name: 'Interaction — `disabled` blocks click activation',
  args: {
    children: 'Disabled',
    disabled: true,
    onClick: fn(),
  },
  play: async ({ canvasElement, args, step }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', { name: /disabled/i });

    await step('Button reports disabled state', async () => {
      await expect(button).toBeDisabled();
    });

    await step('Click does NOT fire onClick', async () => {
      await userEvent.click(button);
      await expect(args.onClick).not.toHaveBeenCalled();
    });
  },
};
