# DPM - Gestao de Consultorio Odontologico

## Documentacao Completa | [English Documentation](./README.md)

---

# DPM - Sistema de Gestao de Consultorio Odontologico

**Versao:** 1.0.0
**Arquitetura:** SaaS Multi-tenant
**Licenca:** Proprietaria

---

## Indice

1. [Visao Geral](#1-visao-geral)
2. [Stack Tecnologico](#2-stack-tecnologico)
3. [Estrutura do Projeto](#3-estrutura-do-projeto)
4. [Funcionalidades](#4-funcionalidades)
5. [Modulos](#5-modulos)
6. [Esquema do Banco de Dados](#6-esquema-do-banco-de-dados)
7. [Referencia da API](#7-referencia-da-api)
8. [Paginas do Frontend](#8-paginas-do-frontend)
9. [Integracoes](#9-integracoes)
10. [Seguranca](#10-seguranca)
11. [Instalacao](#11-instalacao)
12. [Configuracao](#12-configuracao)
13. [Deploy](#13-deploy)

---

## 1. Visao Geral

O DPM (Dental Practice Management) e uma plataforma SaaS completa, baseada em nuvem, projetada especificamente para clinicas odontologicas. Oferece uma solucao abrangente para gerenciar todos os aspectos de um consultorio, desde agendamento de pacientes e prontuarios clinicos ate gestao financeira e campanhas de marketing.

### Destaques Principais

- **Arquitetura Multi-tenant**: Isolamento completo de dados entre clinicas
- **Prontuario Eletronico Completo**: Registros de saude com suporte a odontograma
- **Agendamento Inteligente**: Deteccao de conflitos e gestao de disponibilidade
- **Controle Financeiro**: Pagamentos, comissoes e relatorios detalhados
- **Engajamento do Paciente**: Pesquisas NPS, campanhas e lembretes automaticos
- **Gestao de Conformidade**: Rastreamento de documentos com alertas de vencimento
- **Stack Tecnologico Moderno**: TypeScript, Vue 3, Fastify, PostgreSQL

### Usuarios Alvo

- **Administradores da Clinica**: Gestao completa do sistema
- **Dentistas**: Atendimento ao paciente e documentacao clinica
- **Recepcionistas**: Agendamento e comunicacao com pacientes
- **Equipe Financeira**: Processamento de pagamentos e relatorios

---

## 2. Stack Tecnologico

### Backend

| Tecnologia | Versao | Finalidade |
|------------|--------|------------|
| Node.js | 20.x | Ambiente de execucao |
| TypeScript | 5.3.0 | Desenvolvimento type-safe |
| Fastify | 4.26.0 | Framework web |
| Prisma | 5.9.0 | ORM / Toolkit de banco |
| PostgreSQL | 15.x | Banco de dados principal |
| Redis | 7.x | Cache e sessoes |
| BullMQ | 5.1.0 | Processamento de filas |
| Stripe | 20.1.2 | Processamento de pagamentos |

### Frontend

| Tecnologia | Versao | Finalidade |
|------------|--------|------------|
| Vue 3 | 3.4.0 | Framework de UI |
| Vite | 5.0.0 | Ferramenta de build |
| TailwindCSS | 3.4.0 | Estilizacao |
| Pinia | 2.1.0 | Gerenciamento de estado |
| Vue Router | 4.2.0 | Roteamento |
| vue-i18n | 9.9.0 | Internacionalizacao |

### Infraestrutura

| Tecnologia | Finalidade |
|------------|------------|
| Docker | Containerizacao |
| MinIO | Armazenamento de arquivos S3 |
| MailHog | Servidor de email de desenvolvimento |
| Turbo | Sistema de build monorepo |

---

## 3. Estrutura do Projeto

```
dpm-v0/
├── apps/
│   ├── api/                    # API Backend
│   │   ├── src/
│   │   │   ├── modules/        # Modulos de funcionalidades (21)
│   │   │   ├── common/         # Utilitarios compartilhados
│   │   │   ├── integrations/   # Servicos externos
│   │   │   └── index.ts        # Ponto de entrada
│   │   └── prisma/
│   │       ├── schema.prisma   # Esquema do banco
│   │       └── seed.ts         # Seed do banco
│   │
│   └── web/                    # Frontend SPA
│       ├── src/
│       │   ├── modules/        # Componentes de pagina
│       │   ├── components/     # Componentes reutilizaveis
│       │   ├── stores/         # Stores Pinia
│       │   ├── composables/    # Vue composables
│       │   └── i18n/           # Traducoes
│       └── index.html
│
├── packages/
│   └── shared/                 # Tipos compartilhados
│
├── docker/                     # Configs Docker
│   ├── docker-compose.dev.yml
│   └── docker-compose.yml
│
└── docs/                       # Documentacao
```

---

## 4. Funcionalidades

### 4.1 Gestao de Pacientes

- **Perfis Completos**: Dados pessoais, contato, historico medico
- **Anamnese Medica**: Alergias, medicamentos, condicoes, habitos
- **Tags de Pacientes**: Tags personalizadas para segmentacao
- **Preferencias de Comunicacao**: Opt-in para WhatsApp, SMS, email
- **Informacoes de Responsavel**: Suporte para pacientes menores
- **Busca e Filtros**: Encontre pacientes por nome, CPF, telefone, email

### 4.2 Agendamento de Consultas

- **Visualizacoes de Calendario**: Visualizacoes por dia, semana e mes
- **Deteccao de Conflitos**: Verificacao automatica de disponibilidade de profissional e sala
- **Tipos de Consulta**: Avaliacao, tratamento, retorno, emergencia, manutencao
- **Fluxo de Status**: Agendada → Confirmada → Aguardando → Em Atendimento → Concluida
- **Consultas Recorrentes**: Agende consultas repetidas
- **Horarios Disponiveis**: Calcule slots de tempo abertos
- **Overlay Financeiro**: Visualize projecoes de receita das consultas

### 4.3 Prontuario Eletronico (PEP)

#### Odontograma
- Grafico dental interativo (adulto e pediatrico)
- Rastreamento de condicao dente a dente
- Marcadores visuais para procedimentos e condicoes
- Historico completo de alteracoes com trilha de auditoria

#### Notas Clinicas
- Documentacao de consultas
- Fluxo de finalizacao
- Atribuicao profissional

#### Planos de Tratamento
- Planejamento de tratamento em multiplas etapas
- Priorizacao de itens
- Rastreamento de progresso
- Estimativa de custos

#### Imagens de Pacientes
- Raio-X, panoramica, tomografia, fotos
- Anotacoes em imagens
- Comparacoes antes/depois
- Armazenamento em nuvem com MinIO/S3

### 4.4 Gestao Financeira

#### Pagamentos
- Multiplos metodos de pagamento (dinheiro, cartao, PIX, cheque, convenio)
- Suporte a parcelamento
- Rastreamento de status de pagamento
- Pagamentos parciais

#### Transacoes
- Rastreamento de receitas e despesas
- Classificacao por categoria
- Vinculacao de recibos/notas

#### Relatorios
- Analise de fluxo de caixa
- Aging de contas a receber
- Comissoes de profissionais
- Receita por procedimento
- Receita por profissional
- Demonstrativos de Lucros e Perdas

### 4.5 Sistema de Comunicacao

#### Templates de Mensagem
- Templates personalizaveis para todos os tipos de mensagem
- Substituicao de variaveis (nome do paciente, data, hora, etc.)
- Suporte multi-canal (WhatsApp, SMS, email)

#### Lembretes Automaticos
- Lembretes de consulta (tempo configuravel)
- Mensagens de aniversario
- Lembretes de retorno
- Acompanhamento de tratamento

#### Rastreamento de Entrega
- Monitoramento de status de mensagem
- Tratamento de erros e retentativas
- Relatorios de entrega

### 4.6 Satisfacao do Paciente (NPS)

#### Pesquisas
- Multiplos tipos de pesquisa (Inicial, NPS, Periodica, Pos-tratamento)
- Tipos de pergunta: Escala NPS, avaliacao por estrelas, multipla escolha, texto aberto
- Envio automatico apos consulta

#### Analises
- Calculo de score NPS
- Breakdown de Promotores/Passivos/Detratores
- Analise de tendencias
- Sistema de alertas para scores baixos

### 4.7 Campanhas de Marketing

#### Segmentacao de Pacientes
- Filtro por demograficos
- Filtro por historico de consultas
- Filtro por tags
- Pre-visualizacao do segmento antes do envio

#### Tipos de Campanha
- Datas comemorativas
- Campanhas de aniversario
- Campanhas de reativacao
- Acompanhamento de tratamento
- Campanhas promocionais

#### Entrega Multi-canal
- Mensagens WhatsApp
- Mensagens SMS
- Campanhas de email
- Rastreamento de entrega e analises

### 4.8 Gestao de Documentos

#### Templates
- Receituarios
- Atestados medicos
- Solicitacoes de exames
- Encaminhamentos
- Termos de consentimento
- Templates personalizados

#### Recursos
- Suporte HTML/PDF
- Personalizacao de cabecalho e rodape
- Substituicao de variaveis
- Assinaturas digitais
- Historico de documentos

### 4.9 Gestao de Conformidade

#### Rastreamento de Documentos
- Licencas e alvaras
- Certificados profissionais
- Apolices de seguro
- Certificacoes de equipamentos
- Documentos de instalacoes

#### Alertas
- Avisos de vencimento
- Lembretes de renovacao
- Dashboard de status
- Associacao de documentos profissionais

### 4.10 Central de Ajuda e Suporte

#### Base de Conhecimento
- Artigos categorizados
- Busca por texto completo
- Rastreamento de visualizacoes
- Guias de introducao

#### Tickets de Suporte
- Criacao e rastreamento de tickets
- Niveis de prioridade
- Fluxo de status
- Threading de mensagens

### 4.11 Recursos SaaS

#### Planos de Assinatura

| Plano | Preco (BRL) | Usuarios | Pacientes | Consultas |
|-------|-------------|----------|-----------|-----------|
| Gratis | R$ 0 | 1 | 50 | 100/mes |
| Starter | R$ 99 | 3 | 300 | 500/mes |
| Professional | R$ 199 | 10 | 1.000 | Ilimitado |
| Enterprise | R$ 499 | Ilimitado | Ilimitado | Ilimitado |

#### Recursos
- Periodo de teste (14 dias)
- Integracao com pagamento Stripe
- Rastreamento e limites de uso
- Upgrade/downgrade de planos
- Gestao de faturas

#### Painel Super Admin
- Gestao de clinicas
- Supervisao de assinaturas
- Extensoes de trial
- Analises da plataforma
- Relatorios de receita

---

## 5. Modulos

### Modulos da API (21 no total)

| Modulo | Endpoint | Descricao |
|--------|----------|-----------|
| Auth | `/auth` | Autenticacao, 2FA, sessoes |
| Patients | `/patients` | CRUD e perfis de pacientes |
| Appointments | `/appointments` | Agendamento e calendario |
| EHR | `/ehr` | Prontuarios clinicos, odontograma |
| Messages | `/messages` | Templates e lembretes |
| Financial | `/financial` | Pagamentos e transacoes |
| Surveys | `/surveys` | NPS e satisfacao |
| Campaigns | `/campaigns` | Campanhas de marketing |
| Documents | `/documents` | Geracao de documentos |
| Images | `/images` | Gestao de imagens de pacientes |
| Compliance | `/compliance` | Documentos regulatorios |
| Help | `/help` | Base de conhecimento |
| Support | `/support` | Tickets de suporte |
| Staff | `/staff` | Gestao de profissionais |
| Clinic | `/clinic` | Configuracoes da clinica |
| Dashboard | `/dashboard` | Estatisticas e KPIs |
| Onboarding | `/onboarding` | Assistente de configuracao |
| Reports | `/reports` | Exportacao e analises |
| Subscription | `/subscription` | Gestao de cobranca |
| Admin | `/admin` | Funcoes de super admin |
| Public | `/public` | Endpoints publicos |

---

## 6. Esquema do Banco de Dados

### Modelos Principais

```
Clinic              - Organizacao tenant
User                - Usuarios do sistema
Professional        - Profissionais odontologicos
Patient             - Registros de pacientes
Room                - Salas de atendimento
Procedure           - Procedimentos odontologicos
```

### Modelos de Agendamento

```
Appointment         - Consultas agendadas
```

### Modelos Clinicos

```
Treatment           - Tratamentos individuais
TreatmentPlan       - Planos de tratamento
TreatmentPlanItem   - Itens do plano
ClinicalNote        - Notas de consulta
Odontogram          - Graficos dentais
OdontogramHistory   - Historico de alteracoes
PatientImage        - Imagens clinicas
```

### Modelos de Comunicacao

```
MessageTemplate     - Templates de mensagem
Reminder            - Lembretes agendados
MessageLog          - Rastreamento de entrega
ReminderSettings    - Preferencias da clinica
```

### Modelos Financeiros

```
Payment             - Pagamentos de pacientes
Transaction         - Receitas/despesas
```

### Modelos de Pesquisa

```
Survey              - Definicoes de pesquisa
SurveyQuestion      - Perguntas da pesquisa
SurveyResponse      - Respostas de pacientes
SurveyResponseAnswer - Respostas individuais
SurveyAlert         - Alertas de score baixo
```

### Modelos de Campanha

```
Segment             - Segmentos de pacientes
Campaign            - Campanhas de marketing
```

### Modelos de Documento

```
DocumentTemplate    - Templates de documento
PatientDocument     - Documentos gerados
ComplianceDocument  - Documentos regulatorios
```

### Modelos de Suporte

```
HelpArticle         - Base de conhecimento
SupportTicket       - Tickets de suporte
TicketMessage       - Mensagens de tickets
```

### Modelos SaaS

```
SubscriptionPlan    - Tiers de preco
Subscription        - Assinaturas de clinicas
Invoice             - Faturas de cobranca
UsageRecord         - Rastreamento de uso
SuperAdmin          - Admins da plataforma
```

---

## 7. Referencia da API

### Autenticacao

```
POST   /auth/login              # Login de usuario
POST   /auth/register           # Criar usuario
POST   /auth/refresh            # Atualizar token
POST   /auth/forgot-password    # Solicitar reset
POST   /auth/reset-password     # Resetar senha
POST   /auth/2fa/enable         # Habilitar 2FA
POST   /auth/2fa/verify         # Verificar codigo 2FA
POST   /auth/2fa/disable        # Desabilitar 2FA
GET    /auth/me                 # Usuario atual
POST   /auth/change-password    # Alterar senha
GET    /auth/sessions           # Listar sessoes
DELETE /auth/sessions/:id       # Revogar sessao
```

### Pacientes

```
GET    /patients                # Listar pacientes
GET    /patients/:id            # Obter paciente
POST   /patients                # Criar paciente
PUT    /patients/:id            # Atualizar paciente
DELETE /patients/:id            # Excluir paciente
GET    /patients/:id/appointments # Historico do paciente
PUT    /patients/:id/anamnesis  # Atualizar anamnese
```

### Consultas

```
GET    /appointments            # Listar consultas
GET    /appointments/:id        # Obter consulta
POST   /appointments            # Criar consulta
PUT    /appointments/:id        # Atualizar consulta
POST   /appointments/:id/status # Alterar status
GET    /appointments/available-slots # Encontrar horarios
GET    /appointments/financial-summary # Dados financeiros
```

### Financeiro

```
GET    /financial/payments      # Listar pagamentos
POST   /financial/payments      # Criar pagamento
POST   /financial/payments/:id/pay # Registrar pagamento
GET    /financial/transactions  # Listar transacoes
POST   /financial/transactions  # Criar transacao
GET    /financial/summary       # Resumo financeiro
GET    /financial/cash-flow     # Relatorio de fluxo de caixa
GET    /financial/commissions   # Relatorio de comissoes
```

---

## 8. Paginas do Frontend

### Paginas Publicas
- Pagina Inicial (`/landing`)
- Cadastro (`/register`)
- Login (`/login`)
- Recuperacao de Senha (`/forgot-password`)

### Dashboard
- Dashboard Principal (`/`)

### Gestao de Pacientes
- Lista de Pacientes (`/patients`)
- Detalhes do Paciente (`/patients/:id`)

### Agendamento
- Visualizacao de Calendario (`/schedule`)

### Financeiro
- Dashboard Financeiro (`/financial`)

### Configuracoes
- Configuracoes da Clinica (`/settings`)
- Gestao de Assinatura (`/settings/subscription`)

### Outros Modulos
- Pesquisas de Satisfacao (`/satisfaction`)
- Campanhas de Marketing (`/campaigns`)
- Conformidade (`/compliance`)
- Relatorios (`/reports`)
- Central de Ajuda (`/help`)

### Painel Admin
- Login Admin (`/admin/login`)
- Dashboard Admin (`/admin`)
- Gestao de Clinicas (`/admin/clinics`)

---

## 9. Integracoes

### Stripe (Processamento de Pagamentos)
- Cobranca de assinaturas
- Sessoes de checkout
- Portal do cliente
- Tratamento de webhooks
- Gestao de faturas

### API WhatsApp Business
- Envio de mensagens de texto
- Mensagens com templates
- Rastreamento de status de entrega
- Via Evolution API

### ElevenLabs (Texto para Fala)
- Geracao de mensagens de audio
- Lembretes por voz
- Suporte a Portugues Brasileiro

### MinIO/S3 (Armazenamento de Arquivos)
- Imagens de pacientes
- Armazenamento de documentos
- Documentos de conformidade
- Acesso seguro a arquivos

### SMTP (Email)
- Emails transacionais
- Reset de senha
- Lembretes de consulta
- Entrega de campanhas

---

## 10. Seguranca

### Autenticacao
- Autenticacao baseada em JWT
- Tokens de acesso e refresh
- Rotacao de tokens
- Gestao de sessoes

### Autenticacao de Dois Fatores
- 2FA baseado em TOTP
- Configuracao por QR code
- Codigos de backup

### Seguranca de Senha
- Hash bcrypt (12 rounds)
- Requisitos de forca de senha
- Protecao contra bloqueio de conta

### Autorizacao
- Controle de acesso baseado em funcoes (RBAC)
- 5 funcoes de usuario: Admin, Dentista, Recepcionista, Auxiliar, Financeiro
- Aplicacao de permissoes

### Seguranca da API
- Protecao CORS
- Headers de seguranca Helmet
- Limitacao de taxa
- Validacao de entrada (Zod)

### Protecao de Dados
- Isolamento multi-tenant
- Log de auditoria
- Pronto para conformidade LGPD

---

## 11. Instalacao

### Pre-requisitos

- Node.js 20.x
- pnpm 9.x
- Docker e Docker Compose
- PostgreSQL 15.x (ou use Docker)
- Redis 7.x (ou use Docker)

### Inicio Rapido

```bash
# Clonar repositorio
git clone <url-do-repositorio>
cd dpm-v0

# Instalar dependencias
pnpm install

# Iniciar infraestrutura (Docker)
docker compose -f docker/docker-compose.dev.yml up -d

# Executar migracoes do banco
pnpm --filter @dpm/api db:push

# Popular banco de dados
pnpm --filter @dpm/api db:seed

# Iniciar servidores de desenvolvimento
pnpm dev
```

### Pontos de Acesso

- Frontend: http://localhost:5173
- API: http://localhost:3001
- Prisma Studio: http://localhost:5555
- MailHog: http://localhost:8025
- Console MinIO: http://localhost:9001

### Credenciais de Demonstracao

**Usuario da Clinica:**
- Email: `admin@demo.dpm.local`
- Senha: `Admin@123`

**Super Admin:**
- Email: `admin@dpm.app`
- Senha: `SuperAdmin@123`
- URL: `/admin/login`

---

## 12. Configuracao

### Variaveis de Ambiente

Crie um arquivo `.env` em `apps/api/`:

```env
# Aplicacao
NODE_ENV=development
PORT=3001
HOST=0.0.0.0

# Banco de Dados
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/dpm

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=sua-chave-secreta-aqui
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# Armazenamento (MinIO)
STORAGE_ENDPOINT=localhost
STORAGE_PORT=9000
STORAGE_ACCESS_KEY=minioadmin
STORAGE_SECRET_KEY=minioadmin
STORAGE_BUCKET=dpm
STORAGE_USE_SSL=false

# Email (SMTP)
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@dpm.local

# Stripe
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# WhatsApp (Evolution API)
WHATSAPP_API_URL=http://localhost:8080
WHATSAPP_API_KEY=sua-api-key
WHATSAPP_INSTANCE_NAME=dpm

# ElevenLabs
ELEVENLABS_API_KEY=sua-api-key
ELEVENLABS_VOICE_ID=voice-id
```

---

## 13. Deploy

### Requisitos de Producao

- Banco de dados PostgreSQL (gerenciado recomendado)
- Instancia Redis
- Armazenamento compativel com S3
- Servico SMTP ou provedor de email
- Conta Stripe
- Conta API WhatsApp Business
- Conta ElevenLabs
- Certificados SSL
- Proxy reverso (nginx/Caddy)

### Deploy com Docker

```bash
# Construir imagens de producao
docker compose -f docker/docker-compose.yml build

# Iniciar servicos
docker compose -f docker/docker-compose.yml up -d

# Executar migracoes
docker compose exec api npx prisma migrate deploy

# Popular dados iniciais
docker compose exec api npx prisma db seed
```

### Health Checks

- API: `GET /health`
- Banco de Dados: Monitoramento de pool de conexoes
- Redis: Status de conexao
- Armazenamento: Acessibilidade do bucket

---

## Suporte

Para duvidas, problemas ou solicitacoes de funcionalidades, entre em contato com a equipe de desenvolvimento ou crie um ticket de suporte dentro da aplicacao.

---

**DPM - Gestao de Consultorio Odontologico**
*Transformando a gestao de consultorios odontologicos*
