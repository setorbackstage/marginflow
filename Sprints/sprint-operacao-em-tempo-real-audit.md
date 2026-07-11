# Sprint Operação em Tempo Real — Relatório de Auditoria e Entregáveis

Data: 2026-07-11  
Sprint: `sprint operação em tempo real.md`  
Branch: `main`

---

## 1. Diagnóstico Inicial

### O que existia

| Mecanismo | Intervalo | Tabelas cobertas |
|---|---|---|
| TanStack Query polling — pedidos | 5s foreground / 30s background | `orders` |
| TanStack Query polling — cozinha | 8s | `kitchen_tickets` |
| TanStack Query polling — entregas | 10s | `deliveries` |
| TanStack Query polling — notificações | 15s | `notifications` |
| TanStack Query polling — dashboard | 30s–60s | agregados client-side |
| `useNewOrderNotifier` | 5s / 30s bg | `orders` (PENDING) |
| Botão Refresh Global | manual | todas |

**Problema:** polling a cada 5–15s é confiável mas nunca é "instantâneo". Um pedido novo do iFood podia levar até 5s para aparecer. Status de cozinha podia levar 8s.

### O que não existia

- `@supabase/realtime-js` — não instalado
- Variáveis `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — inexistentes
- Tabelas no `supabase_realtime` publication — não configurado (Prisma migrations não adicionam automaticamente)
- Nenhum WebSocket, SSE ou Broadcast ativo

---

## 2. Decisão de Arquitetura

### Por que Supabase Realtime e não SSE/WebSocket próprio

- **SSE próprio no Vercel:** timeout serverless de 25s — inviável para conexão persistente.
- **WebSocket próprio:** exigiria servidor dedicado (não serverless). Fora do escopo MVP.
- **Supabase Realtime:** WebSocket do browser direto para `wss://[project].supabase.co` — bypassa o Vercel completamente. Zero custo de infra adicional.

### Padrão implementado: Realtime como sinal, TanStack Query como dado

```
Banco muda (INSERT/UPDATE/DELETE)
        ↓
Supabase Realtime (logical replication) detecta
        ↓
WebSocket envia evento ao browser (< 100ms)
        ↓
useRealtimeInvalidator → queryClient.invalidateQueries(key)
        ↓
TanStack Query refetcha da nossa API autenticada (JWT)
        ↓
UI atualiza instantaneamente
```

**Dados sensíveis nunca passam pelo Supabase Realtime.** O payload do evento não é lido — é apenas o gatilho. A busca de dados continua via nossa API com JWT.

### Por que não SSR/streaming

O sistema de auth é nosso (JWT), não Supabase Auth. RLS com `auth.uid()` não funcionaria para nossos usuários. A abordagem de sinal + invalidação contorna isso elegantemente.

---

## 3. Arquivos Criados e Modificados

### Criados (3 arquivos)

```
lib/supabase-realtime.ts
hooks/use-realtime-invalidator.ts
prisma/migrations/20260711100000_enable_realtime_on_operational_tables/migration.sql
```

### Modificados (7 arquivos)

```
.env                                         — NEXT_PUBLIC_SUPABASE_URL + KEY adicionados
components/app-shell/app-shell-layout.tsx    — <RealtimeInvalidator /> montado no shell
features/orders/hooks.ts                     — polling 5s → 15s (fallback)
features/orders/use-new-order-notifier.ts    — polling 5s → 15s foreground
features/kitchen/hooks.ts                    — polling 8s → 15s (fallback)
features/delivery/hooks.ts                   — polling 10s → 20s (fallback)
features/notifications/hooks.ts              — polling 15s → 30s (fallback)
```

### Banco de dados (via Supabase MCP)

```sql
alter publication supabase_realtime add table orders;
alter publication supabase_realtime add table kitchen_tickets;
alter publication supabase_realtime add table payments;
alter publication supabase_realtime add table notifications;
alter publication supabase_realtime add table deliveries;
alter publication supabase_realtime add table stock_movements;
```

Aplicado diretamente no projeto `butercuvqsimgfcfqxvh` via MCP tool.

---

## 4. Como Funciona — Detalhe Técnico

### `lib/supabase-realtime.ts`

Singleton do `RealtimeClient`. Um único WebSocket por sessão de browser, compartilhado por todos os canais. Guarda `typeof window === "undefined"` para SSR safety.

### `hooks/use-realtime-invalidator.ts`

Monta no app-shell, uma vez. Cria um canal Supabase Realtime por store (`store-{storeId}`). Sobre esse canal multiplexado, registra 6 subscriptions de `postgres_changes`:

| Tabela | Invalidações disparadas |
|---|---|
| `orders` | `["orders", storeId]` + `["dashboard", storeId]` |
| `kitchen_tickets` | `["kitchen", storeId]` |
| `payments` | `["payments", storeId]` + `["dashboard", storeId]` |
| `notifications` | `["notifications", storeId]` |
| `deliveries` | `["delivery", storeId]` |
| `stock_movements` | `["inventory", storeId]` + `["dashboard", storeId]` |

Todas com `filter: store_id=eq.{storeId}` — só recebe eventos da loja ativa.

Cleanup no `return` do `useEffect` remove o canal corretamente ao desmontar.

### Novos intervalos de polling (safety net)

| Query | Antes | Depois | Gatilho realtime |
|---|---|---|---|
| Pedidos (lista) | 5s | 15s | `orders` INSERT/UPDATE |
| Notificador de pedidos | 5s / 30s bg | 15s / 30s bg | `orders` INSERT |
| Cozinha | 8s | 15s | `kitchen_tickets` UPDATE |
| Entregas | 10s | 20s | `deliveries` INSERT/UPDATE |
| Notificações | 15s | 30s | `notifications` INSERT |
| Dashboard | 30s–60s | inalterado | `orders`+`payments`+`stock_movements` |

O `useNewOrderNotifier` se beneficia automaticamente: `invalidateQueries(["orders", storeId])` invalida `["orders", storeId, "notifier-pending"]` por correspondência parcial do TanStack Query. Pedido iFood novo → realtime dispara → notificador refetcha → som + toast instantâneos.

---

## 5. Cobertura do Realtime

### O que é instantâneo agora

- ✅ Pedido novo chega (qualquer canal — iFood, balcão, telefone)
- ✅ Status do pedido muda (confirmar, preparar, pronto, entregar, cancelar)
- ✅ Ticket de cozinha criado ou atualizado
- ✅ Entrega atribuída, despachada, concluída
- ✅ Pagamento registrado ou atualizado
- ✅ Notificação nova (badge atualiza instantaneamente)
- ✅ Movimento de estoque (dashboard de estoque atualiza)

### O que ainda é polling (sem tabela dedicada de realtime)

- Dashboard KPIs agregados (30s–60s) — derivados de múltiplas tabelas, polling suficiente
- Configurações da loja (staleTime 60s) — muda raramente

---

## 6. Segurança

- A `NEXT_PUBLIC_SUPABASE_ANON_KEY` é a chave anônima — projetada para ser pública, sem permissões de escrita no banco.
- O filtro `store_id=eq.{uuid}` limita eventos ao store do usuário logado.
- Nenhum dado sensível trafega pelo canal realtime — apenas o sinal "algo mudou" é recebido.
- Todos os dados reais continuam sendo buscados pela nossa API com JWT.

---

## 7. Dependência adicionada

```
@supabase/realtime-js  2.110.2
```

Pacote standalone de ~50KB (minified+gzip). Apenas o cliente WebSocket de realtime — sem auth, storage, ou database SDK do Supabase.

---

## 8. Resultados do Build

```
pnpm tsc --noEmit    ✅  0 erros
pnpm lint            ✅  0 erros (3 warnings pré-existentes)
pnpm build           ✅  Compiled successfully
```

---

## 9. Configuração necessária no Vercel

Adicionar nas variáveis de ambiente do projeto Vercel (Production + Preview):

```
NEXT_PUBLIC_SUPABASE_URL=https://butercuvqsimgfcfqxvh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Sem essas vars no Vercel, o realtime silenciosamente não conecta (sem erro — o polling de fallback garante funcionamento normal).
