// CWE-943: NoSQL injection — $where with string-built JS
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-05-10
// This MUST be detected — $where evaluates JS, attacker-controlled name escapes
async function searchByName(req) {
  return db.collection('items').find({
    $where: `this.name == '${req.query.name}'`,
  }).toArray();
}
