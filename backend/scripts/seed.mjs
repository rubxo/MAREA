import { checked, client, environment, fixtureId, login, png } from './lib.mjs';

const env = environment();
const password = process.env.SEED_PASSWORD;
if (!password || password.length < 12) throw new Error('Set an explicit SEED_PASSWORD with at least 12 characters.');
const admin = client(env.url, env.key);
const users = [];
for (let i = 0; i < 6; i++) {
  const id = fixtureId(`user:${i}`);
  const username = `fixture_marea_${i + 1}`;
  const email = `${username}@example.invalid`;
  const existing = await admin.auth.admin.getUserById(id);
  if (existing.data?.user) {
    if (existing.data.user.app_metadata?.fixture !== 'marea-v1') throw new Error(`Reserved fixture ID collision: ${id}`);
    await checked(admin.auth.admin.updateUserById(id, { password }), 'Update fixture password');
  } else {
    if (existing.error && !['user_not_found', 'not_found'].includes(existing.error.code) && existing.error.status !== 404) throw existing.error;
    await checked(admin.auth.admin.createUser({ id, email, password, email_confirm: true, app_metadata: { fixture: 'marea-v1' }, user_metadata: { username, display_name: `Fixture ${i + 1}` } }), 'Create fixture user');
  }
  const avatar = `${id}/fixture-avatar.png`;
  await checked(admin.storage.from('avatars').upload(avatar, png(i, 128, 128), { contentType: 'image/png', upsert: true }));
  await checked(admin.from('profiles').update({ username, display_name: `Fixture ${i + 1}`, bio: 'Datos de prueba creados explícitamente por el comando seed.', avatar_path: avatar, is_private: i >= 4 }).eq('id', id));
  users.push({ id, username, email, session: await login(env, email, password) });
}
for (let i = 0; i < 40; i++) {
  const author = users[i % users.length];
  const id = fixtureId(`post:${i}`);
  const path = `${author.id}/fixture-post-${i}.png`;
  await checked(admin.storage.from('post-media').upload(path, png(i), { contentType: 'image/png', upsert: true }));
  await checked(author.session.rpc('publish_post', { post_id: id, caption_text: `Imagen geométrica de prueba ${i + 1}. #fixture`, media_path: path, media_width: 256, media_height: 256 }));
  // Fixed ordering makes pagination reproducible across repeated runs.
  await checked(admin.from('posts').update({ created_at: new Date(Date.UTC(2026, 0, 1, 12, 0, i)).toISOString() }).eq('id', id));
}
for (let i = 1; i < users.length; i++) {
  await checked(users[0].session.rpc('request_follow', { operation_id: fixtureId(`follow:0:${i}`), target_user_id: users[i].id }));
}
const accepted = await checked(users[1].session.rpc('request_follow', { operation_id: fixtureId('follow:1:4'), target_user_id: users[4].id }));
await checked(users[4].session.rpc('respond_follow_request', { operation_id: fixtureId('accept:1:4'), target_request_id: accepted.requestId, decision: 'accepted' }));
await checked(users[1].session.rpc('set_post_like', { operation_id: fixtureId('like:1:0'), target_post_id: fixtureId('post:0'), liked: true }));
await checked(users[1].session.rpc('create_comment_idempotent', { operation_id: fixtureId('comment:1:0'), comment_id: fixtureId('comment:root'), target_post_id: fixtureId('post:0'), comment_body: 'Comentario de prueba reproducible.' }));
await checked(users[0].session.rpc('create_comment_idempotent', { operation_id: fixtureId('comment:reply'), comment_id: fixtureId('comment:reply:row'), target_post_id: fixtureId('post:0'), parent_comment_id: fixtureId('comment:root'), comment_body: 'Respuesta anidada de prueba.' }));
for (let i = 0; i < users.length; i++) {
  const author = users[i];
  const path = `${author.id}/fixture-story.png`;
  await checked(admin.storage.from('story-media').upload(path, png(i + 40), { contentType: 'image/png', upsert: true }));
  const id = fixtureId(`story:${i}`);
  const existing = await checked(admin.from('stories').select('id').eq('id', id));
  if (!existing.length) await checked(author.session.from('stories').insert({ id, author_id: author.id, storage_path: path, width: 256, height: 256 }));
}
const conversation = await checked(users[0].session.rpc('get_or_create_direct_conversation', { target_username: users[1].username }));
for (let i = 0; i < 4; i++) {
  await checked(users[i % 2].session.rpc('send_message_idempotent', { operation_id: fixtureId(`message-op:${i}`), message_id: fixtureId(`message:${i}`), target_conversation_id: conversation, message_body: `Mensaje de prueba ${i + 1}.` }));
}
await checked(users[0].session.rpc('acknowledge_messages', { target_conversation_id: conversation, through_message_id: fixtureId('message:3'), mark_read: true }));
for (const user of users) await user.session.auth.signOut();
console.log('Fixtures persistidas: 6 usuarios, 40 posts PNG, 6 historias, seguimientos/solicitudes, comentarios y conversación. Ejecutar otra vez conserva las mismas identidades; las historias expiran normalmente.');
console.log('Correos de acceso: fixture_marea_1@example.invalid ... fixture_marea_6@example.invalid. Contraseña: el valor explícito de SEED_PASSWORD (no se imprime).');
