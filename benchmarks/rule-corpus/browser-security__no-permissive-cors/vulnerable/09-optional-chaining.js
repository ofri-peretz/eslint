/** VULNERABLE - the same wildcard through an optional call. */
export function openCors(res) {
  res?.setHeader('Access-Control-Allow-Origin', '*');
}
