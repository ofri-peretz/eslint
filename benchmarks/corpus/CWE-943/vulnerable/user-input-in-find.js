// CWE-943: NoSQL injection — user input flowing directly into find()
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-05-10
// This MUST be detected — req.body.username can carry { $ne: null } to bypass auth
async function login(req, res) {
  const user = await db.collection('users').findOne({
    username: req.body.username,
    password: req.body.password,
  });
  return user;
}
