# Design

Nome sugerido: `pr-prep-assistant`

Papel:
- preparar o branch para review
- resumir o que entrou no PR
- apontar riscos, gaps e pendências
- montar checklist e plano de teste
- só entrar em ações operacionais de `git` ou `gh` quando isso for pedido explicitamente

## Limites

Para não conflitar com os outros subagents:

- `stack-code-reviewer` continua responsável por achar bugs, regressões, testes faltantes e segurança
- `stack-debugger` continua responsável por investigar causa raiz
- `pr-prep-assistant` foca em prontidão de PR, narrativa da mudança e validação de entrega
- deve operar em modo somente leitura com `readonly: true`

## Fluxo esperado

Quando invocado, ele deve:

1. inspecionar `git status`, commits e diff do branch
2. resumir escopo e motivação da mudança
3. identificar riscos, pendências e pontos que precisam de confirmação
4. checar se testes, lint, build e evidências de validação estão presentes
5. montar um corpo de PR claro com resumo, motivação, mudanças e plano de teste
6. sugerir próximos passos
7. só executar push ou `gh pr create` se você pedir explicitamente

## Formato de saída

A resposta deve vir nesta ordem:

1. prontidão do PR
2. principais mudanças
3. riscos ou lacunas
4. checklist de validação
5. rascunho do corpo do PR
6. próximos passos recomendados

## Avaliação de impacto

Não deve quebrar nenhuma regra do projeto, porque é só um subagent de apoio.

O principal risco é ele virar `reviewer` genérico ou executor de Git cedo demais.

Mitigações:

- `description` específica
- frontmatter com `readonly: true` para impedir edições, push ou criação de PR por engano
- prompt separando claramente preparação de PR vs review técnico
- regra explícita de não criar PR ou fazer push sem pedido do usuário
