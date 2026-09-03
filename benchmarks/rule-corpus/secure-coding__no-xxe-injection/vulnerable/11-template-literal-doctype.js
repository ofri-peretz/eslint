/**
 * VULNERABLE - ADVERSARIAL. The same declared SYSTEM entity as vulnerable/09,
 * written as a template literal because the document spans lines - which is how
 * every multi-line XML string in JavaScript is actually written.
 */
import libxmljs from 'libxmljs2';

export function buildBranding(req) {
  const document = `<!DOCTYPE branding [
  <!ENTITY logo SYSTEM "${req.query.logoUrl}">
]>
<branding>&logo;</branding>`;

  return libxmljs.parseXml(document, { noent: true });
}
