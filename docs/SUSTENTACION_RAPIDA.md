# Sustentación rápida de Marea

## Guion de 8 minutos

### 1. Producto y arquitectura — 45 segundos

“Marea es una red social fotográfica construida con Expo SDK 57, React Native y TypeScript. El cliente vive en `mobile`; PostgreSQL, Auth, Storage, Realtime, migraciones y políticas viven en `backend`. El teléfono nunca recibe una clave administrativa.”

Muestra `mobile/src` y `backend/supabase/migrations`.

### 2. Registro y sesión — 45 segundos

Registra una cuenta. MAREA Cloud tiene desactivada la confirmación, así que Supabase entrega la sesión inmediatamente. El trigger de `0004_auth_profile_trigger.sql` crea `profiles` con el mismo UUID de `auth.users`.

Archivos: `mobile/src/data/repositories/auth-repository.ts` y `backend/supabase/migrations/0004_auth_profile_trigger.sql`.

### 3. Privacidad y RLS — 90 segundos

Pon una cuenta privada y solicita seguirla desde otra. Antes de aceptar, intenta abrir sus publicaciones; después acepta desde Actividad y repite.

Explicación: la UI mejora la experiencia, pero la seguridad real está en PostgreSQL. Las políticas consultan `auth.uid()` y la relación aceptada. Storage también es privado; la app solicita URLs firmadas solo después de superar RLS.

Archivos: `0002_rls_policies.sql`, `0008_social_hardening.sql` y `social-repository.ts`.

### 4. Offline e idempotencia — 90 segundos

Carga el feed, activa modo avión, realiza un like o comentario y muestra el estado pendiente. Reconecta y comprueba que aparece una sola vez.

Explicación: la UI cambia primero; la operación conserva UUID en SQLite de Expo Go. `SyncManager` usa un único worker, leases y backoff. Los RPC guardan `operation_id`, toman advisory lock y devuelven el resultado previo si se reintenta.

Archivos: `social-runtime.ts`, `sync-queue.ts`, `sync-manager.ts` y `0003_domain_functions.sql`.

En web se usa `localStorage`, no `expo-sqlite`, para evitar la exclusividad de OPFS entre pestañas. En Android/iOS continúa SQLite.

### 5. Realtime — 90 segundos

Abre dos cuentas en dispositivos distintos. Envía un mensaje, escribe sin enviar y abre la conversación del receptor.

Explicación: mensajes y recibos quedan en PostgreSQL; Realtime notifica cambios confirmados. Typing es broadcast efímero y privado. Delivered/read solo avanzan y la app recarga historial al reconectar para no depender de eventos que pudieron perderse.

Archivos: `chat-repository.ts`, `use-chat.ts`, `0006_chat.sql` y `0009_chat_receipt_fix.sql`.

### 6. Rendimiento y caché — 60 segundos

Explica que el feed pagina por cursor, virtualiza la lista y no monta todas las imágenes. `ImageCacheManager` deduplica descargas, cancela cuando no hay consumidores y aplica LRU en RAM y disco. `expo-image` atiende la versión web.

Archivos: `image-cache-manager.ts`, `lru-index.ts`, `CachedImage.tsx` y `CachedImage.web.tsx`.

### 7. Evidencia — 30 segundos

Muestra `docs/QA.md`: 74 pruebas TypeScript/Jest, 49 aserciones pgTAP y smoke remoto de ocho grupos contra Supabase Cloud. Aclara que exportar no reemplaza una prueba física.

## Respuestas cortas importantes

- **¿Por qué Supabase?** Integra PostgreSQL, Auth, Storage y Realtime, pero conserva seguridad SQL auditable mediante RLS.
- **¿La publishable key es secreta?** No; identifica el proyecto. El JWT identifica al usuario y RLS autoriza. `service_role` jamás va en Expo.
- **¿Por qué RPC?** Agrupa validación, autorización, idempotencia y escritura en una transacción del servidor.
- **¿Qué pasa si llega dos veces un evento?** Los UUID y `mergeMessages` deduplican; después se recarga la fuente de verdad.
- **¿Qué pasa si dos sincronizaciones arrancan juntas?** `SyncManager` comparte `activeRun`; la cola aplica lease y el servidor vuelve idempotente la mutación.
- **¿Async crea un hilo?** No. `await` cede el event loop; red, SQLite e imágenes pueden trabajar fuera del hilo JS mediante implementaciones nativas.
- **¿Por qué no hay Google ni recuperación?** Se retiraron porque no estaban configurados de extremo a extremo. La entrega solo muestra funciones realmente operativas.

## Antes de entrar al salón

1. Ejecuta `npx expo start --lan --clear` dentro de `mobile`.
2. Abre Marea en dos dispositivos o prepara dos sesiones.
3. Verifica login, una publicación y un chat antes de desconectar Internet.
4. Ten abiertas `ARCHITECTURE.md`, `DEFENSA.md` y `PREGUNTAS_DEFENSA.md`.
5. No afirmes ejecución en segundo plano con la app terminada ni 60 FPS sin medición física.
