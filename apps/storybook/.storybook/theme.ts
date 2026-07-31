/**
 * Interlace-branded Storybook manager theme.
 *
 * Read in `manager.ts` via `addons.setConfig({ theme })`. Colors mirror
 * the dark-mode brand layer from `packages/ui/styles/interlace-theme.css`
 * — same single source of truth the docs site uses, so the storybook
 * chrome can't drift from the brand palette over time.
 *
 * Storybook ships its theme primitives via the `storybook/theming` entry
 * (Storybook 8+ moved this from the older `@storybook/theming` package).
 */
import { create } from 'storybook/theming';

// Brand burnt orange — primary + hover. Light variant for selected sidebar items
// against the dark chrome (matches `--interlace-primary` light/dark pair).
const brandDark = '#fbb99a'; // light burnt orange, 11.79:1 on near-black
const brandDarker = '#8a3a10'; // burnt orange, 7.80:1 on white

// Surface tokens — mirror `.dark { --interlace-* }` from interlace-theme.css.
const bg = '#0a0a0f';
const contentBg = '#14131c';
const border = '#1f1d2b';
const fg = '#ededf2';
const mutedFg = '#a09cb3';

const theme = create({
  base: 'dark',

  brandTitle: 'Interlace UI',
  brandUrl: 'https://eslint.interlace.tools',
  brandImage: './interlace-mark.svg',
  brandTarget: '_self',

  colorPrimary: brandDark,
  colorSecondary: brandDarker,

  // App surfaces
  appBg: bg,
  appContentBg: contentBg,
  appPreviewBg: contentBg,
  appBorderColor: border,
  appBorderRadius: 8,

  // Text
  textColor: fg,
  textInverseColor: bg,
  textMutedColor: mutedFg,

  // Toolbar (top bar of the manager)
  barTextColor: mutedFg,
  barSelectedColor: brandDark,
  barHoverColor: brandDark,
  barBg: contentBg,

  // Inputs (sidebar search, controls panel)
  inputBg: bg,
  inputBorder: border,
  inputTextColor: fg,
  inputBorderRadius: 6,

  // Fonts — match the docs site (Space Grotesk is already loaded in preview.css).
  fontBase:
    "'Space Grotesk', system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
  fontCode:
    "'Geist Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
});

export default theme;
