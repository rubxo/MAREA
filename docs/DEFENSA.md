# Cómo defender Marea

Empieza con este relato: «La UI presenta estado; SQLite conserva intención; Supabase decide autorización. Las operaciones se pueden repetir sin repetir sus efectos». Sigue una acción real de extremo a extremo.

## 1. Arquitectura y feed

Abre `mobile/src/features/feed/use-posts.ts`: `usePosts` primero obtiene el snapshot de esa cuenta, luego consulta `SupabaseFeedRepository.list` y aplica operaciones pendientes. No hay datos ficticios como fallback. En `backend/supabase/migrations/0005_social_reads.sql`, `list_posts` usa tu identidad y relaciones, y RLS excluye cuentas privadas no autorizadas. El cursor es una pareja fecha/UUID: resuelve empates y evita el coste creciente de OFFSET. FlatList limita vistas montadas, no requiere renderizar todas las fotos.

## 2. RAM, disco y LRU

Abre `services/image-cache/lru-index.ts`. Un Map ordenado guarda clave, valor y coste. Leer mueve al final; al exceder presupuesto sale la menos reciente. El coste se acumula, así una foto grande pesa más que una pequeña. Pruebas en `lru-index.test.ts`.

`ImageCacheManager.acquire` busca primero una imagen codificada en RAM, después bytes locales y por último red. Los datos codificados evitan releer disco en un hit RAM; la imagen se decodifica para mostrarla. RAM es rápida y volátil; disco sobrevive reinicios. No digas que el presupuesto RAM limita toda la memoria: hay buffers temporales, componentes y bitmaps nativos.

`ExpoImageFileStore` registra tamaño/último acceso en SQLite y usa nombres SHA-256. Una descarga escribe temporal y después mueve al destino. Recovery limpia temporales/huérfanos. Hay protección de archivos usados para no borrarlos mientras una celda los muestra. Los archivos del sistema de caché también pueden ser eliminados por el SO; se comprueba existencia.

## 3. Cancelación y concurrencia

Una URL tiene una promesa compartida en `inFlight`. Cada celda es un consumidor. Su AbortController cancela su espera; solo cuando no queda nadie se cancela la transferencia común. `CachedImage` libera el lease al desmontarse. La viewability de FlatList desmonta la imagen fuera del viewport. AbortSignal no interrumpe mágicamente cualquier función: la API File de Expo conecta esa señal con cancelación nativa.

Una carrera ocurre si una limpieza decide borrar con información vieja. La caché comprueba protección actual inmediatamente antes de borrar. La promoción a RAM se serializa para evitar varias grandes asignaciones a la vez.

## 4. Offline y UI optimista

`setOptimisticLike` aplica el estado objetivo. Dar Me gusta dos veces no debe sumar dos. Al fallar el guardado local, el hook restaura el estado previo. Al fallar la red, la operación permanece en SQLite. Comentarios muestran pendiente y conservan UUID; `reconcileComment` sustituye por ID, no concatena duplicados.

`getSocialRuntime` crea bases separadas por cuenta. No enviamos las acciones de A usando la sesión B. Los snapshots se reconstruyen desde servidor + cola pendiente, de modo que una actualización remota no borra intención todavía no sincronizada.

## 5. SyncManager e idempotencia

`SyncManager.requestRun` reutiliza una promesa activa. Dos eventos de red no producen dos drains. `leaseNext` selecciona y marca la siguiente operación dentro de una transacción exclusiva SQLite; un lease vencido se recupera tras un cierre inesperado. Backoff evita golpear la red continuamente. FIFO bloquea operaciones posteriores mientras la primera espera: un unlike posterior no debe adelantarse al like anterior.

La red ofrece como mucho entrega repetible, no exactamente una vez. Si el servidor confirmó pero se perdió la respuesta, el cliente repite el mismo operation_id. `private.lock_operation` bloquea ese ID y `remember_operation` guarda el resultado en la misma transacción PostgreSQL. Mensajes/comentarios tienen además IDs creados por el cliente. El servidor decide el resultado; no se confía en contadores del cliente.

Conflictos: likes son set-based en orden de la cola local; entre dispositivos prevalece el orden de ejecución del servidor. Mensajes/comentarios son append-only. Un permiso revocado da rechazo permanente, no reintentos infinitos automáticos. El usuario puede revisar/reintentar pendientes.

## 6. Async, event loop y threads

JavaScript coordina promesas y callbacks en su event loop. await cede control; no crea un thread y no vuelve paralelo un cálculo pesado. IO de red, SQLite y decodificación usan implementaciones nativas. Por eso no leemos megabytes síncronamente dentro del render. Una promesa pendiente no bloquea la UI, pero un bucle CPU largo sí. Los threads de conversación son conversaciones, y un comentario con parent_id es una respuesta; no son hilos de ejecución.

## 7. Mensajes y WebSockets

`SupabaseChatRepository.subscribeConversation` escucha cambios confirmados en PostgreSQL. WebSocket mantiene un canal bidireccional abierto; una desconexión implica que eventos pueden perderse. Por eso al reconectar se consulta historial y `mergeMessages` deduplica y conserva estados avanzados.

Typing es efímero: broadcast con frecuencia limitada y caducidad. No se guarda como mensaje. Sent significa persistido por servidor; delivered confirma que el receptor recibió; read requiere conversación activa. `acknowledge_messages` valida membresía y actualiza sin retroceder marcas. Abre `features/chat/message-state.test.ts`.

## 8. Stories, navegación y enlaces

`StoryViewerScreen` avanza por tiempo transcurrido; detiene progreso al mantener pulsado o pasar a background. Se marca vista tras cargar imagen. `story-view-store.ts` conserva receipts locales por usuario y reintenta. La caducidad real la fija el trigger de `0007_stories.sql`; cambiar el reloj del móvil no extiende acceso remoto.

Cada tab mantiene Stack propio: navegar no borra las pantallas de las otras pestañas. Los enlaces seleccionan recurso, no conceden permisos. El servidor sigue aplicando RLS aunque alguien conozca UUID. Expo Go usa su URL exp; el esquema marea requiere instalación propia.

## 9. Seguridad y acceso

Nunca confundas ocultar botones con autorización. Intenta consultar un post privado desde otra sesión: devuelve vacío o rechazo. Storage también debe negar la URL firmada. El smoke real hace ambas verificaciones. La clave publishable identifica proyecto; JWT identifica usuario; RLS decide acceso; service_role es solo backend.

El registro usa Supabase Auth y devuelve sesión inmediatamente porque la confirmación de correo está desactivada en MAREA Cloud. La clave publishable puede estar en la app; no permite saltarse RLS. La versión entregada no promete recuperación por correo porque no hay SMTP configurado.

## 10. Qué demostrar y qué no afirmar

Muestra creación, privado/solicitud/aceptación, modo avión/cola/reconexión y conversación entre dos cuentas. Ejecuta `npm --prefix backend run test:local`: valida servicios reales, no componentes simulados. Las pruebas unitarias cubren lógica y pgTAP autorización. Exportar Android no mide FPS ni sustituye el teléfono. Lleva dos dispositivos y registra si la experiencia cumple la fluidez esperada.
