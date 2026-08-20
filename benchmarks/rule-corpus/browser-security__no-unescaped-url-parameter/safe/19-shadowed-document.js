/**
 * SAFE (wave 2) - A local `document` that is a parsed content model, not the
 * DOM. Its `getElementById` returns a plain object this module built, so the
 * value is the module's own.
 */
export function renderUrl(document) {
  const node = document.getElementById('title');
  return `https://render.example.com/v1/page?title=${node.value}`;
}
