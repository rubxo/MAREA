# Herramientas del backend

Requieren Node 22+ y las dependencias instaladas en `mobile` (`npm ci --prefix mobile`). No se ejecutan al iniciar la app. El cliente móvil no contiene cuentas preconfiguradas ni recibe credenciales administrativas.

## Prueba real y aislada

Con Supabase local ya iniciado en `backend`, ejecutar desde la raíz:

```sh
npm --prefix backend run test:local
```

El lanzador consulta `supabase status -o json`, mantiene las claves en memoria y las pasa exclusivamente al proceso de prueba. Nunca las imprime. Para un proyecto de pruebas remoto, exportar en el entorno de backend `SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY`, y ejecutar `npm --prefix backend run test:smoke`.

La prueba crea dos usuarios temporales con contraseña aleatoria, utiliza sus sesiones con la clave anónima para las operaciones de producto y comprueba Auth, bytes PNG en Storage privado, publicación, feed, solicitudes privadas aceptadas/rechazadas, reintentos concurrentes de likes/comentarios/mensajes, respuestas anidadas, actividades, mensajes y recibos por WebSocket, typing privado e historias de 24 horas. Para comprobar la expiración sin esperar un día, adelanta únicamente el reloj de un registro temporal mediante el cliente administrativo. `finally` elimina exclusivamente los usuarios, objetos y conversación creados por esa ejecución. Un fallo de limpieza termina con código de error. No acredita pruebas en dispositivos, rendimiento de 60 FPS ni reconexión móvil.

## Fixtures opcionales persistentes

Solo si se desea poblar un proyecto de pruebas, exportar las tres variables de backend anteriores y `SEED_PASSWORD` (mínimo 12 caracteres), después ejecutar:

```sh
npm --prefix backend run seed
```

Es una escritura explícita sobre el proyecto indicado. Crea seis cuentas `fixture_marea_1@example.invalid` a `fixture_marea_6@example.invalid`, 40 publicaciones con PNG geométricos originales generados en memoria, avatares, seis historias, seguimientos y solicitudes pendientes, una aceptación, likes, comentarios anidados, actividades y una conversación con cuatro mensajes. Los perfiles 5 y 6 son privados. Son registros reales de prueba almacenados en Supabase; las imágenes y textos se identifican como fixtures. No representan personas ni publicaciones reales.

Los UUID y las operaciones son deterministas. Repetir el comando actualiza la contraseña explícita y conserva las identidades sin duplicar posts, comentarios ni mensajes. Las historias existentes no se renuevan y expiran normalmente. El comando no borra datos ajenos y rechaza colisiones con usuarios sin su marca administrativa. La contraseña nunca se imprime ni se incluye en el repositorio. La clave `service_role` debe permanecer únicamente en el entorno del backend, nunca en variables `EXPO_PUBLIC_*`.
