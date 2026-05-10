# Component API conventions

The contract every `@interlace/ui` component must follow. Drives consistency
across primitives, blocks, patterns, and ecosystem helpers.

## Foundational stance

We adopt **MUI's API design philosophy** ([guide](https://mui.com/material-ui/guides/api/))
for naming, prop forwarding, controlled-vs-uncontrolled patterns, and event
shapes — because consistency is what makes a component library learnable.

We diverge from **MUI's mechanism**:

| MUI mechanism | Our mechanism | Why |
|---|---|---|
| CSS-in-JS theming + `<ThemeProvider>` | Tailwind v4 utility classes + CSS variables | No runtime; works with RSC; fumadocs already owns design tokens |
| `slots` / `slotProps` | `className` (Tailwind) + Base UI `render` prop | Less ceremony; Tailwind achieves the override goal directly |
| `component` prop (polymorphic) | Base UI `useRender` `render` prop | Aligned with our headless layer |

Both achieve the same flexibility — render-element override, prop forwarding,
inner-element customization — without the CSS-in-JS overhead.

## Naming

| Element | Convention | Example |
|---|---|---|
| Component file | `kebab-case.tsx` | `dropdown-menu.tsx` |
| Exported component | `PascalCase` | `DropdownMenu` |
| Compound subcomponents | flat `PascalCase` (no dot notation) | `DropdownMenuItem`, never `DropdownMenu.Item` |
| Boolean props | no `is*` prefix; use the meaning word | `disabled`, `open`, `checked` |
| Event callbacks | `on<Event>` for DOM events; `on<Value>Change` for state | `onClick`, `onValueChange`, `onOpenChange` |
| State props (controlled) | `value` / `onValueChange` or `open` / `onOpenChange` | matches MUI + Base UI |
| State props (uncontrolled) | `defaultValue` / `defaultOpen` | matches MUI |
| Slot data attributes | `data-slot="<component-name>"` | shadcn/Tailwind canon for class targeting |

## Standard prop vocabularies

When a primitive accepts these props, use **only** the listed values. Never
introduce a new variant name in one component if a synonym exists elsewhere.

### `variant`

| Value | Meaning |
|---|---|
| `default` | The primary visual treatment (filled / branded) |
| `secondary` | Lower-emphasis filled |
| `outline` | Bordered, transparent fill |
| `ghost` | No border, no fill (hover-reveal only) |
| `link` | Inline-text link styling |
| `destructive` | Destructive action (red palette) |

Components currently using this vocabulary: Button, Badge.

### `size`

| Value | Pixel intent (height) |
|---|---|
| `xs` | 24px |
| `sm` | 32px |
| `default` | 36px |
| `lg` | 40px |
| `icon`, `icon-xs`, `icon-sm`, `icon-lg` | square, matching height |

Components currently using this vocabulary: Button.

### `color` (for severity-style components)

When applicable, follow MUI's vocabulary:
`primary | secondary | success | info | warning | error`.
Components: Alert (uses `variant: default | destructive` today; can extend).

## Prop forwarding contract

Every component **must**:

1. Spread unknown props onto the root element (`...props`).
2. Forward `ref` (in React 19, ref is part of `props` — spreading is enough).
3. Merge `className` via `cn(...)` — never overwrite consumer-provided classes.
4. Set `data-slot="<component-name>"` for class-targeting from outside.

```tsx
function MyComponent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="my-component"
      className={cn('our-default-classes', className)}
      {...props}
    />
  );
}
```

## Override patterns

| What you want to override | How |
|---|---|
| Visual styling | `className` |
| Inline style | `style` |
| The rendered HTML element | Base UI `render` prop (e.g., `<Button render={<Link />}>`) |
| A specific event | Pass the `on*` callback |
| Props on an internal subcomponent | The compound subcomponent is exported separately (e.g., `<DialogContent>`); pass props directly |

We do **not** ship `slots` / `slotProps`. If a use-case can't be served by the
above, it's a design gap and should be raised on the component, not patched
with a new override mechanism.

## Controlled vs uncontrolled

Mirror MUI's pattern:

```tsx
// Controlled
<Switch checked={value} onCheckedChange={setValue} />

// Uncontrolled
<Switch defaultChecked={false} />

// Disabling controlled mode entirely is fine
<Switch disabled />
```

Internal state lives in Base UI; we surface its props directly.

## Server-first

Default to **server components**. Only add `'use client'` when:

- The component uses state hooks (`useState`, `useEffect`, etc.)
- The component imports from a `'use client'` library (e.g., `motion/react`)
- The component handles user interaction directly (Base UI primitives are
  `'use client'`; wrappers around them must be too)

Server-component primitives in this package: Card, Input, Alert, Skeleton,
Label, Separator, Pagination links, ArticleCard.

## Accessibility (non-negotiable)

- **Keyboard**: every interactive component must be reachable via Tab and
  operable via Enter/Space/arrow keys. Base UI handles this for behavioral
  primitives; verify for our compositions.
- **`prefers-reduced-motion`**: every animated component must degrade
  gracefully when the user has motion-sensitivity preferences. Use
  `useReducedMotion()` from our `lib/use-reduced-motion`.
- **ARIA**: handled by Base UI for behavioral primitives. For our
  decorative components, ensure `aria-hidden="true"` where appropriate.
- **Focus visible**: `focus-visible:` rings on all interactive primitives.
  Already standardized via shared class fragments.

## File structure

```
src/
├── lib/                     # Hooks and utilities
├── primitives/              # Single-element-wrap components (Button, Input, ...)
├── blocks/                  # Purposeful compositions (ArticleCard, SearchInput, ...)
├── patterns/                # Full-page presets (HeroCosmic, ...)
├── mdx/                     # MDX-author components (Mermaid)
├── fumadocs/                # Fumadocs-ecosystem helpers (RemoteMarkdown, ...)
├── magicui/                 # MagicUI-derived decorative motion
└── aceternity/              # Aceternity-derived backgrounds
```

The path tells the consumer the level of opinion.

## File header convention

Every component file starts with a one-line "what + why":

```tsx
// Mirrors the shadcn Button canon, built on Base UI's useRender hook.
// Upstream: https://base-ui.com/react/utils/use-render
'use client';
import * as React from 'react';
// ...
```

For components that fill an ecosystem gap, link the upstream pattern doc.
For brand patterns, identify the design source.

## When in doubt

1. **Look at MUI's API.** Match their vocabulary unless we have a documented
   reason to diverge.
2. **Look at shadcn's source for the same component.** That's our visual canon.
3. **Look at Base UI's primitive.** That's our behavior canon.
4. **If all three agree, we agree.** If they diverge, document our choice
   in the file header.
