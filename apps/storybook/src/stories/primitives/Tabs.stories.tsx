import type { Meta, StoryObj } from '@storybook/react-vite';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@interlace/ui/tabs';
import { withDark, withRtl } from '@/decorators';

const meta: Meta<typeof Tabs> = {
  title: 'Primitives/Tabs',
  component: Tabs,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Horizontal tab navigation with keyboard arrow-key traversal per `KEYBOARD_PHILOSOPHY.md`. Lazy-mount: a TabsContent renders only when its trigger is active.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Tabs>;

export const Default: Story = {
  render: () => (
    <Tabs defaultValue="security" className="w-[420px]">
      <TabsList>
        <TabsTrigger value="security">Security</TabsTrigger>
        <TabsTrigger value="quality">Code Quality</TabsTrigger>
        <TabsTrigger value="react">React</TabsTrigger>
      </TabsList>
      <TabsContent value="security" className="text-muted-foreground p-3 text-sm">
        8 plugins, 224+ rules.
      </TabsContent>
      <TabsContent value="quality" className="text-muted-foreground p-3 text-sm">
        6 plugins, 49+ rules.
      </TabsContent>
      <TabsContent value="react" className="text-muted-foreground p-3 text-sm">
        2 plugins, 91 rules.
      </TabsContent>
    </Tabs>
  ),
};

export const Dark: Story = {
  ...Default,
  decorators: [withDark],
};

export const RTL: Story = {
  ...Default,
  decorators: [withRtl],
};
