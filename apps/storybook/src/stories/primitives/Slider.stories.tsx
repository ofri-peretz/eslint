import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  Slider,
  SliderControl,
  SliderIndicator,
  SliderThumb,
  SliderTrack,
} from '@interlace/ui/slider';

const meta: Meta<typeof Slider> = {
  title: 'Primitives/Slider',
  component: Slider,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Range / value-picker. Wraps @base-ui/react/slider. Keyboard (Arrow / Home / End / PageUp / PageDown), drag, focus-visible, and ARIA inherited from Base UI.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Slider defaultValue={[50]} max={100} step={1} className="w-64">
      <SliderControl>
        <SliderTrack>
          <SliderIndicator />
        </SliderTrack>
        <SliderThumb />
      </SliderControl>
    </Slider>
  ),
};

export const Range: Story = {
  parameters: {
    docs: { description: { story: 'Two-thumb range slider — pass `defaultValue` as a `[min, max]` tuple.' } },
  },
  render: () => (
    <Slider defaultValue={[20, 70]} max={100} step={1} className="w-64">
      <SliderControl>
        <SliderTrack>
          <SliderIndicator />
        </SliderTrack>
        <SliderThumb />
        <SliderThumb />
      </SliderControl>
    </Slider>
  ),
};

export const Stepped: Story = {
  parameters: {
    docs: { description: { story: 'Stepped values — `step={10}` snaps to 0/10/20/.../100.' } },
  },
  render: () => (
    <Slider defaultValue={[40]} max={100} step={10} className="w-64">
      <SliderControl>
        <SliderTrack>
          <SliderIndicator />
        </SliderTrack>
        <SliderThumb />
      </SliderControl>
    </Slider>
  ),
};

export const Disabled: Story = {
  render: () => (
    <Slider defaultValue={[40]} max={100} step={1} disabled className="w-64">
      <SliderControl>
        <SliderTrack>
          <SliderIndicator />
        </SliderTrack>
        <SliderThumb />
      </SliderControl>
    </Slider>
  ),
};
