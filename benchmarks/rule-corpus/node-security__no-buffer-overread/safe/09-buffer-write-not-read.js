/**
 * SAFE for CWE-126 - a buffer OVERWRITE, not an overread. Writing past the end
 * is CWE-787, a different weakness with a different fix; reporting both under
 * one id tells the reader the wrong thing about what is wrong.
 */
import { Buffer } from 'node:buffer';

export function toLatin1(text) {
  const out = Buffer.alloc(text.length);
  for (let i = 0; i < text.length; i += 1) {
    out[i] = text.charCodeAt(i) & 0xff;
  }
  return out;
}
