/** VULNERABLE - a table of headers applied in a loop, with the security ones
 *  simply absent from the table. */
const HEADERS = [
  ['Content-Type', 'text/html'],
  ['Cache-Control', 'no-store'],
];

export function applyAll(res) {
  res.setHeader(HEADERS[0][0], HEADERS[0][1]);
  res.setHeader(HEADERS[1][0], HEADERS[1][1]);
}
