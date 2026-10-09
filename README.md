# Marea

Red social de fotografías con Expo SDK 57, React Native, TypeScript estricto y Supabase. La aplicación utiliza cuentas y datos reales del backend. No contiene modo demo ni inicio automático con usuarios simulados.

## Arranque

Requisitos: Node 22.13+ (probado con Node 24), npm, Docker para Supabase local y Expo Go compatible con SDK 57 en el teléfono.

Desde la raíz del repositorio clonado:

```bash
npm install
npm run backend:start
npm run backend:migrate
cp mobile/.env.example mobile/.env
npx supabase@2.119.0 --workdir backend status
```

En `mobile/.env` coloca:
- `EXPO_PUBLIC_SUPABASE_URL`: en teléfono, `http://IP_LAN_DE_TU_PC:55321`; **localhost en el teléfono no apunta al PC**. En Supabase alojado, la URL HTTPS del proyecto.
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: clave publishable o anon que muestra Supabase. Nunca service_role.

PC y teléfono deben compartir Wi-Fi; habilita acceso LAN a puertos 8081 y 55321. Abre:

```bash
cd mobile
npx expo start --clear
```

Escanea el QR con Expo Go. Crea tu propia cuenta. MAREA Cloud y el backend local tienen confirmación de correo desactivada, por lo que la sesión comienza al terminar el registro. El frontend muestra estados vacíos reales hasta que publiques/sigas cuentas. El feed incluye tus fotos y las de quienes sigues; Explorar permite descubrir publicaciones visibles y buscar usuarios.

El backend local queda en Docker aunque cierres Metro. Studio: `http://localhost:55323`; buzón local de pruebas: `http://localhost:55324`. No ejecutes `db reset` sobre datos que quieras conservar. Para apagar conservando datos: `npx supabase@2.119.0 --workdir backend stop`.

## Supabase alojado

Crea un proyecto, configura URL/clave pública en mobile/.env y aplica las migraciones:

```bash
npx supabase@2.119.0 login
npx supabase@2.119.0 --workdir backend link --project-ref TU_PROJECT_REF
npx supabase@2.119.0 --workdir backend db push
```

La confirmación de correo está desactivada para que el registro inicie sesión inmediatamente. Desactiva canales Realtime públicos (usa canales privados para typing). Las políticas SQL protegen conversaciones y contenido privado.

## Recorrido de prueba

1. Dos teléfonos, dos cuentas reales A y B. Publica con A, busca A desde B en Explorar y síguela.
2. Configura A privada; con una tercera cuenta solicita seguirla. A acepta/rechaza en Actividad. Comprueba que el contenido privado no se muestra antes de aceptar.
3. Abre una foto: like, comentario, respuesta a comentario y compartir. Cambia de pestaña y vuelve: cada pestaña tiene su propio stack.
4. Crea una historia. Comprueba progreso, pausa manteniendo pulsado, anterior/siguiente y marcas de visto; el servidor fija caducidad a 24 horas.
5. Mensajes: escribe el username de la otra cuenta, envía y comprueba escribiendo/entregado/leído. Ambos teléfonos deben tener sesión activa.
6. Carga el feed, activa modo avión, cambia un like y escribe un comentario. Cierra/reabre la app sin cerrar sesión. Reconecta: la cola conserva UUIDs y sincroniza sin duplicar. La sincronización se ejecuta con la app activa.
7. Comparte una publicación. En Expo Go el enlace es `exp://IP:8081/--/post/UUID`; `marea://post/UUID` corresponde a una app instalada con esquema propio. Perfiles: `.../--/profile/username`. Para abrir contenido protegido debes tener sesión.

## Pruebas

```bash
npm run typecheck
npm run lint
npm test -- --runInBand
npm run doctor
npm run backend:test
npm --prefix backend run test:local
cd mobile && npx expo export --platform android
```

La prueba local crea dos usuarios temporales, verifica Auth, Storage, PostgreSQL y WebSockets y elimina únicamente sus propios datos. El seed opcional se ejecuta explícitamente siguiendo [backend/scripts/README.md](backend/scripts/README.md). No hay cuentas preconfiguradas en el cliente ni carga de fixtures por defecto.

## Límites de verificación

Las pruebas automatizadas y la exportación Android no certifican 60 FPS ni funcionamiento físico en tu modelo de teléfono. Revisa [QA.md](docs/QA.md). Las imágenes ya descargadas pueden seguir visibles offline: ninguna app puede revocar remotamente una copia en un dispositivo desconectado; nuevas lecturas del servidor sí aplican RLS. No hay push remoto ni sincronización garantizada con la app terminada.

## Documentación

- [Arquitectura](docs/ARCHITECTURE.md)
- [Guía de defensa](docs/DEFENSA.md)
- [Guion rápido de sustentación](docs/SUSTENTACION_RAPIDA.md)
- [Preguntas del profesor](docs/PREGUNTAS_DEFENSA.md)
- [Validación](docs/QA.md)
