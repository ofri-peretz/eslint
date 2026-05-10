// CWE-943: NoSQL — safe, user input wrapped in $eq
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-05-10
// This MUST NOT fire — $eq forces value-equality, blocks operator injection
async function login(req, res) {
  const user = await db.collection('users').findOne({
    username: { $eq: String(req.body.username) },
    password: { $eq: String(req.body.password) },
  });
  return user;
}
