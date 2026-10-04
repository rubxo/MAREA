# Marea

Red social móvil de fotografía construida con Expo, React Native, TypeScript y Supabase. El proyecto está en desarrollo incremental; el frontend vive en `mobile/` y la infraestructura backend en `backend/`.

## Ejecutar la interfaz actual

Requisitos: Node.js 20 o superior y Expo Go actualizado.

```bash
cd mobile
npm install
npx expo start
```

Escanea el QR con Expo Go. Si no existe `mobile/.env`, Marea entra deliberadamente en modo demo local para poder recorrer la interfaz sin credenciales.

## Variables públicas

Copia `.env.example` como `mobile/.env` y reemplaza:

```text
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

`SUPABASE_SERVICE_ROLE_KEY` se utilizará únicamente desde los scripts administrativos de `backend/`; nunca debe copiarse dentro de `mobile/`.

## Verificación

```bash
npm test
npm run typecheck
npm run lint
npm run doctor
```

La preparación de Supabase, el seed y las credenciales demo se documentarán en `backend/README.md` cuando se complete ese corte funcional.
