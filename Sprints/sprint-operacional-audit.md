# Sprint Operacional — Relatório de Auditoria e Entregáveis

Data: 2026-07-11  
Sprint: `sprint operacional.md`  
Branch: `main`

---

## Visão Geral

Sprint focada em transformar o MarginFlow num **Channel Hub operacional real**:  
pedidos iFood chegam em tempo real, clientes são capturados automaticamente, estoque baixo desativa produtos no marketplace, e o dashboard passa a exibir breakdown por canal.

---

## 1. Auditoria Inicial — Problemas Encontrados

| # | Arquivo / Componente | Problema |
|---|---|---|
| 1 | `vercel.json` | Cron schedule `"0 0 * * *"` — polling iFood rodava **uma vez por dia** às meia-noite. Pedidos levavam até 24h para aparecer. |
| 2 | `server/services/ifood-sync.service.ts` | `findByStorePlatform(prisma, "IFOOD", storeId)` — argumentos `storeId` e `platform` invertidos em **duas** chamadas. Integração nunca encontrava credenciais corretas. |
| 3 | `server/services/ifood-sync.service.ts` | `customerId: null` hardcoded no `eventBus.publish` — pedidos iFood nunca vinculavam clientes, perdendo todo o histórico. |
| 4 | Não existia | Webhook iFood: sem endpoint para receber push events. Dependia exclusivamente do cron com schedule quebrado. |
| 5 | Não existia | Listener `stock.low`: quando ingrediente acabava, produtos afetados **não** eram desativados no iFood. |
| 6 | `features/orders/api.ts` | Parâmetro `channel` não era passado ao endpoint da API — filtro por canal não funcionava. |
| 7 | `features/orders/types.ts` | `OrderListParams` sem campo `channel` — impossível filtrar pedidos por canal. |
| 8 | `app/(app)/orders/page.tsx` | Sem filtro de canal na UI — usuário não conseguia ver só pedidos iFood ou só balcão. |
| 9 | `app/(app)/page.tsx` | Dashboard sem breakdown por canal — dono não sabia quanto veio de iFood vs. balcão. |

---

## 2. Arquivos Criados, Modificados e Removidos

### Criados (1 arquivo)

```
app/api/webhooks/ifood/route.ts
```

### Modificados (6 arquivos)

```
vercel.json                                  — cron schedule corrigido
server/services/ifood-sync.service.ts        — 3 bugs corrigidos + customer upsert + stock.low listener
features/orders/types.ts                     — campo channel em OrderListParams
features/orders/api.ts                       — channel passado ao endpoint
app/(app)/orders/page.tsx                    — filtro de canal na UI
app/(app)/page.tsx                           — ChannelBreakdownCard no dashboard
features/dashboard/hooks.ts                  — byChannel no DashboardOrdersToday
```

### Removidos

Nenhum arquivo removido.

---

## 3. Bugs Corrigidos

### Bug 1 — Cron iFood rodando uma vez por dia
**Causa raiz:** `"schedule": "0 0 * * *"` = diariamente à meia-noite.  
**Solução:** `"schedule": "* * * * *"` = a cada minuto, conforme documentação iFood (polling de segurança complementa webhooks).

### Bug 2 — findByStorePlatform com argumentos invertidos
**Causa raiz:** Assinatura da função é `(db, storeId, platform)`, mas era chamada como `(prisma, "IFOOD", storeId)` em dois lugares.  
**Solução:** Corrigido para `(prisma, storeId, "IFOOD")` e `(db, storeId, "IFOOD")`. Sem esse fix, a integração nunca encontrava credenciais e falhava silenciosamente.

### Bug 3 — Pedidos iFood sem cliente vinculado
**Causa raiz:** `customerId: null` hardcoded no publish do evento de criação.  
**Solução:** Find-or-create de customer por telefone dentro da transaction de criação do pedido. Agora todo pedido iFood com telefone disponível cria ou vincula o cliente automaticamente.

### Bug 4 — channel ausente nos params da API de pedidos
**Causa raiz:** `ordersApi.list()` não incluía `channel` no querystring.  
**Solução:** Adicionado `channel: params.channel` ao objeto passado para `qs()`.

---

## 4. Funcionalidades Implementadas

### 4.1 Webhook iFood (`app/api/webhooks/ifood/route.ts`)

- Endpoint `POST /api/webhooks/ifood`
- Aceita objeto único ou array de eventos (ambos os formatos que o iFood pode enviar)
- Chama `processIfoodEvents` do serviço existente
- Retorna 500 em erro para que o iFood faça retry automático
- Log estruturado com contagem de eventos processados

### 4.2 Customer Upsert em Pedidos iFood

Dentro da transaction de `ingestIfoodOrder`:

1. Busca customer por `(storeId, phone)`
2. Se não existe e tem nome: cria com `firstOrderAt = lastOrderAt = now`, `totalOrders = 0`, `totalSpent = 0`
3. Se existe sem `firstOrderAt`: preenche o campo
4. Após criação do pedido: incrementa `totalOrders + 1`, `totalSpent + grandTotal`, atualiza `lastOrderAt`
5. `customerId` passado corretamente ao evento de domínio `order.created`

**Resultado:** histórico completo de clientes iFood — frequência, ticket médio, primeiro e último pedido.

### 4.3 Auto-desativação de Produtos no iFood por Estoque Baixo

Listener `stock.low` registrado em `ifood-sync.service.ts`:

```
stock.low (ingredientId, storeId)
        ↓
RecipeItem → Recipe → Product (filtra por storeId + ifoodExternalCode + status ACTIVE)
        ↓
marketplaceIntegrationRepository.findByStorePlatform(db, storeId, "IFOOD")
        ↓
Se integração ACTIVE e não pausada: getIfoodAccessToken()
        ↓
Promise.allSettled → setIfoodItemAvailability(token, merchantId, externalCode, false)
```

**Resultado:** ingrediente acabou → produtos afetados desativados no iFood automaticamente.

### 4.4 Filtro de Canal na Página de Pedidos

Select dropdown "Todos os canais / Presencial / Telefone / Marketplace / WhatsApp / Totem" na página `/orders`.

- Usa `ORDER_CHANNEL_LABEL` existente (sem duplicar labels)
- Reseta página para 1 ao trocar canal
- Passa `channel` para `useOrders` → `ordersApi.list` → API

### 4.5 Channel Breakdown no Dashboard

`ChannelBreakdownCard` calculado client-side sobre os mesmos pedidos de `useDashboardOrdersToday` (sem request extra):

- Lista canais ativos hoje ordenados por receita decrescente
- Para usuários com `finance:view`: mostra receita por canal
- Para todos: mostra contagem de pedidos
- Canal MARKETPLACE exibe badge iFood vermelho
- Aparece apenas quando há pedidos (hidden se nenhum canal ativo)

---

## 5. Arquitetura Channel Hub

O MarginFlow já estava estruturado como Channel Hub desde a implementação inicial:

```
OrderChannel = "IN_STORE" | "PHONE" | "MARKETPLACE" | "WHATSAPP" | "KIOSK"
```

Todos os pedidos passam pelo mesmo pipeline:
- Mesma tabela `orders`
- Mesmo fluxo de status (PENDING → CONFIRMED → PREPARING → READY → ...)
- Mesma cozinha, mesmo financeiro, mesmas entregas
- Canal é apenas metadado que muda a origem

A Sprint Operacional ativou o **lado iFood** desse hub. Adicionar Rappi, 99Food ou WhatsApp no futuro requer apenas:
1. `server/integrations/{plataforma}/client.ts` — wrapper da API externa
2. `server/integrations/{plataforma}/mapper.ts` — normaliza para `Order`
3. `server/integrations/{plataforma}/events.ts` — listeners no event bus
4. Nenhuma alteração no core de pedidos, cozinha ou financeiro

---

## 6. Sincronização Bidirecional de Status

O sistema já tinha sync bidirecional implementado na sprint anterior:

| Quando muda no MarginFlow | iFood recebe |
|---|---|
| CONFIRMED | `CONFIRMED` |
| PREPARING | `PREPARING` |
| READY | `READY` |
| OUT_FOR_DELIVERY | `DISPATCHED` |
| DELIVERED | `DELIVERED` |
| CANCELLED | `CANCELLED` |

E quando o iFood muda (via webhook ou polling):
- `ORDER_STATUS_CHANGED` → atualiza status no MarginFlow
- `ORDER_CANCELLATION_REQUEST` → cancela com motivo
- `NEW_ORDER` → ingere pedido

---

## 7. Resultados do Build

```
pnpm tsc --noEmit    ✅  0 erros
pnpm lint            ✅  0 erros (exit code 0)
pnpm build           ✅  Compiled successfully
```

---

## 8. O Que Falta da Sprint Operacional (Próximas Etapas)

| Item | Status | Observação |
|---|---|---|
| Produtos — importar categorias/produtos/imagens do iFood | ⏳ | Sync de catálogo. Endpoint `/catalog` da API iFood |
| Horário — sincronizar abertura/fechamento/pausas | ⏳ | Já tem pause/resume da loja. Falta sync automático por horário |
| Auto-aceite por regras (estoque OK + cozinha aberta + valor < R$X) | ⏳ | Sprint 3 da visão operacional |
| Auto-pausa por fila (>15 pedidos → pausar iFood) | ⏳ | Sprint 3 |
| Auto-retorno (fila baixou → reativar) | ⏳ | Sprint 3 |
| Financeiro iFood (comissão, taxas, repasses) | ⏳ | Sprint 4 |
