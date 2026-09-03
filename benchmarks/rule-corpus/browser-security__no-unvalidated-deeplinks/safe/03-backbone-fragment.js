/**
 * SAFE - Backbone's `router.navigate(fragment)` sets an in-app history
 * fragment. All seven corpus findings for this rule were this shape.
 */
const pollUrl = 'signin/poll';
router.navigate(pollUrl, { trigger: true });
