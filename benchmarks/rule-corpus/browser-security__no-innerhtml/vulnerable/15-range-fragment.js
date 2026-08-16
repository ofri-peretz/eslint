/**
 * VULNERABLE - createContextualFragment parses HTML exactly like innerHTML.
 */
const range = document.createRange();
const frag = range.createContextualFragment(userSuppliedMarkup);
host.append(frag);
