# VouNoVolei

Plataforma fullstack para criacao e gerenciamento de eventos de volei.

O repositorio esta organizado como monorepo:
- `frontend/`: aplicacao web em React + Vite
- `backend/`: API REST em Spring Boot

## Funcionalidades

- Autenticacao com JWT (cadastro, login, perfil e troca de senha)
- CRUD de eventos
- Inscricao e cancelamento em eventos
- Indicacao de participante que leva bola (`bringBall`)
- Upload/remocao de avatar do usuario
- Painel administrativo para usuarios e eventos
- Sorteio de times no detalhe do evento (frontend)

## Stack

- Frontend: React 19, React Router 7, Axios, Vite
- Backend: Java 17, Spring Boot 3, Spring Security, Spring Data JPA, Flyway, MySQL

## Estrutura

```text
vounovolei/
|- frontend/
|  |- src/
|  |- public/
|  `- README.md
|- backend/
|  |- src/
|  `- README.md
`- README.md
```

## Como executar (ambiente local)

Pre-requisitos:
- Node.js 20+
- npm 10+
- Java 17
- MySQL 8+

1. Suba o banco MySQL e crie o schema:

```sql
CREATE DATABASE vounovolei;
```

2. Configure e rode o backend:

```bash
cd backend
./mvnw spring-boot:run
```

No Windows PowerShell:

```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

3. Configure e rode o frontend:

```bash
cd frontend
npm install
npm run dev
```

4. Acesse:
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8080`

## Configuracoes principais

- O frontend usa `VITE_API_URL` como base da API.
- O frontend pode ser configurado via `frontend/.env` a partir de `frontend/.env.example`.
- O backend esta com CORS liberado para `http://localhost:5173`.
- O backend pode ser configurado por variaveis de ambiente a partir de `backend/.env.example`.
- Upload de avatar: ate 2MB (JPG/PNG/WEBP), servido em `/media/**`.

## Documentacao por modulo

- Backend: [backend/README.md](backend/README.md)
- Frontend: [frontend/README.md](frontend/README.md)
