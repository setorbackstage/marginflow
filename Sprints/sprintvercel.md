Sprint — Deploy em Produção (Vercel)
Objetivo

Publicar o MarginFlow OS em produção utilizando:

Frontend + API (Next.js) → Vercel
Banco → Supabase (já configurado)
Prisma → Supabase PostgreSQL
JWT próprio (não migrar para Supabase Auth)

IMPORTANTE

Esta sprint é somente infraestrutura.

É proibido:

criar funcionalidades
alterar regra de negócio
refatorar services
alterar contratos HTTP
modificar schema
alterar migrations existentes
criar novos módulos

O comportamento do sistema deve permanecer idêntico.

Etapa 1 — Auditoria obrigatória

Antes de modificar qualquer arquivo, audite:

package.json
prisma.config.ts
prisma/schema.prisma
next.config.mjs
middleware.ts
app/api/*
server/db.ts
config/env.ts

Verifique:

variáveis obrigatórias
runtime Node
Prisma Client
build da Vercel
Server Components
Route Handlers
uso de server-only
geração do Prisma Client
caminhos relativos

Não altere nada antes da auditoria.

Etapa 2 — Compatibilidade Vercel

Garanta que:

Runtime

Todo Route Handler rode em

export const runtime = "nodejs";

onde necessário.

Não usar Edge Runtime para Prisma.

Dynamic Rendering

Somente onde realmente necessário.

Evitar forçar páginas dinâmicas sem necessidade.

Build

Garantir que:

pnpm build

gera exatamente o mesmo resultado local e na Vercel.

Etapa 3 — Prisma

Verificar:

Prisma Client gerado corretamente
adapter-pg funcionando
DATABASE_URL
DIRECT_URL
pooler transaction
conexões serverless

Não trocar adapter.

Não trocar ORM.

Não trocar arquitetura.

Etapa 4 — Variáveis de ambiente

Gerar uma lista completa das envs necessárias.

Exemplo:

DATABASE_URL

DIRECT_URL

JWT_PRIVATE_KEY

JWT_PUBLIC_KEY

NODE_ENV

Verificar se existe qualquer env esquecida.

Não inventar novas.

Etapa 5 — Build Production

Executar

pnpm lint

pnpm tsc --noEmit

pnpm build

Corrigir apenas erros que impeçam produção.

Não fazer melhorias estéticas.

Etapa 6 — Deploy

Preparar tudo para:

vercel

ou

vercel --prod

Sem hacks.

Sem workarounds temporários.

Etapa 7 — Pós Deploy

Validar em produção:

Login

Refresh Token

Logout

Dashboard

Produtos

Clientes

Pedidos

Pagamento

Estoque

Ficha Técnica

Cozinha

Entregas

Cardápios

Todas as chamadas HTTP devem funcionar na URL pública.

Etapa 8 — Performance

Somente problemas reais.

Não fazer micro otimizações.

Apenas verificar:

imagens
cache
bundle
prisma client
queries N+1

Se não houver problema, não modificar.

Etapa 9 — Segurança

Verificar:

Cookies

JWT

HTTPS

Headers

Secrets

Env vars

Nenhum segredo pode ficar commitado.

Etapa 10 — Relatório obrigatório

No final entregar obrigatoriamente:

Arquivos modificados
Motivo de cada alteração
Variáveis necessárias na Vercel
Configuração necessária no Supabase
Build
pnpm lint

pnpm tsc

pnpm build

todos aprovados.

Testes realizados
URL publicada

(se publicada)

ou

explicar exatamente o que impede a publicação.

Restrições
Não criar funcionalidades.
Não alterar UX.
Não alterar layout.
Não refatorar código funcionando.
Não alterar banco.
Não alterar autenticação.
Não alterar permissões.
Não alterar contratos HTTP.
Não criar novas dependências sem justificativa técnica.
Não alterar migrations existentes.

Objetivo único: deixar o projeto pronto e publicado na Vercel utilizando o Supabase como banco de produção, preservando integralmente o comportamento do MVP.