/**
 * VULNERABLE - ADVERSARIAL. Google Tag Manager's transport is
 * `dataLayer.push`, which is not `analytics.*` and is not `gtag`. The rule's
 * own docs list non-standard libraries as a known false negative whose only
 * mitigation is "review it by hand".
 */
window.dataLayer.push({ event: 'page_view', page: location.pathname });
