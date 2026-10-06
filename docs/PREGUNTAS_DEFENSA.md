# Preguntas para la defensa de Marea

50 preguntas, de fundamentos a concurrencia y seguridad. Las rutas se expresan desde la raíz del repositorio. No presentes una prueba pendiente como realizada.

## 1. ¿Por qué separar mobile y backend?

**Respuesta excelente:** Las pantallas no definen permisos ni administran la base. El cliente presenta datos y consume repositorios; PostgreSQL aplica las reglas incluso si alguien evita la interfaz.

**Dónde verlo en nuestro código:** `docs/ARCHITECTURE.md`; `backend/supabase/migrations/0002_rls_policies.sql`.

## 2. ¿Por qué Supabase?

**Respuesta excelente:** Integra PostgreSQL, Auth, Storage y Realtime. Evita mantener un servidor CRUD propio sin renunciar a transacciones, SQL ni control de autorización.

**Dónde verlo en nuestro código:** `mobile/src/data/remote/supabase-client.ts`.

## 3. ¿Qué aporta TypeScript estricto?

**Respuesta excelente:** Detecta contratos incompatibles y valores posiblemente nulos al compilar. No sustituye validaciones de datos externos ni seguridad SQL.

**Dónde verlo en nuestro código:** `mobile/tsconfig.json`; `mobile/src/domain/models`.

## 4. ¿Qué es un repositorio?

**Respuesta excelente:** Una frontera que traduce consultas y filas remotas a modelos usados por las pantallas. Permite probar reglas sin acoplarlas al componente visual.

**Dónde verlo en nuestro código:** `mobile/src/data/repositories/feed-repository.ts`.

## 5. ¿Por qué no añadir Redux?

**Respuesta excelente:** El estado local de pantalla y proveedores pequeños cubren el alcance. SQLite conserva lo durable; añadir otro almacén global duplicaría fuentes de verdad.

**Dónde verlo en nuestro código:** `mobile/src/features/auth/auth-session-provider.ts`.

## 6. ¿Cómo se crea una cuenta?

**Respuesta excelente:** Supabase Auth crea la identidad; un trigger crea el perfil asociado. La app nunca inserta una identidad administrativa desde el teléfono.

**Dónde verlo en nuestro código:** `backend/supabase/migrations/0004_auth_profile_trigger.sql`.

## 7. ¿Qué contiene la sesión?

**Respuesta excelente:** Tokens de Auth e identidad real del usuario. El perfil es un dato asociado, no la prueba de autenticación. No existe sesión demo.

**Dónde verlo en nuestro código:** `mobile/src/data/repositories/auth-repository.ts`.

## 8. ¿Por qué la clave pública puede estar en la app?

**Respuesta excelente:** Identifica el proyecto, pero no concede acceso administrativo. Los permisos dependen del JWT del usuario, grants y RLS; service_role nunca va al cliente.

**Dónde verlo en nuestro código:** `mobile/.env.example`; `backend/.env.example`.

## 9. ¿Cómo funciona Google en Expo Go?

**Respuesta excelente:** Usa navegador, Supabase y PKCE con un retorno HTTP separado. El usuario vuelve a la app y esta intercambia el código; no depende del SDK nativo de Google.

**Dónde verlo en nuestro código:** `mobile/src/features/auth/google-login.ts`; `docs/GOOGLE.md`.

## 10. ¿Qué evita PKCE?

**Respuesta excelente:** Un código interceptado no basta para obtener la sesión: hace falta el verificador creado por el cliente que inició el acceso.

**Dónde verlo en nuestro código:** `mobile/src/data/remote/supabase-client.ts`.

## 11. ¿El relay de Google guarda contraseñas?

**Respuesta excelente:** No. Guarda temporalmente un código, separa secretos de lectura y escritura y elimina flujos expirados. Requiere HTTPS en despliegue.

**Dónde verlo en nuestro código:** `backend/oauth-relay/server.mjs`.

## 12. ¿Cómo se recupera la contraseña?

**Respuesta excelente:** Se solicita un código por correo, se verifica como recovery y se actualiza la contraseña con la sesión autorizada. El SMTP y la plantilla deben configurarse.

**Dónde verlo en nuestro código:** `mobile/src/app/recovery.tsx`; `backend/supabase/templates/recovery.html`.

## 13. ¿Cómo se construye el feed?

**Respuesta excelente:** El RPC aplica visibilidad y seguimiento, ordena por fecha e identificador y devuelve páginas. El repositorio mapea medios y el hook superpone acciones pendientes.

**Dónde verlo en nuestro código:** `mobile/src/features/feed/use-posts.ts`; `backend/supabase/migrations/0005_social_reads.sql`.

## 14. ¿Por qué paginación por cursor?

**Respuesta excelente:** Usa la última fecha y UUID como frontera estable. Evita desplazamientos y coste creciente de OFFSET cuando entran publicaciones nuevas.

**Dónde verlo en nuestro código:** `mobile/src/data/repositories/feed-repository.ts`.

## 15. ¿Qué hace FlatList?

**Respuesta excelente:** Monta una ventana de elementos en vez de todo el feed. Los tamaños de lote y ventana equilibran memoria y desplazamiento; no prueban por sí solos 60 FPS.

**Dónde verlo en nuestro código:** `mobile/src/app/(tabs)/(feed)/index.tsx`.

## 16. ¿Cómo se reducen imágenes pesadas?

**Respuesta excelente:** Antes de subir se redimensiona la foto a un máximo de 1600 píxeles en su lado mayor y se comprime a JPEG. Se liberan los objetos nativos de manipulación.

**Dónde verlo en nuestro código:** `mobile/src/services/media/pick-photo.ts`.

## 17. ¿Qué diferencia RAM de disco?

**Respuesta excelente:** RAM ofrece acceso rápido pero desaparece con el proceso. Disco conserva archivos entre ejecuciones y usa más capacidad; descargar de red es el último recurso.

**Dónde verlo en nuestro código:** `mobile/src/services/image-cache/image-cache-manager.ts`.

## 18. ¿Qué es LRU?

**Respuesta excelente:** Least Recently Used elimina primero entradas usadas hace más tiempo hasta respetar el presupuesto. Leer también actualiza la recencia.

**Dónde verlo en nuestro código:** `mobile/src/services/image-cache/lru-index.ts`.

## 19. ¿Cuáles son los límites del caché?

**Respuesta excelente:** El gestor presupone 24 MiB de cadenas en RAM y 256 MiB en disco. Son presupuestos del caché, no límites de toda la memoria del proceso ni de bitmaps nativos.

**Dónde verlo en nuestro código:** `mobile/src/services/image-cache/image-cache-manager.ts`.

## 20. ¿Por qué contar bytes y no imágenes?

**Respuesta excelente:** Dos imágenes pueden tener tamaños muy distintos. El presupuesto usa coste real de la cadena en memoria y tamaño del archivo en disco.

**Dónde verlo en nuestro código:** `mobile/src/services/image-cache/image-cache-manager.ts`.

## 21. ¿Qué pasa si dos componentes piden la misma imagen?

**Respuesta excelente:** Comparten una promesa de descarga. Cada consumidor recibe una lease y la petición solo se cancela si todos abandonan antes de terminar.

**Dónde verlo en nuestro código:** `mobile/src/services/image-cache/image-cache-manager.ts`.

## 22. ¿Cómo se cancela una imagen al salir?

**Respuesta excelente:** El efecto aborta su consumidor y libera la lease. El gestor conserva solicitudes compartidas que aún tienen consumidores y protege archivos activos de la limpieza.

**Dónde verlo en nuestro código:** `mobile/src/components/CachedImage.tsx`.

## 23. ¿Por qué un AbortController no basta?

**Respuesta excelente:** Cancelar un consumidor no debe cancelar a los demás. Además hay que ignorar resultados tardíos para no actualizar componentes desmontados.

**Dónde verlo en nuestro código:** `mobile/src/services/image-cache/image-cache-manager.test.ts`.

## 24. ¿Qué es offline-first aquí?

**Respuesta excelente:** Las acciones compatibles se guardan en SQLite con su UUID, actualizan la vista y se envían al volver la conexión. No promete publicar ni consultar cualquier dato sin haberlo descargado.

**Dónde verlo en nuestro código:** `mobile/src/services/sync/social-runtime.ts`.

## 25. ¿Qué guarda SQLite?

**Respuesta excelente:** Operaciones pendientes, snapshots estructurados y vistas de stories. La cola no se elimina para reducir el caché: una intención del usuario no es un dato descartable.

**Dónde verlo en nuestro código:** `mobile/src/data/local/schema.ts`; `mobile/src/features/stories/story-view-store.ts`.

## 26. ¿Qué es UI optimista?

**Respuesta excelente:** Muestra el resultado previsto antes de la confirmación remota. Los likes se calculan de forma coherente y se reconcilian con el servidor; persistir puede fallar y debe mostrarse.

**Dónde verlo en nuestro código:** `mobile/src/services/sync/reconciliation.ts`; `mobile/src/features/feed/use-posts.ts`.

## 27. ¿Cómo se evita perder un comentario?

**Respuesta excelente:** El contenido y UUID se guardan como una operación durable antes del envío. Un reintento conserva el mismo identificador.

**Dónde verlo en nuestro código:** `mobile/src/features/feed/PostScreen.tsx`.

## 28. ¿Cómo evita SyncManager dos workers?

**Respuesta excelente:** Comparte activeRun entre llamadas concurrentes. La cola además usa leases con vencimiento para recuperar operaciones interrumpidas.

**Dónde verlo en nuestro código:** `mobile/src/services/sync/sync-manager.ts`.

## 29. ¿Por qué FIFO estricto?

**Respuesta excelente:** Un unlike posterior no debe adelantarse a un like que está reintentando. Una operación con error permanente se conserva pero no bloquea indefinidamente las demás.

**Dónde verlo en nuestro código:** `mobile/src/services/sync/sync-queue.ts`; `mobile/src/services/sync/sync-queue.test.ts`.

## 30. ¿Qué es backoff?

**Respuesta excelente:** Aumenta el tiempo entre intentos fallidos hasta un máximo para no saturar red o servidor. No se utiliza para fingir éxito ni descartar la acción.

**Dónde verlo en nuestro código:** `mobile/src/services/sync/sync-queue.ts`.

## 31. ¿Qué es idempotencia?

**Respuesta excelente:** Repetir la misma operación produce un solo efecto lógico. El servidor registra operation_id y retorna el resultado ya confirmado dentro de una transacción.

**Dónde verlo en nuestro código:** `backend/supabase/migrations/0003_domain_functions.sql`.

## 32. ¿Qué pasa si el servidor confirma y se corta internet?

**Respuesta excelente:** El cliente puede no recibir la respuesta y reintentar. Como conserva operation_id, PostgreSQL reconoce el intento y no duplica el comentario, like o mensaje.

**Dónde verlo en nuestro código:** `backend/scripts/smoke.mjs`.

## 33. ¿Cómo se resuelven conflictos?

**Respuesta excelente:** Las acciones expresan un estado deseado, por ejemplo liked=true, no un toggle ambiguo. El servidor decide visibilidad y el cliente refresca la representación confirmada.

**Dónde verlo en nuestro código:** `mobile/src/services/sync/reconciliation.ts`.

## 34. ¿Sincroniza con la app cerrada?

**Respuesta excelente:** No se garantiza. SyncStatus sincroniza con la app activa y al recuperar conexión; SQLite permite retomar al abrirla. No se promete un servicio de fondo inexistente.

**Dónde verlo en nuestro código:** `mobile/src/features/sync/SyncStatus.tsx`.

## 35. ¿Cómo se distingue delivered de read?

**Respuesta excelente:** Entregado indica recepción confirmada por el destinatario; leído exige conversación enfocada y app activa. Los timestamps avanzan, no retroceden.

**Dónde verlo en nuestro código:** `mobile/src/features/chat/use-chat.ts`; `backend/supabase/migrations/0009_chat_receipt_fix.sql`.

## 36. ¿Qué papel tiene WebSocket?

**Respuesta excelente:** Mantiene un canal bidireccional para cambios y eventos sin pedir cada novedad repetidamente. La base sigue siendo la fuente durable: un evento no reemplaza una consulta.

**Dónde verlo en nuestro código:** `mobile/src/data/repositories/chat-repository.ts`.

## 37. ¿Se persiste escribiendo?

**Respuesta excelente:** No es un mensaje durable. Se transmite por un canal privado de la conversación y caduca en la interfaz para evitar indicadores atascados.

**Dónde verlo en nuestro código:** `mobile/src/features/chat/use-chat.ts`.

## 38. ¿Cómo se evitan mensajes duplicados?

**Respuesta excelente:** Los mensajes tienen UUID estable; las listas fusionan por ID y el RPC de envío es idempotente. La reconexión vuelve a consultar el estado autorizado.

**Dónde verlo en nuestro código:** `mobile/src/features/chat/message-state.ts`.

## 39. ¿Por qué limpiar subscriptions?

**Respuesta excelente:** Mantener canales al desmontar produce eventos duplicados, referencias retenidas y tráfico innecesario. El repositorio devuelve funciones de cleanup.

**Dónde verlo en nuestro código:** `mobile/src/data/repositories/chat-repository.ts`.

## 40. ¿Quién fija las 24 horas de una story?

**Respuesta excelente:** Un trigger de PostgreSQL fija created_at y expires_at usando su reloj. No se confía en la hora que envía el teléfono.

**Dónde verlo en nuestro código:** `backend/supabase/migrations/0007_stories.sql`.

## 41. ¿Ocultar un perfil privado basta?

**Respuesta excelente:** No. RLS limita consultas de publicaciones, stories y relaciones; Storage también exige autorización. La interfaz solo comunica esos permisos.

**Dónde verlo en nuestro código:** `backend/supabase/migrations/0002_rls_policies.sql`.

## 42. ¿Qué ocurre con imágenes privadas descargadas antes?

**Respuesta excelente:** Un dispositivo desconectado puede conservar una copia. RLS impide nuevas lecturas no autorizadas, pero no revoca mágicamente bytes que ya llegaron al dispositivo.

**Dónde verlo en nuestro código:** `docs/ARCHITECTURE.md`.

## 43. ¿Por qué security definer requiere cuidado?

**Respuesta excelente:** Ejecuta con privilegios del dueño. Se fija search_path, se califican tablas, se restringe EXECUTE y se verifica auth.uid y autorización antes de mutar.

**Dónde verlo en nuestro código:** `backend/supabase/migrations/0003_domain_functions.sql`.

## 44. ¿Cómo pruebo que RLS realmente protege?

**Respuesta excelente:** Las pruebas cambian identidad JWT y comprueban resultados permitidos y denegados. El smoke también intenta obtener medios privados con otro usuario autenticado.

**Dónde verlo en nuestro código:** `backend/supabase/tests/rls.test.sql`; `backend/scripts/smoke.mjs`.

## 45. ¿Cómo conserva cada pestaña su historial?

**Respuesta excelente:** Cada grupo de tabs contiene su propio Stack. El helper de navegación abre posts y personas dentro del grupo activo.

**Dónde verlo en nuestro código:** `mobile/src/features/navigation/use-social-navigation.ts`.

## 46. ¿Por qué marea:// no es el enlace principal de Expo Go?

**Respuesta excelente:** Ese esquema pertenece a un binario instalado que lo registre. Expo Go usa exp://host/--/ruta; Linking.createURL genera el prefijo del entorno.

**Dónde verlo en nuestro código:** `mobile/src/components/PostCard.tsx`; `mobile/app.json`.

## 47. ¿Async significa crear otro thread?

**Respuesta excelente:** No. await cede la continuación mientras termina una operación. El event loop ejecuta callbacks de JavaScript; módulos nativos pueden hacer trabajo fuera de ese hilo.

**Dónde verlo en nuestro código:** `docs/DEFENSA.md`.

## 48. ¿Por qué async puede bloquear la UI?

**Respuesta excelente:** Un cálculo CPU intensivo sigue bloqueando JavaScript aunque su función sea async. Por eso se limita trabajo, se virtualizan listas y se usan operaciones nativas para imágenes.

**Dónde verlo en nuestro código:** `mobile/src/services/media/pick-photo.ts`.

## 49. ¿Qué pruebas no demuestran los tests unitarios?

**Respuesta excelente:** No demuestran fluidez física, permisos del teléfono ni login real de Google. Esas comprobaciones necesitan dispositivo y configuración del proveedor.

**Dónde verlo en nuestro código:** `docs/QA.md`.

## 50. ¿Qué estudiar primero para defenderlo?

**Respuesta excelente:** Flujo de datos y repositorios; RLS; cola e idempotencia; caché LRU y cancelación; Realtime y ciclo de vida. Explica cada uno siguiendo una acción real.

**Dónde verlo en nuestro código:** `docs/DEFENSA.md`.
