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

```bash
pnpm test:coverage:all
```

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


