/**
 * SAFE - ADVERSARIAL. A test double and a media library that both expose a
 * `createObjectURL` method. The property name matched; the receiver is what
 * makes it the platform's `URL`.
 */
import { mediaKit } from './media-kit';

const fakeUrl = { createObjectURL: (b) => `blob:test/${b.size}` };

export function stubbedPreview(blob) {
  const a = fakeUrl.createObjectURL(blob);
  const b = mediaKit.createObjectURL(blob);
  return [a, b];
}
