# Validación y límites de Marea

## Evidencia automatizada

Comandos reproducibles desde la raíz:

```bash
npm run typecheck
npm run lint -- --no-cache
npm test -- --runInBand
npm run backend:test
npm --prefix backend run test:local
npx supabase@2.119.0 --workdir backend db lint --level warning
cd mobile
npx expo-doctor
npx expo install --check
npx expo export --platform android
```

Resultados de la base de entrega: 49 aserciones pgTAP de privacidad/chat/stories y DB lint sin errores. Expo Doctor pasó 21/21 y las exportaciones Android (Hermes) y web se generaron correctamente. La regresión actual pasó TypeScript, lint y 74 pruebas de lógica, navegación y adaptadores por plataforma. El smoke incluye ocho grupos, con subida y lectura de avatar autenticadas.

## Despliegue Supabase Cloud (9 de octubre)

Se creó el proyecto alojado independiente `MAREA` en `sa-east-1` (ref. `zdtlzybvmpiiilgimrfy`) y se aplicaron las migraciones `0001`–`0012`; `migration list --linked` confirmó que el historial local y remoto coincide. El smoke remoto pasó sus ocho grupos contra Auth, PostgreSQL, Storage privado y Realtime real, incluyendo mensajes bidireccionales y recibos entre dos sesiones independientes. Después se cargó el seed reproducible para la sustentación: seis usuarios, 40 publicaciones PNG, seis historias, relaciones, solicitudes, comentarios y una conversación. Las claves siguen fuera del repositorio; este registro documenta la verificación realizada, no garantiza que el estado externo no cambie después.

## Regresión de guardado de perfil (5 de octubre)

El usuario informó que la foto seguía bloqueada después de pulsar Guardar. La corrección previa solo iniciaba el timeout después de `getSession()` y confiaba en que el transporte rechazara al abortar. El guardado posterior del perfil tampoco tenía deadline. La ausencia de peticiones a Storage no basta para atribuir el fallo a la lectura del archivo: también puede estar esperando la sesión.

`core/with-deadline.ts` limita la espera independientemente del transporte. Se aplica a sesión/subida y actualización del perfil; cancela la petición cuando es posible y evita iniciar una escritura si la validación de identidad termina después del vencimiento. Un timeout de guardado es un resultado incierto: se informa que no se pudo confirmar, sin afirmar que el servidor no guardó. El botón conserva el texto de etapa junto al indicador.

Las regresiones cubren sesión bloqueada, respuesta tardía, transporte que ignora abort y guardado de avatar junto con los campos del perfil. Esto verifica recuperación del estado de carga, no demuestra todavía que la foto se guarde físicamente en el teléfono del usuario. Ese recorrido continúa pendiente de confirmación.

El 9 de octubre la suite pgTAP se ejecutó con datos reales ya presentes y se aislaron sus consultas a los UUID de fixtures, de modo que las 49 aserciones no dependen de una base vacía. El smoke detectó que el acuse `SUBSCRIBED` del stack local puede llegar una fracción de segundo antes de registrar el filtro `postgres_changes`; el helper espera 500 ms después del acuse y dos ejecuciones integrales consecutivas pasaron los ocho grupos sin ampliar el timeout de eventos. El cliente recarga estado al reconectar: no usa los eventos como única fuente de verdad.

## Regresión de entrada

`mobile/src/features/navigation/auth-navigation.test.tsx` monta el navegador real con pantallas de prueba y sesión controlada. Comprueba:

- Apertura sin sesión → login.
- Sesión restaurada → feed.
- Ruta protegida sin sesión → login.
- Login → feed → cerrar sesión → login.

El fallo corregido era tener una ruta pública auxiliar antes que los grupos de autenticación y producto. Ahora los destinos iniciales son explícitos y la versión final solo expone rutas de autenticación funcionales.

Referencia del comportamiento de rutas protegidas: [Expo Router](https://docs.expo.dev/router/advanced/protected/).

## Revisión visual

El login se inspeccionó en navegador a 390 × 844: hero fotográfico, formulario, mostrar contraseña y registro. La vista web es apoyo visual, no sustituye las pruebas nativas. La cola web usa `localStorage`: evita abrir el worker OPFS de `expo-sqlite`, cuyo acceso exclusivo falla si existe otra pestaña o worker. Expo Go conserva SQLite nativo.

El recorrido web autenticado se validó con una cuenta temporal: login, selector de archivo del PC, publicación optimista, sincronización, persistencia en Supabase y recarga del feed. La consola final quedó sin errores ni advertencias; después se eliminaron la cuenta y sus publicaciones. Web usa `localStorage` para Auth e historias vistas, `expo-image` para caché y una URI de imagen duradera para la cola; Expo Go conserva SQLite y el caché de archivos nativo. Las pruebas de regresión impiden volver a cargar `expo-file-system` desde esas rutas web.

## Prueba física pendiente

Cerrar Marea dentro de Expo Go y escanear de nuevo el QR raíz. Si Metro antiguo sigue abierto, detenerlo y ejecutar `cd mobile && npx expo start --clear`.

1. Sin sesión, comprobar login; registrarse y verificar entrada inmediata.
2. Publicar una foto real, cambiar avatar y editar perfil.
3. Con dos cuentas: follow, privado, solicitud, rechazo, nueva solicitud y aceptación.
4. Comentar/responder, like/unlike y compartir un post autorizado.
5. Abrir stories, mantener para pausar, navegar y verificar visto.
6. Dos teléfonos: enviar mensajes en ambas direcciones, typing, entregado, leído y reconectar.
7. Con feed cargado, modo avión: like y comentario; reiniciar app sin cerrar sesión; reconectar y comprobar una sola mutación remota.
8. Probar enlaces Expo Go de post/perfil y regresar entre stacks de pestañas.
9. Medir frames y memoria en un dispositivo identificado con una lista larga; no se ha certificado 60 FPS.

## Condiciones antes de publicar

- Correo: el registro no exige confirmación. Recuperación por correo quedó fuera del alcance porque no hay SMTP configurado.
- Seguridad: SQLite y caché local no están cifrados por la app; RLS no revoca copias ya descargadas mientras el teléfono está desconectado. URLs firmadas mantienen validez hasta su expiración.
- Dependencias: npm audit reportó 65 hallazgos transitivos (16 moderados, 49 altos). No se aplicó `audit fix --force`, que puede romper el SDK. Expo Doctor sí pasó 21/21 con todos los parches esperados de SDK 57; la revisión de exposición de transitivas queda pendiente antes de un lanzamiento público.
- No hay push remoto ni sincronización garantizada con el proceso terminado. El seed es opcional; no hay modo demo ni cuentas ficticias en el cliente.

No confundir "bundle exportado" con "recorrido físico aprobado". El criterio final requiere ejecutar esta lista en Expo Go y configurar los proveedores externos.
