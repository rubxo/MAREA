# Backend de Marea

El backend vive separado de la aplicación móvil y se administra como un proyecto de Supabase versionado. PostgreSQL es la fuente de verdad; Auth identifica al usuario, Storage guarda imágenes privadas y Realtime distribuye mensajes y recibos que ya pasaron RLS.

## Requisitos

- Docker Desktop/Engine en ejecución.
- Node.js 20 o superior.
- Supabase CLI 2.119 o compatible. Los comandos usan `npx` para no requerir una instalación global.

## Arranque local

Desde la raíz del repositorio:

```bash
npx supabase@2.119.0 --workdir backend start
npx supabase@2.119.0 --workdir backend status
```

El proyecto usa puertos `55320`–`55327` para poder convivir con otras instalaciones locales. La salida de `status` entrega la URL y la clave publicable para el `.env` móvil. La `SECRET_KEY`, `SERVICE_ROLE_KEY` y el secreto JWT son administrativos: nunca deben copiarse a Expo ni subirse al repositorio.

Para recrear la base desde las migraciones:

```bash
npx supabase@2.119.0 --workdir backend db reset
```

Para detener solo este proyecto:

```bash
npx supabase@2.119.0 --workdir backend stop
```

## Verificación

```bash
npx supabase@2.119.0 --workdir backend test db
npx supabase@2.119.0 --workdir backend db lint --level warning
```

`rls.test.sql` cambia deliberadamente de identidad JWT para probar accesos permitidos y denegados. Cubre publicaciones e historias privadas, listas de seguidores, conversaciones, mensajes e idempotencia de likes y envíos.

## Migraciones

- `0001_initial_schema.sql`: entidades, restricciones, índices de cursor, buckets privados y tablas publicadas a Realtime.
- `0002_rls_policies.sql`: privilegios mínimos, helpers no expuestos, políticas RLS para datos, Storage y canales privados.
- `0003_domain_functions.sql`: operaciones transaccionales e idempotentes para follow, solicitudes, likes, comentarios y mensajes.
- `0004`–`0005`: perfil al registrarse, lectura paginada y publicación de fotos.
- `0006`–`0007`: inbox, recibos, canales privados y caducidad de stories.
- `0008`–`0012`: cancelación de seguimiento, permisos de medios, recibos sin actualizaciones redundantes, corrección de publicación, permisos administrativos separados y validación de carpeta de stories.

Para actualizar sin borrar datos utiliza `npm run backend:migrate` desde la raíz. `db reset` es destructivo y solo debe utilizarse cuando quieras recrear tu base local.

Pruebas integradas: `npm --prefix backend run test:local`. Crean usuarios temporales propios, ejercitan Auth/Storage/RPC/WebSockets y limpian sus propios recursos. El seed es opcional y explícito: [instrucciones](scripts/README.md).

Google requiere activar el proveedor y ejecutar un retorno HTTP separado: [configuración](../docs/GOOGLE.md). Para recuperación por código, configura la plantilla `supabase/templates/recovery.html` en Auth; el SMTP real corresponde al despliegue alojado.

Los RPC públicos son wrappers `security invoker`. La lógica con privilegios elevados permanece en el esquema `private`, fija `search_path = ''`, valida `auth.uid()` y comprueba la autorización del recurso. Cada mutación offline lleva un `operation_id`; un advisory lock serializa reintentos concurrentes y `client_operations` devuelve el resultado ya confirmado.

## Despliegue remoto

Después de crear un proyecto en Supabase:

```bash
npx supabase@2.119.0 --workdir backend login
npx supabase@2.119.0 --workdir backend link --project-ref TU_PROJECT_REF
npx supabase@2.119.0 --workdir backend db push
```

En Realtime, desactiva canales públicos antes de usar typing/presence. Los clientes deben abrir tópicos privados con el formato `conversation:<uuid>`; la política comprueba que el usuario pertenece a esa conversación.
