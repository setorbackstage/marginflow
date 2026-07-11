# Sprint Final MVP — Relatório de Auditoria e Entregáveis

Data: 2026-07-10  
Sprint: `sprintmtimportante.md`  
Commit final: `18523af`

---

## 1. Auditoria Inicial — Problemas Encontrados

### Dados Falsos / Mocks

| Arquivo | Problema |
|---|---|
| `components/app-shell/notifications.tsx` | `const items = [...]` — 3 notificações hardcoded com dados falsos. Badge sempre mostrava 2. "Ver todas" era link morto. |
| `features/orders/use-new-order-notifier.ts` | `requestNotificationPermission()` no mount — diálogo de permissão do browser aparecia em contas sem pedidos. |

### Bugs de UX

| Arquivo | Problema |
|---|---|
| `app/(app)/settings/page.tsx` — `OperatingHoursSection` | Skeleton permanente: `if (store.isLoading \|\| !schedule)` com `schedule` nunca sendo populado quando `operatingHours` era null no banco. |
| `app/(app)/customers/page.tsx` — dropdown "Editar" | Chamava `setDetailId(customer.id)` — abria o painel de detalhe em vez do formulário de edição. |
| `features/customers/components/customer-detail-sheet.tsx` | Status do pedido exibido como string crua (`CONFIRMED`, `DELIVERED` etc.) em vez de `StatusBadge`. |
| `app/(app)/page.tsx` — `TopConsumedCard` | Envolvido em `<div className="grid gap-4 lg:grid-cols-2">` com apenas 1 filho — coluna vazia ao lado. |
| `features/orders/components/order-payment-card.tsx` | Estado de carregamento usando `<p>Carregando...</p>` em vez de Skeleton. Sem estado de erro. |

### Ausência de Funcionalidades Críticas

| Item | Status Antes |
|---|---|
| Botão de atualização global | Não existia |
| Banner de detecção offline | Não existia |
| Tab de configuração de sons | Não existia |
| Central de notificações real | Não existia — apenas mock |

---

## 2. Arquivos Criados, Modificados e Removidos

### Criados (16 arquivos)

```
app/api/v1/stores/[storeId]/notifications/route.ts
app/api/v1/stores/[storeId]/notifications/read-all/route.ts
app/api/v1/stores/[storeId]/notifications/[notificationId]/route.ts
components/app-shell/offline-banner.tsx
features/notifications/types.ts
features/notifications/api.ts
features/notifications/hooks.ts
features/notifications/index.ts
prisma/migrations/20260711090000_add_notifications/migration.sql
server/repositories/notification.repository.ts
server/services/notification.service.ts
```

### Modificados (12 arquivos)

```
app/(app)/customers/page.tsx          — fix dropdown Editar
app/(app)/page.tsx                    — fix grid TopConsumedCard
app/(app)/settings/page.tsx           — fix OperatingHours + tab Sons
components/app-shell/app-shell-layout.tsx — adiciona OfflineBanner
components/app-shell/notifications.tsx    — substitui mock por implementação real
components/app-shell/top-bar.tsx          — adiciona RefreshButton
features/customers/components/customer-detail-sheet.tsx — StatusBadge
features/orders/components/order-payment-card.tsx       — Skeleton + ErrorState
features/orders/use-new-order-notifier.ts               — permissão lazy
features/stores/types.ts              — notificationPreferences no StoreSettings
prisma/schema.prisma                  — model Notification + relations
server/repositories/index.ts          — export notificationRepository
server/services/index.ts              — export notificationService
```

### Removidos

Nenhum arquivo removido.

---

## 3. Bugs Corrigidos

### Bug 1 — OperatingHoursSection sempre em skeleton
**Causa raiz:** `useSyncedState<WeeklySchedule | null>` inicializado como `null`. Guard `if (store.isLoading || !schedule)` nunca chegava ao render pois `schedule` ficava `null` para lojas sem horários configurados no banco.  
**Solução:** Inicializar state com `DEFAULT_SCHEDULE` (Seg–Sex 09h–18h, Sab/Dom fechado). Guard reduzido para `if (store.isLoading)`.

### Bug 2 — Customer "Editar" abre painel de detalhe
**Causa raiz:** `onClick` do item de menu chamava `setDetailId(customer.id)` que abre o `CustomerDetailSheet`.  
**Solução:** Trocar para `setFormDialog({ open: true, customer: customer as unknown as CustomerDetail })` que abre o `CustomerFormDialog`.

### Bug 3 — Status do pedido como string crua
**Causa raiz:** `<p className="text-xs text-muted-foreground">{order.status}</p>` sem formatação.  
**Solução:** Importar `ORDER_STATUS_CONFIG` de `@/features/orders` e usar `<StatusBadge status={order.status} config={ORDER_STATUS_CONFIG} />`.

### Bug 4 — TopConsumedCard em grid de 2 colunas
**Causa raiz:** `<div className="grid gap-4 lg:grid-cols-2">` com apenas `<TopConsumedCard />` como filho.  
**Solução:** Remover o wrapper `div` com grid — card renderiza como bloco.

### Bug 5 — order-payment-card sem estados adequados
**Causa raiz:** Estado de loading com `<p>Carregando...</p>`, sem estado de erro.  
**Solução:** Loading com `<Skeleton className="h-24 w-full" />`, erro com `<ErrorState error={payment.error} onRetry={() => payment.refetch()} />`.

### Bug 6 — Browser permission dialog em conta vazia
**Causa raiz:** `useNewOrderNotifier` chamava `requestNotificationPermission()` em `useEffect([])` — disparava para qualquer loja ao entrar na app.  
**Solução:** Permissão solicitada lazily apenas quando um pedido marketplace real chega (`sendNativeNotification` com `Notification.requestPermission()` no fluxo de notificação).

---

## 4. Melhorias de UX Implementadas

| Melhoria | Detalhe |
|---|---|
| **Botão Refresh Global** | `RefreshButton` no `TopBar`: ícone `RefreshCw` gira enquanto qualquer query está ativa (`useIsFetching`). Clique invalida todas as queries. |
| **Banner Offline** | `OfflineBanner` detecta `navigator.onLine` + eventos `window.online`/`offline`. Aparece entre TopBar e conteúdo. |
| **Tab de Sons** | `NotificationsSoundsSection` em Settings > Sons: toggle mestre, toggles por evento (novo pedido, pagamento, entrega, estoque), slider de volume, botão "Testar som", persistido em `notificationPreferences.sounds`. |
| **Empty state nas notificações** | "Nenhuma notificação" quando lista vazia; skeleton durante carregamento; mensagem de erro com instrução. |
| **Horário de funcionamento** | Não trava mais em skeleton quando a loja não tem horário configurado. |

---

## 5. Sistema Realtime — Como Funciona

### Arquitetura

O sistema **não usa WebSockets nem SSE** (incompatíveis com Vercel serverless 25s timeout). A estratégia é polling com TanStack Query.

### Notificações (polling 15s)

```
Evento de domínio (order.created, payment.paid etc.)
        ↓
eventBus.publish(event, db)  [síncrono, mesma transaction]
        ↓
notification.service listeners  [7 listeners, auto-registrados no import]
        ↓
notificationRepository.create(db, {...})  [INSERT na tabela notifications]
        ↓
Frontend: useNotifications() polls GET /api/v1/.../notifications a cada 15s
        ↓
Badge atualiza, dropdown mostra notificação real
```

### Pedidos iFood (polling 5s/30s)

```
useNewOrderNotifier: polling PENDING orders a cada 5s (foreground) / 30s (background)
        ↓
Novo marketplace order detectado (Set de IDs conhecidos)
        ↓
playAlertSound() + toast.success() + sendNativeNotification() [lazy, com permissão]
```

---

## 6. Notification Center Real

### Banco de Dados

Tabela `notifications`:
- `id` UUID, `store_id` UUID FK, `user_id` UUID FK nullable
- `type` VARCHAR (NEW_ORDER, ORDER_CANCELLED, PAYMENT_RECEIVED, PAYMENT_REFUNDED, DELIVERY_FAILED, STOCK_LOW, KITCHEN_READY, SYSTEM)
- `title`, `body`, `link`, `metadata` JSONB
- `read_at` TIMESTAMPTZ nullable (null = não lida)
- `created_at` TIMESTAMPTZ
- Index em `(store_id, created_at DESC)`

### Eventos → Notificações

| Evento | Notificação |
|---|---|
| `order.created` | "Novo pedido #N — X itens · R$ Y" |
| `order.cancelled` | "Pedido #N cancelado — {motivo}" |
| `payment.paid` | "Pagamento recebido — R$ X · PIX/Crédito/etc." |
| `payment.refunded` | "Reembolso total/parcial processado" |
| `delivery.failed` | "Entrega falhou — {motivo}" |
| `stock.low` | "Estoque baixo — {ingrediente}: X un (mín. Y)" |
| `kitchen_ticket.ready` | "Pedido #N pronto para sair/retirada" |

### Funcionalidades da UI

- Marcar individual como lida (clique no item)
- Marcar todas como lidas (botão "Ler tudo")
- Badge sincronizado com contagem real de não lidas
- Horário relativo via `formatDistanceToNow` com `ptBR`
- Skeleton durante carregamento, empty state humanizado
- Polling 15s (foreground apenas, para não drenar bateria)

---

## 7. Preparação para Futuras Integrações

O event bus existente (`server/lib/events/bus.ts`) já é o ponto de extensão. Para adicionar uma nova integração:

1. Criar `server/integrations/{plataforma}/` com `client.ts`, `mapper.ts`, `events.ts`
2. Registrar listeners no event bus (padrão `eventBus.on("event.type", "chave-unica", async (event, db) => {...})`)
3. Nenhuma refatoração do core necessária

O `notificationService` também já está preparado para tipos adicionais de notificação — basta adicionar um novo `eventBus.on(...)` em `notification.service.ts`.

---

## 8. Resultados do Build

```
pnpm tsc --noEmit    ✅  0 erros
pnpm lint            ✅  0 erros (3 warnings pré-existentes: React Hook Form watch() + unused eslint-disable)
pnpm build           ✅  Compiled successfully in 26.6s
```

Deploy: `https://marginflow-foj6t7bze-setor-backstage.vercel.app` (production)  
Commit: `18523af`

---

## 9. Pendente (Próximas Sprints)

As etapas abaixo da sprint estão registradas para continuidade:

| Etapa | Descrição |
|---|---|
| 7 | Onboarding completo (checklist + tour spotlight) |
| 8 | Empty states humanizados em todas as telas |
| 9 | Busca global tipo Spotlight (Ctrl+K) |
| 13 | Seletor internacional de telefone com bandeira/máscara |
| 14 | Máscaras CPF/CNPJ com validação |
| 15 | Timestamp "última atualização" por tela |
| 18 | Performance: lazy loading, memoização, prefetch |
