# AI_RULES.md

## Objetivo

Este documento define as regras que toda Inteligência Artificial deve seguir ao trabalhar neste projeto.

Estas regras têm prioridade sobre preferências da IA e devem ser respeitadas em qualquer geração de código.

---

# Missão

Construir um sistema operacional para restaurantes moderno, modular, rápido, escalável e fácil de manter.

Toda decisão deve priorizar qualidade, simplicidade e evolução contínua do projeto.

---

# Regra 1 — Nunca quebrar a arquitetura

Antes de criar qualquer código, analisar a estrutura existente.

Sempre respeitar a organização do projeto.

Nunca criar estruturas paralelas.

Nunca mover arquivos sem necessidade.

Nunca alterar a arquitetura sem justificar claramente.

---

# Regra 2 — Reutilização

Antes de criar qualquer componente, função, serviço, tipo ou utilitário:

* verificar se já existe algo semelhante;
* reutilizar sempre que possível;
* evitar duplicação de código.

---

# Regra 3 — Simplicidade

Sempre escolher a solução mais simples que resolva o problema.

Evitar complexidade desnecessária.

Não utilizar padrões sofisticados quando uma solução simples for suficiente.

---

# Regra 4 — Modularidade

Cada módulo deve possuir sua própria responsabilidade.

Um módulo não deve conhecer a implementação interna de outro.

A comunicação deve ocorrer por APIs, serviços ou contratos bem definidos.

---

# Regra 5 — Código Limpo

Todo código deve possuir:

* nomes claros;
* funções pequenas;
* componentes reutilizáveis;
* arquivos organizados;
* comentários apenas quando realmente necessários.

Nunca gerar código confuso.

---

# Regra 6 — Escalabilidade

Toda implementação deve permitir crescimento futuro.

Evitar soluções descartáveis.

Pensar sempre em múltiplas lojas, milhares de pedidos e novas funcionalidades.

---

# Regra 7 — Performance

Priorizar desempenho.

Evitar consultas desnecessárias.

Evitar renderizações desnecessárias.

Evitar processamento repetido.

Criar soluções eficientes.

---

# Regra 8 — Interface

A interface deve seguir um padrão único.

Características obrigatórias:

* moderna;
* limpa;
* intuitiva;
* responsiva;
* rápida;
* consistente.

Nunca criar telas visualmente diferentes do restante do sistema.

---

# Regra 9 — Componentização

Sempre que um componente puder ser reutilizado, transformá-lo em componente compartilhado.

Evitar copiar JSX.

Evitar copiar estilos.

Evitar copiar lógica.

---

# Regra 10 — TypeScript

Sempre utilizar tipagem forte.

Evitar "any".

Criar tipos reutilizáveis.

Criar interfaces quando necessário.

---

# Regra 11 — Banco de Dados

Nunca criar tabelas duplicadas.

Sempre verificar relacionamentos existentes.

Evitar redundância.

Priorizar consistência.

---

# Regra 12 — APIs

Toda API deve:

* possuir responsabilidade única;
* retornar respostas consistentes;
* validar entradas;
* tratar erros;
* seguir um padrão único.

---

# Regra 13 — Segurança

Nunca confiar em dados enviados pelo cliente.

Validar tudo.

Sanitizar entradas.

Proteger rotas.

Respeitar permissões.

---

# Regra 14 — Organização

Sempre manter:

* estrutura previsível;
* nomes consistentes;
* arquivos pequenos;
* baixa complexidade.

---

# Regra 15 — Evolução

Ao implementar uma funcionalidade:

1. entender o contexto;
2. analisar impactos;
3. reutilizar código existente;
4. implementar;
5. validar se nada foi quebrado.

Nunca implementar funcionalidades isoladas sem considerar o restante do sistema.

---

# Regra 16 — Antes de escrever código

Sempre responder internamente às seguintes perguntas:

* Já existe algo semelhante?
* Posso reutilizar?
* Estou quebrando alguma regra?
* Essa solução escala?
* Existe uma forma mais simples?

Somente depois iniciar a implementação.

---

# Regra 17 — Decisões Técnicas

Sempre justificar mudanças importantes.

Explicar vantagens e desvantagens quando houver mais de uma abordagem.

---

# Regra 18 — Objetivo Permanente

Cada alteração deve deixar o projeto melhor do que estava antes.

Nunca adicionar complexidade sem necessidade.

Sempre preservar:

* simplicidade;
* organização;
* legibilidade;
* velocidade;
* escalabilidade.

---

# Regra 19 — Filosofia

Este projeto é um produto de longo prazo.

Não gerar soluções temporárias.

Não gerar "gambiarras".

Preferir qualidade em vez de velocidade quando houver conflito.

---

# Regra 20 — Princípio Fundamental

Quando houver dúvida entre duas soluções:

Escolher sempre a mais simples, mais organizada, mais reutilizável e mais fácil de manter.

Todas as decisões devem contribuir para que o RestaurantOS permaneça consistente durante sua evolução.
