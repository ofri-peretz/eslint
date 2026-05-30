/**
 * Interlace-domain drift — eslint variant.
 *
 * Asserts that every `https://*.interlace.{dev,tools,com}` URL in
 * `content/docs/**.mdx` either points at this site's canonical origin
 * (`SITE_ORIGIN` from `lib/site-config.ts`) or to an explicitly allowlisted
 * sibling site (`SIBLING_ORIGINS`). Catches the failure mode this whole
 * Wave 8 cleanup was prompted by — `interlace.dev` references staying in
 * docs long after the brand apex moved to `interlace.tools` and the products
 * to `*.interlace.tools`.
 */

import { describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import { validateInterlaceDomainDrift } from '../../.interlace/validators/interlace-domain-drift';
import { SITE_ORIGIN, SIBLING_ORIGINS } from '../lib/site-config';

describe('interlace-domain drift (eslint content/docs)', () => {
  it('every https://*.interlace.{dev,tools,com} URL is canonical or allowlisted', async () => {
    const findings = await validateInterlaceDomainDrift({
      contentRoot: resolve(__dirname, '..', '..', 'content', 'docs'),
      canonicalOrigin: SITE_ORIGIN,
      allowedOrigins: SIBLING_ORIGINS,
    });

    if (findings.length > 0) {
      console.error('Interlace domain drift findings:', findings);
    }

    expect(findings).toEqual([]);
  });
});
