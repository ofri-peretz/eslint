/**
 * SAFE - ADVERSARIAL. A server-side DTO serialiser. The branch decides whether
 * an OPTIONAL FIELD is present in the response body; it grants nothing, denies
 * nothing, and cannot be bypassed because there is nothing behind it.
 */
export function toMemberDto(member) {
  const dto = { id: member.id, email: member.email };

  if (member.role) {
    dto.role = member.role;
  }

  return dto;
}
