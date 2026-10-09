# Validación y límites de Marea

## Evidencia automatizada

Comandos reproducibles desde la raíz (la cuenta de Google no se simula):

```bash
npm run typecheck
npm run lint -- --no-cache
npm test -- --runInBand
npm --prefix backend run test:oauth
npm run backend:test
npm --prefix backend run test:local
npx supabase@2.119.0 --workdir backend db lint --level warning
cd mobile
npx expo-doctor
npx expo install --check
npx expo export --platform android
```

Resultados de la base de entrega: 49 aserciones pgTAP de privacidad/chat/stories; relay OAuth con aislamiento y caducidad; DB lint sin errores. Expo Doctor pasó 21/21 y las exportaciones Android (Hermes) y web se generaron correctamente. La regresión del 6 de octubre pasó TypeScript, lint y 72 pruebas de lógica, navegación y adaptadores por plataforma. El smoke incluye ocho grupos, con subida y lectura de avatar autenticadas.

## Regresión de guardado de perfil (5 de octubre)

El usuario informó que la foto seguía bloqueada después de pulsar Guardar. La corrección previa solo iniciaba el timeout después de `getSession()` y confiaba en que el transporte rechazara al abortar. El guardado posterior del perfil tampoco tenía deadline. La ausencia de peticiones a Storage no basta para atribuir el fallo a la lectura del archivo: también puede estar esperando la sesión.

`core/with-deadline.ts` limita la espera independientemente del transporte. Se aplica a sesión/subida y actualización del perfil; cancela la petición cuando es posible y evita iniciar una escritura si la validación de identidad termina después del vencimiento. Un timeout de guardado es un resultado incierto: se informa que no se pudo confirmar, sin afirmar que el servidor no guardó. El botón conserva el texto de etapa junto al indicador.

Las regresiones cubren sesión bloqueada, respuesta tardía, transporte que ignora abort y guardado de avatar junto con los campos del perfil. Esto verifica recuperación del estado de carga, no demuestra todavía que la foto se guarde físicamente en el teléfono del usuario. Ese recorrido continúa pendiente de confirmación.

El 9 de octubre la suite pgTAP se ejecutó con datos reales ya presentes y se aislaron sus consultas a los UUID de fixtures, de modo que las 49 aserciones no dependen de una base vacía. El smoke detectó que el acuse `SUBSCRIBED` del stack local puede llegar una fracción de segundo antes de registrar el filtro `postgres_changes`; el helper espera 500 ms después del acuse y dos ejecuciones integrales consecutivas pasaron los ocho grupos sin ampliar el timeout de eventos. El cliente recarga estado al reconectar: no usa los eventos como única fuente de verdad.

## Regresión de entrada

`mobile/src/features/navigation/auth-navigation.test.tsx` monta el navegador real con pantallas de prueba y sesión controlada. Comprueba:

- Apertura sin sesión → login.
- Sesión restaurada → feed.
- Ruta protegida sin sesión → login, nunca recuperación.
- Recuperación explícita → volver al login.
- Login → feed → cerrar sesión → login.

El fallo corregido era el orden del Stack: `recovery` estaba antes que los grupos de autenticación y producto. Expo Router la elegía como ruta disponible al invalidar la pantalla anterior. Ahora los destinos iniciales son explícitos y recuperación está al final. No se usa una redirección permanente que impida recuperarse por OTP.

Referencia del comportamiento de rutas protegidas: [Expo Router](https://docs.expo.dev/router/advanced/protected/).

## Revisión visual

El login se inspeccionó en navegador a 390 × 844: hero fotográfico, formulario, Google, mostrar contraseña, recuperación y registro. La vista web es apoyo visual, no sustituye las pruebas nativas. SQLite web requiere WASM y cabeceras de aislamiento en `mobile/metro.config.js`; se evita SSR para esta vista. [Documentación de Expo SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/).

El recorrido web autenticado se validó con una cuenta temporal: login, selector de archivo del PC, publicación optimista, sincronización, persistencia en Supabase y recarga del feed. La consola final quedó sin errores ni advertencias; después se eliminaron la cuenta y sus publicaciones. Web usa `localStorage` para Auth e historias vistas, `expo-image` para caché y una URI de imagen duradera para la cola; Expo Go conserva SQLite y el caché de archivos nativo. Las pruebas de regresión impiden volver a cargar `expo-file-system` desde esas rutas web.

## Prueba física pendiente

Cerrar Marea dentro de Expo Go y escanear de nuevo el QR **raíz**, no un enlace `/recovery`. Si Metro antiguo sigue abierto, detenerlo y ejecutar `cd mobile && npx expo start --clear`.

1. Sin sesión, comprobar login; abrir recuperación y volver; registrarse e iniciar sesión.
2. Publicar una foto real, cambiar avatar y editar perfil.
3. Con dos cuentas: follow, privado, solicitud, rechazo, nueva solicitud y aceptación.
4. Comentar/responder, like/unlike y compartir un post autorizado.
5. Abrir stories, mantener para pausar, navegar y verificar visto.
6. Dos teléfonos: enviar mensajes en ambas direcciones, typing, entregado, leído y reconectar.
7. Con feed cargado, modo avión: like y comentario; reiniciar app sin cerrar sesión; reconectar y comprobar una sola mutación remota.
8. Probar enlaces Expo Go de post/perfil y regresar entre stacks de pestañas.
9. Medir frames y memoria en un dispositivo identificado con una lista larga; no se ha certificado 60 FPS.

## Condiciones antes de publicar

- Google: requiere credenciales del propietario, proveedor Supabase activado y relay HTTPS. El botón y protocolo están implementados; el consentimiento real no está verificado. Ver `GOOGLE.md`.
- Correo: configurar SMTP y plantilla OTP en Supabase alojado; verificar entrega real y recuperación completa.
- Seguridad: SQLite y caché local no están cifrados por la app; RLS no revoca copias ya descargadas mientras el teléfono está desconectado. URLs firmadas mantienen validez hasta su expiración.
- Dependencias: npm audit reportó 65 hallazgos transitivos (16 moderados, 49 altos). No se aplicó `audit fix --force`, que puede romper el SDK. Expo Doctor sí pasó 21/21 con todos los parches esperados de SDK 57; la revisión de exposición de transitivas queda pendiente antes de un lanzamiento público.
- No hay push remoto ni sincronización garantizada con el proceso terminado. El seed es opcional; no hay modo demo ni cuentas ficticias en el cliente.

No confundir "bundle exportado" con "recorrido físico aprobado". El criterio final requiere ejecutar esta lista en Expo Go y configurar los proveedores externos.
