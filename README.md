# DPM - Dental Practice Management

A complete, cloud-based SaaS platform for dental clinic management.

Uma plataforma SaaS completa, baseada em nuvem, para gestao de clinicas odontologicas.

---

## Documentation | Documentacao

- **[English Documentation](./docs/README.md)**
- **[Documentacao em Portugues](./docs/README.pt-BR.md)**

---

## Quick Start | Inicio Rapido

```bash
# Install dependencies | Instalar dependencias
pnpm install

# Start infrastructure | Iniciar infraestrutura
docker compose -f docker/docker-compose.dev.yml up -d

# Setup database | Configurar banco de dados
pnpm --filter @dpm/api db:push
pnpm --filter @dpm/api db:seed

# Start development | Iniciar desenvolvimento
pnpm dev
```

## Access | Acesso

- **Frontend:** http://localhost:5173
- **API:** http://localhost:3001
- **Admin Panel:** http://localhost:5173/admin/login

## Demo Credentials | Credenciais de Demo

**Clinic User | Usuario da Clinica:**
- Email: `admin@demo.dpm.local`
- Password | Senha: `Admin@123`

**Super Admin:**
- Email: `admin@dpm.app`
- Password | Senha: `SuperAdmin@123`

---

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| Backend | Node.js, Fastify, TypeScript, Prisma, PostgreSQL |
| Frontend | Vue 3, Vite, TailwindCSS, Pinia |
| Infrastructure | Docker, Redis, MinIO, BullMQ |
| Payments | Stripe |

---

## Features | Funcionalidades

- Patient Management | Gestao de Pacientes
- Appointment Scheduling | Agendamento de Consultas
- Electronic Health Records | Prontuario Eletronico
- Financial Management | Gestao Financeira
- Communication (WhatsApp, SMS, Email) | Comunicacao
- Patient Satisfaction (NPS) | Satisfacao do Paciente
- Marketing Campaigns | Campanhas de Marketing
- Document Management | Gestao de Documentos
- Compliance Tracking | Rastreamento de Conformidade
- Multi-tenant SaaS | SaaS Multi-tenant

---

## License | Licenca

Proprietary | Proprietario

---

**DPM - Dental Practice Management**
*Transforming dental practice management | Transformando a gestao de consultorios odontologicos*
