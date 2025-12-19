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
    layout.tsx       # Layout raiz e metadados
    page.tsx         # Landing inicial da Etapa 1
    globals.css      # Estilos globais em CSS puro
next.config.mjs      # Configuração Next.js (strict mode)
eslint.config.mjs    # Regras de lint baseadas no Next
package.json         # Scripts e dependências (Next, React, TypeScript)
tsconfig.json        # Path alias @/* e opções do TS
```

## Como testar localmente
1. Configure o registro npm acessível para instalar dependências (por padrão: `https://registry.npmjs.org`).
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
