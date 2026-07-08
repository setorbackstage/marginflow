Sprint — Dogfooding Completo do MarginFlow OS (QA Operacional)

A partir desta sprint você deixa de ser um desenvolvedor.

Você agora é um operador de restaurante utilizando o MarginFlow OS pela primeira vez.

Seu objetivo NÃO é criar funcionalidades.

Seu objetivo é encontrar tudo que dificulta a operação de um restaurante real.

Regra número 1

Não implemente nada novo.

Não refatore.

Não melhore arquitetura.

Não invente funcionalidades.

Apenas opere o sistema como um cliente faria.

Se encontrar problemas:

corrija somente quando forem bugs
ou problemas claros de UX
ou inconsistências
ou fluxos quebrados

Se for uma funcionalidade nova, apenas registre.

Quero que você literalmente trabalhe dentro do sistema.

Imagine que hoje é segunda-feira.

Você acabou de abrir um restaurante.

Agora faça um turno inteiro de operação.

Cenário 1 — Primeiro acesso

Entre no sistema.

Observe tudo.

Anote:

primeira impressão
velocidade
organização
poluição visual
excesso de cliques
textos ruins
termos técnicos
inconsistências
Cenário 2 — Cadastro inicial

Cadastre:

Categorias

Produtos

Ingredientes

Ficha técnica

Clientes

Cardápio

Observe:

quantos cliques
campos desnecessários
campos confusos
ordem dos formulários
Cenário 3 — Abrindo o restaurante

Cadastre:

20 produtos

8 categorias

10 ingredientes

5 clientes

Monte fichas técnicas reais.

Cenário 4 — Operação

Faça pedidos.

Muitos pedidos.

Balcão.

Mesa.

Delivery.

Teste:

cancelamentos

edições

itens

modificadores

observações

Cenário 5 — Cozinha

Confirme pedidos.

Mova tickets.

Prepare.

Finalize.

Observe:

velocidade
clareza
excesso de informação
Cenário 6 — Estoque

Verifique:

baixa automática

movimentações

alertas

custos

CMV

estoque negativo

Cenário 7 — Entregas

Despache.

Finalize.

Cancele.

Observe:

tempo

status

clareza

Cenário 8 — Dashboard

Depois de operar por bastante tempo:

O Dashboard realmente ajuda?

Ou só ocupa espaço?

Que informação faz falta?

Que informação sobra?

Cenário 9 — Responsividade

Desktop

Notebook

Tablet

Celular

Verifique:

overflow

scroll

botões

cards

dialogs

tabelas

Cenário 10 — Performance

Observe:

Loading

Skeleton

Travamentos

Re-renders

Consultas repetidas

Cenário 11 — UX

Procure:

Confirmações ruins

Botões escondidos

Fluxos confusos

Mensagens ruins

Ícones errados

Campos mal posicionados

Falta de feedback

Cenário 12 — Consistência

Verifique:

Todos os botões

Todos os modais

Todos os sheets

Todos os badges

Todos os status

Todos os formulários

Todos os loaders

Todos os Empty States

Todos os Errors

Muito importante

Não faça testes artificiais.

Trabalhe como um restaurante faria.

Faça dezenas de operações.

Passe horas navegando se necessário.

Quero descobrir problemas reais.

Classifique tudo

Critical

High

Medium

Low

UX

Performance

Visual

Texto

Corrija apenas

Bug

Erro

Fluxo quebrado

Problema de UX evidente

Nada além disso.

Não adicionar

CRM

Financeiro

BI

Integrações

Novos módulos

Relatórios

IA

Nada disso.

Continuamos estritamente no MVP.

Ao finalizar

Entregue um relatório extremamente detalhado contendo:

fluxos executados
quantidade de operações realizadas
bugs encontrados
bugs corrigidos
melhorias de UX aplicadas
melhorias adiadas
screenshots relevantes (quando possível)
classificação de severidade
regressões verificadas
validação final

Se, ao final da auditoria, o sistema puder ser utilizado por um restaurante pequeno durante um dia inteiro sem impedir a operação, considere o MVP operacionalmente aprovado.

Minha sugestão adicional

Depois dessa sprint, eu faria uma última chamada "Restaurante Fantasma": pediria ao Claude para simular 7 dias completos de operação, gerando centenas de pedidos, cancelamentos, entregas e movimentações de estoque. Esse tipo de teste costuma revelar problemas de consistência e UX que só aparecem com uso contínuo, e é um excelente passo antes de começar as integrações com iFood e 99Food.