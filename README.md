# Horas-Homem web

Projeto mobile-first em Next.js (App Router) + TypeScript e CSS puro para lançamento e acompanhamento de horas-homem de equipes terceiras.

## Visão geral
- **Login do administrador**: autenticação via Firebase Authentication (email/senha) com proteção de rotas server-side usando Firebase Admin SDK.
- **Pasta + link privado**: criação/edição de pastas e geração de link com token `k` para liberar apenas a pasta selecionada ao terceiro.
- **O.S com CRUD e OCR**: cadastro, busca e importação de ordens de serviço com leitura de imagens via Tesseract (OCR) para agilizar a digitação.
- **Tela do terceiro**: seleção de funcionários, lançamentos de serviços por O.S, validações de horários, dictation por voz (quando suportado), assinatura digital e salvamento com feedback em tempo real.
- **Agregação e fechamento**: endpoint de agregação (`/api/admin/folders/[folderId]/aggregate`) já pronto para somar horas por período; tela de fechamento disponível como placeholder aguardando conexão com o endpoint.

## Estrutura do repositório
```
src/
  app/
    layout.tsx        # Layout raiz e metadados
    page.tsx          # Landing de divulgação do produto
    providers.tsx     # Providers globais (auth, toasts)
    admin/
      layout.tsx      # Shell autenticada para o painel
      page.tsx        # Quadro estilo kanban com pastas
      login/page.tsx  # Login do administrador (Firebase Auth)
      pastas/page.tsx # CRUD de pastas + geração de link privado
      pastas/[folderId]/os/page.tsx # CRUD de O.S. com importação/OCR
      pastas/[folderId]/fechamento/page.tsx # Placeholder conectado ao endpoint de agregação
    p/demo/page.tsx   # Link público de demonstração
    p/[folderId]/page.tsx # Portal do terceiro: funcionários, serviços, voz e assinatura
  app/api/admin/folders/   # Rotas protegidas para CRUD de pastas
  app/api/admin/folders/[folderId]/os/   # Rotas protegidas para CRUD/edição em massa de O.S.
  app/api/admin/folders/[folderId]/aggregate/ # Agregados de horas por período (admin)
  app/api/p/folders/[folderId]/summary/  # Validação de link privado
  app/api/p/folders/[folderId]/os/       # Listagem de O.S. públicas para o terceiro
  app/api/p/folders/[folderId]/days/[date]/employees/     # Funcionários do dia (GET/POST)
  app/api/p/folders/[folderId]/days/[date]/employees/[employeeId]/ # Atualização de horários do funcionário (PATCH)
  app/api/p/folders/[folderId]/days/[date]/employees/[employeeId]/services/      # CRUD de serviços (GET/POST)
  app/api/p/folders/[folderId]/days/[date]/employees/[employeeId]/services/[serviceId]/ # Atualização/remoção de serviços (PATCH/DELETE)
  components/         # UI base (Button, Input, Card, Modal, Toast, TimeSequenceInput)
    Button.tsx
    Card.tsx
    Input.tsx
    Modal.tsx
    Toast.tsx
    TimeSequenceInput.tsx
  app/globals.css     # Estilos globais em CSS puro (mobile-first)
next.config.mjs       # Configuração Next.js (strict mode)
eslint.config.mjs     # Regras de lint baseadas no Next
package.json          # Scripts e dependências (Next, React, TypeScript)
tsconfig.json         # Path alias @/* e opções do TS
```

## Variáveis de ambiente
Crie um arquivo `.env.local` (para desenvolvimento) ou defina as chaves no painel da Vercel (Produção):

**Cliente (NEXT_PUBLIC_*)**
```
NEXT_PUBLIC_FIREBASE_API_KEY=<sua-api-key>
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=<seu-auth-domain>
NEXT_PUBLIC_FIREBASE_PROJECT_ID=<seu-project-id>
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=<seu-storage-bucket>
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=<seu-sender-id>
NEXT_PUBLIC_FIREBASE_APP_ID=<seu-app-id>
```
Usadas pelo app Next.js para inicializar o Firebase Authentication no login do administrador.

**Servidor/Admin**
```
FIREBASE_ADMIN_PROJECT_ID=<seu-project-id>
FIREBASE_ADMIN_CLIENT_EMAIL=<service-account-email>
FIREBASE_ADMIN_PRIVATE_KEY=<service-account-private-key>
```
Armazenadas apenas no backend para validar links, proteger rotas `/api/admin/*` e gerar agregações. A chave privada deve ser salva com quebras de linha escapadas (`\n`). Exemplo: `-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n`. No código (`src/lib/env.ts`), ela é convertida para múltiplas linhas com `privateKeyRaw.replace(/\\n/g, '\n')`.

## Rotas principais
- `/` — landing page com visão geral do produto.
- `/admin/login` — login do administrador (Firebase Authentication).
- `/admin` — dashboard do administrador com quadro e atalho para pastas.
- `/admin/pastas` — listagem, criação e edição de pastas com geração de link privado.
- `/admin/pastas/[folderId]/os` — CRUD de O.S. da pasta, importação em lote e OCR.
- `/admin/pastas/[folderId]/fechamento` — placeholder conectado ao endpoint de agregação para exportar/filtrar horas.
- `/p/[folderId]?k=...` — portal público do terceiro com validação de token `k`, lançamentos de serviços, voz e assinatura.

## Como testar localmente
1. Garanta acesso ao registry npm (`https://registry.npmjs.org`) para baixar dependências.
2. Instale as dependências: `npm install`.
3. Rode o servidor de desenvolvimento: `npm run dev` e acesse `http://localhost:3000`.

> Observação: no ambiente atual não foi possível baixar pacotes da npm registry (erros 403). Execute a instalação em um ambiente com acesso liberado ao registry para continuar o desenvolvimento.

## Scripts
- `npm run dev` — inicia o servidor de desenvolvimento Next.js.
- `npm run build` — gera a build de produção.
- `npm run start` — inicia o servidor em modo produção.
- `npm run lint` — executa linting com as regras do Next.js.
- `npm run format` — formata os arquivos com Prettier.

## Deploy na Vercel
1. Crie o projeto na Vercel apontando para este repositório.
2. Em **Environment Variables**, cadastre todas as chaves listadas em “Variáveis de ambiente” (incluindo o `FIREBASE_ADMIN_PRIVATE_KEY` com `\n`).
3. Mantenha o comando de build padrão (`next build`) e output `.next`.
4. As funções serverless usam Firebase Admin de forma lazy (inicialização dentro de `getAdminApp()`), compatível com o ambiente da Vercel.

## Possíveis melhorias
- Testes automatizados (unitários e E2E) cobrindo fluxos críticos de admin e terceiro.
- Ajustes de UX/acessibilidade (atalhos de teclado, estados de loading e foco).
- Exportação/download direto na tela de fechamento usando o endpoint de agregação já disponível.
