/**
 * SAFE - `queryParams` here holds a parsed POSTGRES CONNECTION URI, supplied
 * by the operator's own configuration. It was reported because its name
 * contains both `query` and `params`.
 *
 * parse-server src/Adapters/Storage/Postgres/PostgresConfigParser.js:30
 */
const fs = require('fs');

function getDatabaseOptionsFromURI(uri) {
  const parsedURI = new URL(uri);
  const queryParams = Object.fromEntries(parsedURI.searchParams);
  const ssl = {};
  if (queryParams.ca) {
    ssl.ca = fs.readFileSync(queryParams.ca).toString();
  }
  return ssl;
}

module.exports = { getDatabaseOptionsFromURI };
