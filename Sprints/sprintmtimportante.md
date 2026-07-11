SPRINT FINAL DO MVP
Realtime + UX + Onboarding + Preparação para Integrações
IMPORTANTE

Esta sprint NÃO é para criar módulos novos.

É para elevar drasticamente a qualidade do sistema existente.

Não alterar regras de negócio.

Não quebrar contratos do backend.

Não criar endpoints desnecessários.

Toda alteração deve ser incremental.

Tudo precisa continuar compatível com o backend atual.

No final:

build limpo
eslint limpo
typescript limpo
sem placeholders
sem mocks
sem regressões
ETAPA 1
Auditoria completa

Antes de escrever código faça uma auditoria completa.

Mapear:

todos os estados fake
mocks
arrays hardcoded
loaders ruins
dados que nunca atualizam
componentes mortos
páginas que exigem refresh manual
timers artificiais
useEffect desnecessários
polling excessivo
estados duplicados

Nada deve ser alterado antes dessa auditoria.

ETAPA 2
Sistema Realtime

O objetivo é que o usuário nunca precise apertar F5.

Tudo deve atualizar sozinho.

Sempre.

Dashboard

Atualizar automaticamente:

Receita

Pedidos

Ticket médio

Clientes

Produtos

Entregas

Pagamentos

Estoque

Últimos pedidos

Atividade

sem refresh.

Pedidos

Novo pedido

↓

lista atualiza

contador atualiza

dashboard atualiza

cozinha atualiza

som dispara

toast aparece

badge atualiza

Cozinha

Ticket mudou de status

↓

kanban atualiza

tempo recalcula

dashboard atualiza

Entregas

Mudou status

↓

kanban atualiza

contador atualiza

tempo recalcula

Estoque

Baixa automática

↓

saldo muda

CMV muda

valor em estoque muda

alertas atualizam

Financeiro

Pagamento recebido

↓

cards atualizam

gráficos atualizam

indicadores atualizam

Clientes

Novo cliente

↓

contador

lista

dashboard

busca

todos atualizam

ETAPA 3
Notification Center REAL

Eliminar qualquer dado mock.

Não pode existir:

const notifications=[]

nem arrays fixos.

Criar sistema real.

Persistente.

Por usuário.

Por loja.

Cada evento do domínio gera notificação.

order.created

order.confirmed

payment.paid

delivery.failed

inventory.low_stock

etc.

As notificações precisam:

marcar como lida

marcar todas

excluir

filtrar

abrir detalhe

mostrar horário relativo

mostrar horário absoluto

persistir entre sessões

Badge sempre sincronizado.

ETAPA 4
Atualização automática

Adicionar botão global

Atualizar

com:

loading

ícone animado

invalidateQueries

tooltip

atalho

Ctrl+R interno

sem recarregar página.

ETAPA 5
Toasts

Criar sistema consistente.

Eventos:

pedido novo

pagamento

erro

estoque

cliente

integração

sincronização

Todos com animações.

ETAPA 6
Sons

Configurações:

Som novo pedido

Som entrega

Som pagamento

Som estoque crítico

Volume

Mute

Teste de áudio

ETAPA 7
Onboarding

Hoje o usuário entra perdido.

Criar fluxo completo.

Primeiro acesso:

Bem-vindo ao MarginFlow

explicar

Dashboard

Produtos

Clientes

Estoque

Pedidos

Cardápio

Configurações

Finalizar

Checklist.

Checklist inicial

Criar loja

Adicionar logo

Cadastrar categorias

Cadastrar produtos

Cadastrar insumos

Criar ficha técnica

Cadastrar cliente

Criar primeiro pedido

Configurar pagamento

Concluir onboarding

Mostrar progresso.

Tours

Usar spotlight.

Explicar cada tela.

Permitir repetir depois.

ETAPA 8
Empty States

Todos precisam ser humanos.

Exemplo ruim:

Nenhum produto.

Exemplo bom:

Você ainda não cadastrou produtos.

Comece adicionando sua primeira categoria e depois seus primeiros produtos.

Botão:

Criar produto

Nunca mostrar telas vazias.

ETAPA 9
Busca Global

Hoje praticamente não funciona.

Transformar em Spotlight.

Pesquisar simultaneamente:

Produtos

Categorias

Clientes

Pedidos

Entregas

Insumos

Fichas

Cardápios

Configurações

Atalhos

Recentes

Favoritos

Ctrl+K

Tudo em tempo real.

ETAPA 10
Dashboard Vivo

Adicionar:

Últimos pedidos

Últimas movimentações

Últimos pagamentos

Últimos clientes

Alertas

Estoque crítico

Itens mais vendidos

Produtos sem estoque

Tudo atualizando sozinho.

ETAPA 11
UX

Eliminar:

duplo clique

refresh manual

loading infinito

flash branco

layout shift

scroll perdido

botões desalinhados

inputs inconsistentes

animações quebradas

ETAPA 12
Identidade da Loja

Logo

Banner

FavIcon

Cores

Tema

Upload

Arrastar arquivo

Selecionar galeria

Conversão automática WEBP

Compressão inteligente

Crop

Preview

ETAPA 13
Telefones

Todo telefone do sistema.

Adicionar seletor internacional.

Brasil padrão.

Bandeira.

DDD.

Máscara automática.

Validação.

ETAPA 14
CNPJ / CPF

Adicionar onde fizer sentido.

Máscaras.

Validação.

Detecção automática.

Preparar arquitetura para consulta futura da Receita Federal sem implementar agora.

ETAPA 15
Refresh Inteligente

Toda tela deve mostrar:

Última atualização

Agora

há 1 minuto

há 5 minutos

Atualizando...

ETAPA 16
Estados Offline

Detectar:

sem internet

API indisponível

timeout

backend fora

Mostrar mensagens amigáveis.

Permitir retry.

ETAPA 17
Preparação para Integrações

Sem integrar ainda.

Preparar arquitetura.

Eventos do sistema devem conseguir receber futuramente:

iFood

99Food

WhatsApp

PIX

TEF

Mercado Pago

Stone

PagBank

Delivery próprio

Cardápio público

sem refatoração.

Criar interfaces, adapters e pontos de extensão, mas não implementar integrações reais nesta sprint.

ETAPA 18
Performance

Eliminar renders desnecessários.

Lazy loading.

Memoização onde fizer sentido.

React Query otimizado.

Cache inteligente.

Prefetch.

Suspense onde aplicável.

ETAPA 19
Testes

O Claude deve navegar pela aplicação inteira utilizando o navegador integrado (Playwright ou equivalente), simulando um operador real.

Validar:

Login
Onboarding
Dashboard
Produtos
Estoque
Ficha Técnica
Clientes
Pedidos
Cozinha
Entregas
Financeiro
Cardápios
Configurações
Notificações
Busca Global
Atualização em tempo real

Corrigir automaticamente qualquer bug encontrado antes de encerrar a sprint.

Restrições
Não criar funcionalidades fictícias.
Não usar dados mock.
Não adicionar bibliotecas desnecessárias.
Não quebrar contratos do backend.
Não alterar regras de negócio.
Não remover funcionalidades existentes.
Não criar endpoints sem necessidade.
Manter compatibilidade total com Supabase e Vercel.
Entregáveis obrigatórios

Ao final, apresentar um relatório contendo:

Auditoria inicial com todos os problemas encontrados.
Lista completa de arquivos criados, modificados e removidos.
Bugs corrigidos com causa raiz e solução aplicada.
Melhorias de UX implementadas.
Recursos de tempo real implementados e como funcionam.
Fluxo completo do onboarding.
Estratégia adotada para o sistema de notificações.
Preparação realizada para futuras integrações.
Resultados dos testes automatizados e manuais.
Resultado de pnpm lint, pnpm tsc --noEmit e pnpm build.
Hash do commit final.

Critério de aceite: o sistema deve transmitir a sensação de um produto SaaS maduro, responsivo e confiável, preparado para a próxima fase do projeto, que será a implementação das integrações com iFood, 99Food, WhatsApp, meios de pagamento e cardápio público.