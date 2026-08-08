# MarginFlow OS — Master Specification & Roadmap

**Versão:** 1.0
**Foco:** Transformação em SaaS High-Ticket para Food Service / Gelaterias / Restaurantes

---

## 🎯 1. Visão Geral e Identidade do Produto

O MarginFlow OS foi concebido não como um simples gerenciador passivo de vendas, mas como uma plataforma operacional e financeira proativa. O objetivo central do produto é ajudar o empresário a entender e proteger a sua margem de lucro real, reduzindo o tempo de atendimento e aumentando a retenção de clientes.

---

## 🎨 2. Design System & UX/UI

### 2.1 Arquitetura de Profundidade no Dark Mode

Para eliminar a sensação de "template genérico" e criar uma interface tridimensional e coesa:

- **Layer 0 (Fundo Geral):** `#09090b` (Preto profundo)
- **Layer 1 (Sidebar & Header):** `#121215` com borda sutil de 1px (`#27272a` ou `rgba(255,255,255,0.08)`)
- **Layer 2 (Cards, Tabela, Modais):** `#18181b` (Cinza escuro elevado)
- **Layer 3 (Hover States):** Transição suave para `#27272a`

### 2.2 Paleta de Cores Semânticas

- **Accent Color / Brand (Verde Vibrante):** `#15803d` (light) / `#4ade80` (dark) — oklch(.58/.13/155). Reservado para ações primárias, links ativos, toggles ligados.
- **Sucesso (Verde Suave):** Métricas positivas, status Ativo, pedidos Entregues.
- **Alerta (Amarelo/Laranja):** Estoque baixo, pedidos com tempo limite estourado.
- **Erro / Perigo (Vermelho):** Clientes em Risco, Cancelar Pedido.
- **Neutro / Muted (Cinza Médio):** Textos secundários, bordas, botões secundários.

### 2.3 Sensação de Sistema "Vivo"

- **Hover States:** `transition-all duration-200 ease-in-out` em botões, cards e linhas.
- **Feedback Visual:** Modais com fundo desfocado (`backdrop-blur-sm`).
- **Sticky Save Bar:** Barra flutuante "Você tem alterações não salvas — [Descartar] [Salvar]".

---

## 🔍 3. Componentes Globais e Navegação

### 3.1 Cabeçalho Superior (Header / Top Bar)

- **Seletor de Unidade:** Dropdown no header para alternar entre filiais ou papel do usuário.
- **Breadcrumbs:** Hierarquia simplificada (ex: Relacionamento / Clientes).
- **Busca Global (⌘K):** Placeholder "Pesquisar clientes, pedidos, produtos".
- **Central de Notificações (Sino):** Badge numérica com alerta (ex: 3 em vermelho).
- **Menu do Usuário:** Avatar com iniciais, dropdown para Perfil, Configurações, Suporte, Sair.

### 3.2 Menu Lateral (Sidebar)

- **Blocos lógicos:** Operações, Catálogo, Relacionamento, Análises, Integrações, Configurações.
- **Item ativo:** Barra vertical verde na borda esquerda.
- **Botão de colapso:** Otimizar espaço em PDV/Tablets.

---

## 🛠️ 4. Módulos Operacionais

### 4.1 Operações (Pedidos, Cozinha, Entregas)

- **KDS / Cozinha (Modo TV):** Cards Kanban (A Fazer, Em Preparo, Pronto). Cronômetro visual (amarelo >10min, vermelho >15min). Feedback sonoro. Botão [Avançar Status] grande para touch.
- **Entregas:** Visualização de rotas com agrupamento por bairro/entregador.

### 4.2 Catálogo (Produtos, Cardápio, Estoque)

- **Wizard de Modificadores:** Tamanho, sabores/base, caldas, adicionais pagos.
- **Estoque:** Baixa fracionada dinâmica. Edição rápida na tabela.

### 4.3 Relacionamento (Clientes & CRM)

- **Cards de KPI:** Aumentar contraste, bg `#18181b`.
- **Filtros:** Status: Todos | Ativos | Inativos | Em Risco.
- **Ações por Linha:** WhatsApp direto, histórico, cupom.
- **Badges VIP:** VIP 👑, Frequente ⭐, Primeira Compra 🌱.

---

## ⚙️ 5. Arquitetura de Configurações

Layout de **duas colunas** (submenu esquerda + forms direita).

### Abas:
1. **Geral & Empresa:** Logo (drag-and-drop), Razão Social, CNPJ, Horários.
2. **Perfil do Usuário:** Dados pessoais, senha, 2FA.
3. **Parâmetros de Pedidos & Impressão:** Impressora térmica (Bematech, Elgin, Epson), autopeças, tamanho de bobina.
4. **Formas de Pagamento:** Pix, Cartão, Dinheiro; chave Pix.
5. **Equipe & Permissões (RBAC):** Convite por e-mail, papéis (Admin, Gerente, Caixa, Cozinha).

---

## 🚀 6. Pilares Estratégicos (High-Ticket SaaS)

### Pilar 1: Inteligência de Margem e Ficha Técnica (CMV)
- Cálculo do CMV com base em insumos do estoque.
- Alerta proativo quando aumento do insumo corrói margem.

### Pilar 2: UX de Alta Performance
- PDV Rápido (atalhos de teclado).
- PWA Offline-First.

### Pilar 3: CRM & Automações no WhatsApp
- Disparo automático para clientes inativos >30 dias.

### Pilar 4: Suporte Multi-Loja e RBAC Granular
- Consolidação de métricas no Dashboard.
- Controle rigoroso de acessos.

---

## 💎 7. Funcionalidades do Ecossistema

- **Cardápio Digital QR Code & Totem:** Autoatendimento, pagamento Pix, envio para cozinha.
- **Gestão Logística Last-Mile:** App Web para motoboy com rotas.
- **DRE Gerencial Automático:** Demonstrativo do Resultado com impostos, taxas, CMV, custos fixos.
- **Prevenção de Perdas & Audit Trail:** Log de ações sensíveis, alertas no WhatsApp.
- **Clube de Fidelidade & Cashback:** 5% do cashback atribuído ao próximo pedido.

---

## 📋 8. Checklist de Execução

### Fase 1 (Design System & UI Clean-up)
- [ ] Padronizar bordas `border-zinc-800`, hierarquia de superfícies Dark Mode
- [ ] Paleta verde de acento (oklch .58/.13/155)
- [ ] Micro-interações (transitions, backdrop-blur, sticky save bar)

### Fase 2 (Navegação & Header)
- [ ] Corrigir breadcrumbs
- [ ] Implementar busca ⌘K
- [ ] Menu de perfil com avatar

### Fase 3 (Telas Operacionais)
- [ ] KDS Kanban com cronômetro
- [ ] Wizard de Modificadores

### Fase 4 (Configurações & RBAC)
- [ ] Layout de duas colunas
- [ ] Gestão de impressão
- [ ] Permissões de usuários

### Fase 5 (Inteligência & CMV)
- [ ] Conectar Ficha Técnica ao estoque
- [ ] Recálculo de margem em tempo real

### Fase 6 (Ecossistema Extra)
- [ ] DRE Gerencial
- [ ] Automações de CRM via WhatsApp
- [ ] Totem/QR Code
