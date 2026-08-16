/**
 * SAFE - The leading operand fixes the scheme and host. Nothing appended after
 * it can retarget the navigation, however attacker-chosen it is.
 */
location.href = 'https://app.acme-corp.io/go?next=' + encodeURIComponent(location.search);
