/**
 * SAFE - The leading operand fixes the scheme and host, so nothing appended
 * after it can retarget the navigation.
 */
window.open('https://app.acme-corp.io/preview?src=' + encodeURIComponent(location.search));
