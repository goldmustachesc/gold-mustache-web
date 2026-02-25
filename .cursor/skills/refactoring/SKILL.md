---
name: refactoring
description: Workflow para refatoração segura de código sem alterar comportamento. Use quando o usuário quiser reestruturar código, melhorar legibilidade, extrair componentes, reduzir duplicação, ou reorganizar módulos.
---

# Refactoring - Gold Mustache

## Instruções

Refatoração altera estrutura sem mudar comportamento. Siga este fluxo:

### Fase 1: Diagnóstico

Antes de refatorar, identifique o problema específico:

| Code Smell | Sinal | Ação |
|------------|-------|------|
| **Componente grande** | >200 linhas | Extrair sub-componentes |
| **Função longa** | >50 linhas | Extrair funções auxiliares |
| **Duplicação** | Código repetido 3+ vezes | Extrair para utilitário/hook |
| **Prop drilling** | Props passando 3+ níveis | Context ou composição |
| **God file** | Arquivo com múltiplas responsabilidades | Separar por domínio |
| **Any excessivo** | Tipos genéricos demais | Tipar adequadamente |
| **Imports relativos longos** | `../../../` | Usar alias `@/` |

### Fase 2: Planejamento

1. **Documente o estado atual**: O que faz, como funciona, quem consome.
2. **Defina o estado desejado**: Como ficará após refatoração.
3. **Mapeie dependências**: Quem importa/usa o código alvo.

```bash
# Encontre todos os consumidores do módulo
rg "import.*from.*modulo" src/
rg "modulo" src/ --type ts
```

4. **Avalie risco**: Quantos arquivos serão afetados? Há testes cobrindo?

### Fase 3: Execução Segura

#### Regras de Ouro

1. **Um tipo de refatoração por commit**: Não misture rename com extract.
2. **Build entre cada passo**: `pnpm build` após cada mudança significativa.
3. **Preserve comportamento**: Outputs devem ser idênticos.

#### Padrão: Extract Component

```typescript
// ANTES: Componente monolítico
function BookingPage() {
  return (
    <div>
      {/* 50 linhas de header */}
      {/* 80 linhas de form */}
      {/* 40 linhas de footer */}
    </div>
  );
}

// DEPOIS: Componentes extraídos
function BookingPage() {
  return (
    <div>
      <BookingHeader />
      <BookingForm />
      <BookingFooter />
    </div>
  );
}
```

#### Padrão: Extract Custom Hook

```typescript
// ANTES: Lógica no componente
function BarberDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  // 20 linhas de fetch + transform
}

// DEPOIS: Hook extraído
function BarberDashboard() {
  const { data, loading } = useBarberDashboard();
}
```

#### Padrão: Extract Utility

```typescript
// ANTES: Lógica duplicada em 3 arquivos
const formatted = new Intl.DateTimeFormat("pt-BR").format(date);

// DEPOIS: Utilitário centralizado em src/utils/
import { formatDateBR } from "@/utils/date";
const formatted = formatDateBR(date);
```

#### Padrão: Tipar Corretamente

```typescript
// ANTES
function processData(data: any): any { ... }

// DEPOIS
interface BookingData {
  barberId: string;
  serviceId: string;
  dateTime: Date;
}

function processBooking(data: BookingData): ProcessedBooking { ... }
```

### Fase 4: Validação

Após cada refatoração:

```bash
pnpm lint       # Padrões de código
pnpm build      # Compilação sem erros
```

Verifique manualmente:
- [ ] Comportamento idêntico ao original
- [ ] Nenhum import quebrado
- [ ] Nenhuma referência perdida
- [ ] Performance não degradou

### Fase 5: Commit

```
refactor(escopo): descrição da reestruturação

Motivo: [por que refatorar]
Mudanças: [o que mudou estruturalmente]
Comportamento: [inalterado]
```

## Checklist

- [ ] Comportamento preservado (mesmos inputs → mesmos outputs)
- [ ] Todos os consumidores atualizados
- [ ] Imports usando `@/`
- [ ] Sem `any` introduzido
- [ ] `pnpm lint` passa
- [ ] `pnpm build` passa
- [ ] Cada commit é uma refatoração atômica
