/**
 * SAFE - A Web Audio mixer. `level` is a gain value in dB and `mixer.input` is
 * the input channel node. There is no user, no role and no request in this
 * file - the values come from the audio graph itself.
 *
 * The default "user input" pattern is the bare word `input`, and `level` is a
 * watched property name, so the two together report a volume fader.
 */
export function rebalance(mixer, track) {
  const audioTrack = track;

  audioTrack.level = mixer.input.gain.value;
  audioTrack.pan = mixer.input.pan.value;

  return audioTrack;
}
