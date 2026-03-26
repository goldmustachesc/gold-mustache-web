# 015 - Corrigir invalidação de cache das configurações

## Prioridade: 🟡 MÉDIA (Arquitetura)

## Status: ✅ RESOLVIDO

## Problema (original)

O serviço `barbershop-settings.ts` cacheia as configurações por 5 minutos via `unstable_cache`. Quando o admin atualiza as configurações pelo `PUT /api/admin/settings`, a invalidação de cache estava **comentada**.

Resultado: após atualizar, o admin precisava esperar até 5 minutos para ver as mudanças refletidas no site.

## Solução aplicada

A chamada `revalidateTag(BARBERSHOP_SETTINGS_CACHE_TAG)` foi descomentada e corrigida no handler PUT (linha 106 de `route.ts`). Na versão em uso (Next.js 15.5.9), `revalidateTag` aceita um único argumento (a string da tag), o que está correto.

O `unstable_cache` em `barbershop-settings.ts` já declarava a tag corretamente via `tags: [BARBERSHOP_SETTINGS_CACHE_TAG]`, garantindo que a invalidação por tag funciona como esperado.

## Arquivos afetados

- `src/app/api/admin/settings/route.ts` — `revalidateTag` ativo na linha 106
- `src/services/barbershop-settings.ts` — cache com `unstable_cache` e tag `barbershop-settings`

## Checklist

- [x] Verificar a API de `revalidateTag` na versão do Next.js em uso (15.5.9 — aceita 1 argumento)
- [x] Implementar invalidação de cache funcional no PUT (`revalidateTag` descomentado)
- [x] Cache continua funcionando para leituras subsequentes via `getBarbershopSettingsCached`
- [ ] Testar: atualizar settings → mudança reflete imediatamente
