# VouNoVôlei 🏐

**VouNoVôlei** é uma plataforma **fullstack** para divulgação e gerenciamento de eventos de vôlei (ex.: vôlei de praia), permitindo que usuários se autentiquem, visualizem eventos, acessem detalhes e realizem **inscrições**.

Este repositório é um **monorepo** contendo:
- `frontend/` → aplicação web (React)
- `backend/` → API REST (Spring Boot)

---

## ✨ Funcionalidades

- Autenticação (login/logout)
- Listagem de eventos
- Detalhe de evento com inscritos
- Inscrição e cancelamento de inscrição
- Topbar/UX consistente entre páginas (events, detail, etc.)

---

## 🧱 Stack

### Frontend
- React + Vite
- React Router
- CSS (arquivos por página/componentes)
- Consumo de API via HTTP client (ex.: Axios)

### Backend
- Java + Spring Boot
- REST API (CRUD de eventos + inscrições)
- Persistência com JPA/Hibernate
- Testes (quando aplicável)

---

## 🗂️ Estrutura do projeto

```bash
vounovolei/
├─ frontend/
│  ├─ src/
│  ├─ public/
│  └─ ...
├─ backend/
│  ├─ src/
│  └─ ...
└─ README.md
