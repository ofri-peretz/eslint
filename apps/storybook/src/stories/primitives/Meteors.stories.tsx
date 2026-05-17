import type { Meta, StoryObj } from '@storybook/react-vite';
import { Meteors } from '@interlace/ui/meteors';

const meta: Meta<typeof Meteors> = {
  title: 'Primitives/Meteors',
  component: Meteors,
};

export default meta;
type Story = StoryObj<typeof Meteors>;

export const Default: Story = {
  render: () => (
    <div className="relative h-[480px] w-full overflow-hidden rounded-xl bg-slate-950">
      <Meteors number={22} />
      <div className="relative z-10 flex h-full items-center justify-center text-slate-100">
        <span className="text-xs uppercase tracking-widest opacity-60">
          Meteors — 22 over a 480px hero
        </span>
      </div>
    </div>
  ),
};

export const LightSurface: Story = {
  render: () => (
    <div className="relative h-[480px] w-full overflow-hidden rounded-xl bg-gradient-to-b from-sky-50 to-sky-200">
      <Meteors number={15} />
      <div className="relative z-10 flex h-full items-center justify-center text-slate-700">
        <span className="text-xs uppercase tracking-widest opacity-60">
          Meteors over a daylit hero
        </span>
      </div>
    </div>
  ),
};

export const Sparse: Story = {
  render: () => (
    <div className="relative h-[480px] w-full overflow-hidden rounded-xl bg-slate-950">
      <Meteors number={6} />
      <div className="relative z-10 flex h-full items-center justify-center text-slate-100">
        <span className="text-xs uppercase tracking-widest opacity-60">
          6 meteors — quiet sky
        </span>
      </div>
    </div>
  ),
};
