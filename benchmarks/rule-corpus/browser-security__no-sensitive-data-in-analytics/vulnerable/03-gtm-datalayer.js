/**
 * VULNERABLE - Google Tag Manager. The payload is argument ZERO, and the
 * global is `window.`-prefixed because GTM's own snippet writes it that way.
 */
window.dataLayer.push({
  event: 'lead_submitted',
  phone: form.phone,
});
