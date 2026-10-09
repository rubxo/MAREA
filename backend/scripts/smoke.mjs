import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { checked, client, environment, login, png } from './lib.mjs';

const env = environment();
const admin = client(env.url, env.key);
const run = randomUUID().replaceAll('-', '').slice(0, 12);
const password = `${randomUUID()}Aa1!`;
const users = [];
const uploads = [];
const conversations = [];
const channels = [];
let assertions = 0;
function pass(label) { assertions++; console.log(`PASS ${label}`); }
async function rpc(session, name, args = {}) { return checked(session.rpc(name, args), name); }
async function upload(session, bucket, path, bytes = png()) {
  await checked(session.storage.from(bucket).upload(path, bytes, { contentType: 'image/png' }), 'Upload PNG');
  uploads.push({ bucket, path });
}
function eventPromise(channel, type, filter, match) {
  let timer;
  const promise = new Promise((resolve, reject) => {
    timer = setTimeout(() => reject(new Error(`Realtime ${type} ${filter.table ?? filter.event} ${filter.event} timed out after 15 seconds (${channel.topic})`)), 15000);
    channel.on(type, filter, payload => { if (match(payload)) { clearTimeout(timer); resolve(payload); } });
  });
  // Avoid an unhandled rejection if the RPC preceding the await fails.
  promise.catch(() => {});
  return promise;
}
async function subscribe(session, channel) {
  channels.push({ session, channel });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Realtime subscription timed out')), 15000);
    channel.subscribe((status, error) => {
      if (status === 'SUBSCRIBED') { clearTimeout(timer); resolve(); }
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') { clearTimeout(timer); reject(error ?? new Error(status)); }
    });
  });
  // The local Realtime join acknowledgement can precede registration of the
  // postgres_changes replication filter by a fraction of a second.
  await new Promise(resolve => setTimeout(resolve, 500));
}
try {
  for (let i = 0; i < 2; i++) {
    const id = randomUUID();
    const username = `smoke_${run}_${i}`;
    const email = `${username}@example.invalid`;
    await checked(admin.auth.admin.createUser({ id, email, password, email_confirm: true, app_metadata: { smoke_run: run }, user_metadata: { username, display_name: `Smoke ${i}` } }), 'Create isolated smoke user');
    users.push({ id, username, email });
    users[i].session = await login(env, email, password);
    const identity = await checked(users[i].session.auth.getUser());
    assert.equal(identity.user.id, id);
  }
  const [alice, bob] = users;
  pass('Two independent authenticated user sessions');

  const avatarPath = `${alice.id}/${randomUUID()}.png`;
  const avatarBytes = png(7, 128, 128);
  await upload(alice.session, 'avatars', avatarPath, avatarBytes);
  await checked(alice.session.from('profiles').update({ avatar_path: avatarPath }).eq('id', alice.id));
  const avatarUrl = await checked(bob.session.storage.from('avatars').createSignedUrl(avatarPath, 60));
  const avatarResponse = await fetch(avatarUrl.signedUrl);
  assert.equal(avatarResponse.status, 200);
  assert.deepEqual(Buffer.from(await avatarResponse.arrayBuffer()), avatarBytes);
  pass('Authenticated avatar upload, profile update and signed image bytes');

  await checked(bob.session.from('profiles').update({ is_private: true }).eq('id', bob.id));
  const postId = randomUUID();
  const postPath = `${bob.id}/${postId}.png`;
  const bytes = png(12);
  await upload(bob.session, 'post-media', postPath, bytes);
  const publish = { post_id: postId, caption_text: `Smoke ${run}`, media_path: postPath, media_width: 256, media_height: 256 };
  assert.equal(await rpc(bob.session, 'publish_post', publish), postId);
  assert.equal(await rpc(bob.session, 'publish_post', publish), postId);
  const media = await checked(bob.session.from('post_media').select('id').eq('post_id', postId));
  assert.equal(media.length, 1);
  assert.equal(await rpc(alice.session, 'get_post', { target_id: postId }), null);
  assert.ok((await alice.session.storage.from('post-media').createSignedUrl(postPath, 60)).error);
  pass('Real PNG upload, idempotent publication and private post/Storage denial');

  const rejected = await rpc(alice.session, 'request_follow', { operation_id: randomUUID(), target_user_id: bob.id });
  assert.equal(rejected.status, 'requested');
  const rejection = { operation_id: randomUUID(), target_request_id: rejected.requestId, decision: 'rejected' };
  assert.deepEqual(await rpc(bob.session, 'respond_follow_request', rejection), await rpc(bob.session, 'respond_follow_request', rejection));
  assert.equal(await rpc(alice.session, 'get_post', { target_id: postId }), null);
  const requested = await rpc(alice.session, 'request_follow', { operation_id: randomUUID(), target_user_id: bob.id });
  assert.notEqual(requested.requestId, rejected.requestId);
  const approval = { operation_id: randomUUID(), target_request_id: requested.requestId, decision: 'accepted' };
  assert.deepEqual(await rpc(bob.session, 'respond_follow_request', approval), await rpc(bob.session, 'respond_follow_request', approval));
  assert.equal((await rpc(alice.session, 'get_post', { target_id: postId })).id, postId);
  const signed = await checked(alice.session.storage.from('post-media').createSignedUrl(postPath, 60));
  const response = await fetch(signed.signedUrl);
  assert.equal(response.status, 200);
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes);
  assert.ok((await rpc(alice.session, 'list_posts', { feed_only: true })).some(post => post.id === postId));
  pass('Private follow rejection, retry/acceptance, authenticated feed and signed image bytes');

  const like = { operation_id: randomUUID(), target_post_id: postId, liked: true };
  const likes = await Promise.all([rpc(alice.session, 'set_post_like', like), rpc(alice.session, 'set_post_like', like)]);
  assert.deepEqual(likes[0], likes[1]);
  const commentId = randomUUID();
  const comment = { operation_id: randomUUID(), comment_id: commentId, target_post_id: postId, comment_body: 'Actual integration comment' };
  await Promise.all([rpc(alice.session, 'create_comment_idempotent', comment), rpc(alice.session, 'create_comment_idempotent', comment)]);
  await rpc(bob.session, 'create_comment_idempotent', { operation_id: randomUUID(), comment_id: randomUUID(), target_post_id: postId, comment_body: 'Nested reply', parent_comment_id: commentId });
  const post = await rpc(alice.session, 'get_post', { target_id: postId });
  assert.equal(post.likeCount, 1);
  assert.equal(post.commentCount, 2);
  assert.equal(post.viewerHasLiked, true);
  const activity = await checked(bob.session.from('activities').select('kind,entity_id').eq('actor_id', alice.id));
  assert.equal(activity.filter(row => row.kind === 'like' && row.entity_id === postId).length, 1);
  assert.equal(activity.filter(row => row.kind === 'comment' && row.entity_id === commentId).length, 1);
  await rpc(alice.session, 'set_post_like', { operation_id: randomUUID(), target_post_id: postId, liked: false });
  assert.equal((await rpc(alice.session, 'get_post', { target_id: postId })).likeCount, 0);
  pass('Concurrent like/comment idempotency, nested reply, unlike and single activities');

  const conversation = await rpc(alice.session, 'get_or_create_direct_conversation', { target_username: bob.username });
  conversations.push(conversation);
  assert.equal(await rpc(bob.session, 'get_or_create_direct_conversation', { target_username: alice.username }), conversation);
  const messageId = randomUUID();
  const incoming = bob.session.channel(`smoke-message:${run}`);
  const messageEvent = eventPromise(incoming, 'postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversation}` }, payload => payload.new.id === messageId);
  await subscribe(bob.session, incoming);
  const outgoing = alice.session.channel(`smoke-receipt:${run}`);
  const receiptEvent = eventPromise(outgoing, 'postgres_changes', { event: 'UPDATE', schema: 'public', table: 'message_receipts', filter: `message_id=eq.${messageId}` }, payload => Boolean(payload.new.read_at));
  await subscribe(alice.session, outgoing);
  const message = { operation_id: randomUUID(), message_id: messageId, target_conversation_id: conversation, message_body: 'Real WebSocket smoke message' };
  await Promise.all([rpc(alice.session, 'send_message_idempotent', message), rpc(alice.session, 'send_message_idempotent', message)]);
  assert.equal((await messageEvent).new.sender_id, alice.id);
  assert.equal((await checked(bob.session.from('messages').select('id').eq('id', messageId))).length, 1);
  assert.equal((await rpc(bob.session, 'get_chat_inbox')).find(row => row.conversation_id === conversation).unread_count, 1);
  await rpc(bob.session, 'acknowledge_messages', { target_conversation_id: conversation, through_message_id: messageId, mark_read: false });
  let receipt = await checked(alice.session.from('message_receipts').select('*').eq('message_id', messageId).single());
  assert.ok(receipt.delivered_at);
  assert.equal(receipt.read_at, null);
  await rpc(bob.session, 'acknowledge_messages', { target_conversation_id: conversation, through_message_id: messageId, mark_read: true });
  assert.ok((await receiptEvent).new.read_at);
  receipt = await checked(alice.session.from('message_receipts').select('*').eq('message_id', messageId).single());
  assert.ok(receipt.read_at);
  assert.equal((await rpc(bob.session, 'get_chat_inbox')).find(row => row.conversation_id === conversation).unread_count, 0);
  const replyId = randomUUID();
  const replyChannel = alice.session.channel(`smoke-reply:${run}`);
  const replyEvent = eventPromise(replyChannel, 'postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversation}` }, payload => payload.new.id === replyId);
  await subscribe(alice.session, replyChannel);
  await rpc(bob.session, 'send_message_idempotent', { operation_id: randomUUID(), message_id: replyId, target_conversation_id: conversation, message_body: 'Real reply from the second session' });
  assert.equal((await replyEvent).new.sender_id, bob.id);
  const updatedInbox = (await rpc(alice.session, 'get_chat_inbox')).find(row => row.conversation_id === conversation);
  assert.equal(updatedInbox.last_message_id, replyId);
  assert.equal(updatedInbox.unread_count, 1);
  pass('Bidirectional WebSocket messages and read receipt, idempotent send, delivery/read and updated inbox');

  const typingReceiver = bob.session.channel(`conversation:${conversation}`, { config: { private: true } });
  const typingEvent = eventPromise(typingReceiver, 'broadcast', { event: 'typing' }, event => event.payload.userId === alice.id);
  await subscribe(bob.session, typingReceiver);
  const typingSender = alice.session.channel(`conversation:${conversation}`, { config: { private: true, broadcast: { ack: true } } });
  await subscribe(alice.session, typingSender);
  assert.equal(await typingSender.send({ type: 'broadcast', event: 'typing', payload: { userId: alice.id, isTyping: true } }), 'ok');
  assert.equal((await typingEvent).payload.isTyping, true);
  pass('Private authenticated Realtime typing broadcast across sessions');

  const storyId = randomUUID();
  const storyPath = `${bob.id}/${storyId}.png`;
  await upload(bob.session, 'story-media', storyPath);
  const story = await checked(bob.session.from('stories').insert({ id: storyId, author_id: bob.id, storage_path: storyPath, width: 256, height: 256, created_at: '2000-01-01T00:00:00Z', expires_at: '2099-01-01T00:00:00Z' }).select('*').single());
  assert.equal(Date.parse(story.expires_at) - Date.parse(story.created_at), 24 * 60 * 60 * 1000);
  assert.ok(Math.abs(Date.parse(story.created_at) - Date.now()) < 60000);
  assert.equal((await checked(alice.session.from('stories').select('id').eq('id', storyId))).length, 1);
  await checked(alice.session.from('story_views').insert({ story_id: storyId, viewer_id: alice.id }));
  const now = Date.now();
  // Only this smoke-owned record is time-shifted; authenticated clients cannot update lifetime.
  await checked(admin.from('stories').update({ created_at: new Date(now - 25 * 3600000).toISOString(), expires_at: new Date(now - 3600000).toISOString() }).eq('id', storyId));
  assert.equal((await checked(alice.session.from('stories').select('id').eq('id', storyId))).length, 0);
  assert.ok((await alice.session.storage.from('story-media').createSignedUrl(storyPath, 60)).error);
  pass('Server-owned 24h story lifetime, persisted view and expired story/Storage denial');
  console.log(`Backend smoke passed: ${assertions} groups. Real Auth, Postgres, private Storage and Realtime; no device/FPS/offline claim.`);
} finally {
  let cleanupFailed = false;
  async function clean(promise, label) {
    try { await checked(promise, label); } catch (error) { cleanupFailed = true; console.error(error.message); }
  }
  for (const { session, channel } of channels) await session.removeChannel(channel);
  for (const { bucket, path } of uploads) await clean(admin.storage.from(bucket).remove([path]), 'Remove smoke image');
  for (const id of conversations) await clean(admin.from('conversations').delete().eq('id', id), 'Remove smoke conversation');
  for (const user of users) {
    if (user.session) await user.session.auth.signOut();
    await clean(admin.auth.admin.deleteUser(user.id), `Remove smoke user ${user.id}`);
  }
  if (cleanupFailed) process.exitCode = 1;
}
