/**
 * SAFE - A constant XPath. `//` is the descendant axis and appears in
 * essentially every XPath ever written; a fixed expression has nothing to inject
 * into.
 */
const xpath = require('xpath');
const { directory } = require('../lib/directory');

const ACTIVE_MEMBERS = '//staff/member[@active=1]/text()';

exports.activeMembers = function activeMembers() {
  return xpath.select(ACTIVE_MEMBERS, directory());
};
