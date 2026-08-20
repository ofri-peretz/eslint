/**
 * SAFE - patching a class prototype, the modern spelling of safe/10.
 * Verified: Object.prototype untouched.
 */
export class Widget {
  constructor(name) {
    this.name = name;
  }
}
Widget.prototype.describe = function describe() {
  return this.name;
};
