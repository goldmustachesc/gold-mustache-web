### Cobertura de testes (Vitest)

Este projeto usa **Vitest** para testes unitários. A cobertura é gerada via provider **V8**.

#### Pré-requisito

Depois de puxar as mudanças, rode:

```bash
pnpm install
```

#### Gerar relatório de cobertura (escopo “core”)

O escopo “core” mede apenas código com lógica reaproveitável:
- `src/utils`
- `src/lib/booking`
- `src/lib/utils.ts`

```bash
pnpm test:coverage
```

Saídas:
- Terminal (summary)
- `coverage/` (HTML, LCOV e JSON)

#### Gerar cobertura do projeto todo (escopo “all”)

Este escopo e usado como **baseline amplo** do projeto, mas ainda nao representa a regua final de "90% no projeto inteiro".

```bash
pnpm test:coverage:all
```

Hoje esse escopo inclui `src/**/*.{ts,tsx}`, mas ainda exclui algumas areas por decisao tecnica atual da configuracao:
- `src/app/**`
- `src/i18n/**`
- `src/lib/supabase/**`
- `src/lib/auth/**`
- `src/lib/prisma.ts`
- `src/lib/validations/**`

Essas exclusoes nao devem ser tratadas como definitivas para a meta final de cobertura global. Elas precisam ser reavaliadas antes de declarar o projeto com 90% real.

#### Gerar relatório de cobertura de services (escopo “services”)

Esse escopo mede `src/services/**`, mas **exclui integrações externas** por enquanto:
- `src/services/auth.ts`
- `src/services/instagram.ts`

```bash
pnpm test:coverage:services
```

#### Gerar relatório de cobertura de integrações (escopo “integrations”)

Esse escopo mede apenas:
- `src/services/auth.ts`
- `src/services/instagram.ts`

```bash
pnpm test:coverage:integrations
```

#### Enforçar mínimo de 90% (escopo “core”)

Isso falha o comando caso a cobertura fique abaixo de **90%** em:
- lines
- functions
- statements
- branches

```bash
pnpm test:coverage:check
```

#### Enforçar mínimo de 90% (escopo “services”)

```bash
pnpm test:coverage:services:check
```

#### Enforçar mínimo de 90% (escopo “integrations”)

```bash
pnpm test:coverage:integrations:check
```

#### Rodar o gate completo (lint + testes + coverage core + coverage services)

```bash
pnpm test:gate
```

#### Rodar o gate completo + integrações

```bash
pnpm test:gate:full
```

#### Observação importante

Por padrão, o coverage exclui:
- `src/app/**` (rotas e páginas do Next — melhor cobrir com integração/e2e)
- `src/i18n/**` (catálogo de mensagens)
- artefatos gerados e arquivos de configuração

#### Meta final de 90% no projeto inteiro

A meta final do projeto e chegar a pelo menos **90%** em:
- lines
- functions
- statements
- branches

Essa regua global ja esta definida na configuracao, mas **nao esta sendo endurecida por padrao ainda** para o escopo `all`. O endurecimento final deve acontecer apenas quando a cobertura real estiver proxima da meta e depois da revisao do escopo excluido.

Para validar explicitamente a regua final do projeto inteiro:

```bash
COVERAGE_TARGET=project-wide pnpm test:coverage:all:check
```


