/**
 * SAFE - A WebRTC pre-flight check logging which capture devices the browser
 * granted. There is no personal information anywhere in this file: a boolean
 * saying "the mic is on" is a device capability.
 *
 * This is the known shipped false positive - `phone` is a substring of
 * `microphone`, so a substring test reports "PII in console logs" here.
 */
export async function preflightDevices() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
  const device = {
    microphoneEnabled: stream.getAudioTracks().length > 0,
    cameraEnabled: stream.getVideoTracks().length > 0,
  };

  console.log('capture ready', device.microphoneEnabled);
  return device;
}
