/**
 * SAFE - Directive registration with literal names, which is how every real
 * Vue plugin registers. The request never chooses which directive exists.
 */
const Vue = require('vue');

Vue.directive('tooltip', {
  mounted(el, binding) {
    el.setAttribute('title', String(binding.value));
  },
});

Vue.directive('focus', {
  mounted(el) {
    el.focus();
  },
});

module.exports = { Vue };
