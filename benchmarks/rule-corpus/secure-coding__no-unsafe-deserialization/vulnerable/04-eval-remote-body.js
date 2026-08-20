/**
 * VULNERABLE - `serialize-javascript` output is a JS expression, so the consumer
 * side has to eval it back. Here the expression arrives over the wire, which is
 * remote code execution with extra steps.
 */
import fetch from 'node-fetch';

export async function loadRemoteState(stateUrl) {
  const response = await fetch(stateUrl);
  return eval('(' + (await response.text()) + ')');
}
