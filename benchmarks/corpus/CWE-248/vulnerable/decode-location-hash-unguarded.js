// CWE-248: the page decodes its own location hash with no try/catch.
// @author       claude
// @reviewedBy    benchmark-validator
// @lastReviewed  2026-11-25
// A link to #%E0%A4%A throws URIError before the router renders anything.
function currentTab() {
  return decodeURIComponent(location.hash.slice(1));
}

module.exports = { currentTab };
