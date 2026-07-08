# Dogfooding — Relatório Final de QA Operacional
**Data:** 07/07/2026  
**Operador fictício:** João Silva — Cantina do João  
**Ambiente:** Produção — https://marginflow-os.vercel.app  
**Store ID:** `0bffa52f-a7d4-4b52-a0db-0874969e8ad6`

---

## Conta Criada

| Campo | Valor |
|-------|-------|
| Nome | João Silva |
| Email | joao@cantinadojoao.com.br |
| Senha | Cantina@2024 |
| Restaurante | Cantina do João |
| Slug | cantina-do-jo-o ← **bug de encoding** |

---

## Operações Realizadas

| Cenário | Quantidade | Status |
|---------|-----------|--------|
| Categorias criadas | 8 | OK |
| Produtos criados | 20 | OK |
| Ingredientes criados | 10 | OK |
| Fichas técnicas criadas | 6 | OK |
| Clientes criados | 5 | OK |
| Endereços de entrega | 3 | OK |
| Cardápios criados | 2 (IN_STORE + DELIVERY) | OK |
| Pedidos criados (total) | 19 | OK |
| — DINE_IN (mesa) | 7 | OK |
| — TAKEAWAY (balcão) | 9 | OK |
| — DELIVERY | 3 | OK |
| Cancelamentos testados | 2 | OK |
| Tickets de cozinha processados | 17 (QUEUED→PREPARING→READY) | OK |
| Entregas finalizadas | 3 (DISPATCHED→IN_TRANSIT→DELIVERED) | OK |
| Pagamentos registrados | 2 (CASH + CREDIT_CARD) | OK |
| Movimentações de estoque geradas | 20+ automáticas | OK |

**Faturamento simulado:** R$ 1.893,00 em 19 pedidos

---

## Bugs Encontrados

### CRITICAL

#### BUG-01 — Encoding duplo de caracteres acentuados
- **Severidade:** Critical
- **Onde:** Toda resposta da API que contém texto com acentos
- **Observado:** `João` armazenado como `Jo\uFFFDo`, slug gerado como `cantina-do-jo-o`
- **Impacto:** Nome do restaurante, nome do usuário e todos os campos de texto com ã, ô, ç são exibidos com caractere de substituição (?) em produção
- **Reprodução:** POST /auth/signup com qualquer nome acentuado
- **Causa provável:** Texto enviado em UTF-8 e re-codificado pela camada de transporte ou middleware

#### BUG-02 — currentStock ignorado na criação de ingredientes
- **Severidade:** Critical
- **Onde:** POST /api/v1/stores/:storeId/inventory/ingredients
- **Observado:** Enviei `currentStock: 20000` para todos os 10 ingredientes. API retornou 201, mas estoque real ficou em 0. Após operação com pedidos, todos os ingredientes ficaram negativos (-500g a -3300g).
- **Impacto:** Operador configura estoque inicial e o sistema simplesmente ignora. CMV e alertas de estoque ficam todos errados desde o primeiro dia.
- **Reprodução:** Criar ingrediente com qualquer valor em `currentStock`, verificar GET — campo fica 0.

---

### HIGH

#### BUG-03 — isLowStock = false mesmo com estoque negativo
- **Severidade:** High
- **Onde:** GET /api/v1/stores/:storeId/inventory/ingredients
- **Observado:** Todos os ingredientes com estoque negativo (-200g a -3300g) retornam `isLowStock: false`. Exceção: Feijão Preto retornou `isLowStock: true` apenas depois que `minStock: 1000` foi definido via PATCH — a lógica é `currentStock < minStock`, não `currentStock < 0`.
- **Impacto:** Estoque negativo não dispara alerta. O restaurante opera sem insumos e o sistema não avisa.
- **Correção necessária:** `isLowStock` deve ser `true` sempre que `currentStock < 0`, independentemente de `minStock`.

#### BUG-04 — PATCH em ingrediente não atualiza currentStock
- **Severidade:** High
- **Onde:** PATCH /api/v1/stores/:storeId/inventory/ingredients/:ingredientId
- **Observado:** Enviei `{ currentStock: 19500 }` via PATCH. A resposta retornou 200, mas `currentStock` continuou sendo -500.
- **Impacto:** Não há como corrigir estoque incorreto via API. A permissão `inventory:adjust` existe no sistema mas não há endpoint correspondente.
- **Reprodução:** PATCH com `currentStock` em qualquer ingrediente, verificar que o valor não muda.

#### BUG-05 — Nenhum endpoint de ajuste/reposição de estoque
- **Severidade:** High
- **Onde:** Módulo de inventário
- **Observado:** Testei POST em `/inventory/adjustments`, `/inventory/adjust`, `/inventory/stock/adjust`, PATCH em ingrediente com currentStock — todos retornam 404 ou ignoram o campo.
- **Impacto:** A permissão `inventory:adjust` existe mas não é utilizável. Não há como registrar entrada de mercadoria, corrigir estoque ou lançar inventário manual.
- **Nota:** Este é o fluxo mais básico de estoque. Um restaurante real recebe mercadoria toda semana.

#### BUG-06 — Estoque negativo não é bloqueado em pedidos
- **Severidade:** High
- **Onde:** POST /api/v1/stores/:storeId/orders + ficha técnica
- **Observado:** Com todos os ingredientes em estoque negativo, o sistema continua aceitando novos pedidos e consumindo ainda mais estoque. Não há validação de estoque mínimo.
- **Impacto:** O restaurante pode criar pedidos de pratos cujos insumos não existem.

#### BUG-07 — Recipe endpoint: POST retorna 405 com body vazio
- **Severidade:** High (UX)
- **Onde:** POST /api/v1/stores/:storeId/products/:productId/recipe
- **Observado:** O endpoint correto é PUT (não POST). Mas o POST retorna HTTP 405 com body completamente vazio — nenhuma mensagem de erro, nenhuma indicação do método correto.
- **Impacto:** Desenvolvedor ou integrador fica sem diagnóstico. Descobri apenas lendo o código fonte.
- **Correção simples:** Retornar `405 Method Not Allowed` com body `{ "error": { "code": "METHOD_NOT_ALLOWED", "message": "Use PUT para criar ou substituir uma ficha técnica." } }`

#### BUG-08 — Timeline de pedido não inclui status de origem
- **Severidade:** High (UX)
- **Onde:** GET /api/v1/stores/:storeId/orders/:orderId/timeline
- **Observado:** Cada evento retorna `{ id, status, triggeredByUser, notes, occurredAt }`. O campo `status` é o destino da transição. Não existe campo `fromStatus` ou similar.
- **Impacto:** Ao revisar a timeline de um pedido, não é possível saber de qual status ele veio — só para onde foi.
- **Exemplo:** Ver que o pedido ficou READY não diz se veio de PREPARING ou CONFIRMED.

---

### MEDIUM

#### BUG-09 — Pedido de delivery falha silenciosamente sem indicar como criar endereço
- **Severidade:** Medium (UX)
- **Onde:** POST /api/v1/stores/:storeId/orders com type=DELIVERY sem deliveryAddressId
- **Observado:** Erro correto: `DELIVERY_ADDRESS_REQUIRED`. Mas a mensagem não diz onde criar um endereço. O operador precisa saber que é `POST /customers/:id/addresses` — endpoint completamente separado.
- **Melhoria:** Mensagem poderia incluir `"hint": "Crie um endereço em POST /customers/:customerId/addresses primeiro."`

#### BUG-10 — Pedidos criados em DRAFT, não em PENDING
- **Severidade:** Medium (UX)
- **Onde:** POST /api/v1/stores/:storeId/orders
- **Observado:** Todos os pedidos criados chegam com `status: DRAFT`. O operador precisa manualmente mover para PENDING e depois CONFIRMED antes de qualquer ação da cozinha.
- **Impacto:** Fluxo real de restaurante: operador anota o pedido → vai imediatamente para a cozinha. Dois passos extras (PENDING → CONFIRMED) criam atrito sem valor perceptível para o operador de balcão.
- **Sugestão:** Permitir que `POST /orders` receba um parâmetro `autoConfirm: true` ou que o padrão seja PENDING ao invés de DRAFT.

#### BUG-11 — Pagamento criado sempre em PENDING, sem confirmação
- **Severidade:** Medium
- **Onde:** POST /api/v1/stores/:storeId/orders/:orderId/payment
- **Observado:** Ao registrar pagamento (CASH ou CREDIT_CARD), o sistema cria o registro mas o status permanece PENDING. Não há endpoint para confirmar recebimento ou marcar como PAID.
- **Impacto:** Financeiro do sistema sempre mostrará pagamentos em aberto, mesmo após o dinheiro ter sido recebido.

#### BUG-12 — Nenhum endpoint de dashboard/analytics
- **Severidade:** Medium
- **Onde:** GET /api/v1/stores/:storeId/dashboard (e analytics, metrics, reports, summary)
- **Observado:** Todos retornam HTML 404 (Next.js not found page, não JSON).
- **Impacto:** A tela de Dashboard na UI existe (foi implementada no frontend), mas não há API correspondente. O Dashboard operacional fica sem dados ou usa dados mockados.

#### BUG-13 — Label de endereço como enum (HOME/WORK/OTHER) em vez de texto livre
- **Severidade:** Medium (UX)
- **Onde:** POST /api/v1/stores/:storeId/customers/:customerId/addresses
- **Observado:** O campo `label` aceita apenas `HOME`, `WORK` ou `OTHER`. Um operador brasileiro escreveria "Casa", "Trabalho", "Apartamento".
- **Impacto:** Atrito desnecessário. Ou o sistema precisa fazer a tradução no frontend, ou o campo deve aceitar texto livre.

---

### LOW

#### BUG-14 — Token de acesso expira em ~15 minutos
- **Severidade:** Low
- **Onde:** JWT access token
- **Observado:** Durante operação longa, o token expirou múltiplas vezes. Cada vez foi necessário re-autenticar.
- **Impacto:** Para operação via API (integrações, scripts), o token de curta duração força re-autenticação frequente. Para o frontend com refresh token automático, não é problema.

#### BUG-15 — Unidades de ingredientes não condizem com terminologia brasileira
- **Severidade:** Low (UX/Texto)
- **Onde:** POST /api/v1/stores/:storeId/inventory/ingredients — campo `unit`
- **Observado:** Os valores aceitos são `G`, `ML`, `UN`. No Brasil, restaurantes trabalham com KG, gramas, litros, ml e unidades. Um cozinheiro não pensa em "500 G de carne" — pensa em "500 gramas".
- **Sugestão:** Aceitar `KG`, `G`, `LT`, `ML`, `UN` e converter internamente, ou exibir labels mais amigáveis no frontend.

---

### UX (sem bug de código, mas fricção real)

#### UX-01 — Campo `channel` obrigatório na criação de cardápio sem indicação clara
- **Observado:** POST /menus sem `channel` retorna 422 com opções válidas. A mensagem de erro é clara, mas o campo `channel` não é óbvio — restaurante pequeno não pensa em "canal" ao criar o cardápio.

#### UX-02 — Fichas técnicas: nomenclatura inconsistente com a UI
- **Observado:** A ficha técnica usa `items` (não `ingredientes`), `yieldQuantity` (não `rendimento`). O campo de ingrediente se chama `ingredientId` + `quantity`. Um operador que lê a documentação espera campos mais próximos do vocabulário de restaurante.

#### UX-03 — Sem endpoint de estoque disponível por produto
- **Observado:** Não há como consultar "qual é o estoque do Spaghetti Bolonhesa?" diretamente. O operador precisa saber a ficha técnica do produto e calcular manualmente quanto de cada ingrediente resta.

#### UX-04 — Pedidos READY ficam parados sem trigger de conclusão
- **Observado:** Após a cozinha marcar um ticket como READY, o pedido fica em status READY indefinidamente. Não há ação automática nem guia para o operador de salão sobre como "fechar" a mesa.
- **Nota:** Pode ser intencional (pagamento fecha o pedido), mas o fluxo não é evidente.

---

## Fluxos Validados (sem erros)

| Fluxo | Resultado |
|-------|-----------|
| Signup + login | OK |
| CRUD categorias | OK |
| CRUD produtos | OK |
| CRUD ingredientes | OK |
| Ficha técnica (PUT) | OK |
| CRUD clientes + endereços | OK |
| Criação de cardápio com seções | OK |
| Publicação de cardápio | OK |
| Pedido DINE_IN (mesa) | OK |
| Pedido TAKEAWAY (balcão) | OK |
| Pedido DELIVERY com endereço | OK |
| Cancelamento de pedido (DRAFT e CONFIRMED) | OK |
| Cancelamento de entrega despachada requer manager | OK (comportamento correto) |
| Cozinha: QUEUED → PREPARING → READY | OK |
| Entrega: AWAITING_PICKUP → DISPATCHED → IN_TRANSIT → DELIVERED | OK |
| Entrega FAILED com reason obrigatório | OK |
| Registro de pagamento CASH/CREDIT_CARD | OK |
| Consumo automático de estoque por ficha técnica | OK |
| Movimentações de estoque registradas automaticamente | OK |
| Timeline de pedido | OK (com ressalva BUG-08) |
| Isolamento por store | OK |

---

## Consistência de API

| Aspecto | Avaliação |
|---------|-----------|
| Paginação consistente | OK — todos os endpoints retornam `{ data, pagination }` |
| Erros estruturados | OK — `{ error: { code, message, status, details[] } }` |
| Auth 401 expirado | OK — mensagem clara `ACCESS_TOKEN_EXPIRED` |
| 405 sem body | FALHA — recipe endpoint silencioso |
| HTTP 404 retorna HTML | FALHA — dashboard/analytics retorna HTML Next.js |
| Validação de schema | OK — 422 com field-level details |
| Store isolation | OK — não consegui acessar dados de outra store |

---

## Inventário: Diagnóstico Completo

O módulo de inventário tem a infraestrutura certa (fichas técnicas, consumo automático, movimentações), mas falta o **ciclo de entrada de mercadoria**:

- ✅ Consumo automático na confirmação do pedido (via ficha técnica)
- ✅ Reversão de consumo no cancelamento
- ✅ Movimentações registradas com ingrediente, quantidade e tipo
- ❌ Estoque inicial ignorado na criação
- ❌ Sem endpoint de entrada de mercadoria (reposição)
- ❌ Sem endpoint de ajuste manual
- ❌ Alerta de estoque baixo não funciona quando minStock não está definido
- ❌ Sem bloqueio de pedido quando estoque insuficiente

**Conclusão:** O inventário está "somente saída". Funciona para CMV, mas é inutilizável operacionalmente sem entrada.

---

## Dashboard

O endpoint de dashboard não existe na API. A tela na UI provavelmente usa dados mockados ou busca de outros endpoints individualmente. Não foi possível avaliar o dashboard como ferramenta operacional via API.

**O que faz falta (do ponto de vista de um operador):**
- Pedidos abertos agora (por tipo e mesa)
- Receita do dia
- Ticket médio
- Produtos mais vendidos hoje
- Alertas de estoque crítico
- Entregas em andamento

---

## Veredicto Final

**O MVP pode ser usado por um restaurante pequeno em um dia de operação com as seguintes condições:**

✅ Pedidos de balcão e mesa — funciona sem bloqueios  
✅ Fluxo de cozinha — funciona completamente  
✅ Entregas — funciona com alguns passos extras  
✅ Cadastro de produtos e cardápio — funciona  
✅ Ficha técnica e rastreamento de CMV — funciona (mas estoque começa em 0)  

❌ **Bloqueador operacional real:** Estoque sempre negativo desde o primeiro dia (currentStock ignorado). Operador verá CMV errado e alertas falsos.  
❌ **Bloqueador financeiro:** Pagamentos ficam em PENDING para sempre — sem fechamento de caixa.  
❌ **Bloqueador de gestão:** Sem dashboard da API, sem relatórios, sem visão consolidada do dia.  

### Classificação: MVP Operacionalmente Parcial

O sistema **não impede a operação** (pedidos entram, cozinha processa, entregas saem), mas **não é confiável para gestão** (estoque errado, pagamentos não confirmados, sem dashboard).

**Para aprovação operacional completa, os itens críticos são:**
1. BUG-02: Respeitar `currentStock` na criação de ingrediente
2. BUG-03: `isLowStock = true` quando `currentStock < 0`
3. BUG-05: Endpoint de ajuste/reposição de estoque
4. BUG-11: Endpoint de confirmação de pagamento

---

## Dados da Conta (para continuar testes futuros)

```
URL: https://marginflow-os.vercel.app
Email: joao@cantinadojoao.com.br
Senha: Cantina@2024
Store ID: 0bffa52f-a7d4-4b52-a0db-0874969e8ad6
```

### IDs de Referência

**Categorias:**
- Entradas: `657ecd37-37d8-4d7d-8208-9b0466f4c131`
- Pratos Principais: `710c68e2-79c8-4c71-bba9-af0fe618aa53`
- Massas: `b20ffcb9-a6a8-4bc0-ad42-da578884281a`
- Grelhados: `9b1750e2-4671-44fc-9f29-f10286c75809`
- Sobremesas: `be04e6b3-0b9c-430a-90a8-2cbc5cf2c8fa`
- Bebidas: `f52848aa-9e3e-4878-937e-2eedeea73b56`
- Porções: `69280865-823f-41e8-a665-f37e5f4ee091`
- Combos: `643ee173-cfc1-4e73-86ac-76a76db4f865`

**Produtos selecionados (com ficha técnica):**
- Feijoada Completa: `c91b5dce-466c-4d7f-8ee4-ba10d3cc8e33`
- Frango ao Molho Pardo: `79b5f30f-94f2-43de-ac73-442facba8b5b`
- Spaghetti Bolonhesa: `daa960a2-0151-4ec7-ac3f-304375d7b44e`
- Lasanha de Frango: `897832ad-f2b0-4e70-9ab5-f6d7c6d09c98`
- Picanha na Brasa: `b5cc1f80-260f-45d4-9883-bc3d5c90def2`
- Frango Grelhado: `20a4b43f-57f3-4d00-93b1-29c607a5a647`

**Clientes:**
- Maria Santos: `0ba21d21-a452-470b-abc7-9afd91ab69cd`
- Carlos Oliveira: `db0f35a5-c81e-452e-98e5-f139301f64c9`
- Ana Lima: `d77bd51c-f56b-46a8-b12b-15477f6dfb94`
- Pedro Souza: `89068115-a342-4fbe-8d8b-b7217146a365`
- Julia Ferreira: `f04307db-a527-4db2-ae13-d772d25b9a2d`

**Cardápios:**
- Cardápio Principal (IN_STORE, ACTIVE): `16d354b4-f72d-4524-acca-0d7591149ed9`
- Cardápio Delivery (DELIVERY, ACTIVE): `b55701c3-d728-4b6b-867d-7d4a9232d8ec`
