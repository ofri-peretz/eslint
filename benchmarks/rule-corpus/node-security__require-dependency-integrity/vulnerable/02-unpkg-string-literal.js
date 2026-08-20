/**
 * VULNERABLE - the tag lives in a plain single-quoted string rather than a
 * template, which is how a build step that concatenates its output writes it.
 * unpkg serves whatever the package publishes; without a hash the page has no
 * way to notice a substitution.
 */
const HEAD_SCRIPTS =
  '<script src="https://unpkg.com/htmx.org@1.9.10/dist/htmx.min.js" defer></script>';

export function renderDocument(bodyHtml, title) {
  return (
    '<!doctype html><html><head><title>' +
    title +
    '</title>' +
    HEAD_SCRIPTS +
    '</head><body>' +
    bodyHtml +
    '</body></html>'
  );
}
