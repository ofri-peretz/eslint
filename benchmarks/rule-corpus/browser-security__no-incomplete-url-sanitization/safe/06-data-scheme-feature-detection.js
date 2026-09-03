/**
 * SAFE - A lone `data:` test is feature detection ("is this an inline image?"),
 * not sanitisation. Flagging it would be noise, and the rule only speaks when
 * `javascript:` is explicitly denied and `data:` never mentioned.
 */
export function isInlineImage(src) {
  return src.startsWith('data:image/');
}
