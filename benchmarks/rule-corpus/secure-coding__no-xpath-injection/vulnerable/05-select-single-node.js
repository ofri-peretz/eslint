/**
 * VULNERABLE - The MSXML-style API surfaced by xmldom-xpath and by every
 * SharePoint/SOAP client. `login` is a function parameter, so its provenance is
 * whatever the caller passes - which in this file is the route handler.
 */
const { parseXml } = require('../lib/xml');

function memberNode(doc, login) {
  return doc.selectSingleNode("//members/member[login='" + login + "']");
}

exports.handler = function handler(req, res) {
  const doc = parseXml(req.app.locals.directoryXml);
  res.json({ node: memberNode(doc, req.query.login)?.textContent ?? null });
};
