// FLAGSHIP: mongodb-security/no-unsafe-query · CWE-943 (NoSQL Injection)
// Passing untrusted input directly into a Mongo $where (or operator-bearing
// object) lets the attacker craft arbitrary query operators.

import mongoose from 'mongoose';
const User = mongoose.model('User');

export async function findUser(payload) {
  // ❌ Vulnerable: payload may contain $gt / $ne / $regex etc., bypassing the intended filter.
  return await User.findOne({ username: payload.username });
}

export async function dangerousWhereQuery(rawQuery) {
  // ❌ Even worse: $where lets the attacker run arbitrary JS on the DB server.
  return await User.find({ $where: rawQuery });
}
