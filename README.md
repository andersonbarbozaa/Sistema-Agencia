# 🚀 PixelCraft Studio — Sistema de Gestão Criativa & Audiovisual

Sistema web completo e funcional de gerenciamento para agências de audiovisual, marketing, conteúdo e serviços criativos. Desenvolvido com **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, **Lucide Icons** e otimizado para o ecossistema gratuito da **Cloudflare** utilizando **Cloudflare D1 (SQLite)** e **Google Gemini API**.

---

## 📋 Sumário
- [1. Visão Geral e Arquitetura](#1-visão-geral-e-arquitetura)
- [2. Credenciais de Demonstração](#2-credenciais-de-demonstração)
- [3. Instalação e Desenvolvimento Local](#3-instalação-e-desenvolvimento-local)
- [4. Banco de Dados e Cloudflare D1](#4-banco-de-dados-e-cloudflare-d1)
- [5. Armazenamento e Visualização de Mídias (MediaViewer)](#5-armazenamento-e-visualização-de-mídias-mediaviewer)
- [6. Assistente de IA Gemini](#6-assistente-de-ia-gemini)
- [7. Módulos do Sistema](#7-módulos-do-sistema)
- [8. Variáveis de Ambiente](#8-variáveis-de-ambiente)
- [9. Estrutura de Diretórios](#9-estrutura-de-diretórios)

---

## 1. Visão Geral e Arquitetura

O sistema foi concebido como uma aplicação **REAL e FUNCIONAL** (sem telas falsas, sem simulação estática e com persistência completa).

- **Frontend**: Next.js 14/15, React, TypeScript, Tailwind CSS, Lucide Icons.
- **Backend**: Next.js App Router (Route Handlers) compatível com Cloudflare Workers e Cloudflare Pages.
- **Banco de Dados**: Cloudflare D1 (SQLite distribuído). Em desenvolvimento local, utiliza a engine SQLite nativa (`node:sqlite`) com sincronização automática do schema em `migrations/0001_initial_schema.sql`.
- **Mídia**: O sistema **NÃO utiliza Cloudflare R2** nem armazena arquivos pesados em disco. Gerencia URLs e links externos (YouTube, Vimeo, Google Drive, Dropbox, etc.) com renderização incorporada no `MediaViewer`.
- **Inteligência Artificial**: Google Gemini API com fluxo rigoroso de duas etapas (`/api/ai/interpret` e `/api/ai/confirm`), cards de pré-visualização, proteção contra ambiguidade e confirmação prévia pelo administrador antes de qualquer gravação no banco.

---

## 2. Credenciais de Demonstração

Para testar todos os perfis e níveis de permissão com dados reais previamente semeados:

| Perfil | E-mail | Senha | Cargo / Detalhe |
|---|---|---|---|
| **Administrador** | `anderson@agencia.com` | `admin123` | Diretor de Fotografia / Sócio Parceiro |
| **Colaborador** | `joao@agencia.com` | `admin123` | Editor de Vídeo |
| **Colaboradora** | `mariana@agencia.com` | `admin123` | Social Media / Sócia Parceira |
| **Cliente** | `contato@santacasa.com` | `admin123` | Santa Casa de Misericórdia de Araçatuba |

---

## 3. Instalação e Desenvolvimento Local

### Pré-requisitos
- Node.js v20+ (recomendado v22 ou v24)
- npm v10+

### Passo a Passo

1. **Instalar as dependências**:
   ```bash
   npm install
   ```

2. **Configurar variáveis de ambiente**:
   Copie `.env.example` para `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

3. **Popular o banco de dados inicial (Seed)**:
   ```bash
   npm run seed
   ```

4. **Iniciar o servidor de desenvolvimento**:
   ```bash
   npm run dev
   ```
   Acesse: [http://localhost:3000](http://localhost:3000)

---

## 4. Banco de Dados e Cloudflare D1

O banco de dados possui 23 tabelas relacionais com chaves estrangeiras (`PRAGMA foreign_keys = ON`) e índices dedicados para consultas de alta performance no plano gratuito da Cloudflare.

### Migrations
O arquivo `migrations/0001_initial_schema.sql` contém a estrutura completa de:
- `users`, `positions` (cargos separados de permissões), `clients`, `projects`
- `tasks`, `task_assignees`, `task_categories`, `task_media_links`, `task_comments`, `task_status_history`, `task_deletion_requests`
- `bank_accounts`, `financial_categories`, `financial_transactions`
- `contracts`, `crm_leads`, `crm_interactions`, `calendar_events`
- `notifications`, `audit_logs`, `google_integrations`, `ai_interpretations`, `settings`

### Deploy no Cloudflare D1 (Produção)
1. Crie o banco de dados no Cloudflare D1:
   ```bash
   npx wrangler d1 create agencia-db
   ```
2. Adicione o `database_id` gerado no arquivo `wrangler.jsonc`.
3. Aplique as migrações no Cloudflare:
   ```bash
   npx wrangler d1 execute agencia-db --file=./migrations/0001_initial_schema.sql
   ```

---

## 5. Armazenamento e Visualização de Mídias (MediaViewer)

Conforme os requisitos 4, 5, 6 e 62:
- Nenhuma imagem ou vídeo é baixado para o servidor.
- Os links cadastrados são identificados automaticamente (`image`, `video`, `document`, `other`).
- O modal `MediaViewer`:
  - Imagens: ampliação (zoom in/out), visualização em alta definição.
  - Vídeos: player incorporado (YouTube, Vimeo, Google Drive preview ou MP4 direto).
  - Documentos / Links externos: exibição via iframe ou fallback seguro `"Este conteúdo não permite visualização incorporada"` com botão direto **`ABRIR LINK ORIGINAL`**.
  - Galeria com navegação entre mídias e contador (ex: `2 de 5`).

---

## 6. Assistente de IA Gemini

Conforme os requisitos 44 a 56:
- **Exclusivo para Administrador**.
- A chave `GEMINI_API_KEY` permanece **100% no backend**.
- **Fluxo Seguro**:
  1. O usuário dita ou escreve um comando (ex: *"Cria uma tarefa para a Santa Casa, edição do vídeo da campanha de outubro, Anderson como responsável, entregar sexta-feira, valor 800 reais"*).
  2. O backend processa no Gemini via endpoint `POST /api/ai/interpret`.
  3. O frontend exibe o **Card de Pré-visualização Estruturado**.
  4. O administrador clica em **`[ADICIONAR]`** ou **`[DISPENSAR]`**.
  5. Somente após a confirmação expressa o endpoint `POST /api/ai/confirm` grava no banco de dados com registro no audit log.
  6. **Tratamento de ambiguidade**: se o usuário disser apenas *"Registrar 500 reais"*, o sistema alerta os campos faltantes sem inventar dados.

---

## 7. Módulos do Sistema

1. **Dashboard**: Métricas operacionais, tarefas urgentes, resumo financeiro, movimentação analítica por sócio e visão restrita no portal do cliente.
2. **Tarefas**: Visualizações em Lista (carregamento progressivo de 5 itens), Kanban e Calendário. Suporte a múltiplos responsáveis, links de mídia, histórico e aprovação pelo cliente (`[APROVAR]` e `[SOLICITAR ALTERAÇÃO]`).
3. **Solicitação de Exclusão de Tarefas**: Colaboradores não excluem diretamente; geram uma solicitação que deixa a tarefa em vermelho com 50% de opacidade até decisão do administrador.
4. **Financeiro**: Entradas e Saídas independentes dos prazos das tarefas, contas bancárias (Nubank, Inter, Caixa), conciliação com data efetiva (`paid_at`), faturamento por cliente e movimentação por sócio parceiro sem ranking.
5. **CRM & Prospecção**: Funil em Kanban e Lista com regra dinâmica de **`SEM RESPOSTA`** para contatos sem interação há mais de 7 dias e timeline de follow-up.
6. **Agenda & Google Calendar**: Compromissos com separação estrita (tarefas não vão para a agenda externa; apenas eventos da agenda são sincronizáveis).
7. **Clientes**: Ficha completa com abas de Visão Geral, Financeiro, Tarefas, Projetos e Contratos.
8. **Projetos**: Controle de campanhas com barra de progresso por tarefas concluídas.
9. **Contratos**: Gestão de vigência e links externos seguros.
10. **Notificações**: Contador no cabeçalho com leitura em tempo real.
11. **Configurações**: Gerenciamento de equipe, cargos criativos, categorias e chave de IA.

---

## 8. Variáveis de Ambiente

Arquivo `.env.local`:
```ini
JWT_SECRET=super_secret_jwt_key_creative_agency_2026_change_in_production
GEMINI_API_KEY=sua_chave_gemini_aqui
GEMINI_MODEL=gemini-1.5-flash
DEFAULT_TIMEZONE=America/Sao_Paulo
```

---

## 9. Estrutura de Diretórios

```
├── app/
│   ├── (app)/
│   │   ├── layout.tsx         # Layout autenticado (Sidebar + Header)
│   │   ├── dashboard/page.tsx # Dashboard administrativo e do cliente
│   │   ├── tasks/page.tsx     # Tarefas (Lista, Kanban, Calendário, Detalhes)
│   │   ├── clients/page.tsx   # Clientes e ficha com abas
│   │   ├── projects/page.tsx  # Projetos e campanhas
│   │   ├── finance/page.tsx   # Módulo financeiro e contas bancárias
│   │   ├── crm/page.tsx       # CRM comercial e regra de 7 dias
│   │   ├── agenda/page.tsx    # Agenda interna e Google Calendar
│   │   ├── contracts/page.tsx # Gestão de contratos
│   │   ├── assistant/page.tsx # Assistente Gemini (Voz/Texto + Confirmação)
│   │   ├── notifications/page.tsx # Central de notificações
│   │   ├── reports/page.tsx   # Relatórios analíticos
│   │   └── settings/page.tsx  # Configurações gerais e cargos
│   ├── api/                   # Rotas de API REST seguras
│   ├── login/page.tsx         # Página de login com atalhos de demonstração
│   ├── globals.css            # Estilos globais e Tailwind
│   └── layout.tsx             # Root layout
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx        # Menu lateral responsivo e retrátil
│   │   └── Header.tsx         # Cabeçalho com notificações e menu de perfil
│   └── MediaViewer.tsx        # Visualizador modal inteligente de links externos
├── lib/
│   ├── db.ts                  # Adaptador D1 SQLite
│   ├── auth.ts                # Autenticação JWT e RBAC
│   ├── audit.ts               # Serviço de trilha de auditoria
│   ├── notifications.ts       # Criação e despacho de notificações
│   ├── media.ts               # Detecção e tratamento de mídias incorporadas
│   ├── gemini.ts              # Integração Google Gemini e parser NLU
│   └── utils.ts               # Formatadores de moeda, data e classes
├── migrations/
│   └── 0001_initial_schema.sql# Schema D1 com 23 tabelas e índices
├── scripts/
│   └── seed.mjs               # Seed completo com dados realistas de agência
├── wrangler.jsonc             # Configuração para deploy na Cloudflare
└── package.json
```
