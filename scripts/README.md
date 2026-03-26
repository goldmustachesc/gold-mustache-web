# 🛠️ Scripts de Automação

## Otimização de Imagens

### optimize-images.cjs

Converte automaticamente todas as imagens JPG/PNG para WebP com compressão otimizada.

**Uso:**
```bash
npm run optimize:images
```

**O que faz:**
- Procura imagens em `public/images/*` e `public/barbers/*`
- Converte para WebP (qualidade 85%, effort 6)
- Mantém originais como fallback
- Gera relatório de economia

**Exemplo de saída:**
```
📁 Processando: images/gallery
  ✅ photo.jpg → photo.webp
     Original: 500KB → WebP: 150KB (70% menor)

✨ Otimização concluída!
📊 Total de imagens processadas: 24
💾 Espaço economizado: 4.90MB
```

**Quando executar:**
- Após adicionar novas imagens
- Antes de fazer commit de assets
- Periodicamente para manter otimização

**Requisitos:**
- Node.js 18+
- Sharp (instalado automaticamente)

## Adicionar Novos Scripts

Para criar novos scripts de automação:

1. Crie o arquivo em `scripts/`
2. Adicione shebang: `#!/usr/bin/env node`
3. Torne executável: `chmod +x scripts/seu-script.js`
4. Adicione ao package.json:
```json
"scripts": {
  "seu-comando": "node scripts/seu-script.js"
}
```

## Boas Práticas

- Use `#!/usr/bin/env node` no início
- Adicione logs informativos
- Trate erros graciosamente
- Documente o uso no README
- Teste antes de commitar
