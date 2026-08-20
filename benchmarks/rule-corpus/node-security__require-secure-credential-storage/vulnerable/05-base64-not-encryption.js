/**
 * VULNERABLE - base64 is an encoding, not encryption. The API key is fully
 * recoverable by anyone who reads the storage entry, and the transformation
 * reads as a mitigation to a hurried reviewer, which is what makes this shape
 * worth detecting.
 */
export function rememberApiKey(apiKey) {
  localStorage.setItem('apiKey', btoa(apiKey));
}

export function recallApiKey() {
  return atob(localStorage.getItem('apiKey') ?? '');
}
