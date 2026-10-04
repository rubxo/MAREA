export type Relationship = 'none' | 'requested' | 'following';

type PendingRelationship = Readonly<{
  operationId: string;
  previousRelationship: Relationship;
  previousFollowerCount: number;
}>;

export type RelationshipState = Readonly<{
  relationship: Relationship;
  followerCount: number;
  pending: PendingRelationship | null;
}>;

export type FollowRequestState = Readonly<{
  id: string;
  status: 'pending' | 'accepted' | 'rejected';
}>;

function transition(
  state: RelationshipState,
  relationship: Relationship,
  followerCount: number,
  operationId: string,
): RelationshipState {
  if (state.pending) return state;

  return {
    relationship,
    followerCount,
    pending: {
      operationId,
      previousRelationship: state.relationship,
      previousFollowerCount: state.followerCount,
    },
  };
}

export function beginFollow(
  state: RelationshipState,
  isPrivate: boolean,
  operationId: string,
): RelationshipState {
  if (state.relationship !== 'none') return state;
  return transition(
    state,
    isPrivate ? 'requested' : 'following',
    state.followerCount + (isPrivate ? 0 : 1),
    operationId,
  );
}

export function beginUnfollow(
  state: RelationshipState,
  operationId: string,
): RelationshipState {
  if (state.relationship === 'none') return state;
  const removedFollower = state.relationship === 'following' ? 1 : 0;
  return transition(state, 'none', Math.max(0, state.followerCount - removedFollower), operationId);
}

export function confirmRelationship(
  state: RelationshipState,
  operationId: string,
  relationship = state.relationship,
): RelationshipState {
  if (state.pending?.operationId !== operationId) return state;
  return { ...state, relationship, pending: null };
}

export function rollbackRelationship(
  state: RelationshipState,
  operationId: string,
): RelationshipState {
  if (state.pending?.operationId !== operationId) return state;
  return {
    relationship: state.pending.previousRelationship,
    followerCount: state.pending.previousFollowerCount,
    pending: null,
  };
}

export function decideFollowRequest(
  request: FollowRequestState,
  decision: 'accepted' | 'rejected',
): FollowRequestState {
  if (request.status !== 'pending') return request;
  return { ...request, status: decision };
}
