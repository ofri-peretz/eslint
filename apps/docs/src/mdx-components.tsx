import { isValidElement, type ComponentProps, type ReactElement, type ReactNode } from 'react';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import { cn } from '@interlace/ui/cn';
import * as Twoslash from 'fumadocs-twoslash/ui';
import { Mermaid } from '@/components/mdx/mermaid';
import { InstallSnippet } from '@/components/mdx/install-snippet';
import { Stat } from '@/components/mdx/stat';
import { Steps, Step } from 'fumadocs-ui/components/steps';
import { Tabs, Tab } from 'fumadocs-ui/components/tabs';
import { Accordion, Accordions } from 'fumadocs-ui/components/accordion';
import type { MDXComponents } from 'mdx/types';

/**
 * Strip a ```mermaid fenced block out of the default `<pre>` pipeline and
 * render it through `<Mermaid>` instead.
 *
 * Why this lives on the React component (not as a remark plugin): emitting
 * the chart string via `mdxJsxAttributeValueExpression` lost its `estree`
 * payload through fumadocs-mdx's recma stage and produced broken compile
 * output (`_jsx(Mermaid, { chart: })`). The component-level override sees
 * the raw children verbatim and skips the AST round-trip entirely.
 *
 * Detection: by the time React renders the `<pre>`, Shiki has already
 * stripped the `language-mermaid` class and wrapped each line in styled
 * `<span>`s. We therefore sniff the extracted text for the canonical
 * Mermaid diagram openers — that's what's reachable downstream of Shiki.
 */
function extractText(node: ReactNode): string {
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (isValidElement<{ children?: ReactNode }>(node)) {
    return extractText(node.props.children);
  }
  return '';
}

// Mermaid diagram openers per https://mermaid.js.org/intro/syntax-reference.html
// `%%{init: …}%%` and front-matter `---` blocks are valid leading directives
// (the directive must appear before the diagram keyword), so we strip a
// leading directive before matching.
const MERMAID_OPENER =
  /^(?:graph\b|flowchart\b|sequenceDiagram\b|classDiagram\b|stateDiagram(?:-v2)?\b|erDiagram\b|gantt\b|pie\b|journey\b|gitGraph\b|requirementDiagram\b|mindmap\b|timeline\b|quadrantChart\b|xychart-beta\b|sankey-beta\b|block-beta\b|architecture-beta\b|c4Context\b|c4Container\b|c4Component\b|c4Dynamic\b|c4Deployment\b)/;

function looksLikeMermaid(text: string): boolean {
  // Strip leading `%%{init: …}%%` directive(s) and a `---\n…\n---` front-matter.
  let body = text.replace(/^\s*(?:%%\{[\s\S]*?\}%%\s*)+/, '');
  body = body.replace(/^\s*---[\s\S]*?\n---\s*/, '');
  return MERMAID_OPENER.test(body.trimStart());
}

const DefaultPre = defaultMdxComponents.pre as
  | ((props: ComponentProps<'pre'>) => ReactNode)
  | undefined;

function Pre(props: ComponentProps<'pre'>) {
  const text = extractText(props.children).trim();
  if (text && looksLikeMermaid(text)) {
    return <Mermaid chart={text} />;
  }
  return DefaultPre ? (
    DefaultPre(props) as ReactElement
  ) : (
    <pre {...props} />
  );
}

const DefaultImg = defaultMdxComponents.img as
  | ((props: ComponentProps<'img'>) => ReactNode)
  | undefined;

/**
 * Hosts that only ever serve status badges — always 20 CSS pixels tall,
 * variable width. Anything from these hosts can be laid out without knowing
 * its intrinsic size.
 */
const BADGE_HOST =
  /^https?:\/\/(img\.shields\.io|shields\.io|badgen\.net|codecov\.io)\//i;

/**
 * `next/image` (behind fumadocs' default image component) throws when a string
 * `src` arrives without width/height. We deliberately no longer measure
 * external images at build time — see `remarkImageOptions.external` in
 * `src/lib/mdx-compiler.tsx` and `source.config.ts` — so unsized externals
 * (~275 shields.io badges across the plugin READMEs) render as plain image
 * elements here instead of crashing the page.
 *
 * Both branches keep explicit width/height so layout space is still reserved
 * before decode (MOTION_PHILOSOPHY CLS budget, enforced by
 * `philosophy-enforcement.test.ts`); the paired Tailwind classes let the real
 * intrinsic size take over once the bytes land. Local images still carry real
 * dimensions from disk and keep the optimized `next/image` path.
 */
function Img({ className, ...props }: ComponentProps<'img'>) {
  const unsized =
    typeof props.src === 'string' && props.width == null && props.height == null;

  if (unsized) {
    return BADGE_HOST.test(props.src as string) ? (
      // eslint-disable-next-line @next/next/no-img-element -- badge, not a content image
      <img
        {...props}
        alt={props.alt ?? ''}
        width={100}
        height={20}
        loading="lazy"
        decoding="async"
        className={cn('inline-block h-5 w-auto', className)}
      />
    ) : (
      // Next.js' documented idiom for an image of unknown intrinsic size.
      // eslint-disable-next-line @next/next/no-img-element -- intrinsic size unknown
      <img
        {...props}
        alt={props.alt ?? ''}
        width={0}
        height={0}
        sizes="100vw"
        loading="lazy"
        decoding="async"
        className={cn('h-auto w-full rounded-lg', className)}
      />
    );
  }

  return DefaultImg ? (
    (DefaultImg({ ...props, className }) as ReactElement)
  ) : (
    // eslint-disable-next-line @next/next/no-img-element -- no default component available
    <img width={0} height={0} {...props} alt={props.alt ?? ''} className={className} />
  );
}

/**
 * MDX components registry
 *
 * Includes:
 * - Default Fumadocs components (Callout, Card, etc.)
 * - Twoslash TypeScript inline hints
 * - Mermaid diagram rendering — dispatched through a `pre` override below.
 *   ```mermaid fenced blocks get caught before the default <pre>/<code>
 *   render and forwarded to `<Mermaid chart="…" />`.
 * - Steps/Step for multi-step guides
 * - Tabs/Tab for tabbed content
 * - Accordion/Accordions for collapsible sections
 * - InstallSnippet — npm/pnpm/yarn/bun package-install switcher
 *   (CODE_EXAMPLE_PHILOSOPHY)
 */
export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
    ...Twoslash, // TypeScript code hints
    pre: Pre, // Catches ```mermaid before fumadocs renders it as a code block
    img: Img, // Unsized external images (README badges) bypass next/image
    Mermaid, // Diagram rendering (also usable as a direct MDX component)
    InstallSnippet, // Package-install snippet w/ PM switcher
    Stat, // Plugin/rule counts from the generated numbers manifest — never hand-type them
    Steps, // Multi-step guides
    Step,
    Tabs, // Tabbed content
    Tab,
    Accordion, // Collapsible sections
    Accordions,
    ...components,
  };
}
