# Google sin depender de código nativo personalizado

Expo documenta que el retorno OAuth convencional con esquema propio no se prueba en Expo Go: https://docs.expo.dev/guides/authentication/. Por eso Marea utiliza navegador + retorno HTTP(S) + PKCE; no utiliza el SDK nativo de Google.

## Configuración real

1. Crea credenciales OAuth tipo **Web application** en Google Cloud y configura la pantalla de consentimiento. Si está en modo Testing, añade tus cuentas como test users.
2. En Google, registra como Authorized redirect URI el callback mostrado por Supabase Auth > Providers > Google: normalmente `https://PROJECT_REF.supabase.co/auth/v1/callback`. Es el callback de **Supabase**, no el relay.
3. Activa Google en Supabase e introduce Client ID y Client Secret allí. El secreto NO va en mobile/.env.
4. Ejecuta el servicio de retorno:
   ```bash
   npm --prefix backend run oauth
   ```
   En desarrollo puede escucharse en `http://IP_LAN:8787`; usa un proyecto Supabase alojado y HTTPS público si el proveedor o tu red no permite el callback local. En despliegue publica este servicio detrás de TLS, con una sola instancia o almacén compartido, y configura rate limiting del proxy.
5. En Supabase Auth > URL Configuration > Redirect URLs añade `https://TU-RELAY/callback**` (o el origen LAN exacto para desarrollo). No uses comodines sobre dominios ajenos.
6. Configura `EXPO_PUBLIC_OAUTH_RELAY_URL=https://TU-RELAY` y reinicia Expo.
7. Pulsa Google, selecciona una cuenta y completa el consentimiento. La página de retorno indica cerrar la ventana y volver a Marea. El cliente recibe el código y lo intercambia por la sesión.

Fuentes: [Google en Supabase](https://supabase.com/docs/guides/auth/social-login/auth-google), [PKCE](https://supabase.com/docs/guides/auth/sessions/pkce-flow).

## Seguridad y límites

`backend/oauth-relay/server.mjs` mantiene solicitudes por cinco minutos, con 256 bits aleatorios para identificación, lectura y escritura separados. Leer exige bearer secreto; escribir el callback exige proof secreto. Solo transporta el **código** temporal ligado al verificador PKCE del cliente; no recibe contraseñas, service_role ni access/refresh tokens. Responde no-store, no-referrer y CSP; no registra URLs de callback. Limita solicitudes e impone un máximo de 500 flujos. No confíes en X-Forwarded-For sin configurar tu proxy.

`mobile/src/features/auth/google-login.ts` inicia OAuth con skipBrowserRedirect y usa `exchangeCodeForSession`. El cliente Supabase persiste el verificador y la sesión en almacenamiento de la app. Cancelar/expirar borra la solicitud. Un reinicio del relay invalida solicitudes pendientes y se debe reintentar; no invalida sesiones ya emitidas.

En Expo Go no hay redirección automática garantizada desde el navegador: el usuario vuelve manualmente. Para una app publicada se puede sustituir por Universal Links o esquema propio con un build firmado.

**Estado:** implementación y prueba local del relay disponibles. Activación y prueba contra Google pendientes de credenciales del propietario. No se ha simulado un login de Google.

