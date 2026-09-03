/**
 * ADVERSARIAL, false-negative direction — the test nobody runs.
 *
 * This is fixture 02 with every identifier renamed to something that carries no
 * security connotation at all: no `req`, no `query`, no `user`, no `input`,
 * no `pattern`. The vulnerability is byte-for-byte the same. If detection dies
 * here, the rule was reading names rather than evidence — the defect class the
 * repo's CLAUDE.md puts first.
 */
export function summarise(envelope, catalogue) {
  const seed = envelope.payload.needle;
  const probe = new RegExp(`.*${seed}.*`, 'i');

  return catalogue.filter((entry) => probe.test(entry.label));
}
