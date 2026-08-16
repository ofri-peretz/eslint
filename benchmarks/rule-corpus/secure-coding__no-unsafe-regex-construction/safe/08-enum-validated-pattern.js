/**
 * SAFE - A partial mitigation that IS sufficient: the user chooses a KEY, and
 * the pattern text comes from a closed table the source owns. The request can
 * pick which constant is compiled but cannot contribute a character to it.
 *
 * JUDGEMENT: safe. Contrast with vulnerable/05, where the request contributes
 * pattern TEXT.
 */
const PRESETS = {
  email: '^[^@\\s]+@[^@\\s]+$',
  slug: '^[a-z0-9-]+$',
  uuid: '^[0-9a-f]{8}-[0-9a-f]{4}',
};

export function presetMatcher(req) {
  const preset = PRESETS[req.query.preset] ?? PRESETS.slug;
  return new RegExp(preset, 'i');
}
