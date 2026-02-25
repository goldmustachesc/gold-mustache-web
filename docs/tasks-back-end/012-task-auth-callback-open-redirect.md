# 012 - Validar parâmetro `next` no auth callback (open redirect)

## Prioridade: 🟡 MÉDIA (Segurança)

## Problema

O callback de autenticação (`/auth/callback`) usa o parâmetro `next` da URL para redirecionar o usuário após login, sem validar se é um path seguro.

**Arquivo:** `src/app/[locale]/(auth)/auth/callback/route.ts` (linha 9)

```typescript
const next = searchParams.get("next") ?? "/dashboard";
// ...
return NextResponse.redirect(`${origin}${next}`);
```

Um atacante pode craftar um link como:
```
https://goldmustache.com/auth/callback?code=xxx&next=//evil.com
```

Apesar de `next` ser concatenado com `origin`, existem edge cases em que navegadores podem interpretar caminhos como `//evil.com`, `/\evil.com`, ou `/%0d%0aLocation:%20http://evil.com` de forma inesperada.

## Risco

- **Phishing:** Atacante envia link de "login na Gold Mustache" que redireciona para site falso após autenticação
- **Token theft:** Se o redirect incluir tokens na URL, eles podem vazar para o site malicioso

## O que corrigir

Validar que `next` é um path relativo seguro:

```typescript
function getSafeRedirectPath(next: string | null): string {
  const defaultPath = "/dashboard";

  if (!next) return defaultPath;

  // Deve começar com / e não com // (evita protocol-relative URLs)
  if (!next.startsWith("/") || next.startsWith("//")) return defaultPath;

  // Não deve conter caracteres de controle ou newlines (header injection)
  if (/[\x00-\x1f]/.test(next)) return defaultPath;

  // Não deve conter backslash (interpretado como / em alguns ambientes)
  if (next.includes("\\")) return defaultPath;

  return next;
}

// Uso:
const next = getSafeRedirectPath(searchParams.get("next"));
return NextResponse.redirect(`${origin}${next}`);
```

## Checklist

- [ ] Criar função `getSafeRedirectPath` para validação
- [ ] Aplicar no auth callback
- [ ] Verificar se há outros redirects baseados em parâmetros de URL no projeto
- [ ] Testar redirect normal (`next=/dashboard`) funciona
- [ ] Testar que `next=//evil.com` redireciona para `/dashboard`
- [ ] Testar que `next=/\evil.com` redireciona para `/dashboard`
