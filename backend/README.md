# Backend - VouNoVolei API

API REST para autenticacao, eventos, inscricoes e administracao.

## Stack

- Java 17
- Spring Boot 3.5.x
- Spring Security + JWT
- Spring Data JPA
- Flyway
- MySQL

## Como executar

Pre-requisitos:
- Java 17
- MySQL 8+

1. Crie o banco:

```sql
CREATE DATABASE vounovolei;
```

2. Ajuste as configuracoes em `src/main/resources/application.properties` (se necessario):
- `spring.datasource.url`
- `spring.datasource.username`
- `spring.datasource.password`
- `security.jwt.secret`

3. Rode a aplicacao:

```bash
./mvnw spring-boot:run
```

No Windows PowerShell:

```powershell
.\mvnw.cmd spring-boot:run
```

A API sobe em `http://localhost:8080`.

## Configuracao atual (application.properties)

- Porta: `8080`
- Banco: `jdbc:mysql://localhost:3306/vounovolei`
- Access token expiration: `15` minutos
- Refresh token expiration: `10080` minutos (7 dias)
- Upload base dir: `uploads`
- Upload avatar maximo: `2097152` bytes (2MB)
- CORS permitido: `http://localhost:5173`

## Migrations (Flyway)

- `V1__create_users_table.sql`
- `V2__create_events_table.sql`
- `V3__create_event_registrations_table.sql`
- `V4__add_bring_ball_to_event_registration.sql`
- `V5__add_user_avatar.sql`

## Autenticacao

Use header:

```http
Authorization: Bearer <token>
```

Rotas publicas:
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `GET /media/**` (arquivos de avatar)

## Endpoints

### Auth

- `GET /auth/me`
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `PATCH /auth/me`
- `PATCH /auth/me/password`

### Avatar

- `PUT /auth/me/avatar` (multipart, campo `file`)
- `DELETE /auth/me/avatar`

### Eventos

- `POST /events` (autenticado)
- `GET /events`
- `GET /events/{id}`
- `PUT /events/{id}` (admin ou criador)
- `DELETE /events/{id}` (admin ou criador)
- `POST /events/{id}/register` (body opcional: `{ "bringBall": true|false }`)
- `DELETE /events/{id}/register`
- `GET /events/{id}/participants`
- `GET /events/{id}/detail`

### Admin (role ADMIN)

- `GET /admin/users?q=`
- `GET /admin/users/{id}`
- `PUT /admin/users/{id}`
- `PATCH /admin/users/{id}/password`
- `DELETE /admin/users/{id}`
- `GET /admin/events?q=`
- `GET /admin/events/{id}`
- `PUT /admin/events/{id}`
- `DELETE /admin/events/{id}`

## Regras de negocio relevantes

- Cadastro de conta: limite de 3 criacoes por 15 minutos por cliente/IP.
- Criacao de evento por usuario comum: limite de 3 criacoes por 15 minutos.
- Admin nao sofre limite de criacao de evento.
- Inscricao e cancelamento sao idempotentes.
- Upload avatar aceito: `image/jpeg`, `image/png`, `image/webp`.
- Avatares sao servidos em `/media/avatars/{userId}/avatar.<ext>`.

## Formato de erro

A API responde erros em JSON, normalmente com:

```json
{
  "error": "CODIGO",
  "message": "Descricao"
}
```

## Testes

Executar:

```bash
./mvnw test
```

No Windows PowerShell:

```powershell
.\mvnw.cmd test
```
