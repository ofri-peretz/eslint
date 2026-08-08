// CWE-116: Broken sanitizer — single-pass, non-global replace()
// @author      claude-fable-5
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-07-31
// This MUST be detected — a string-argument replace() removes only the FIRST match, so "<scr<script>ipt>" survives
function stripScripts(input) {
  return input.replace('<script>', '').replace('</script>', '');
}

function renderBio(container, req) {
  container.innerHTML = stripScripts(req.body.bio);
}
