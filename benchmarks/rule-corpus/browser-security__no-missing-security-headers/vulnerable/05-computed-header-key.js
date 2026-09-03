/** VULNERABLE - the header name arrives through a constant, which is how any
 *  codebase with more than one handler writes it. */
const FRAME_HEADER = 'X-Frame-Options';

export function applyHeaders(res) {
  res.setHeader(FRAME_HEADER, 'DENY');
}
