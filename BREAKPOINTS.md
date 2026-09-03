# Breakpoint contract — apps in this repo

> **Doctrine lives in Interlace.** The design system's breakpoint ladder and
> the reasoning behind it are authored at
> [`packages/ui/BREAKPOINT_PHILOSOPHY.md`](https://github.com/ofri-peretz/interlace/blob/main/packages/ui/BREAKPOINT_PHILOSOPHY.md)
> (moving to `docs/philosophies/` alongside the other charters).
> This file is now only the **local enforcement contract** for the apps in
> this repo — what the lock tests here assert, and why.

## ⚠️ These two ladders currently disagree

Read this before "fixing" either side.

| | This repo's apps | `@interlace/ui` (the DS) |
| --- | --- | --- |
| `sm:` | 40rem / **640px** | 30rem / **480px** |
| `md:` | 48rem / 768px | 48rem / 768px |
| `lg:` | 64rem / 1024px | 64rem / 1024px |
| `xl:` | 80rem / 1280px | 80rem / 1280px |
| `2xl:` | 96rem / 1536px | **does not exist** |
| `--breakpoint-*` overrides | **forbidden**, lock-asserted | **required**, lock-asserted |

The apps here use Tailwind v4's built-in defaults as-is. The DS narrowed the
ladder to four rem-based tiers and dropped `2xl:` entirely, because
`Container size="wide"` (1280px) is the widest section it supports, so a
variant firing only above 1536px has no meaning there.

So the two repos hold **lock tests that assert opposite things about the same
token family**: `breakpoints-lock.test.ts` here fails if `--breakpoint-*`
appears, and `packages/ui/__tests__/breakpoints-lock.test.ts` in interlace
fails if it doesn't. Neither is broken; they govern different surfaces. But a
component pulled from `@interlace/ui` into an app here will hit `sm:` at
640px, not the 480px its `MIN_VIEWPORT` contract assumes.

**Adopting the DS ladder in this repo is an open decision, not an oversight.**
Until it's made, don't relax either lock to make the other pass.

## What this repo's apps enforce

These are Tailwind v4's built-in defaults, used as-is — no `@theme`
overrides, no `--breakpoint-*` custom variables, no `min-[Xpx]:` /
`max-[Xpx]:` arbitrary variants.

| Variant | Width | Use |
| --- | --- | --- |
| `sm:` | 40rem / 640px | Phablet → small tablet portrait. Default for "stop being one-column." |
| `md:` | 48rem / 768px | Tablet portrait. Two-column layouts, horizontal nav. |
| `lg:` | 64rem / 1024px | Tablet landscape / small laptop. Three-column grids. |
| `xl:` | 80rem / 1280px | Desktop. Content that genuinely benefits from a wider canvas. |
| `2xl:` | 96rem / 1536px | Large desktop. Rare. Hero / marquee / decorative scaling only. |

### Why no custom breakpoints here

Every custom breakpoint is a contract the next person (or the next agent)
doesn't know about. Apps with synchronised breakpoints stay predictable; one
app with a custom `2.5xl:` at 1440px breaks the muscle memory of everyone
editing the others, and the screen size where a bug appears stops mapping to
the tokens used at review time.

If a layout looks wrong at exactly 920px, the answer is **not** a custom
breakpoint between `sm` (640) and `md` (768). Redesign the layout so it works
through that range.

### Forbidden patterns (lint-locked where the app has vitest)

- `@theme inline { --breakpoint-* : ... }` in any `*.css` file under `src/`.
- `screens: { … }` in any legacy `tailwind.config.*` file.
- `className="… min-[920px]:flex …"` — any `min-[…px]:` / `max-[…px]:`
  arbitrary breakpoint variant in source. (Container queries `@…` are fine;
  this rule is only about viewport breakpoints.)
- `"tailwindcss": "^4"` (unpinned) in any app `package.json` — pin to
  `^4.1.18` or higher so a future minor that bumps the default scale can't
  drift a single app silently.

### Where the lock lives

| Surface | Lock |
| --- | --- |
| `eslint/apps/docs` | `src/__tests__/breakpoints-lock.test.ts` |
| `agents/apps/interlace-landing` | `src/__tests__/breakpoints-lock.test.ts` |
| `agents/apps/blog` | No vitest in this app yet — doc-only. PR review enforces. |
| `serverless/apps/docs` | `src/__tests__/breakpoints-lock.test.ts` |

Each lock asserts:

1. No `--breakpoint-` overrides in any `.css` under `src/`.
2. No `min-[Xpx]:` / `max-[Xpx]:` viewport arbitraries in source
   (`.ts` / `.tsx` / `.css`).
3. The app's own `package.json` pins `tailwindcss` to `^4.1.18` or higher.

A failure means either the violation is a real bug (revert) or the contract
has changed — in which case edit this doc in **all three consumer repos**
(`eslint`, `agents`, `serverless`), update every lock test, and reconcile
against the DS ladder above before coming back.

> This doc used to declare itself "source-of-truth across
> `ofriperetz.dev/{eslint, agents, serverless}`" with identical hand-copied
> copies in each — the drift it existed to prevent was the drift it caused.
> Breakpoint *doctrine* now has one home (Interlace); what remains here is
> local enforcement.

## Mobile-first reminder

We write mobile-first. Default styles target the smallest viewport. `sm:` /
`md:` / `lg:` only *add* behaviour at larger viewports. Never use a desktop
default and then override with `max-[…]` to "fix" mobile — flip the authoring
direction. This repo's `CLAUDE.md` already requires reproducing layout
regressions at ~390px before claiming a fix; that practice applies in all
three repos.
