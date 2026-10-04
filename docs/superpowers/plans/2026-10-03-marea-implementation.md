# Marea Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir una red social de fotografía completa, demostrable en Expo Go, con Supabase separado, offline-first, caché LRU controlable, Realtime y documentación de defensa.

**Architecture:** Expo Router organiza la UI por rutas y features; casos de uso consumen repositorios que combinan SQLite y Supabase. Las escrituras optimistas se confirman localmente junto con una operación idempotente y un SyncManager único las reconcilia con el backend.

**Tech Stack:** Expo SDK 57, React Native, TypeScript strict, Expo Router, Expo SQLite/FileSystem/Image/ImagePicker, Supabase JS/PostgreSQL/Auth/Storage/Realtime, Jest.

**Spec:** `docs/superpowers/specs/2026-10-03-marea-design.md`

## Global Constraints

- La versión principal debe abrir en Expo Go con `npx expo start`; no se permite código nativo personalizado.
- Frontend en `mobile/` y backend Supabase en `backend/`; no se mezcla SQL ni service role con React.
- TypeScript usa `strict`; no se admite `any` salvo una frontera documentada e inevitable.
- Scheme canónico `marea://`; en Expo Go se prueba la ruta equivalente `exp://.../--/`.
- Design tokens: ink `#121515`, paper `#F6F2EA`, coral `#FF604A`, seaGlass `#73BFAE`, deepBlue `#2448A8`, danger `#C5362F`.
- Interacciones táctiles de al menos 44 x 44 puntos, contraste AA y etiquetas accesibles.
- Videos, llamadas, monetización, push remoto y ML quedan fuera de alcance.
- Ningún secreto real se versiona; el cliente solo consume URL y publishable key.

## Review Focus

- La app arranca sin `.env`: debe entrar en demo local, explicar el modo y nunca lanzar una excepción por variables ausentes; Task 1 lo prueba.
- Dos consumidores solicitan la misma imagen y uno se desmonta: la descarga continúa para el restante y solo se cancela al quedar en cero; Task 5 lo prueba.
- La app se cierra entre persistir y enviar una acción: la operación reaparece pendiente al reiniciar y conserva orden FIFO; Task 6 lo prueba.
- Un extraño intenta leer posts, stories o mensajes privados: RLS rechaza cada lectura; Task 3 lo prueba.
- Realtime repite un mensaje/comentario después de reconectar: el repositorio lo deduplica por ID sin incrementar contadores; Tasks 7 y 9 lo prueban.

---

### Task 1: Workspace Expo, configuración y shell visual

**Files:**
- Create: `package.json`, `.gitignore`, `.env.example`, `README.md`
- Create: `mobile/` mediante plantilla oficial Expo Router
- Create: `mobile/src/core/config/env.ts`
- Create: `mobile/src/theme/tokens.ts`
- Create: `mobile/src/features/demo/demo-session.ts`
- Modify: `mobile/app.json`, `mobile/app/_layout.tsx`, `mobile/app/(tabs)/_layout.tsx`
- Test: `mobile/src/core/config/env.test.ts`, `mobile/src/theme/tokens.test.ts`

**Interfaces:**
- Produces: `getAppEnvironment(source?: Record<string, string | undefined>): AppEnvironment`; `theme`; rutas raíz y tabs.

- [ ] **Step 1: Generar la app oficial y añadir scripts raíz para install, start, test, typecheck, lint y doctor.**

- [ ] **Step 2: Escribir tests fallidos para `getAppEnvironment`: remoto con dos variables válidas; demo cuando falta cualquiera; sin exponer service role.**

- [ ] **Step 3: Ejecutar `npm test -- --runInBand` en `mobile/`; esperar FAIL por módulo ausente.**

- [ ] **Step 4: Implementar `AppEnvironment` como unión discriminada `demo | remote`, tokens exactos y `.env.example`.**

- [ ] **Step 5: Construir shell Marea con root Stack, tabs Inicio/Explorar/Crear/Actividad/Perfil, safe areas y estados demo visibles.**

- [ ] **Step 6: Ejecutar tests, `npx tsc --noEmit`, lint y `npx expo-doctor`; esperar salida verde.**

- [ ] **Step 7: Commit `feat: scaffold Marea Expo workspace`.**

### Task 2: Dominio, persistencia SQLite y contratos de repositorio

**Files:**
- Create: `mobile/src/domain/models/*.ts`
- Create: `mobile/src/domain/repositories/*.ts`
- Create: `mobile/src/data/local/schema.ts`
- Create: `mobile/src/data/local/database.ts`
- Create: `mobile/src/data/local/migrations.ts`
- Create: `mobile/src/data/mappers/*.ts`
- Test: `mobile/src/data/local/schema.test.ts`, `mobile/src/data/mappers/post-mapper.test.ts`

**Interfaces:**
- Consumes: `AppEnvironment` from Task 1.
- Produces: `Post`, `Profile`, `Story`, `Conversation`, `Message`, `SyncOperation`; `LocalDatabase`; repository interfaces for auth, feed, social, stories and chat.

- [ ] **Step 1: Escribir tests fallidos que exijan migraciones versionadas e idempotentes y mappers que rechacen filas incompletas.**

- [ ] **Step 2: Ejecutar tests focalizados; esperar FAIL por módulos ausentes.**

- [ ] **Step 3: Implementar modelos readonly, contratos async, schema SQL y runner transaccional `migrateDatabase(db: SqlExecutor): Promise<void>`.**

- [ ] **Step 4: Implementar `openLocalDatabase(): Promise<LocalDatabase>` usando `expo-sqlite` solo en el adaptador.**

- [ ] **Step 5: Ejecutar tests, typecheck y lint; esperar salida verde.**

- [ ] **Step 6: Commit `feat: add typed domain and SQLite persistence`.**

### Task 3: Backend Supabase, esquema, RLS e idempotencia

**Files:**
- Create: `backend/supabase/config.toml`
- Create: `backend/supabase/migrations/0001_initial_schema.sql`
- Create: `backend/supabase/migrations/0002_rls_policies.sql`
- Create: `backend/supabase/migrations/0003_domain_functions.sql`
- Create: `backend/supabase/tests/rls.test.sql`
- Create: `backend/README.md`

**Interfaces:**
- Consumes: modelos y nombres de Task 2.
- Produces: tablas, índices, RLS y RPC `request_follow`, `respond_follow_request`, `set_post_like`, `create_comment_idempotent`, `send_message_idempotent`.

- [ ] **Step 1: Escribir pruebas SQL negativas y positivas para posts privados, followers, stories, conversaciones y mensajes; incluir repetición de `operation_id`.**

- [ ] **Step 2: Ejecutar `supabase test db`; esperar FAIL por schema ausente, o registrar límite si CLI/Docker no están disponibles.**

- [ ] **Step 3: Implementar schema con UUID, FKs, constraints únicas, timestamps, índices de cursor y Storage buckets privados.**

- [ ] **Step 4: Implementar RLS usando `auth.uid()` y helpers SQL estables; funciones sensibles deben ser transaccionales.**

- [ ] **Step 5: Ejecutar formatter/linter SQL disponible y `supabase test db`; esperar pruebas verdes cuando el runtime exista.**

- [ ] **Step 6: Commit `feat: add Supabase schema and privacy policies`.**

### Task 4: Auth, perfiles y relaciones sociales

**Files:**
- Create: `mobile/src/data/remote/supabase-client.ts`
- Create: `mobile/src/data/repositories/auth-repository.ts`
- Create: `mobile/src/data/repositories/social-repository.ts`
- Create: `mobile/src/features/auth/*`
- Create: `mobile/src/features/profile/*`
- Create: `mobile/src/features/social/*`
- Create: `mobile/app/(auth)/*`, `mobile/app/profile/[username].tsx`
- Test: repository and reducer tests under matching feature folders.

**Interfaces:**
- Consumes: environment, SQLite and backend RPCs.
- Produces: `AuthSessionProvider`; `useProfile`; `follow`, `unfollow`, `acceptRequest`, `rejectRequest`; profile screens.

- [ ] **Step 1: Escribir tests fallidos para sesión demo/remota, transición pública directa y privada pendiente, aceptación/rechazo y rollback de error definitivo.**

- [ ] **Step 2: Ejecutar tests focalizados; esperar FAIL.**

- [ ] **Step 3: Implementar cliente Supabase singleton con persistencia SQLite y refresh ligado a AppState.**

- [ ] **Step 4: Implementar casos de uso, repositorios y pantallas con loading/empty/error/offline/disabled.**

- [ ] **Step 5: Ejecutar tests, typecheck y lint; verificar navegación manual en Expo.**

- [ ] **Step 6: Commit `feat: add authentication profiles and follows`.**

### Task 5: Motor de caché LRU cancelable

**Files:**
- Create: `mobile/src/services/image-cache/lru-index.ts`
- Create: `mobile/src/services/image-cache/image-cache-manager.ts`
- Create: `mobile/src/services/image-cache/expo-file-store.ts`
- Create: `mobile/src/components/CachedImage.tsx`
- Test: `lru-index.test.ts`, `image-cache-manager.test.ts`

**Interfaces:**
- Consumes: SQLite metadata adapter and Expo FileSystem.
- Produces: `ImageCacheManager.acquire(url): Promise<ImageLease>`; `ImageLease { uri, release }`; `CachedImage`.

- [ ] **Step 1: Escribir tests fallidos para hit/miss, promoción LRU, costo, desalojo, deduplicación, cancelación con cero consumidores y recuperación de archivo huérfano.**

- [ ] **Step 2: Ejecutar tests; confirmar fallos conductuales esperados.**

- [ ] **Step 3: Implementar `LruIndex<K,V>` sin dependencias y después `ImageCacheManager` con leases e `AbortController`.**

- [ ] **Step 4: Implementar file store atómico temporal→final y renderer local con caché de disco automática desactivada.**

- [ ] **Step 5: Ejecutar tests, suite completa, typecheck y lint.**

- [ ] **Step 6: Commit `feat: add cancellable two-level image cache`.**

### Task 6: Cola offline, SyncManager y reconciliación

**Files:**
- Create: `mobile/src/services/sync/sync-queue.ts`
- Create: `mobile/src/services/sync/sync-manager.ts`
- Create: `mobile/src/services/sync/reconciliation.ts`
- Create: `mobile/src/services/connectivity/connectivity.ts`
- Test: matching `*.test.ts` files.

**Interfaces:**
- Consumes: `SyncOperation`, LocalDatabase, repository mutation ports.
- Produces: `SyncQueue.enqueue/leaseNext/complete/fail`; `SyncManager.requestRun`; pure reconciliation functions.

- [ ] **Step 1: Escribir tests fallidos para FIFO persistido, exclusión de workers, lease expirado, backoff, operación repetida, like set-based y comentario con client ID.**

- [ ] **Step 2: Ejecutar tests; esperar FAIL.**

- [ ] **Step 3: Implementar cola y reconciliadores puros; después manager singleton con mutex y lifecycle.**

- [ ] **Step 4: Integrar conectividad y AppState sin prometer ejecución con proceso terminado.**

- [ ] **Step 5: Ejecutar tests, suite completa, typecheck y lint.**

- [ ] **Step 6: Commit `feat: add persistent offline synchronization`.**

### Task 7: Feed, publicaciones, comentarios, Explore y Activity

**Files:**
- Create: `mobile/src/data/repositories/feed-repository.ts`
- Create: `mobile/src/features/feed/*`, `posts/*`, `comments/*`, `explore/*`, `activity/*`
- Create: `mobile/app/post/[postId].tsx`, `mobile/app/create.tsx`
- Modify: tab route screens.
- Test: optimistic reducers, pagination and event deduplication tests.

**Interfaces:**
- Consumes: repositories, image cache, sync manager.
- Produces: paginated feed, PostCard, create flow, optimistic likes/comments, share links, Explore and Activity screens.

- [ ] **Step 1: Escribir tests fallidos para cursor estable, like inmediato, comentario pendiente, evento Realtime duplicado y acceso privado denegado.**

- [ ] **Step 2: Ejecutar tests; esperar FAIL.**

- [ ] **Step 3: Implementar repositorio cache-first y reducers optimistas conectados a SyncQueue.**

- [ ] **Step 4: Implementar feed virtualizado con viewability, cancelación/prefetch, detalles, creación, Explore y Activity con todos los estados.**

- [ ] **Step 5: Verificar scroll largo, compartir y deep link `/post/[postId]` en Expo Go; ejecutar suite, typecheck y lint.**

- [ ] **Step 6: Commit `feat: add offline-first social feed`.**

### Task 8: Stories efímeras

**Files:**
- Create: `mobile/src/data/repositories/story-repository.ts`
- Create: `mobile/src/features/stories/*`
- Create: `mobile/app/stories/[userId].tsx`
- Test: `story-player.test.ts`, `story-repository.test.ts`

**Interfaces:**
- Consumes: image cache, SQLite and Supabase.
- Produces: story rail, `StoryPlayerMachine`, local/remote viewed state.

- [ ] **Step 1: Escribir tests fallidos para expiración 24h, progreso, pausa por press, AppState background, avance y persistencia de visto.**

- [ ] **Step 2: Ejecutar tests; esperar FAIL.**

- [ ] **Step 3: Implementar máquina de estado pura y repositorio cache-first.**

- [ ] **Step 4: Implementar rail y visor fullscreen accesible con cleanup de timers y leases.**

- [ ] **Step 5: Ejecutar suite, typecheck, lint y prueba manual.**

- [ ] **Step 6: Commit `feat: add ephemeral stories`.**

### Task 9: DMs Realtime

**Files:**
- Create: `mobile/src/data/repositories/chat-repository.ts`
- Create: `mobile/src/services/realtime/realtime-coordinator.ts`
- Create: `mobile/src/features/chat/*`
- Create: `mobile/app/messages/index.tsx`, `mobile/app/messages/[conversationId].tsx`
- Test: coordinator, inbox ordering, typing TTL, receipts and dedup tests.

**Interfaces:**
- Consumes: SQLite, Supabase channels and idempotent RPC.
- Produces: inbox, conversation, `RealtimeCoordinator`, typing/delivered/read/unread behavior.

- [ ] **Step 1: Escribir tests fallidos para una suscripción por scope, cleanup, mensaje duplicado, reconexión, typing throttle/TTL, delivered/read e inbox reordenado.**

- [ ] **Step 2: Ejecutar tests; esperar FAIL.**

- [ ] **Step 3: Implementar coordinator y repositorio cache-first con delta refresh tras reconexión.**

- [ ] **Step 4: Implementar inbox y conversación virtualizada con estados offline, pending, failed y unread.**

- [ ] **Step 5: Probar con dos sesiones físicas/simuladas; ejecutar suite, typecheck y lint.**

- [ ] **Step 6: Commit `feat: add realtime direct messages`.**

### Task 10: Seed, documentación y auditoría final

**Files:**
- Create: `backend/scripts/seed.ts`
- Create: `backend/supabase/seed.sql`
- Create: `docs/ARCHITECTURE.md`, `docs/DEFENSA.md`, `docs/PREGUNTAS_DEFENSA.md`
- Modify: `README.md`, `backend/README.md`, `.env.example`
- Test: seed idempotency test and smoke checklist.

**Interfaces:**
- Consumes: todo el código real y schema final.
- Produces: demo reproducible, documentación con referencias reales y evidencia de auditoría.

- [ ] **Step 1: Escribir test fallido de seed idempotente y checklist trazable para todas las rutas del Definition of Done.**

- [ ] **Step 2: Implementar seis cuentas, cuarenta posts, relaciones, requests, stories, chats, receipts y actividades sin versionar service role.**

- [ ] **Step 3: Escribir documentación desde símbolos y archivos reales; generar al menos 40 preguntas con respuesta y ubicación.**

- [ ] **Step 4: Ejecutar tests completos, typecheck, lint, Expo Doctor, pruebas RLS y export/bundle de Expo.**

- [ ] **Step 5: Auditar dependencias Expo Go, secretos, rendimiento/listeners, políticas y recorrido de profesor; corregir fallos importantes con RED→GREEN.**

- [ ] **Step 6: Probar en teléfono físico cuando esté disponible y registrar honestamente cualquier validación pendiente.**

- [ ] **Step 7: Commit `docs: add reproducible demo and defense guide`.**
