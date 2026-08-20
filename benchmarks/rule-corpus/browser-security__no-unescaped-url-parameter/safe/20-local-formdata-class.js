/**
 * SAFE (wave 2) - A local class named `FormData`. Exact membership on the
 * constructor's spelling, without checking that the binding is the
 * environment's, is a name test wearing a `Set`.
 */
class FormData {
  constructor(defaults) {
    this.defaults = defaults;
  }
  get(key) {
    return this.defaults[key];
  }
}

const preset = new FormData({ plan: 'pro' });

export function planUrl() {
  return `https://api.example.com/v1/checkout?plan=${preset.get('plan')}`;
}
