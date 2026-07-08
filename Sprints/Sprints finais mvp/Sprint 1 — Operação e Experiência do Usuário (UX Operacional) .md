# Sprint 1 — Operação e Experiência do Usuário (MVP)

## Objetivo

Transformar o MarginFlow de um sistema funcional em um sistema confortável para operar durante um expediente inteiro.

Esta sprint NÃO cria novos módulos.

Ela elimina atritos de uso.

Todo ajuste deve preservar 100% das regras de negócio existentes.

---

# Regras

Não alterar arquitetura.

Não alterar contratos de API.

Não alterar autenticação.

Não alterar banco sem necessidade.

Não criar módulos novos.

Não quebrar compatibilidade.

---

# 1. Sistema de Notificações

Hoje praticamente não existe feedback visual.

Implementar um sistema consistente utilizando Toasts.

Eventos:

- Pedido criado
- Pedido confirmado
- Pedido cancelado
- Pagamento aprovado
- Pagamento recusado
- Produto criado
- Produto atualizado
- Cliente criado
- Cliente bloqueado
- Estoque baixo
- Entrada de estoque
- Saída manual
- Entrega iniciada
- Entrega concluída

Todas as mensagens devem possuir:

- ícone
- cor
- duração adequada
- ação quando aplicável

---

# 2. Branding do Restaurante

Adicionar em Configurações:

Logo

Nome fantasia

Cor principal

Cor secundária

Banner do cardápio

Descrição

Telefone

Instagram

WhatsApp

Esses dados devem refletir automaticamente em:

Login

Sidebar

Dashboard

Cardápio público (quando existir)

---

# 3. Fluxo de Delivery

Auditar completamente.

Verificar:

Pedido

↓

Confirmação

↓

Cozinha

↓

Entrega

↓

Finalização

Nenhuma etapa pode ficar inacessível.

---

# 4. Pesquisa Global

Hoje existe visualmente.

Implementar funcionamento real.

Pesquisar:

Produtos

Categorias

Clientes

Pedidos

Ingredientes

Movimentações

Cardápios

Entregas

Resultado agrupado por tipo.

---

# 5. Gestão de Usuários

Transformar a tela em algo intuitivo.

Ao invés de permissões técnicas:

Mostrar perfis:

- Proprietário
- Gerente
- Caixa
- Cozinha
- Entregador
- Atendente

Permitir criar usuário rapidamente.

Depois permitir personalizar permissões.

---

# 6. Telefones

Substituir todos os inputs.

Usar seletor internacional.

Brasil pré-selecionado.

Máscaras automáticas.

DDD.

Validação.

Aplicar em:

Clientes

Empresa

Usuários

Entregadores

---

# 7. Categorias

Adicionar criação rápida.

Sugestões.

Duplicação.

Ordenação melhor.

---

# 8. Revisão Geral

Revisar:

Dialogs

Sheets

Dropdowns

Botões

Empty States

Loading

Mensagens

Responsividade

---

# Testes

Executar:

Desktop

Notebook

Tablet

Celular

Criar usuários.

Cadastrar clientes.

Cadastrar produtos.

Criar pedidos.

Fluxo completo.

---

# Entregáveis

Sistema mais intuitivo.

Menos cliques.

Zero bugs.

UX consistente.
