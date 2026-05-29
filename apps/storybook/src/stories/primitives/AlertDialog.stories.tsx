import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
  MIN_VIEWPORT,
} from '@interlace/ui/alert-dialog';
import { Button } from '@interlace/ui/button';
import { withDark, withRtl } from '@/decorators';

const meta = {
  title: 'Primitives/AlertDialog',
  component: AlertDialog,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Destructive-confirm surface. Unlike `Dialog`, an `AlertDialog` interrupts the user with a decision they cannot dismiss by clicking outside — Cancel + Confirm are the only exits. Use for irreversible actions (delete a rule, revoke a key). A11y, focus trap, and Escape-to-cancel are inherited from `@base-ui/react/alert-dialog`.',
      },
    },
  },
} satisfies Meta<typeof AlertDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default — destructive confirm shown open so reviewers can see the surface
 * without having to drive the trigger. The trigger is still rendered for
 * shape parity with the production composition.
 */
export const Default: Story = {
  render: () => (
    <AlertDialog open={true}>
      <AlertDialogTrigger render={<Button variant="outline">Delete rule</Button>} />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this rule?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently removes the rule from your config. Existing
            violations will no longer be flagged. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel render={<Button variant="outline">Cancel</Button>} />
          <AlertDialogAction render={<Button variant="destructive">Confirm Delete</Button>} />
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ),
};

/**
 * Variants — AlertDialog is structurally fixed (one title, one description,
 * cancel + action). The meaningful axis is the tone of the action button,
 * driven by `Button`'s `variant`. We walk the two real-world tones a confirm
 * can take: destructive (delete) and primary (irreversible-but-affirmative,
 * e.g. publish).
 */
export const Variants: Story = {
  render: () => (
    <div className="flex flex-col gap-md">
      <AlertDialog open={true}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this rule?</AlertDialogTitle>
            <AlertDialogDescription>
              Destructive tone — removes the rule from your config permanently.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel render={<Button variant="outline">Cancel</Button>} />
            <AlertDialogAction render={<Button variant="destructive">Confirm Delete</Button>} />
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={true}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publish this article?</AlertDialogTitle>
            <AlertDialogDescription>
              Primary tone — publishes to all subscribers. Cannot be undone
              once the syndication fan-out completes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel render={<Button variant="outline">Cancel</Button>} />
            <AlertDialogAction render={<Button>Confirm Publish</Button>} />
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
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

/**
 * Below-min-viewport demo — wrap the trigger surface in a sub-MIN_VIEWPORT
 * container with the `data-interlace-dev` flag so preflight's dashed warning
 * outline appears. The AlertDialog itself portals out to the body and so is
 * not constrained by the wrapper — what we're verifying here is that the
 * primitive *advertises* its MIN_VIEWPORT correctly and that the dev-mode
 * outline contract still fires for its trigger seam.
 */
export const BelowMinViewport: Story = {
  render: () => (
    <div data-interlace-dev style={{ width: MIN_VIEWPORT - 1 }}>
      <AlertDialog open={true}>
        <AlertDialogTrigger
          render={<Button variant="outline">{`< ${MIN_VIEWPORT}px — dev outline`}</Button>}
        />
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this rule?</AlertDialogTitle>
            <AlertDialogDescription>
              Rendered inside a sub-min-viewport container — the dashed
              preflight outline should mark this surface in dev mode.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel render={<Button variant="outline">Cancel</Button>} />
            <AlertDialogAction render={<Button variant="destructive">Confirm Delete</Button>} />
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  ),
  decorators: [
    (Story) => (
      // Promote the body flag for this story so the preflight selector matches.
      <div
        ref={(node) => {
          if (node && typeof document !== 'undefined') {
            document.body.setAttribute('data-interlace-dev', '');
          }
        }}
      >
        <Story />
      </div>
    ),
  ],
};
