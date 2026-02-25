# 015 - Corrigir invalidação de cache das configurações

## Prioridade: 🟡 MÉDIA (Arquitetura)

## Problema

O serviço `barbershop-settings.ts` cacheia as configurações por 5 minutos via `unstable_cache`. Quando o admin atualiza as configurações pelo `PUT /api/admin/settings`, a invalidação de cache está **comentada**:

```typescript
// Note: revalidateTag requires 2 arguments in Next.js 16+, but we'll skip cache invalidation for now
// revalidateTag(BARBERSHOP_SETTINGS_CACHE_TAG, "force");
```

Resultado: após atualizar, o admin precisa esperar até 5 minutos para ver as mudanças refletidas no site.

## Arquivos afetados

- `src/app/api/admin/settings/route.ts` — linha 111-112 (invalidação comentada)
- `src/services/barbershop-settings.ts` — cache com `unstable_cache`

## O que corrigir

1. Descomentar e corrigir a chamada de `revalidateTag` para a API do Next.js atual
2. Se `unstable_cache` não suportar invalidação por tag na versão em uso, considerar alternativas:
   - Usar `revalidatePath` para invalidar a página
   - Mover para cache manual com Redis (já configurado no projeto)
   - Reduzir o TTL do cache para um valor menor

## Checklist

- [ ] Verificar a API de `revalidateTag` na versão do Next.js em uso
- [ ] Implementar invalidação de cache funcional no PUT
- [ ] Testar: atualizar settings → mudança reflete imediatamente
- [ ] Garantir que o cache ainda funciona para leituras subsequentes
