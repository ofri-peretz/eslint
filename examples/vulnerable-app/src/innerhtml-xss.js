// FLAGSHIP: browser-security/no-innerhtml · CWE-79 (XSS)
// Assigning unsanitized data to `innerHTML` is the canonical DOM-XSS sink.

export function renderProfile(el, user) {
  // ❌ Vulnerable: user.bio may contain <script> or event handlers.
  el.innerHTML = `<div class="bio">${user.bio}</div>`;
}

export function renderToast(message) {
  const toast = document.createElement('div');
  // ❌ Vulnerable: even when "you control" the message, anything that flowed
  //    from a URL param / fetch response is suspect.
  toast.innerHTML = message;
  document.body.appendChild(toast);
}

// ✅ Safe equivalents:
//   el.textContent = user.bio;
//   const sanitized = DOMPurify.sanitize(message); toast.innerHTML = sanitized;
