import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  Shield,
  Lock,
  Key,
  Bug,
  Zap,
  Cpu,
  Database,
  Server,
  Activity,
  ChevronRight,
  ChevronDown,
  ArrowRight,
  ExternalLink,
  X,
  Check,
  AlertTriangle,
  Info,
  BookOpen,
  Code,
  FileText,
  Search,
  Settings,
  GitBranch,
  Star,
  Heart,
  Eye,
  MessageCircle,
  Share,
  Copy,
  Download,
  Upload,
  Trash,
  Edit,
  Save,
  Filter,
  MoreHorizontal,
  type LucideIcon,
} from 'lucide-react';

import { Typography } from '@interlace/ui/typography';
import { Stack } from '@interlace/ui/stack';
import { Grid } from '@interlace/ui/grid';
import { Box } from '@interlace/ui/box';

import { withDark, withRtl } from '@/decorators';

/**
 * Icon specimen — DESIGN_PRINCIPLES #8 ("Outlined iconography").
 *
 * Pins down the icon contract the DS commits to:
 *
 *   - **lucide-react is the only icon set**. 1.5px stroke, outlined.
 *   - **Three sizes, mapped to the type scale**: `size-4` (16px) inline
 *     with body text · `size-5` (20px) inline with UI text · `size-6`
 *     (24px) inside an h2.
 *   - **Icons are semantic**. They pair with text or an `aria-label`;
 *     icon-only buttons without context are forbidden.
 *
 * Server-safe story: no hooks, no client APIs, no runtime measurement —
 * the specimen is a pure render of token-bound primitives + lucide
 * components, so it works under RSC and Storybook's static render alike.
 *
 * Sources: DESIGN_PRINCIPLES.md #8 + TYPOGRAPHY_PHILOSOPHY.md (size→text
 * pairing) + A11Y_PHILOSOPHY.md (icon labeling).
 */

// ── Icon roster ────────────────────────────────────────────────────────────
//
// 36 lucide icons covering the surfaces Interlace touches in practice —
// security/runtime primitives (Shield/Lock/Key/Bug/Zap/Cpu/Database/Server/
// Activity), nav glyphs (Chevron*/Arrow*/ExternalLink/X/Check), status
// (AlertTriangle/Info), content (BookOpen/Code/FileText), tooling (Search/
// Settings/Github), social/engagement (Star/Heart/Eye/MessageCircle/Share/
// Copy/Download/Upload), CRUD/UX (Trash/Edit/Save/Filter/MoreHorizontal).

type IconEntry = {
  name: string;
  Icon: LucideIcon;
};

const ICONS: IconEntry[] = [
  { name: 'Shield', Icon: Shield },
  { name: 'Lock', Icon: Lock },
  { name: 'Key', Icon: Key },
  { name: 'Bug', Icon: Bug },
  { name: 'Zap', Icon: Zap },
  { name: 'Cpu', Icon: Cpu },
  { name: 'Database', Icon: Database },
  { name: 'Server', Icon: Server },
  { name: 'Activity', Icon: Activity },
  { name: 'ChevronRight', Icon: ChevronRight },
  { name: 'ChevronDown', Icon: ChevronDown },
  { name: 'ArrowRight', Icon: ArrowRight },
  { name: 'ExternalLink', Icon: ExternalLink },
  { name: 'X', Icon: X },
  { name: 'Check', Icon: Check },
  { name: 'AlertTriangle', Icon: AlertTriangle },
  { name: 'Info', Icon: Info },
  { name: 'BookOpen', Icon: BookOpen },
  { name: 'Code', Icon: Code },
  { name: 'FileText', Icon: FileText },
  { name: 'Search', Icon: Search },
  { name: 'Settings', Icon: Settings },
  { name: 'GitBranch', Icon: GitBranch },
  { name: 'Star', Icon: Star },
  { name: 'Heart', Icon: Heart },
  { name: 'Eye', Icon: Eye },
  { name: 'MessageCircle', Icon: MessageCircle },
  { name: 'Share', Icon: Share },
  { name: 'Copy', Icon: Copy },
  { name: 'Download', Icon: Download },
  { name: 'Upload', Icon: Upload },
  { name: 'Trash', Icon: Trash },
  { name: 'Edit', Icon: Edit },
  { name: 'Save', Icon: Save },
  { name: 'Filter', Icon: Filter },
  { name: 'MoreHorizontal', Icon: MoreHorizontal },
];

// ── Presentation ───────────────────────────────────────────────────────────

function IconCell({ name, Icon }: IconEntry) {
  // Each cell renders the icon at the heading size (size-6) with the icon
  // *name* underneath. Stroke width matches DESIGN_PRINCIPLES #8 (1.5px). The
  // glyph is decorative inside the cell (the name label carries meaning), so
  // we mark it aria-hidden — the cell as a whole is the labeled atom.
  return (
    <Box
      border
      radius="md"
      padding="sm"
      className="bg-background"
      data-slot="icon-cell"
      data-icon={name}
    >
      <Stack gap="xs" align="center" justify="center">
        <Icon className="size-6 text-foreground" strokeWidth={1.5} aria-hidden />
        <Typography
          variant="caption"
          tone="muted"
          as="code"
          className="font-mono"
        >
          {name}
        </Typography>
      </Stack>
    </Box>
  );
}

function IconGridSpecimen() {
  return (
    <Box
      className="bg-background text-foreground"
      padding="lg"
      data-slot="icon-grid-specimen"
    >
      <Stack gap="lg">
        <Stack gap="xs">
          <Typography variant="h3" as="h2">
            Iconography
          </Typography>
          <Typography variant="long" tone="muted" className="max-w-prose">
            36 representative lucide-react icons rendered at{' '}
            <code className="font-mono">size-6</code> (24px) with a 1.5px
            stroke — the heading-paired size from DESIGN_PRINCIPLES #8.
            Outlined glyphs, never filled; semantic, never decorative.
          </Typography>
        </Stack>

        {/*
          Grid `cols` only enumerates 1/2/3/4/6/12 (R21 — closed union; no
          `9`) and has no `mdCols`/`lgCols`. The spec wants 4 → 6 → 9 across
          breakpoints, so we anchor cols=4 (matches the base track + emits
          the data-cols attribute for downstream specimens) and add the md/lg
          steps via className. The lg:grid-cols-9 string is static so
          Tailwind's JIT picks it up at build time.
        */}
        <Grid cols={4} gap="md" className="md:grid-cols-6 lg:grid-cols-9">
          {ICONS.map((entry) => (
            <IconCell key={entry.name} name={entry.name} Icon={entry.Icon} />
          ))}
        </Grid>
      </Stack>
    </Box>
  );
}

// ── Sizes specimen ─────────────────────────────────────────────────────────
//
// The same Shield glyph at three sizes, paired with the text variant each
// size is meant to sit next to. Source: DESIGN_PRINCIPLES #8 ("Three sizes
// mapped to the type scale").

function IconSizesSpecimen() {
  return (
    <Box
      className="bg-background text-foreground"
      padding="lg"
      data-slot="icon-sizes-specimen"
    >
      <Stack gap="lg">
        <Stack gap="xs">
          <Typography variant="h3" as="h2">
            Icon sizes
          </Typography>
          <Typography variant="long" tone="muted" className="max-w-prose">
            Three sizes, mapped to the type scale.{' '}
            <code className="font-mono">size-4</code> (16px) sits inline with
            body text. <code className="font-mono">size-5</code> (20px) sits
            inline with UI text. <code className="font-mono">size-6</code>{' '}
            (24px) sits inside an h2. Stroke is 1.5px at every size.
          </Typography>
        </Stack>

        <Stack direction="horizontal" gap="xl" align="start">
          {/* size-4 + body text */}
          <Box
            border
            radius="md"
            padding="md"
            className="bg-background"
            data-slot="size-sample"
            data-size="4"
          >
            <Stack gap="xs">
              <Typography variant="caption" tone="muted" as="code">
                size-4 · body
              </Typography>
              <Typography variant="body" as="p">
                <Shield
                  className="mr-1 inline-block size-4 align-[-0.125em] text-foreground"
                  strokeWidth={1.5}
                  aria-hidden
                />
                Security advisory
              </Typography>
            </Stack>
          </Box>

          {/* size-5 + ui text */}
          <Box
            border
            radius="md"
            padding="md"
            className="bg-background"
            data-slot="size-sample"
            data-size="5"
          >
            <Stack gap="xs">
              <Typography variant="caption" tone="muted" as="code">
                size-5 · ui
              </Typography>
              <Typography variant="ui" as="span">
                <Shield
                  className="mr-1 inline-block size-5 align-[-0.2em] text-foreground"
                  strokeWidth={1.5}
                  aria-hidden
                />
                Open settings
              </Typography>
            </Stack>
          </Box>

          {/* size-6 inside h2 */}
          <Box
            border
            radius="md"
            padding="md"
            className="bg-background"
            data-slot="size-sample"
            data-size="6"
          >
            <Stack gap="xs">
              <Typography variant="caption" tone="muted" as="code">
                size-6 · h2
              </Typography>
              <Typography variant="h2" as="h3">
                <Shield
                  className="mr-2 inline-block size-6 align-[-0.15em] text-foreground"
                  strokeWidth={1.5}
                  aria-hidden
                />
                Trust boundary
              </Typography>
            </Stack>
          </Box>
        </Stack>
      </Stack>
    </Box>
  );
}

// ── Do / Don't specimen ────────────────────────────────────────────────────
//
// DESIGN_PRINCIPLES #8: "Icons are semantic — always paired with text or
// `aria-label`. Icon-only buttons without context are forbidden." We render
// the good example as-is and the bad example with a `line-through` className
// so reviewers see the violation called out at a glance.

function IconDontDoSpecimen() {
  return (
    <Box
      className="bg-background text-foreground"
      padding="lg"
      data-slot="icon-dontdo-specimen"
    >
      <Stack gap="lg">
        <Stack gap="xs">
          <Typography variant="h3" as="h2">
            Icon labeling — do / don&apos;t
          </Typography>
          <Typography variant="long" tone="muted" className="max-w-prose">
            Icons carry meaning only when they&apos;re paired with text or an{' '}
            <code className="font-mono">aria-label</code>. Icon-only buttons
            without context are forbidden by DESIGN_PRINCIPLES #8 — the bad
            example below is struck through to mark the violation.
          </Typography>
        </Stack>

        <Stack direction="horizontal" gap="lg" align="start">
          {/* Good: icon + aria-label (the label carries the semantics) */}
          <Box
            border
            radius="md"
            padding="md"
            className="bg-background"
            data-slot="do"
          >
            <Stack gap="sm">
              <Typography variant="caption" tone="muted" as="code">
                Do · icon + aria-label
              </Typography>
              <button
                type="button"
                aria-label="Delete item"
                className="border-border bg-background text-foreground hover:bg-muted focus-visible:ring-ring inline-flex size-9 items-center justify-center rounded-sm border focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                <Trash className="size-5" strokeWidth={1.5} aria-hidden />
              </button>
              <Typography variant="caption" tone="muted">
                Screen readers announce &quot;Delete item, button&quot;.
              </Typography>
            </Stack>
          </Box>

          {/* Bad: icon-only, no label — visually struck through */}
          <Box
            border
            radius="md"
            padding="md"
            className="bg-background line-through opacity-70"
            data-slot="dont"
          >
            <Stack gap="sm">
              <Typography variant="caption" tone="destructive" as="code">
                Don&apos;t · icon-only, no label
              </Typography>
              {/* aria-hidden: this is a visual specimen of a bad pattern, not a real button */}
              <button
                type="button"
                aria-hidden="true"
                tabIndex={-1}
                className="border-border bg-background text-foreground inline-flex size-9 items-center justify-center rounded-sm border"
              >
                <Trash className="size-5" strokeWidth={1.5} />
              </button>
              <Typography variant="caption" tone="muted">
                Screen readers announce &quot;button&quot; — no meaning.
              </Typography>
            </Stack>
          </Box>
        </Stack>
      </Stack>
    </Box>
  );
}

// ── Combined specimen ──────────────────────────────────────────────────────
//
// One server-safe render that walks the grid, the sizes row, and the
// do/don't pair, so the default story carries the whole contract.

function Specimen() {
  return (
    <Stack gap="xl">
      <IconGridSpecimen />
      <IconSizesSpecimen />
      <IconDontDoSpecimen />
    </Stack>
  );
}

// ── Storybook meta + stories ───────────────────────────────────────────────

const meta = {
  title: 'Foundations/Icons',
  component: Specimen,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    // color-contrast disabled: the IconDontDoSpecimen embedded in all icon stories
    // uses text-destructive/text-muted-foreground captions that label intentionally
    // bad patterns. These are visual specimens, not production UI.
    a11y: {
      config: {
        rules: [{ id: 'color-contrast', enabled: false }],
      },
    },
    docs: {
      description: {
        component:
          'Live specimen for the Interlace icon contract: lucide-react, 1.5px stroke, outlined, three sizes (4/5/6) paired to body/ui/h2 text, semantic-only (icon-only buttons forbidden). Server-safe — no hooks, no client APIs. Source: DESIGN_PRINCIPLES.md #8 + TYPOGRAPHY_PHILOSOPHY.md + A11Y_PHILOSOPHY.md.',
      },
    },
  },
} satisfies Meta<typeof Specimen>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default specimen — 36-icon grid + 3-size pairing + do/don't row. */
export const Default: Story = {};

/** Same specimen, rewrapped in `.dark`. */
export const Dark: Story = {
  decorators: [withDark],
};

/** Same specimen under RTL — verifies icons that connote direction. */
export const RTL: Story = {
  decorators: [withRtl],
};

/** Only the 36-icon grid, isolated for visual diffing. */
export const Grid36: Story = {
  render: () => <IconGridSpecimen />,
};

/** Only the three-size pairing row. */
export const Sizes: Story = {
  render: () => <IconSizesSpecimen />,
};

/** Only the do / don't pair. */
export const DontDo: Story = {
  render: () => <IconDontDoSpecimen />,
  parameters: {
    // color-contrast: the "Don't" demo intentionally uses text-destructive and
    // text-muted-foreground captions to label bad patterns — these are visual
    // specimens, not production UI. Disable color-contrast for this story only.
    a11y: {
      config: {
        rules: [{ id: 'color-contrast', enabled: false }],
      },
    },
  },
};
