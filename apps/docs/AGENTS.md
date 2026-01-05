# AGENTS.md

> Context for AI coding agents working on the Interlace ESLint Docs

## Project Overview

This is a **Next.js 15** documentation site built with **Fumadocs**, serving as the official docs for the Interlace ESLint Ecosystem.

| Directory       | Purpose                                        |
| --------------- | ---------------------------------------------- |
| `src/app/`      | Next.js App Router pages and routes            |
| `src/lib/`      | Shared utilities and source configuration      |
| `content/docs/` | MDX documentation files (synced from packages) |
| `public/`       | Static assets                                  |

## Setup Commands

```bash
# From monorepo root
pnpm install

# Run development server
nx dev docs

# Build for production
nx build docs

# Run linter
nx lint docs
```

## Code Style

- TypeScript strict mode
- Next.js App Router conventions
- Fumadocs MDX for docs content
- Use Lucide icons via `fumadocs-core/source/lucide-icons`
- CSS: PostCSS with custom properties in `global.css`
- Font: Space Grotesk (variable font)

## Project Structure

```
src/
├── app/
│   ├── (home)/           # Landing page
│   ├── api/              # API routes
│   ├── docs/             # Documentation pages
│   ├── llms.txt/         # LLM context endpoint
│   ├── llms-full.txt/    # Full docs for LLMs
│   ├── og/               # OG image generation
│   ├── robots.ts         # Robots.txt generation
│   └── sitemap.ts        # Sitemap generation
├── lib/
│   └── source.ts         # Fumadocs source config
└── components/           # React components

content/
└── docs/                 # MDX documentation (272 rules across 11 plugins)
    ├── index.mdx         # Getting started
    ├── presets.mdx       # Flat config presets
    ├── benchmarks.mdx    # Performance benchmarks
    └── [plugin]/         # Plugin-specific docs
        ├── index.mdx     # Plugin overview
        └── rules/        # Rule documentation
```

## Content Sync

Documentation is synced from package source files. See `scripts/sync-rule-docs.ts`.

```bash
# Sync rule docs from packages
pnpm tsx scripts/sync-rule-docs.ts
```

## Key Routes

| Route                         | Purpose                       |
| ----------------------------- | ----------------------------- |
| `/`                           | Landing page                  |
| `/docs`                       | Documentation home            |
| `/docs/[plugin]`              | Plugin documentation          |
| `/docs/[plugin]/rules/[rule]` | Individual rule docs          |
| `/llms.txt`                   | LLM-friendly structured index |
| `/llms-full.txt`              | Full docs content for LLMs    |
| `/sitemap.xml`                | XML sitemap                   |
| `/robots.txt`                 | Crawler configuration         |

## AI Configuration Files

This site includes modern AI/LLM configuration:

- `src/app/robots.ts` - Programmatic robots.txt with AI bot permissions
- `src/app/llms.txt/route.ts` - Structured LLM context index
- `src/app/llms-full.txt/route.ts` - Full documentation for LLM indexing

## Environment Variables

| Variable               | Purpose                                                         |
| ---------------------- | --------------------------------------------------------------- |
| `NEXT_PUBLIC_BASE_URL` | Production URL (default: `https://interlace-eslint.vercel.app`) |

## Testing Before Commit

1. Run `nx dev docs` and verify pages load
2. Check `/llms.txt` and `/llms-full.txt` endpoints
3. Verify `/robots.txt` and `/sitemap.xml` generate correctly
4. Ensure MDX content renders properly
