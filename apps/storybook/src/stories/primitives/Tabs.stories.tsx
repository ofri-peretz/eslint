import type { Meta, StoryObj } from '@storybook/react-vite';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@interlace/ui/tabs';

const meta: Meta<typeof Tabs> = {
  title: 'Primitives/Tabs',
  component: Tabs,
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
