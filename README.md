# Horas-Homem web

Projeto mobile-first em Next.js (App Router) + TypeScript e CSS puro para lançamento e acompanhamento de horas-homem de equipes terceiras.

## Visão geral
- **Administrador**: autenticado com Firebase Authentication (SDK client) e operações seguras via rotas de API com Firebase Admin SDK.
- **Terceiro**: sem login; acesso via link privado `/p/[folderId]?k=...` validado no servidor, liberando apenas lançamentos na pasta correspondente.
- **Dados**: Firestore para pastas, ordens de serviço e lançamentos. Estrutura preparada para futuras expansões de fechamento de horas e relatórios.

## Estrutura do repositório
```
src/
  app/
    layout.tsx        # Layout raiz e metadados
    page.tsx          # Landing inicial da Etapa 1
    admin/
      page.tsx        # Placeholder painel admin
      login/page.tsx  # Placeholder login admin
    p/demo/page.tsx   # Placeholder acesso de terceiro
  components/         # UI base (Button, Input, Card, Modal, Toast)
    Button.tsx
    Card.tsx
    Input.tsx
    Modal.tsx
    Toast.tsx
  app/globals.css     # Estilos globais em CSS puro (mobile-first)
next.config.mjs       # Configuração Next.js (strict mode)
eslint.config.mjs     # Regras de lint baseadas no Next
package.json          # Scripts e dependências (Next, React, TypeScript)
tsconfig.json         # Path alias @/* e opções do TS
```

## Variáveis de ambiente (placeholders)
Crie um arquivo `.env.local` com as chaves do Firebase (ajustar valores reais na integração):
```
NEXT_PUBLIC_FIREBASE_API_KEY=changeme
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=changeme
NEXT_PUBLIC_FIREBASE_PROJECT_ID=changeme
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=changeme
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=changeme
NEXT_PUBLIC_FIREBASE_APP_ID=changeme

FIREBASE_ADMIN_PROJECT_ID=changeme
FIREBASE_ADMIN_CLIENT_EMAIL=changeme
FIREBASE_ADMIN_PRIVATE_KEY=changeme
```

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

## Próximos passos
- Integrar Firebase (client + admin) com variáveis de ambiente seguras.
- Definir modelos/serviços para pastas, ordens de serviço e lançamentos.
- Implementar telas do administrador e do terceiro (rota `/p/[folderId]?k=...`) com validações de horário, assinatura digital e confirmações de salvamento.
