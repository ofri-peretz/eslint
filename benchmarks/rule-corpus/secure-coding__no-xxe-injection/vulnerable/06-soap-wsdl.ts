/**
 * VULNERABLE - A SOAP integration in TypeScript. Express types force the
 * `as string` cast on the query value, and libxmljs2's `parseXmlString` is
 * called with entity substitution switched on.
 */
import type { Request } from 'express';
import libxmljs from 'libxmljs2';

export function describeService(req: Request) {
  const wsdl = req.query.wsdl as string;
  return libxmljs.parseXmlString(wsdl, { noent: true });
}
