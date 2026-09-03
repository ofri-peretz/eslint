/**
 * SAFE - The shipped false positive. `phone` lives inside `microphone`, and a
 * substring check reported a device-capability flag as a privacy violation.
 */
analytics.track('Device Capabilities', {
  microphoneEnabled: true,
  headphonesConnected: false,
});
