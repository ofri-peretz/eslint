/**
 * SAFE - ADVERSARIAL, and the honest limit of a word-boundary test.
 * A UI event whose payload names a panel and a tab. Nothing personal is
 * transmitted, and no key contains a PII word. The `sensitiveFields`
 * option exists for exactly this, and the default vocabulary is deliberately
 * narrow rather than clever.
 */
analytics.track('Settings Opened', { panel: 'notifications', tab: 'digest' });
