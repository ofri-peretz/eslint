/**
 * SAFE - The handle is parked on an instance property and released by the
 * component's own teardown. Same path on both halves.
 */
export class Lightbox {
  open(file) {
    this.previewUrl = URL.createObjectURL(file);
    this.node.src = this.previewUrl;
  }

  destroy() {
    URL.revokeObjectURL(this.previewUrl);
  }
}
