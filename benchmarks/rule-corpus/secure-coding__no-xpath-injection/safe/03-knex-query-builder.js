/**
 * SAFE - A SQL query builder. `query`, `select` and `searchTerm` are the natural
 * vocabulary here and none of them touches XML. The value is bound as a
 * parameter, which is the correct remediation for the OTHER injection class.
 */
const knex = require('../lib/knex');

exports.findMembers = function findMembers(searchTerm, req) {
  const queryBuilder = knex('members').select('id', 'login').where('login', 'like', `%${searchTerm}%`);
  return queryBuilder.orderBy(req.query.sort === 'login' ? 'login' : 'id');
};
