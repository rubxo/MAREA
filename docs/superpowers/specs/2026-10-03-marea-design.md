# Marea: diseño de la red social móvil

Fecha: 2026-10-03  
Estado: propuesta aprobada en conversación; pendiente de aprobación del documento  
Fuente funcional: `Parcial Desarrollo Movil - Proyecto 3_ Red Social Estilo Instagram V2.md`

## 1. Propósito y criterios de éxito

Marea será una red social móvil de fotografía, con identidad editorial propia, construida con React Native, Expo y TypeScript. La entrega debe sentirse terminada durante una demostración universitaria y, al mismo tiempo, permitir explicar con claridad su arquitectura, concurrencia, rendimiento, seguridad y funcionamiento offline.

El producto se considera exitoso cuando existe un recorrido demostrable para registro, perfil, feed, stories, publicación, likes, comentarios, seguimiento público y privado, solicitudes, Explore, actividad, mensajes directos, indicadores de escritura/entrega/lectura, modo offline, reconciliación y deep links. La versión principal debe abrir en Expo Go mediante `npx expo start` sin código nativo personalizado.

No se incluyen videos, monetización, llamadas, notificaciones push remotas ni algoritmos de recomendación con aprendizaje automático. Estas exclusiones mantienen el alcance centrado en los requisitos evaluados.

## 2. Decisiones principales

### 2.1 Stack

- Expo SDK 57 y React Native, usando las versiones seleccionadas por `create-expo-app` y `npx expo install`.
- TypeScript en modo `strict`.
- Expo Router para navegación basada en archivos, stacks anidados y deep linking.
- Supabase para PostgreSQL, Auth, Storage y Realtime.
- `expo-sqlite` para persistencia local y cola de sincronización.
- `expo-file-system` para el caché de imágenes en disco y descargas cancelables.
- `expo-image` como renderer compatible con Expo Go, sin delegarle la política de disco que debe controlar Marea.
- `expo-image-picker` para seleccionar fotografías.
- Cliente de Supabase para acceso remoto. Solo se expondrán la URL y la publishable key.
- Estado local con hooks y contextos acotados; no se incorporará un store global si un flujo no lo necesita.

Toda dependencia nativa debe estar incluida en Expo Go. Las dependencias JavaScript adicionales deberán justificar su tamaño y evitar duplicar capacidades del SDK.

### 2.2 Alternativas descartadas

- Un servidor Fastify adicional separaría físicamente otra capa, pero duplicaría autenticación, autorización y Realtime sin aportar valor al parcial.
- Firebase simplificaría algunos eventos, pero haría menos clara la defensa de relaciones, transacciones, índices, RLS e idempotencia.
- Una librería automática de caché de imágenes ocultaría la política LRU que el profesor necesita evaluar.

Supabase constituye el backend separado: su esquema, políticas, funciones, Storage y seed vivirán en `backend/`; ningún SQL ni lógica administrativa se mezclará con componentes React.

## 3. Identidad de producto

### 3.1 Nombre y personalidad

El nombre será **Marea**. La marca representa un flujo vivo de fotografías y conversaciones. La voz será directa, cálida y sobria; los textos de interfaz indicarán qué ocurre y cómo recuperarse de un error.

### 3.2 Design system

Paleta base:

- `ink`: `#121515`, texto y superficies oscuras.
- `paper`: `#F6F2EA`, fondo cálido principal.
- `coral`: `#FF604A`, acción y estado activo.
- `seaGlass`: `#73BFAE`, acento secundario y estados informativos.
- `deepBlue`: `#2448A8`, enlaces y acciones de confianza.
- `danger`: `#C5362F`, errores y acciones destructivas.

La interfaz será clara y editorial: fotografía dominante, bordes mínimos, sombras puntuales y una escala de espaciado basada en 4 puntos. Los targets táctiles medirán al menos 44 x 44 puntos. El contraste de texto normal será como mínimo 4.5:1. Los iconos tendrán etiquetas de accesibilidad y no se usará únicamente color para comunicar estados.

La tipografía principal será Inter, empaquetada como asset local y cargada con `expo-font`; mientras carga se mostrará la alternativa sans serif del sistema sin cambios bruscos de layout.

La única expresión visual fuerte será el contraste entre el papel cálido y el coral sobre fotografías. Se evitarán gradientes decorativos, exceso de tarjetas redondeadas, sombras pesadas y animaciones que no expliquen un cambio de estado.

## 4. Estructura del repositorio

```text
project/
├── mobile/
│   ├── app/                       # rutas Expo Router
│   ├── assets/
│   ├── src/
│   │   ├── components/            # componentes compartidos reales
│   │   ├── core/                  # errores, resultado, configuración
│   │   ├── data/                  # SQLite, Supabase, mappers
│   │   ├── domain/                # entidades y contratos
│   │   ├── features/              # auth, feed, posts, social, stories, chat
│   │   ├── services/              # sync, image cache, realtime, connectivity
│   │   ├── theme/
│   │   └── utils/
│   └── tests/
├── backend/
│   ├── supabase/
│   │   ├── migrations/
│   │   ├── functions/
│   │   └── seed.sql
│   ├── scripts/                   # seed administrativo reproducible
│   └── README.md
├── docs/
│   ├── ARCHITECTURE.md
│   ├── DEFENSA.md
│   └── PREGUNTAS_DEFENSA.md
├── .env.example
└── README.md
```

La organización será feature-based en UI y basada en contratos en los límites. No se crearán capas ceremoniales: una abstracción debe aislar una fuente de datos, una regla de dominio o un efecto difícil de probar.

## 5. Navegación

Un stack raíz contendrá autenticación, tabs y pantallas globales como visor de stories, creación de post y conversación. Las tabs visibles serán Inicio, Explorar, Crear, Actividad y Perfil. Inicio, Explorar, Actividad y Perfil mantendrán stacks independientes.

Las rutas canónicas serán:

```text
/post/[postId]
/profile/[username]
/messages/[conversationId]
/stories/[userId]
```

El scheme será `marea://`. `marea://post/{id}` y `marea://profile/{username}` abrirán el destino después de restaurar la sesión y validar acceso. En Expo Go, las mismas rutas se probarán con el formato `exp://.../--/post/{id}` porque el contenedor no registra schemes personalizados.

## 6. Modelo de dominio y backend

### 6.1 Entidades principales

- `profiles`: identidad pública, biografía, avatar y `is_private`.
- `follows`: relaciones aceptadas, únicas por par de usuarios.
- `follow_requests`: solicitudes pendientes, aceptadas o rechazadas.
- `posts` y `post_media`: contenido y fotografías.
- `post_likes`: like único por usuario y post.
- `comments`: comentarios y respuesta opcional a otro comentario.
- `stories` y `story_views`: contenido efímero y vistos.
- `activities`: eventos visibles para el destinatario.
- `conversations`, `conversation_members` y `messages`.
- `message_receipts`: estado entregado y leído por miembro.
- `client_operations`: claves de idempotencia procesadas.

Las claves serán UUID. Todas las entidades sincronizables tendrán `created_at`, `updated_at` y, cuando corresponda, borrado lógico. Los índices cubrirán cursores del feed, seguidores, solicitudes pendientes, bandeja por último mensaje y mensajes por conversación/fecha.

### 6.2 Privacidad y RLS

La privacidad será una propiedad del backend. Las políticas permitirán leer contenido privado únicamente al propietario o a seguidores aceptados. Las listas de seguidores/seguidos de una cuenta privada seguirán la misma regla. Las conversaciones y mensajes solo serán visibles para miembros.

Las mutaciones sensibles se realizarán mediante funciones SQL `security invoker` o funciones controladas que validen identidad y estado dentro de una transacción. Aceptar una solicitud insertará el follow y cerrará la solicitud atómicamente. La publishable key no omite RLS y la service role jamás llegará al cliente.

Los objetos de Storage usarán rutas con el UID propietario. El acceso a medios respetará las mismas relaciones que los registros y se entregará con URLs firmadas cuando el contenido no sea público.

## 7. Flujo de datos

La UI dependerá de casos de uso y contratos, no del cliente de Supabase. Los repositorios combinarán una fuente local SQLite y una remota Supabase.

```text
Pantalla
  -> hook de feature
  -> caso de uso
  -> repositorio
       -> SQLite
       -> Supabase
```

Las lecturas mostrarán primero datos locales, después intentarán refrescar desde remoto y finalmente actualizarán SQLite y la pantalla. La interfaz distinguirá entre datos frescos, cacheados, pendientes y fallidos.

Los errores de infraestructura se transformarán en errores de dominio legibles. Ninguna pantalla quedará vacía por un fallo: habrá skeleton, estado vacío, error con reintento o banner offline según corresponda.

## 8. Offline-first y UI optimista

### 8.1 Escrituras locales

Likes y comentarios seguirán esta secuencia:

1. Iniciar una transacción SQLite.
2. Aplicar el cambio optimista al modelo local.
3. Insertar una operación en `sync_operations` con `operation_id`, tipo, payload, fecha e intentos.
4. Confirmar la transacción y renderizar el estado pendiente.
5. Solicitar al `SyncManager` que procese la cola si existe conectividad.

Si la aplicación se cierra después del paso 3, la operación permanece. Si la mutación remota falla de forma transitoria, conserva el estado pendiente. Si falla definitivamente por autorización o validación, se reconcilia el dato local y se informa al usuario.

### 8.2 SyncManager

Habrá una sola instancia por proceso y un mutex impedirá dos workers simultáneos. El worker seleccionará la operación pendiente más antigua, marcará un lease corto, ejecutará la mutación y solo entonces avanzará a la siguiente. Los reintentos usarán backoff exponencial limitado.

Cada operación llevará un UUID que el backend registrará en `client_operations`. Repetirla devolverá el resultado anterior o no producirá un segundo efecto. Para likes, la verdad final será la presencia o ausencia de una relación única, no un incremento ciego. Los comentarios conservarán el ID generado por el cliente para evitar duplicados.

La reconciliación usará `updated_at` remoto para contenido editable y reglas específicas para relaciones. No se aplicará una política universal de last-write-wins a contadores o relaciones.

El término "background" en Expo Go significa reanudación al recuperar conexión mientras la app está activa y al volver al foreground. No se prometerá ejecución indefinida después de que el sistema termine la aplicación.

## 9. Caché de imágenes

El servicio propio seguirá dos niveles:

```text
URL remota
  -> índice RAM LRU
  -> índice y archivo de disco LRU
  -> descarga de red cancelable
```

### 9.1 RAM

Un mapa ordenado limitará entradas por costo aproximado. Cada hit moverá la entrada al frente. Al superar el presupuesto se liberarán las referencias menos recientes que no estén en uso. RAM mantendrá referencias y metadatos de recursos activos; no almacenará copias base64 de fotografías grandes.

El índice RAM resolverá URL, dimensiones, URI local y referencias activas sin consultar SQLite. El renderer recibirá archivos locales y tendrá desactivado su caché de disco automático para no crear una segunda política opaca. La memoria decodificada que administra la plataforma seguirá su ciclo nativo; Marea controlará la vida de sus referencias y nunca retendrá una imagen fuera del presupuesto lógico.

### 9.2 Disco

Los archivos vivirán en el directorio de caché de Expo y sus metadatos en SQLite: URL, clave hash, URI local, tamaño, último acceso y estado. La inserción y el desalojo se serializarán. Al superar el presupuesto se borrarán primero archivos no fijados con menor `last_access`.

### 9.3 Red, deduplicación y cancelación

Un registro `inFlight` compartirá una descarga entre celdas que pidan la misma URL. Cada consumidor obtendrá un handle cancelable. La descarga solo se abortará cuando no queden consumidores. Las celdas cancelarán su handle al desmontarse o salir del conjunto visible.

Los archivos se descargarán a un nombre temporal y se moverán al nombre definitivo después de validarse, evitando entradas corruptas. Los fallos no quedarán registrados como hits.

Las pruebas verificarán orden LRU, presupuesto, deduplicación, cancelación de último consumidor y recuperación ante metadata huérfana.

## 10. Feed y rendimiento

El feed usará una lista virtualizada con paginación por cursor, claves estables, layouts de imagen con relación de aspecto conocida y renderizado por ventanas. La visibilidad controlará precarga y cancelación. Los componentes de post recibirán props pequeñas y callbacks estables; la memoización se aplicará únicamente tras identificar límites de render claros.

Las suscripciones Realtime no se crearán por celda. El feed tendrá como máximo una suscripción coordinada para eventos relevantes y actualizará el repositorio local. Se limpiarán listeners, timers y descargas al desmontar.

La vista de comentarios tendrá una suscripción por post abierto para inserts y cambios visibles. Al cerrarla se removerá el canal. Los eventos se reconciliarán por ID para que un comentario optimista y su confirmación Realtime no aparezcan dos veces.

Se evitarán imágenes base64, consultas N+1 y cargas completas de comentarios. La respuesta de feed vendrá de una función paginada con agregados necesarios y acceso ya filtrado por privacidad.

## 11. Stories

Solo se consultarán stories no expiradas (`created_at + 24 horas`). El visor mostrará segmentos de progreso, avanzará automáticamente, pausará al mantener presionado y permitirá navegar con zonas táctiles. El estado visto se escribirá primero en SQLite y se sincronizará con `story_views`.

Los timers se pausarán cuando la app pase a background o el recurso no esté listo. Cerrar el visor cancelará timers, gestos y precargas.

## 12. Mensajería y Realtime

La bandeja se ordenará por `last_message_at`. Al abrir una conversación se cargarán mensajes desde SQLite y después páginas remotas. Una única suscripción por conversación activa recibirá inserts y receipts; otra suscripción de bandeja actualizará últimos mensajes y no leídos.

Los mensajes usarán ID de cliente e idempotencia. Los eventos duplicados se descartarán por ID. `delivered_at` se registrará cuando el cliente receptor persista el mensaje; `read_at`, cuando la conversación esté visible y el mensaje entre al rango leído.

Typing será un evento efímero de Presence/Broadcast con expiración, no una fila permanente. Se enviará con throttle, se limpiará al dejar de escribir y expirará aunque se pierda el evento final.

Las suscripciones tendrán propietarios explícitos, evitarán duplicados y se removerán al cambiar de sesión, conversación o desmontar. La reconexión refrescará el delta remoto antes de confiar nuevamente en eventos en vivo.

## 13. Funcionalidades de producto

- Autenticación por correo y contraseña, recuperación de sesión y cierre de sesión.
- Onboarding de perfil y edición posterior.
- Perfiles públicos/privados, follow/unfollow y solicitudes aceptables/rechazables.
- Feed paginado, likes, comentarios, compartir mediante enlace interno y share sheet.
- Creación de publicación con imagen estática, descripción, progreso y reintento.
- Explore con búsqueda de perfiles y cuadrícula de publicaciones accesibles.
- Activity para likes, comentarios, follows y solicitudes.
- Perfil con estadísticas y cuadrícula de posts.
- Stories efímeras con visto local y remoto.
- Inbox, conversación, typing, delivered/read y no leídos.
- Deep links de post y perfil.

La demo mostrará contenido abundante mediante un seed reproducible. Las cuentas privadas y las conversaciones tendrán estados preparados para demostrar cada flujo.

## 14. Seed y cuentas demo

Un script ejecutado exclusivamente desde `backend/` usará una service role proporcionada al proceso local para crear usuarios Auth y datos relacionados. La clave administrativa no se escribirá en archivos versionados ni se copiará a `mobile/`.

El seed será idempotente y creará al menos:

- seis perfiles con credenciales documentadas para demo;
- cuentas públicas y privadas;
- cuarenta publicaciones para scroll largo;
- relaciones y solicitudes pendientes;
- likes y comentarios;
- stories vigentes;
- dos conversaciones con estados delivered/read distintos;
- actividades vistas y no vistas.

Las fotografías del seed usarán URLs estables autorizadas para demo o assets versionados con licencia clara. La documentación diferenciará Supabase local y proyecto alojado.

## 15. Pruebas y validación

La lógica crítica se desarrollará con ciclos red-green-refactor. Las pruebas unitarias cubrirán:

- LRU de RAM y disco;
- cola FIFO, mutex y leases;
- reintentos e idempotencia;
- reconciliación de likes y comentarios;
- deduplicación y cancelación de imágenes;
- reducers o stores no triviales;
- mappers de datos.

Las políticas RLS tendrán pruebas SQL positivas y negativas para propietario, seguidor, solicitante y extraño. Habrá pruebas de integración de repositorios con adaptadores controlados y una lista manual reproducible para Expo Go, offline, reconexión, Realtime y deep links.

Después de cada corte funcional se ejecutarán tests, TypeScript, lint y Expo Doctor. La auditoría final revisará arquitectura, renders/listeners, secretos/RLS y cumplimiento literal del parcial.

## 16. Documentación de entrega

- `README.md`: instalación desde cero, `.env`, Supabase local/alojado, seed y Expo Go.
- `docs/ARCHITECTURE.md`: arquitectura real y diagramas Mermaid.
- `docs/DEFENSA.md`: explicación pedagógica con referencias a funciones reales.
- `docs/PREGUNTAS_DEFENSA.md`: al menos 40 preguntas con respuesta y ubicación en código.
- `.env.example`: solo nombres y valores de ejemplo seguros.

La documentación no afirmará que una capacidad fue probada si solo compila. Distinguirá pruebas automatizadas, validación local, prueba física y limitaciones del entorno.

## 17. Riesgos y límites explícitos

- Expo Go no ejecuta código nativo personalizado. Toda dependencia se comprobará con Expo Doctor y documentación oficial.
- Un scheme personalizado se verifica plenamente en una build instalada; dentro de Expo Go se valida la ruta equivalente `exp://.../--/`.
- iOS y Android pueden suspender o terminar la app. La cola persiste y continúa al foreground; no se garantiza trabajo arbitrario con el proceso muerto.
- El objetivo de 60 FPS se perseguirá con virtualización, ventanas y medición, pero solo se afirmará con evidencia obtenida en un dispositivo físico.
- Una prueba local de RLS no sustituye la verificación contra el proyecto Supabase que se utilice en la demostración.

## 18. Orden de entrega por cortes verticales

1. Base Expo, design system, navegación, SQLite y modo demo mínimo.
2. Auth, perfil y backend/RLS base.
3. Relaciones públicas/privadas y solicitudes.
4. Feed, publicación, likes y comentarios con UI optimista.
5. Caché LRU cancelable y optimización del feed.
6. Explore, Activity y perfil completo.
7. Stories.
8. Mensajería Realtime y receipts.
9. Offline/reconciliación endurecidos y deep links.
10. Seed completo, documentación, auditorías y prueba física.

Cada corte deberá quedar compilable, probado y explicable antes de ampliar el siguiente.
