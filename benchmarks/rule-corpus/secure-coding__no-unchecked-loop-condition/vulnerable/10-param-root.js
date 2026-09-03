/**
 * VULNERABLE - The bound arrives as a FUNCTION PARAMETER. The HTTP layer lives
 * in another file; this service just trusts the number it is handed.
 *
 * Semantically identical to 01 and 02 — an unclamped attacker-chosen iteration
 * count. Only the spelling of the taint root differs.
 */
class ThumbnailService {
  generateSeries(sourceImage, frameCount) {
    const frames = [];
    for (let frame = 0; frame < frameCount; frame++) {
      frames.push(this.renderFrame(sourceImage, frame));
    }
    return frames;
  }
}

module.exports = { ThumbnailService };
