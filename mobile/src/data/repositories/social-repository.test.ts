import { MareaSupabaseClient } from '../remote/supabase-client';
import { SupabaseSocialRepository } from './social-repository';

function clientWithRpc(rpc: jest.Mock): MareaSupabaseClient {
  return { rpc } as unknown as MareaSupabaseClient;
}

describe('SupabaseSocialRepository.follow', () => {
  it.each(['following', 'requested'] as const)('maps the %s RPC contract', async (status) => {
    const rpc = jest.fn().mockResolvedValue({ data: { status }, error: null });
    const repository = new SupabaseSocialRepository(clientWithRpc(rpc));

    await expect(repository.follow('profile-1', 'operation-1')).resolves.toBe(status);
    expect(rpc).toHaveBeenCalledWith('request_follow', {
      operation_id: 'operation-1',
      target_user_id: 'profile-1',
    });
  });

  it('rejects an unexpected backend response at the remote boundary', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: { state: 'ok' }, error: null });
    const repository = new SupabaseSocialRepository(clientWithRpc(rpc));

    await expect(repository.follow('profile-1', 'operation-1')).rejects.toMatchObject({
      code: 'VALIDATION',
    });
  });
});
