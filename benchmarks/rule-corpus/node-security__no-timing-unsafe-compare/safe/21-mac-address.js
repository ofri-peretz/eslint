/**
 * SAFE (wave 2, name-inference probe) - device enrolment by MAC address.
 *
 * `mac` is in the pattern list because of "message authentication code". A MAC
 * address is printed on the underside of the device and broadcast on every
 * frame the NIC sends.
 */
'use strict';

async function enrolDevice(req, res, fleet) {
  const device = await fleet.lookup(req.params.serial);

  if (req.body.macAddress !== device.macAddress) {
    res.status(409).json({ error: 'device mismatch' });
    return;
  }

  await fleet.markEnrolled(device.id);
  res.json({ ok: true });
}

module.exports = { enrolDevice };
