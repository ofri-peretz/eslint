/**
 * SAFE FOR THIS RULE - A cross-frame `postMessage` body. Also a real
 * vulnerability, also owned by `no-eval`. `window.addEventListener('message')`
 * is the same handler SHAPE as a socket's; the receiver is what separates them.
 */
window.addEventListener('message', (event) => {
  eval(event.data.command);
});
