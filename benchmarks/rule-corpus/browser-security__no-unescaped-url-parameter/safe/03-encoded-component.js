/**
 * SAFE - The remediation the rule's own message asks for. A rule that reports
 * its documented fix teaches users to disable it.
 */
export function searchUrl(term) {
  return `https://api.example.com/v1/search?term=${encodeURIComponent(term)}`;
}
