/**
 * VULNERABLE - The application builds the DOCTYPE itself and lets the request
 * choose the SYSTEM target, then parses the result with entity substitution on.
 * This is CWE-611's SSRF arm: the parser performs the fetch.
 */
import libxmljs from 'libxmljs2';

export function renderReport(req) {
  const doctype = '<!DOCTYPE report [<!ENTITY logo SYSTEM "' + req.query.logoUrl + '">]>';
  return libxmljs.parseXml(`${doctype}<report>&logo;</report>`, { noent: true });
}
