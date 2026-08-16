/**
 * SAFE - A class IMPLEMENTING a serialization protocol and chaining to its base.
 * The argument is the framework's own context object, never attacker data. This
 * is what webpack's whole lib/serialization tree looks like.
 */
import { Dependency } from './dependency.js';

export class CssModuleDependency extends Dependency {
  deserialize(context) {
    super.deserialize(context);
    this.identifier = context.read();
    return this;
  }

  static deserialize(context) {
    const dep = new CssModuleDependency();
    dep.deserialize(context);
    return dep;
  }
}
