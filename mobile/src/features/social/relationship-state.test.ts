import {
  beginFollow,
  beginUnfollow,
  decideFollowRequest,
  rollbackRelationship,
} from './relationship-state';

describe('optimistic social relationship state', () => {
  const initial = {
    relationship: 'none' as const,
    followerCount: 12,
    pending: null,
  };

  it('moves a public account directly to following', () => {
    expect(beginFollow(initial, false, 'op-public')).toEqual({
      relationship: 'following',
      followerCount: 13,
      pending: {
        operationId: 'op-public',
        previousRelationship: 'none',
        previousFollowerCount: 12,
      },
    });
  });

  it('moves a private account to requested without changing followers', () => {
    expect(beginFollow(initial, true, 'op-private')).toEqual({
      relationship: 'requested',
      followerCount: 12,
      pending: {
        operationId: 'op-private',
        previousRelationship: 'none',
        previousFollowerCount: 12,
      },
    });
  });

  it('rolls back only the matching failed operation', () => {
    const pending = beginUnfollow(
      { relationship: 'following', followerCount: 13, pending: null },
      'op-unfollow',
    );

    expect(rollbackRelationship(pending, 'another-operation')).toBe(pending);
    expect(rollbackRelationship(pending, 'op-unfollow')).toEqual({
      relationship: 'following',
      followerCount: 13,
      pending: null,
    });
  });

  it.each([
    ['accepted', 'accepted'],
    ['rejected', 'rejected'],
  ] as const)('records a %s follow request decision', (_label, decision) => {
    expect(decideFollowRequest({ id: 'request-1', status: 'pending' }, decision)).toEqual({
      id: 'request-1',
      status: decision,
    });
  });
});
