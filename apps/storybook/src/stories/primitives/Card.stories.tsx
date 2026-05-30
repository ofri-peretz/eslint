import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@interlace/ui/card';
import { Button } from '@interlace/ui/button';
import { withRtl } from '@/decorators';

const meta: Meta<typeof Card> = {
  title: 'Primitives/Card',
  component: Card,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Container surface that groups related content. Uses `bg-card`/`text-card-foreground` token pair per `COLOR_PHILOSOPHY.md` — contrast holds in both themes without override.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {
  render: () => (
    <Card className="w-[360px]">
      <CardHeader>
        <CardTitle>Plugin: secure-coding</CardTitle>
        <CardDescription>
          31 rules covering tainted input, prototype pollution, and unsafe IO.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-muted-foreground text-sm">
        Type-unaware. Drop-in for ESLint 9+ flat config.
      </CardContent>
      <CardFooter>
        <Button>Read docs</Button>
      </CardFooter>
    </Card>
  ),
};
export const Dark: Story = {
  globals: { theme: 'dark' },
  parameters: { backgrounds: { default: 'dark' } },
  render: () => (
    <div className="dark">
      <Card className="w-[360px]">
        <CardHeader>
          <CardTitle>Plugin: secure-coding</CardTitle>
          <CardDescription>
            31 rules covering tainted input, prototype pollution, and unsafe IO.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button>Read docs</Button>
        </CardFooter>
      </Card>
    </div>
  ),
};

export const RTL: Story = {
  ...Default,
  decorators: [withRtl],
};
