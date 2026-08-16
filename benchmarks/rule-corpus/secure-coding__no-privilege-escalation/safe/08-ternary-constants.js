/**
 * SAFE - The role is chosen by the server from two literals. The request body
 * is not in the expression at all; ownership is established from the session.
 */
export function assignWorkspaceRole(workspace, session) {
  const membership = { userId: session.userId };

  membership.role = workspace.ownerId === session.userId ? 'owner' : 'member';

  return membership;
}
