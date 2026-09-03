/** SAFE - the classic JavaScript remediation. The assignment to the parent
 *  location is the FIX, gated by the frame check; reporting it would be the
 *  rule flagging its own remediation. */
if (top !== self) {
  top.location = self.location;
}
