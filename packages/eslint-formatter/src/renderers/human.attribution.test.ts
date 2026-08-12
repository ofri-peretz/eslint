import { describe, expect, it } from 'vitest';
import { attributionLine } from './human';

/**
 * Lock on the attribution footer.
 *
 * This line appears in other people's terminals on every lint run that finds
 * something. Three properties keep it acceptable, and each one is the kind of
 * thing that gets "simplified" away by someone who does not know why it is
 * there — so each is pinned:
 *
 *   1. It is silenceable. A user who does not want it must be able to turn it
 *      off without turning off the formatter.
 *   2. It is exactly one line. A second line makes it an advertisement.
 *   3. It carries no call to action — no "star us", no "please". It names the
 *      project and where the docs are, and stops.
 */
describe('attribution footer', () => {
  it('is present by default', () => {
    expect(attributionLine({})).toBe(
      'Interlace ESLint · https://eslint.interlace.tools',
    );
  });

  it('is silenced by INTERLACE_NO_ATTRIBUTION=1', () => {
    expect(attributionLine({ INTERLACE_NO_ATTRIBUTION: '1' })).toBeNull();
  });

  it('is a single line', () => {
    expect(attributionLine({})).not.toContain('\n');
  });

  it('makes no request of the reader', () => {
    const line = attributionLine({})!.toLowerCase();
    for (const beg of ['star', 'please', 'sponsor', 'follow', 'subscribe', '⭐']) {
      expect(line).not.toContain(beg);
    }
  });
});
