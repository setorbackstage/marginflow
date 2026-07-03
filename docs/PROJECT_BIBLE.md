# MarginFlow OS

## Visão

MarginFlow OS é um sistema operacional completo para restaurantes, delivery, pizzarias, hamburguerias, lanchonetes e dark kitchens.

O objetivo é centralizar toda a operação do restaurante em uma única plataforma moderna, rápida, modular e altamente escalável.

O sistema deve eliminar retrabalho, reduzir erros operacionais e automatizar o fluxo completo do pedido.

O MarginFlow OS não é apenas um PDV. É uma plataforma operacional completa.

---

# Objetivos

- Centralizar pedidos de todos os canais.
- Organizar a operação da cozinha.
- Facilitar a gestão da empresa.
- Melhorar a experiência dos operadores.
- Automatizar processos repetitivos.
- Permitir crescimento para múltiplas lojas.
- Servir como plataforma para futuras integrações.

---

# Público

Primeira fase:

- Delivery
- Pizzarias
- Hamburguerias
- Lanchonetes
- Açaí
- Marmitaria

Segunda fase:

- Restaurantes
- Cafeterias
- Bares
- Self-service

Terceira fase:

- Franquias
- Redes de restaurantes
- Dark Kitchens
- Multiempresa

---

# Filosofia

O sistema deve ser:

- Simples
- Muito rápido
- Modular
- Fácil de usar
- Responsivo
- Escalável
- Seguro
- Visual moderno

Cada módulo deve funcionar de forma independente.

Nenhuma funcionalidade deve depender diretamente de outra quando isso puder ser evitado.

---

# Fluxo Principal

Todo pedido segue este ciclo:

Cliente

↓

Canal de Venda

↓

Pedido

↓

Validação

↓

Produção

↓

Entrega

↓

Pagamento

↓

Histórico

↓

CRM

↓

Relatórios

Todo o sistema gira em torno desse fluxo.

---

# Módulos

## Core

- Autenticação
- Usuários
- Permissões
- Lojas

## Operação

- Pedidos
- Cardápio
- Produtos
- Categorias
- Adicionais
- Combos
- Cozinha (KDS)
- Delivery

## Gestão

- Clientes
- CRM
- Financeiro
- Relatórios
- Dashboard

## Integrações

- iFood
- APIs futuras
- Webhooks
- Marketplaces

---

# Estrutura

Cada módulo deve possuir sua própria lógica.

Exemplo:

Orders

- telas
- componentes
- serviços
- tipos
- regras

Catalog

- telas
- componentes
- serviços
- tipos
- regras

CRM

- telas
- componentes
- serviços
- tipos
- regras

Nenhum módulo deve acessar diretamente os arquivos internos de outro módulo.

---

# Interface

A interface deve ser inspirada em softwares SaaS modernos.

Características:

- Sidebar fixa
- Dashboard
- Cards
- Kanban
- Tabelas inteligentes
- Filtros rápidos
- Pesquisa instantânea
- Dark Mode
- Responsivo
- Atalhos de teclado

---

# Design

Visual limpo.

Poucos cliques.

Pouco texto.

Muito espaço em branco.

Ícones consistentes.

Animações discretas.

Experiência semelhante a:

Linear
Stripe
Notion
Vercel
Raycast

Nunca copiar telas.

Apenas seguir o nível de qualidade.

---

# Performance

Todas as páginas devem carregar rapidamente.

Evitar renderizações desnecessárias.

Sempre priorizar desempenho.

---

# Arquitetura

Frontend

- Next.js
- React
- TypeScript
- Tailwind
- shadcn/ui

Backend

- Node.js
- PostgreSQL
- Prisma ORM

Comunicação

- REST API

Tempo real

- WebSocket

Cache

- Redis (quando necessário)

---

# Código

Sempre utilizar:

TypeScript

Componentes reutilizáveis

Código limpo

Baixo acoplamento

Alta coesão

Nomes claros

Sem duplicação

Sempre priorizar simplicidade.

---

# Regras para IA

Sempre preservar a arquitetura existente.

Nunca criar código duplicado.

Nunca substituir funcionalidades existentes sem necessidade.

Sempre reutilizar componentes.

Sempre reutilizar tipos.

Sempre reutilizar serviços.

Sempre manter o projeto organizado.

Sempre explicar decisões importantes.

Antes de criar código, analisar a estrutura existente.

Se existir mais de uma solução, escolher a mais simples.

---

# Objetivo Final

Construir o melhor sistema operacional para restaurantes do Brasil.

O projeto deve crescer por módulos.

Cada novo recurso deve se integrar naturalmente à arquitetura existente.

Toda decisão deve priorizar:

- simplicidade
- organização
- velocidade
- escalabilidade