/**
 * SAFE FOR THIS RULE - ADVERSARIAL. `.href` is genuinely ambiguous on a DOM
 * property assignment: on <a> it navigates, on <link> it loads, and the
 * element is unknown here. The rule deliberately declines it rather than
 * report every anchor in the codebase as mixed content — and `no-http-urls`
 * still reports the cleartext URL, so the family loses nothing.
 */
const link = document.createElement('a');
link.href = 'http://docs.acme-corp.io/guide';
