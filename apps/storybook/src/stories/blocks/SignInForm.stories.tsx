import type { Meta, StoryObj } from '@storybook/react-vite';
import { SignInForm } from '@interlace/ui/blocks/sign-in-form';

const meta: Meta<typeof SignInForm> = {
  title: 'Blocks/SignInForm',
  component: SignInForm,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Canonical sign-in pattern. Composes Form + Field + Input + Button + Typography. Server-component-safe — consumers wire onSubmit / action.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const WithSubtitle: Story = {
  args: {
    subtitle: 'Welcome back. Use your work email.',
  },
};

export const WithActionsAndFooter: Story = {
  args: {
    subtitle: 'Welcome back.',
    actions: (
      <a href="#" className="text-violet-600 hover:underline dark:text-violet-400">
        Forgot password?
      </a>
    ),
    footer: (
      <>
        Don&apos;t have an account?{' '}
        <a href="#" className="text-violet-600 hover:underline dark:text-violet-400">
          Sign up
        </a>
      </>
    ),
  },
};
