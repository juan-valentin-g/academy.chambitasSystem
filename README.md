# Chambitas System API

Backend REST para una plataforma de trabajos y servicios. La API permite registrar usuarios, publicar trabajos, recibir postulaciones, seleccionar a una persona, dar seguimiento al trabajo mediante un match y publicar reseñas al finalizar.

Está construido con NestJS, TypeORM, MySQL, JWT y bcrypt.

## Contenido

- [Requisitos](#requisitos)
- [Instalación y configuración](#instalación-y-configuración)
- [Autenticación](#autenticación)
- [Flujo principal](#flujo-principal)
- [Referencia de endpoints](#referencia-de-endpoints)
- [Estados y reglas](#estados-y-reglas)
- [Errores HTTP](#errores-http)
- [Pruebas](#pruebas)
- [Limitaciones actuales](#limitaciones-actuales)

## Requisitos

- Node.js 20 o una versión compatible con NestJS 11.
- npm.
- MySQL 8 o compatible.
- Una base de datos llamada `trabajos_db`, o el nombre configurado en `.env`.

## Instalación y configuración

### 1. Instalar dependencias

```bash
npm install
```

### 2. Crear la base de datos

```sql
CREATE DATABASE IF NOT EXISTS trabajos_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

El proyecto todavía no incluye migraciones. Para desarrollo local se puede permitir que TypeORM genere las tablas con `DB_SYNCHRONIZE=true`. Esta opción no debe utilizarse en producción porque puede modificar el esquema automáticamente.

### 3. Configurar `.env`

Crear un archivo `.env` en la raíz:

```env
PORT=3000

DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=tu_password
DB_DATABASE=trabajos_db
DB_SYNCHRONIZE=true

JWT_SECRET=reemplazar_por_un_secreto_largo_y_seguro
JWT_EXPIRES_IN_SECONDS=86400
```

| Variable | Propósito | Valor habitual |
|---|---|---|
| `PORT` | Puerto HTTP de la API. | `3000` |
| `DB_HOST` | Servidor de MySQL. | `localhost` |
| `DB_PORT` | Puerto de MySQL. | `3306` |
| `DB_USERNAME` | Usuario de MySQL. | `root` |
| `DB_PASSWORD` | Contraseña de MySQL. | Depende de la instalación. |
| `DB_DATABASE` | Base de datos utilizada. | `trabajos_db` |
| `DB_SYNCHRONIZE` | Sincronización automática de entidades. | `true` solo en desarrollo. |
| `JWT_SECRET` | Secreto para firmar tokens. | Una cadena privada y segura. |
| `JWT_EXPIRES_IN_SECONDS` | Duración del token. | `86400` (24 horas). |

### 4. Iniciar la API

```bash
# Desarrollo con recarga automática
npm run start:dev

# Ejecución normal
npm run start
```

URL predeterminada:

```text
http://localhost:3000
```

No existe un prefijo global `/api`; las rutas comienzan directamente en `/auth`, `/jobs`, `/categories`, etc.

## Convenciones

- Los cuerpos se envían como JSON con `Content-Type: application/json`.
- Las rutas protegidas requieren un JWT como token Bearer.
- Los identificadores son enteros positivos.
- Las fechas se devuelven en formato ISO 8601.
- Los campos desconocidos en un JSON son rechazados.
- Los ejemplos son representativos; IDs y fechas cambian en cada instalación.
- MySQL puede devolver valores `DECIMAL`, como `presupuesto`, en forma de cadena.

## Autenticación

El registro y login devuelven `accessToken`:

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "nombre": "Ana López",
    "email": "ana@example.com",
    "telefono": "9511234567",
    "rol": "trabajador",
    "descripcion": null,
    "foto": null,
    "createdAt": "2026-08-22T18:00:00.000Z",
    "updatedAt": "2026-08-22T18:00:00.000Z"
  }
}
```

Enviar el token en las rutas protegidas:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

Ejemplo:

```bash
curl http://localhost:3000/auth/profile \
  -H "Authorization: Bearer TU_TOKEN"
```

Un token ausente, vencido o inválido produce `401 Unauthorized`.

## Flujo principal

1. Empleador y trabajador se registran con `POST /auth/register`.
2. El empleador crea un trabajo con `POST /jobs`.
3. El trabajador consulta oportunidades con `GET /jobs`.
4. El trabajador se postula con `POST /jobs/:jobId/applications`.
5. El empleador consulta candidatos con `GET /jobs/:jobId/applications`.
6. El empleador acepta una postulación con `PATCH /applications/:id/accept`.
7. La API crea un match y cambia el trabajo a `EN_PROCESO`.
8. Ambos participantes consultan el match con `GET /matches`.
9. Un participante finaliza el trabajo con `PATCH /matches/:id/complete`.
10. Cada participante puede reseñar al otro con `POST /matches/:matchId/reviews`.

## Referencia de endpoints

### Resumen

| Método | Ruta | Auth | Propósito |
|---|---|---:|---|
| `GET` | `/` | No | Comprobar que el servidor responde. |
| `POST` | `/auth/register` | No | Registrar usuario. |
| `POST` | `/auth/login` | No | Iniciar sesión. |
| `GET` | `/auth/profile` | Sí | Consultar usuario autenticado. |
| `POST` | `/categories` | No* | Crear categoría. |
| `GET` | `/categories` | No | Listar categorías. |
| `GET` | `/categories/:id` | No | Consultar categoría. |
| `PATCH` | `/categories/:id` | No* | Actualizar categoría. |
| `DELETE` | `/categories/:id` | No* | Eliminar categoría. |
| `POST` | `/jobs` | Sí | Publicar trabajo. |
| `GET` | `/jobs` | No | Buscar trabajos publicados. |
| `GET` | `/jobs/:id` | No | Consultar trabajo publicado. |
| `PATCH` | `/jobs/:id` | Sí | Actualizar trabajo propio. |
| `DELETE` | `/jobs/:id` | Sí | Eliminar trabajo propio. |
| `POST` | `/jobs/:jobId/applications` | Sí | Postularse. |
| `GET` | `/jobs/:jobId/applications` | Sí | Consultar candidatos de un trabajo propio. |
| `PATCH` | `/applications/:id/accept` | Sí | Aceptar postulación y crear match. |
| `PATCH` | `/applications/:id/reject` | Sí | Rechazar postulación. |
| `POST` | `/matches/applications/:applicationId` | Sí | Crear match desde una postulación aceptada. |
| `GET` | `/matches` | Sí | Consultar matches propios. |
| `GET` | `/matches/:id` | Sí | Consultar un match propio. |
| `PATCH` | `/matches/:id/complete` | Sí | Finalizar match y trabajo. |
| `POST` | `/matches/:matchId/reviews` | Sí | Reseñar al otro participante. |
| `GET` | `/matches/:matchId/reviews` | Sí | Consultar reseñas del match. |
| `GET` | `/reviews/received` | Sí | Consultar reseñas recibidas. |

\* Actualmente las escrituras sobre categorías no tienen protección. Funcionalmente deberían reservarse para administradores; ver [Limitaciones actuales](#limitaciones-actuales).

### General

#### `GET /`

Comprueba que NestJS responde, pero no es una comprobación completa de MySQL.

Respuesta `200 OK`:

```text
Hello World!
```

### Autenticación y perfil

#### `POST /auth/register`

Registra un usuario. El correo debe ser único y la contraseña se almacena con bcrypt. El rol inicial es `trabajador`; esta ruta no permite elegir un rol administrativo.

Cuerpo:

```json
{
  "nombre": "Ana López",
  "email": "ana@example.com",
  "password": "secreto123",
  "telefono": "9511234567",
  "descripcion": "Electricista con cinco años de experiencia",
  "foto": "https://example.com/ana.jpg"
}
```

| Campo | Obligatorio | Reglas |
|---|---:|---|
| `nombre` | Sí | Texto no vacío, máximo 100 caracteres. |
| `email` | Sí | Correo válido, máximo 100 caracteres y único. |
| `password` | Sí | Al menos 6 caracteres. |
| `telefono` | No | Máximo 20 caracteres. |
| `descripcion` | No | Texto. |
| `foto` | No | Máximo 255 caracteres. |

Respuesta `201 Created`:

```json
{
  "accessToken": "TOKEN_JWT",
  "user": {
    "id": 1,
    "nombre": "Ana López",
    "email": "ana@example.com",
    "telefono": "9511234567",
    "rol": "trabajador",
    "descripcion": "Electricista con cinco años de experiencia",
    "foto": "https://example.com/ana.jpg",
    "createdAt": "2026-08-22T18:00:00.000Z",
    "updatedAt": "2026-08-22T18:00:00.000Z"
  }
}
```

Errores habituales: `400` por validación y `409` si el correo ya existe.

#### `POST /auth/login`

Valida correo y contraseña y entrega un JWT.

```json
{
  "email": "ana@example.com",
  "password": "secreto123"
}
```

Respuesta `201 Created`: misma estructura del registro (`accessToken` y `user`).

Error posible:

```json
{
  "message": "Correo o contrasena incorrectos",
  "error": "Unauthorized",
  "statusCode": 401
}
```

#### `GET /auth/profile`

Devuelve el propietario del JWT sin incluir la contraseña. Requiere autenticación.

Respuesta `200 OK`:

```json
{
  "id": 1,
  "nombre": "Ana López",
  "email": "ana@example.com",
  "telefono": "9511234567",
  "rol": "trabajador",
  "descripcion": "Electricista con cinco años de experiencia",
  "foto": "https://example.com/ana.jpg",
  "createdAt": "2026-08-22T18:00:00.000Z",
  "updatedAt": "2026-08-22T18:00:00.000Z"
}
```

Actualmente no existe una ruta activa para modificar el perfil.

### Categorías

Las categorías clasifican los trabajos, por ejemplo: electricidad, plomería o limpieza.

#### `POST /categories`

Crea una categoría.

```json
{
  "nombre": "Electricidad",
  "descripcion": "Instalaciones y reparaciones eléctricas",
  "icono": "bolt"
}
```

`nombre` y `descripcion` son obligatorios. `nombre` admite hasta 100 caracteres e `icono` hasta 255.

Respuesta `201 Created`:

```json
{
  "id": 1,
  "nombre": "Electricidad",
  "descripcion": "Instalaciones y reparaciones eléctricas",
  "icono": "bolt",
  "createdAt": "2026-08-22T18:10:00.000Z",
  "updatedAt": "2026-08-22T18:10:00.000Z"
}
```

#### `GET /categories`

Devuelve un arreglo con todas las categorías. Si no hay registros devuelve `[]`.

#### `GET /categories/:id`

Devuelve una categoría por ID. Responde `404` cuando no existe.

#### `PATCH /categories/:id`

Actualiza solo los campos enviados:

```json
{
  "descripcion": "Instalaciones residenciales y reparaciones eléctricas"
}
```

Respuesta `200 OK`: categoría completa actualizada.

#### `DELETE /categories/:id`

Respuesta `200 OK`:

```json
{
  "message": "Categoría eliminada correctamente"
}
```

MySQL puede impedir la eliminación si existen trabajos asociados.

### Trabajos

#### `POST /jobs`

Publica un trabajo usando al usuario autenticado como propietario. El estado inicial siempre es `PUBLICADO`.

```json
{
  "categoryId": 1,
  "titulo": "Reparar contacto eléctrico",
  "descripcion": "El contacto de la cocina dejó de funcionar",
  "presupuesto": 500,
  "ubicacion": "Oaxaca de Juárez"
}
```

| Campo | Obligatorio | Reglas |
|---|---:|---|
| `categoryId` | Sí | Entero positivo y categoría existente. |
| `titulo` | Sí | Texto no vacío, máximo 150 caracteres. |
| `descripcion` | Sí | Texto no vacío. |
| `presupuesto` | No | Número mayor o igual a cero, máximo dos decimales. |
| `ubicacion` | No | Máximo 150 caracteres. |

Respuesta `201 Created`:

```json
{
  "id": 10,
  "ownerId": 1,
  "categoryId": 1,
  "titulo": "Reparar contacto eléctrico",
  "descripcion": "El contacto de la cocina dejó de funcionar",
  "presupuesto": "500.00",
  "ubicacion": "Oaxaca de Juárez",
  "estado": "PUBLICADO",
  "createdAt": "2026-08-22T18:20:00.000Z",
  "updatedAt": "2026-08-22T18:20:00.000Z",
  "owner": {
    "id": 1,
    "nombre": "Ana López",
    "email": "ana@example.com",
    "rol": "trabajador"
  },
  "category": {
    "id": 1,
    "nombre": "Electricidad",
    "descripcion": "Instalaciones y reparaciones eléctricas",
    "icono": "bolt"
  }
}
```

Las relaciones pueden incluir sus campos de fecha y datos opcionales.

#### `GET /jobs`

Lista exclusivamente trabajos `PUBLICADO`, del más reciente al más antiguo.

| Filtro opcional | Ejemplo | Comportamiento |
|---|---|---|
| `titulo` | `electricidad` | Coincidencia parcial. |
| `categoryId` | `1` | Categoría exacta. |
| `ubicacion` | `Oaxaca` | Coincidencia parcial. |

```http
GET /jobs?titulo=contacto&categoryId=1&ubicacion=Oaxaca
```

Respuesta `200 OK`: arreglo de trabajos con `owner` y `category`; sin coincidencias devuelve `[]`.

#### `GET /jobs/:id`

Devuelve un trabajo publicado con propietario y categoría.

Importante: responde `404` cuando el trabajo no está `PUBLICADO`, incluso si todavía existe en la base de datos.

#### `PATCH /jobs/:id`

Actualiza un trabajo propio únicamente mientras esté `PUBLICADO`.

```json
{
  "categoryId": 2,
  "titulo": "Nuevo título",
  "descripcion": "Descripción actualizada",
  "presupuesto": 650.5,
  "ubicacion": "Santa Cruz Xoxocotlán"
}
```

Todos los campos son opcionales, pero solo se admiten los mostrados. No se puede cambiar `ownerId` ni `estado`.

Respuesta `200 OK`: trabajo actualizado con `owner` y `category`. Puede responder `403` si no pertenece al usuario o dejó de estar publicado, y `404` si no existe el trabajo o la categoría.

#### `DELETE /jobs/:id`

Elimina un trabajo propio que aún esté `PUBLICADO`.

```json
{
  "message": "Trabajo eliminado correctamente"
}
```

Responde `403` si pertenece a otra persona o ya está en proceso/finalizado.

### Postulaciones

#### `POST /jobs/:jobId/applications`

Postula al usuario autenticado al trabajo.

Reglas:

- El trabajo debe estar `PUBLICADO`.
- El propietario no puede postularse a su propio trabajo.
- Un usuario solo puede postularse una vez al mismo trabajo.
- El estado inicial es `PENDIENTE`.

Cuerpo opcional:

```json
{
  "mensaje": "Tengo experiencia y disponibilidad para realizar el trabajo"
}
```

`mensaje` admite hasta 2000 caracteres.

Respuesta `201 Created`:

```json
{
  "id": 20,
  "jobId": 10,
  "applicantId": 2,
  "mensaje": "Tengo experiencia y disponibilidad para realizar el trabajo",
  "estado": "PENDIENTE",
  "createdAt": "2026-08-22T18:30:00.000Z",
  "updatedAt": "2026-08-22T18:30:00.000Z",
  "job": {
    "id": 10,
    "titulo": "Reparar contacto eléctrico",
    "estado": "PUBLICADO"
  },
  "applicant": {
    "id": 2,
    "nombre": "Carlos Pérez",
    "email": "carlos@example.com",
    "rol": "trabajador"
  }
}
```

Errores habituales: `403` por trabajo propio, `404` si no existe y `409` por duplicado o trabajo no publicado.

#### `GET /jobs/:jobId/applications`

Devuelve las postulaciones de un trabajo. Solo el propietario puede consultarlas.

Respuesta `200 OK`:

```json
[
  {
    "id": 20,
    "jobId": 10,
    "applicantId": 2,
    "mensaje": "Tengo experiencia y disponibilidad",
    "estado": "PENDIENTE",
    "createdAt": "2026-08-22T18:30:00.000Z",
    "updatedAt": "2026-08-22T18:30:00.000Z",
    "applicant": {
      "id": 2,
      "nombre": "Carlos Pérez",
      "email": "carlos@example.com",
      "rol": "trabajador"
    }
  }
]
```

#### `PATCH /applications/:id/accept`

Acepta una postulación pendiente. Solo el propietario del trabajo puede hacerlo. No requiere cuerpo.

En una sola transacción:

- La seleccionada cambia a `ACEPTADA`.
- Las demás postulaciones pendientes cambian a `RECHAZADA`.
- El trabajo cambia a `EN_PROCESO`.
- Se crea un match `ACTIVO`.

Respuesta `200 OK`:

```json
{
  "id": 30,
  "applicationId": 20,
  "jobId": 10,
  "employerId": 1,
  "workerId": 2,
  "estado": "ACTIVO",
  "startedAt": "2026-08-22T18:40:00.000Z",
  "completedAt": null,
  "createdAt": "2026-08-22T18:40:00.000Z",
  "updatedAt": "2026-08-22T18:40:00.000Z"
}
```

Puede responder `409` si ya fue resuelta, el trabajo dejó de estar publicado o ya existe un match.

#### `PATCH /applications/:id/reject`

Rechaza una postulación pendiente. Solo puede hacerlo el propietario y no genera match. No requiere cuerpo.

Respuesta `200 OK`: postulación con `estado: "RECHAZADA"`, trabajo y solicitante relacionados.

### Matches

Un match relaciona al propietario (`employer`) con la persona seleccionada (`worker`). Normalmente se crea al aceptar una postulación.

#### `POST /matches/applications/:applicationId`

Crea manualmente un match desde una postulación `ACEPTADA` que todavía no tenga match. Solo el propietario puede usarlo.

Es una ruta auxiliar: el flujo normal no la necesita porque `PATCH /applications/:id/accept` ya crea el match. Responde `409` si ya existe uno.

#### `GET /matches`

Devuelve los matches donde el usuario autenticado participa como empleador o trabajador, del más reciente al más antiguo.

Respuesta `200 OK`:

```json
[
  {
    "id": 30,
    "applicationId": 20,
    "jobId": 10,
    "employerId": 1,
    "workerId": 2,
    "estado": "ACTIVO",
    "startedAt": "2026-08-22T18:40:00.000Z",
    "completedAt": null,
    "job": {
      "id": 10,
      "titulo": "Reparar contacto eléctrico",
      "estado": "EN_PROCESO"
    },
    "employer": {
      "id": 1,
      "nombre": "Ana López"
    },
    "worker": {
      "id": 2,
      "nombre": "Carlos Pérez"
    },
    "application": {
      "id": 20,
      "estado": "ACEPTADA",
      "mensaje": "Tengo experiencia y disponibilidad"
    }
  }
]
```

Las relaciones pueden incluir campos adicionales.

#### `GET /matches/:id`

Devuelve un match con `job`, `employer`, `worker` y `application`. Solo sus dos participantes pueden consultarlo; otro usuario recibe `403`.

#### `PATCH /matches/:id/complete`

Finaliza un match activo. Puede hacerlo cualquiera de sus participantes. No requiere cuerpo.

La operación cambia el match a `FINALIZADO`, registra `completedAt` y cambia el trabajo a `COMPLETADO`.

Respuesta `200 OK`: match actualizado, incluyendo `job`. Responde `409` si ya no está activo.

### Reseñas

#### `POST /matches/:matchId/reviews`

Permite que un participante califique al otro.

Reglas:

- El usuario debe participar en el match.
- El match debe estar `FINALIZADO`.
- La calificación debe estar entre 1 y 5.
- Cada participante puede publicar una sola reseña por match.
- La API determina automáticamente quién recibe la reseña.

```json
{
  "calificacion": 5,
  "comentario": "Excelente trabajo y buena comunicación"
}
```

`comentario` es obligatorio y admite hasta 2000 caracteres.

Respuesta `201 Created`:

```json
{
  "id": 40,
  "matchId": 30,
  "reviewerId": 1,
  "revieweeId": 2,
  "calificacion": 5,
  "comentario": "Excelente trabajo y buena comunicación",
  "createdAt": "2026-08-22T20:00:00.000Z",
  "match": {
    "id": 30,
    "estado": "FINALIZADO",
    "job": {
      "id": 10,
      "titulo": "Reparar contacto eléctrico"
    }
  },
  "reviewer": {
    "id": 1,
    "nombre": "Ana López"
  },
  "reviewee": {
    "id": 2,
    "nombre": "Carlos Pérez"
  }
}
```

Errores habituales: `403` si no participa, `404` si no existe el match y `409` si no ha finalizado o ya publicó una reseña.

#### `GET /matches/:matchId/reviews`

Devuelve las reseñas del match. Solo sus participantes pueden consultarlas. La respuesta es un arreglo ordenado de la más reciente a la más antigua, con `reviewer` y `reviewee`.

#### `GET /reviews/received`

Devuelve las reseñas recibidas por el usuario autenticado con el autor y el trabajo asociado. Si no ha recibido reseñas devuelve `[]`.

## Estados y reglas

### Trabajo

```text
PUBLICADO -> EN_PROCESO -> COMPLETADO
```

| Estado | Significado |
|---|---|
| `PUBLICADO` | Visible y disponible para postulaciones. |
| `EN_PROCESO` | Ya se aceptó una postulación. |
| `COMPLETADO` | El match fue finalizado. |
| `CANCELADO` | Definido, pero sin endpoint actualmente. |

### Postulación

```text
PENDIENTE -> ACEPTADA
          -> RECHAZADA
```

Aceptar una postulación rechaza automáticamente las otras pendientes del trabajo.

### Match

```text
ACTIVO -> FINALIZADO
```

`CANCELADO` existe en el modelo, pero todavía no hay una operación para usarlo.

## Errores HTTP

Formato habitual:

```json
{
  "message": "No se encontro el trabajo con id 99",
  "error": "Not Found",
  "statusCode": 404
}
```

En errores de validación, `message` es un arreglo:

```json
{
  "message": [
    "categoryId must be a positive number",
    "titulo should not be empty"
  ],
  "error": "Bad Request",
  "statusCode": 400
}
```

| Código | Significado habitual |
|---:|---|
| `400` | Cuerpo, parámetro o filtro inválido. |
| `401` | Falta el JWT o no es válido. |
| `403` | No es propietario o participante. |
| `404` | El recurso no existe o no es visible en ese estado. |
| `409` | Duplicado o transición de estado inválida. |
| `500` | Error no controlado o problema de MySQL. |

## Pruebas

```bash
# Pruebas unitarias
npm test

# Pruebas E2E
npm run test:e2e

# Comprobar tipos sin generar dist
npx tsc --noEmit
```

Estado conocido: TypeScript compila, pero la suite unitaria contiene pruebas incompletas o desactualizadas en categorías, matches y aceptación de postulaciones. La prueba E2E actual solo comprueba `GET /` y utiliza el `AppModule` real; se recomienda una base de datos exclusiva de pruebas.

## Limitaciones actuales

- No hay migraciones; `DB_SYNCHRONIZE=true` facilita una instalación local.
- No existe autorización por roles, aunque se definen `cliente`, `trabajador` y `admin`.
- Las escrituras de categorías están expuestas sin autenticación.
- El CRUD de `/users` está deshabilitado.
- El perfil se consulta en `/auth/profile` y no puede actualizarse.
- No existe desactivación de usuarios.
- No hay ruta para consultar las postulaciones del propio trabajador.
- No se pueden cancelar trabajos o matches.
- `GET /jobs/:id` solo devuelve trabajos `PUBLICADO`.
- Los listados no tienen paginación.
- No se incluye Swagger/OpenAPI.
- Crear un match manualmente es redundante en el flujo normal.

## Tecnologías

- NestJS 11
- TypeORM
- MySQL (`mysql2`)
- Passport y JWT
- bcrypt
- class-validator y class-transformer
- Jest
