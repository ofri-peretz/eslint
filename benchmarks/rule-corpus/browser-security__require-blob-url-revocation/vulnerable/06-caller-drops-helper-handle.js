/**
 * VULNERABLE - The helper correctly hands ownership to its caller, and the
 * caller drops it. The defect is at the call site, not in the helper.
 */
import { createPreviewUrl } from './preview';

export function render(file) {
  const preview = createPreviewUrl(file);
  const objectUrl = URL.createObjectURL(file.thumbnail);
  document.querySelector('#big').src = preview;
  document.querySelector('#small').src = objectUrl;
}
