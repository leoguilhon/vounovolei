# Frontend - VouNoVolei Web

Aplicacao React para autenticacao, listagem de eventos, inscricao, perfil e administracao.

## Stack

- React 19
- React Router 7
- Axios
- Vite 7

## Como executar

Pre-requisitos:
- Node.js 20+
- npm 10+

1. Instale dependencias:

```bash
npm install
```

2. Crie o arquivo `.env` na pasta `frontend/`:

```env
VITE_API_URL=http://localhost:8080
```

3. Rode em desenvolvimento:

```bash
npm run dev
```

4. Acesse `http://localhost:5173`.

## Scripts

- `npm run dev`: inicia ambiente de desenvolvimento
- `npm run build`: gera build de producao
- `npm run preview`: serve build localmente
- `npm run lint`: executa ESLint

## Rotas da aplicacao

Publicas:
- `/login`
- `/register`

Protegidas (exigem token):
- `/events`
- `/events/:id`
- `/profile/edit`
- `/admin`

## Integracao com backend

O cliente HTTP esta em `src/api/http.js`:
- usa `VITE_API_URL` como `baseURL`
- injeta automaticamente `Authorization: Bearer <token>` com token salvo no `localStorage`

Principais chamadas:
- Auth: `/auth/login`, `/auth/register`, `/auth/me`, `/auth/me/password`
- Avatar: `/auth/me/avatar`
- Eventos: `/events`, `/events/{id}`, `/events/{id}/detail`, `/events/{id}/register`
- Admin: `/admin/users`, `/admin/events`

## Funcionalidades de interface

- Login e cadastro
- Lista de eventos com paginação
- Criacao de evento
- Detalhe do evento com participantes
- Inscricao com opcao de levar bola
- Sorteio de times no detalhe do evento
- Edicao de perfil (nome, email, senha, avatar)
- Painel administrativo para usuarios e eventos

## Observacoes importantes

- Sem `VITE_API_URL`, a aplicacao nao consegue chamar a API.
- O backend precisa permitir CORS para `http://localhost:5173`.
- Avatares usam URL retornada pela API (`/media/...`) e sao resolvidos com base em `VITE_API_URL`.
