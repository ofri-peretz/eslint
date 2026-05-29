/**
 * Layout Primitives Lock Tests
 *
 * Locks the padding / spacing / container contract from LAYOUT_PHILOSOPHY.md
 * §2 (container widths), §3 (spacing scale), §5 (density scale), §7 (sections
 * own the wrapper) for the four mandated primitives:
 *
 *   - `<Container>` — width contract (prose / content / wide / full)
 *   - `<Section>` — vertical rhythm + tone + dividers + container injection
 *   - `<Stack>` / `<Cluster>` — gap rhythm
 *   - `<SectionHeader>` — title / tagline / eyebrow structure
 *
 * If any of these tests fail, the homepage refactor (HOMEPAGE_LAYOUT_AUDIT.md)
 * has regressed. Update the philosophy doc first if the change is intentional.
 */

import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Container } from '../../../../packages/ui/src/primitives/container';
import { Section } from '../../../../packages/ui/src/primitives/section';
import { Stack, Cluster } from '../../../../packages/ui/src/primitives/stack';
import { SectionHeader } from '../../../../packages/ui/src/blocks/section-header';

const render = (el: React.ReactNode) =>
  renderToStaticMarkup(el as React.ReactElement);

// =========================================
// CONTAINER — LAYOUT §2 (width contract) + §5 (density)
// =========================================

describe('Container: width contract (LAYOUT §2)', () => {
  it('every size carries the responsive horizontal padding scale (LAYOUT §5)', () => {
    for (const size of ['prose', 'content', 'wide'] as const) {
      const html = render(<Container size={size}>x</Container>);
      expect(html).toContain('px-4');
      expect(html).toContain('sm:px-6');
      expect(html).toContain('lg:px-8');
    }
  });

  it('every non-full size centers (mx-auto) and stretches (w-full)', () => {
    for (const size of ['prose', 'content', 'wide'] as const) {
      const html = render(<Container size={size}>x</Container>);
      expect(html).toContain('mx-auto');
      expect(html).toContain('w-full');
    }
  });

  it('size="prose" caps at 65ch', () => {
    expect(render(<Container size="prose">x</Container>)).toContain(
      'max-w-[65ch]',
    );
  });

  it('size="content" caps at 1024px (the landing default)', () => {
    expect(render(<Container size="content">x</Container>)).toContain(
      'max-w-[1024px]',
    );
  });

  it('size="wide" caps at 1280px (card-grid heavy sections)', () => {
    expect(render(<Container size="wide">x</Container>)).toContain(
      'max-w-[1280px]',
    );
  });

  it('size="full" removes the cap AND strips horizontal padding (full-bleed)', () => {
    const html = render(<Container size="full">x</Container>);
    expect(html).toContain('max-w-none');
    expect(html).toContain('px-0');
    expect(html).toContain('sm:px-0');
    expect(html).toContain('lg:px-0');
  });

  it('defaults to size="content" when no prop is passed', () => {
    expect(render(<Container>x</Container>)).toContain('max-w-[1024px]');
  });

  it('tags the rendered element with data-slot="container" and data-size for DevTools/E2E', () => {
    const html = render(<Container size="wide">x</Container>);
    expect(html).toContain('data-slot="container"');
    expect(html).toContain('data-size="wide"');
  });

  it('preserves user-supplied className alongside the variant classes', () => {
    const html = render(
      <Container size="content" className="custom-x">
        x
      </Container>,
    );
    expect(html).toContain('max-w-[1024px]');
    expect(html).toContain('custom-x');
  });
});

// =========================================
// SECTION — LAYOUT §3 (spacing), §7 (sections compose), §8 (tone + divider)
// =========================================

describe('Section: vertical rhythm (LAYOUT §3, §5)', () => {
  it('spacing="tight" produces py-12 md:py-16 lg:py-20 (clears LAYOUT §3 desktop floor of py-16)', () => {
    // Floor rule: even the smallest section spacing variant must hit the
    // §3 desktop minimum (xl token = py-16) by the `md:` breakpoint, or
    // the rendered band looks "padless" — the regression reported on the
    // stats-bar in 2026-05.
    const html = render(<Section spacing="tight">x</Section>);
    expect(html).toContain('py-12');
    expect(html).toContain('md:py-16');
    expect(html).toContain('lg:py-20');
    // Locked OUT: the prior values that triggered the regression.
    expect(html).not.toContain('py-10');
    expect(html).not.toContain('lg:py-14');
  });

  it('spacing="comfortable" produces py-16 md:py-20 lg:py-24 (the landing default)', () => {
    const html = render(<Section spacing="comfortable">x</Section>);
    expect(html).toContain('py-16');
    expect(html).toContain('md:py-20');
    expect(html).toContain('lg:py-24');
  });

  it('spacing="spacious" produces py-20 md:py-24 lg:py-32', () => {
    const html = render(<Section spacing="spacious">x</Section>);
    expect(html).toContain('py-20');
    expect(html).toContain('md:py-24');
    expect(html).toContain('lg:py-32');
  });

  it('defaults to spacing="comfortable" when no prop is passed', () => {
    const html = render(<Section>x</Section>);
    expect(html).toContain('py-16');
    expect(html).toContain('md:py-20');
    expect(html).toContain('lg:py-24');
  });
});

describe('Section: tone + divider (LAYOUT §8)', () => {
  it('tone="muted" applies bg-fd-card/30', () => {
    expect(render(<Section tone="muted">x</Section>)).toContain(
      'bg-fd-card/30',
    );
  });

  it('tone="inset" applies bg-fd-card/50 + backdrop-blur-sm', () => {
    const html = render(<Section tone="inset">x</Section>);
    expect(html).toContain('bg-fd-card/50');
    expect(html).toContain('backdrop-blur-sm');
  });

  it('tone="default" applies NO background class (the only "neutral" tone)', () => {
    const html = render(<Section tone="default">x</Section>);
    expect(html).not.toContain('bg-fd-card');
  });

  it('divider="top" applies border-t only', () => {
    const html = render(<Section divider="top">x</Section>);
    expect(html).toContain('border-t');
    expect(html).toContain('border-fd-border');
    expect(html).not.toContain('border-y');
    expect(html).not.toContain('border-b ');
  });

  it('divider="bottom" applies border-b only', () => {
    const html = render(<Section divider="bottom">x</Section>);
    expect(html).toContain('border-b');
    expect(html).not.toContain('border-y');
  });

  it('divider="both" applies border-y', () => {
    const html = render(<Section divider="both">x</Section>);
    expect(html).toContain('border-y');
  });
});

describe('Section: container injection (LAYOUT §7)', () => {
  // LAYOUT §7: pages never own `container mx-auto px-4`. <Section> wraps its
  // children in <Container> so the horizontal padding contract is owned by
  // the primitive, never the page.
  it('always renders a Container child (never edge-to-edge content)', () => {
    const html = render(<Section>x</Section>);
    expect(html).toContain('data-slot="container"');
  });

  it('inner Container carries px-4 sm:px-6 lg:px-8 (the responsive padding from §5)', () => {
    const html = render(<Section>x</Section>);
    expect(html).toContain('px-4');
    expect(html).toContain('sm:px-6');
    expect(html).toContain('lg:px-8');
  });

  it('inner Container defaults to size="content" (max-w-[1024px])', () => {
    const html = render(<Section>x</Section>);
    expect(html).toContain('data-size="content"');
    expect(html).toContain('max-w-[1024px]');
  });

  it('container="wide" forwards to the inner Container (max-w-[1280px])', () => {
    const html = render(<Section container="wide">x</Section>);
    expect(html).toContain('data-size="wide"');
    expect(html).toContain('max-w-[1280px]');
  });

  it('container="full" forwards full-bleed (no horizontal padding)', () => {
    const html = render(<Section container="full">x</Section>);
    expect(html).toContain('data-size="full"');
    expect(html).toContain('max-w-none');
  });
});

describe('Section: element + data attrs', () => {
  it('renders a <section> tag by default (semantic HTML)', () => {
    expect(render(<Section>x</Section>)).toMatch(/^<section\b/);
  });

  it('as="header" renders a <header> tag', () => {
    expect(render(<Section as="header">x</Section>)).toMatch(/^<header\b/);
  });

  it('tags the rendered element with data-slot + data-spacing + data-tone + data-divider', () => {
    const html = render(
      <Section spacing="tight" tone="inset" divider="both">
        x
      </Section>,
    );
    expect(html).toContain('data-slot="section"');
    expect(html).toContain('data-spacing="tight"');
    expect(html).toContain('data-tone="inset"');
    expect(html).toContain('data-divider="both"');
  });
});

// =========================================
// STACK / CLUSTER — LAYOUT §3 (gap scale)
// =========================================

describe('Stack: gap scale (LAYOUT §3)', () => {
  it.each([
    ['xs', 'gap-xs'],
    ['sm', 'gap-sm'],
    ['md', 'gap-md'],
    ['lg', 'gap-lg'],
    ['xl', 'gap-xl'],
    ['2xl', 'gap-2xl'],
  ] as const)('gap="%s" produces DS-token %s', (gap, klass) => {
    expect(render(<Stack gap={gap}>x</Stack>)).toContain(klass);
  });

  it('gap maps to the --spacing tokens, NOT raw Tailwind gap-N', () => {
    // Regression lock: re-keying to the foundation --spacing scale must not
    // revert to Tailwind's default numeric scale.
    const html = render(<Stack gap="md">x</Stack>);
    expect(html).toContain('gap-md');
    expect(html).not.toContain('gap-6');
  });

  it('defaults to vertical (flex-col) + gap="md" (gap-md)', () => {
    const html = render(<Stack>x</Stack>);
    expect(html).toContain('flex-col');
    expect(html).toContain('gap-md');
  });

  it('emits data-gap / data-align / data-justify styling hooks', () => {
    const html = render(
      <Stack gap="lg" align="center" justify="between">
        x
      </Stack>,
    );
    expect(html).toContain('data-gap="lg"');
    expect(html).toContain('data-align="center"');
    expect(html).toContain('data-justify="between"');
  });

  it('direction="horizontal" produces flex-row flex-wrap', () => {
    const html = render(<Stack direction="horizontal">x</Stack>);
    expect(html).toContain('flex-row');
    expect(html).toContain('flex-wrap');
  });
});

describe('Cluster: horizontal sugar (LAYOUT §3)', () => {
  it('is a horizontal Stack with wrap', () => {
    const html = render(<Cluster>x</Cluster>);
    expect(html).toContain('flex-row');
    expect(html).toContain('flex-wrap');
  });

  it('defaults to gap="sm" (gap-sm) and align="center" (chip-row preset)', () => {
    const html = render(<Cluster>x</Cluster>);
    expect(html).toContain('gap-sm');
    expect(html).toContain('items-center');
  });

  it('is data-slot tagged as "cluster" (overrides Stack\'s data-slot)', () => {
    expect(render(<Cluster>x</Cluster>)).toContain('data-slot="cluster"');
  });
});

// =========================================
// SECTION HEADER — LAYOUT §1 (deduplicate the header pattern)
// =========================================

describe('SectionHeader: structure (LAYOUT §1)', () => {
  it('renders the title as an <h2> by default', () => {
    const html = render(<SectionHeader title="Trusted by developers" />);
    expect(html).toContain('<h2');
    expect(html).toContain('Trusted by developers');
    expect(html).toContain('</h2>');
  });

  it('as="h1" / "h3" change the heading level', () => {
    expect(render(<SectionHeader title="t" as="h1" />)).toContain('<h1');
    expect(render(<SectionHeader title="t" as="h3" />)).toContain('<h3');
  });

  it('omits the eyebrow block when no eyebrow prop is passed', () => {
    const html = render(<SectionHeader title="t" />);
    expect(html).not.toContain('mb-4 flex items-center justify-center');
  });

  it('renders the eyebrow above the title when provided', () => {
    const html = render(
      <SectionHeader title="t" eyebrow={<span>Featured</span>} />,
    );
    expect(html).toContain('Featured');
    expect(html).toContain('mb-4 flex items-center justify-center');
  });

  it('omits the tagline <p> when no tagline prop is passed', () => {
    const html = render(<SectionHeader title="t" />);
    expect(html).not.toContain('<p');
  });

  it('tagline carries max-w-prose (locks the §2 prose width contract)', () => {
    const html = render(<SectionHeader title="t" tagline="Body copy" />);
    expect(html).toContain('max-w-prose');
    expect(html).toContain('Body copy');
  });

  it('default alignment is center (text-center on root, mx-auto on the <p>)', () => {
    const html = render(<SectionHeader title="t" tagline="tag" />);
    expect(html).toContain('text-center');
    // [&_p]:mx-auto compiles into the className verbatim
    expect(html).toContain('[&amp;_p]:mx-auto');
  });

  it('align="start" produces text-left (no implicit mx-auto on the <p>)', () => {
    const html = render(<SectionHeader title="t" align="start" />);
    expect(html).toContain('text-left');
    expect(html).not.toContain('text-center');
  });

  it('defaults to spacing="lg" (mb-16)', () => {
    expect(render(<SectionHeader title="t" />)).toContain('mb-16');
  });

  it('spacing="md" produces mb-12', () => {
    expect(render(<SectionHeader title="t" spacing="md" />)).toContain('mb-12');
  });
});

// =========================================
// END-TO-END COMPOSITION — the homepage stats-bar contract
// =========================================

describe('Section + Container composition: the stats-bar contract', () => {
  // This case mirrors the first <Section> on the homepage:
  //   <Section spacing="tight" tone="inset" divider="both" container="content">
  // Locked here so a future Section refactor can't silently drop the inner
  // Container or change the padding scale that prevents edge-to-edge content
  // on the page (the regression that triggered LAYOUT_PHILOSOPHY.md).
  it('the homepage stats-bar pattern produces every contracted class', () => {
    const html = render(
      <Section spacing="tight" tone="inset" divider="both" container="content">
        <div data-testid="content" />
      </Section>,
    );

    // §3 vertical rhythm — tight tier (must still clear §3 desktop floor)
    expect(html).toContain('py-12');
    expect(html).toContain('md:py-16');
    expect(html).toContain('lg:py-20');

    // §8 tone + divider
    expect(html).toContain('bg-fd-card/50');
    expect(html).toContain('backdrop-blur-sm');
    expect(html).toContain('border-y');
    expect(html).toContain('border-fd-border');

    // §7 inner Container exists
    expect(html).toContain('data-slot="container"');
    expect(html).toContain('data-size="content"');

    // §2 + §5 horizontal padding + width cap on the inner Container
    expect(html).toContain('mx-auto');
    expect(html).toContain('w-full');
    expect(html).toContain('px-4');
    expect(html).toContain('sm:px-6');
    expect(html).toContain('lg:px-8');
    expect(html).toContain('max-w-[1024px]');
  });
});
