/**
 * VULNERABLE - ADVERSARIAL. The prefix test spelled with `indexOf === 0`, on a
 * file reached through an array index. Same defect, different spelling.
 */
export function acceptFirst(files) {
  if (files[0].type.indexOf('video/') === 0) {
    return transcode(files[0]);
  }
  return null;
}
