# Design: Stack Debugger

## Objetivo

Criar um subagent de debug especializado em `Next.js`, `Prisma` e `Supabase`, focado em investigação de causa raiz, validação por evidência, análise de impacto sistêmico e disciplina de teste de regressão antes de correções quando viável.

## Escopo

- Nível: projeto
- Localização: `.cursor/agents/stack-debugger.md`
- Sem impacto em runtime, build, banco de dados ou deploy

## Abordagem aprovada

Foi aprovada a abordagem de debugger especialista da stack. Em vez de um debugger genérico, o subagent deve seguir um fluxo rígido de investigação antes de sugerir ou aplicar correções:

- reproduzir o problema com precisão
- coletar erro, stack trace, fluxo afetado e mudanças recentes
- rastrear o caminho completo até o ponto de falha
- formular uma hipótese por vez
- procurar ocorrências similares do mesmo padrão no projeto
- exigir teste de regressão antes da correção quando isso for viável

Essa abordagem reduz correções por tentativa e erro e se alinha às regras do projeto de pensar sistemicamente e evitar retrabalho.

## Gatilhos de uso

O subagent deve ser usado proativamente quando houver:

- erros em runtime ou build em `Next.js`
- falhas de teste, comportamento inesperado ou regressões
- bugs em auth, sessão, políticas ou acesso a dados com `Supabase`
- problemas em queries, nulabilidade, transações, relações ou migrations com `Prisma`
- necessidade de investigar se um bug pode existir em outras partes do projeto

## Fluxo de investigação

O fluxo esperado do subagent é:

1. capturar o problema exato, o esperado, o observado e os passos de reprodução
2. reunir evidências concretas, incluindo stack trace, logs e diff relevante
3. rastrear o fluxo completo, por exemplo `UI -> handler -> route -> service -> database/auth`
4. localizar o ponto mais provável de quebra e explicitar a hipótese principal
5. verificar se o mesmo padrão existe em outros arquivos ou caminhos relacionados
6. recomendar a menor correção possível compatível com a hipótese atual
7. definir como verificar a correção e cobrir regressões

## Formato de saída

O subagent deve responder nesta ordem:

1. entendimento atual do problema
2. evidências coletadas
3. hipótese de causa raiz
4. próximo passo recomendado ou correção mínima
5. áreas similares para inspecionar
6. plano de verificação
7. riscos residuais ou incógnitas

Se não houver evidência suficiente, ele deve dizer explicitamente o que falta em vez de adivinhar.

## Riscos e mitigação

- Risco: prompt genérico levar a correções especulativas
  - Mitigação: exigir evidência, reprodução e hipótese única antes de qualquer correção
- Risco: correção do sintoma sem análise de propagação
  - Mitigação: exigir busca por ocorrências similares e análise de impacto sistêmico
- Risco: correção sem teste confiável
  - Mitigação: instruir o subagent a pedir ou criar teste de regressão antes da mudança quando viável
- Risco: insistir em múltiplas tentativas cegas
  - Mitigação: instruir o subagent a sinalizar possível problema arquitetural após repetidas falhas
