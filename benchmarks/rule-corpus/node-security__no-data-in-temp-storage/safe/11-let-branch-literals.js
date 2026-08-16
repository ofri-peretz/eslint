/**
 * SAFE (adversarial) - a `let` whose every write is a literal, none of them a
 * temp path. The binding is reassigned, which is the shape that defeats a rule
 * reading only the declarator, but nothing here reaches shared temp storage.
 */
const fs = require('node:fs');

function writeReport(isDraft, body) {
  let target = './reports/final.html';
  if (isDraft) target = './reports/draft.html';
  fs.writeFileSync(target, body);
  return target;
}

module.exports = { writeReport };
