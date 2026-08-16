/** SAFE - ADVERSARIAL. The frame-busting guard written as a LOCATION
 *  comparison rather than a window comparison, and with the redirect inside a
 *  callback. Both halves are the remediation. */
if (window.top.location !== window.self.location) {
  setTimeout(() => {
    top.location = self.location;
  }, 0);
}
