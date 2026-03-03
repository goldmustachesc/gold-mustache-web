# Gold Mustache - AI Development Guidelines

## Overview

Este documento contém diretrizes e padrões para desenvolvimento de IA e agentes no projeto Gold Mustache Barbearia. Todos os agentes devem seguir estas diretrizes para garantir consistência e qualidade.

## Repository Structure & Module Organization
- `src/app` hosts the Next.js App Router entry points, layouts, and route handlers.
- UI primitives live in `src/components/ui`; bespoke widgets stay in `src/components/custom` and reuse shared styles.
- Shared logic is split between `src/hooks`, `src/utils`, `src/lib`, and service clients in `src/services` for external APIs like Instagram.
- Configuration, constants, and TypeScript contracts live in `src/config`, `src/constants`, and `src/types`; assets and fonts stay under `public/`.
- Import from the project root using the `@/` alias (see `tsconfig.json`).

## Brand Book & Visual Identity
- **SEMPRE consulte `docs/Brand_Book_Gold_Mustache.md` antes de implementar qualquer mudança visual.**
- O Brand Book define: cores (dourado como primário), tipografia (Playfair Display para títulos, Geist Sans para UI), tom de voz, espaçamentos e componentes visuais.
- Use os design tokens definidos em `src/app/globals.css` (variáveis CSS como `--primary`, `--background`, etc.).
- Configurações centralizadas da marca estão em `src/config/barbershop.ts`.
- Respeite o sistema dual Light/Dark mode com as cores especificadas no Brand Book.
- Tom de voz: direto, caloroso e profissional. Evite linguagem excessivamente informal ou corporativa.

## Build, Test, and Development Commands
- `pnpm install` configura as dependências; mantenha as mudanças no lockfile commitadas.
- `pnpm dev` executa o servidor local com Turbopack em `http://localhost:3001`.
- `pnpm build` valida o bundle de produção; execute antes de enviar mudanças importantes.
- `pnpm start` serve o build compilado para testes de comportamento em produção.
- `pnpm lint` executa verificações do Biome; `pnpm format` aplica correções de formatação do Biome.
- `pnpm test` roda todos os testes (Vitest); `pnpm test:watch` para ciclo TDD em watch mode.
- `pnpm test:gate` executa lint + test + coverage checks — rode antes de abrir PR.

## Coding Style & Naming Conventions
- Biome enforce 2-space indentation, import sorting, and the shared lint rules in `biome.json`.
- Prefira TypeScript em todo lugar (`.ts`/`.tsx`); mantenha components PascalCase (`HeroBanner.tsx`), hooks com prefixo `use`, e utilities camelCase.
- Componha UI com Tailwind utility classes; use `clsx`/`tailwind-merge` para gerenciar estilos condicionais em vez de concatenação manual de strings.
- Mantenha código de data-fetching dentro de `src/services` ou server components, e exponha configuração via objetos fortemente tipados em `src/config`.

## Code Quality Principles
**Todos os agentes DEVEM seguir estes princípios ao gerar ou modificar código:**
- **Clean Code**: Nomes descritivos, funções pequenas e com propósito único, sem código morto ou comentários desnecessários.
- **SOLID**: Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion. Separe responsabilidades corretamente entre módulos, componentes e funções.
- **KISS** (Keep It Simple, Stupid): Prefira soluções simples e diretas. Evite abstrações prematuras ou complexidade desnecessária.
- **YAGNI** (You Aren't Gonna Need It): Não implemente funcionalidades "para o futuro". Implemente apenas o que é necessário agora.
- **Proibido `any`**: Nunca use `any` em TypeScript. Use tipos explícitos, `unknown` com narrowing, generics, ou utility types quando necessário.
- **Evite overengineering**: Não crie abstrações, wrappers ou camadas extras sem necessidade concreta e imediata.
- **Código testável e manutenível**: Escreva código com dependências injetáveis, funções puras quando possível, e separação clara entre lógica de negócio e infraestrutura.
- **TDD First**: Todo código novo deve começar pelos testes. Escreva o teste que define o comportamento esperado, veja falhar, implemente o mínimo para passar, e então refatore. Isso é inegociável.
- **Decisões arquiteturais**: Explique brevemente o racional por trás de escolhas arquiteturais relevantes (em comentários de PR ou na resposta ao usuário, não em comentários no código).
- **Não colocar comentários no código**: tentar deixar o código mais enxuto possivel, evitando colocar comentários, pois um codigo bem escrito já serve.

## Testing — TDD como Metodologia Primária

**TDD (Test-Driven Development) é a metodologia #1 do projeto.** Todo código novo ou modificação significativa DEVE seguir o ciclo Red → Green → Refactor.

### Ciclo TDD Obrigatório

```
RED ───── Escrever testes ANTES do código. Testes definem o comportamento esperado. Rodar `pnpm test` → devem FALHAR.
GREEN ─── Implementar código MÍNIMO para os testes passarem. Rodar `pnpm test` → devem PASSAR.
REFACTOR ─ Limpar código sem alterar comportamento. Rodar `pnpm test` → devem continuar PASSANDO.
```

### Stack de Testes

| Ferramenta | Uso |
|------------|-----|
| **Vitest** | Test runner (`vitest.config.ts`) |
| **@testing-library/react** | Testes de componentes |
| **@testing-library/jest-dom** | Matchers DOM |
| **@testing-library/user-event** | Interações de usuário |
| **fast-check** | Property-based testing (regras de negócio) |
| **happy-dom** | DOM environment |

### Convenções

- **Localização:** Testes em `__tests__/` dentro do módulo testado, ou colocados como `*.test.ts(x)` junto ao arquivo.
- **Nomenclatura:** `*.test.ts` / `*.test.tsx` para testes unitários, `*.property.test.ts` para property-based.
- **Mocks:** Mockar apenas dependências externas (Prisma, Supabase, APIs). Usar `vi.mock()` com apenas os methods necessários.
- **Console:** `vitest.setup.ts` falha testes com `console.error`/`console.warn` inesperados. Se necessário, spy e restore.

### Mocks Padrão do Projeto

```typescript
// Prisma
vi.mock("@/lib/prisma", () => ({ prisma: { model: { method: vi.fn() } } }));

// Auth (Supabase)
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: () => mockGetUser() },
  }),
}));

// Admin
vi.mock("@/lib/auth/requireAdmin", () => ({
  requireAdmin: () => mockRequireAdmin(),
}));

// Hooks em componentes — usar vi.hoisted() quando referenciado dentro de vi.mock()
const mockFn = vi.hoisted(() => vi.fn());
vi.mock("@/hooks/useAuth", () => ({ useSignIn: () => ({ mutate: mockFn }) }));
```

### Quando aplicar TDD

| Cenário | TDD obrigatório? |
|---------|-------------------|
| Nova feature (service, API, componente) | **Sim** — testes primeiro |
| Bug fix | **Sim** — escrever teste que reproduz o bug, depois corrigir |
| Refatoração | **Sim** — garantir testes existentes antes; criar se faltam |
| Mudança visual/CSS puro | Não obrigatório, mas recomendado para lógica condicional |
| Documentação/config | Não |

### Comandos

```bash
pnpm test                    # Rodar todos os testes (single run)
pnpm test:watch              # Watch mode (uso durante ciclo TDD)
pnpm test:coverage:all       # Coverage completo
pnpm test:coverage:services  # Coverage de services
pnpm test:coverage:app-api   # Coverage de API routes
pnpm test:gate               # Gate: lint + test + coverage checks
```

## Commit & Pull Request Guidelines
- Siga Conventional Commits enforced by Commitlint; use `pnpm commit` (Commitizen) para prompts. Tipos permitidos incluem `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, e `revert`.
- Mantenha assuntos abaixo de 72 caracteres, tempo presente, e sem pontuação final.
- Abra PRs com resumo conciso, issue ou ticket linkado, screenshots para mudanças de UI, e notas sobre verificação manual ou gaps conhecidos.
- Garanta que o branch esteja rebased em `main` e que passos de lint/build passem em CI antes de solicitar review.

## AI Development Standards

### Document Structure (.kiro/specs)
- Cada feature deve ter três arquivos: `requirements.md`, `design.md`, `tasks.md`
- Use os templates em `.kiro/SPECIFICATION_TEMPLATE.md`, `.kiro/DESIGN_TEMPLATE.md`, `.kiro/TASKS_TEMPLATE.md`
- Mantenha todos os documentos em português, exceto quando especificamente requerido

### Requirements Format
- User Stories: "Como [tipo de usuário], quero [ação], para que [benefício]"
- Acceptance Criteria: "WHEN [condição] THEN o [Feature_Name] SHALL [resultado]"
- Inclua glossário com termos específicos da feature

### Design Documents
- Inclua arquitetura com diagramas Mermaid
- Defina propriedades de corretude formais
- Especifique estratégia de testes (unit, integration, property-based)

### Implementation Tasks
- Use formato de checklist com progresso
- Referencie requirements específicos
- Inclua testes de propriedades para validação formal
