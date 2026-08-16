/**
 * SAFE - ADVERSARIAL. Calls to functions SPELLED `upload`. The rule used to
 * report every one of them at CWE-434 / CVSS 8.8 purely on the callee's name,
 * with no file, no FileList and no media type anywhere in sight.
 */
import { upload } from './api-client';

export async function saveDraft(draft) {
  await upload(draft);
  await upload(JSON.stringify(draft));
  return upload();
}
