# Configuração da Integração Instagram

Este guia explica como configurar a integração automática com o Instagram usando a Instagram Graph API.

## Pré-requisitos

1. Conta Instagram Business ou Creator
2. Página do Facebook conectada à conta do Instagram
3. Acesso ao [Meta for Developers](https://developers.facebook.com)

## Passo a Passo

### 1. Criar App no Meta for Developers

1. Acesse [developers.facebook.com](https://developers.facebook.com)
2. Clique em "My Apps" → "Create App"
3. Selecione "Business" como tipo de app
4. Preencha o nome do app (ex: "Gold Mustache Website")
5. Adicione um email de contato
6. Clique em "Create App"

### 2. Adicionar Instagram Graph API

1. No painel do app, vá em "Add Product"
2. Encontre "Instagram" e clique em "Set Up"
3. Siga as instruções para conectar sua conta Instagram

### 3. Obter Access Token

#### 3.1. Token de Curta Duração

1. Vá em [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
2. Selecione seu app no dropdown
3. Clique em "Get Token" → "Get User Access Token"
4. Selecione as permissões:
   - `instagram_basic`
   - `pages_show_list` (se necessário)
5. Clique em "Generate Access Token"
6. Autorize e copie o token gerado

#### 3.2. Converter em Token de Longa Duração

Use a ferramenta [Access Token Debugger](https://developers.facebook.com/tools/debug/accesstoken/):

1. Cole o token de curta duração
2. Clique em "Debug"
3. Clique em "Extend Access Token"
4. Copie o novo token (válido por 60 dias)

**Importante:** Tokens de longa duração expiram em 60 dias. Configure um lembrete para renová-los!

### 4. Obter Instagram User ID

Faça uma requisição GET para:

\`\`\`bash
curl "https://graph.instagram.com/me?fields=id,username&access_token={SEU_TOKEN}"
\`\`\`

Ou use o [Graph API Explorer](https://developers.facebook.com/tools/explorer/) com a query:

\`\`\`
me?fields=id,username
\`\`\`

Copie o `id` retornado.

### 5. Gerar CRON_SECRET

Gere um secret aleatório para proteger o endpoint de sincronização:

\`\`\`bash
openssl rand -base64 32
\`\`\`

Ou use qualquer gerador de senhas seguras.

### 6. Configurar Variáveis de Ambiente

#### Desenvolvimento Local

Crie um arquivo `.env.local` na raiz do projeto:

\`\`\`env
INSTAGRAM_ACCESS_TOKEN=seu_token_de_longa_duracao_aqui
INSTAGRAM_USER_ID=seu_instagram_user_id_aqui
CRON_SECRET=seu_secret_aleatorio_aqui
\`\`\`

#### Produção (Vercel)

1. Acesse seu projeto na [Vercel Dashboard](https://vercel.com)
2. Vá em "Settings" → "Environment Variables"
3. Adicione as três variáveis:
   - `INSTAGRAM_ACCESS_TOKEN`
   - `INSTAGRAM_USER_ID`
   - `CRON_SECRET`
4. Salve e faça um novo deploy

### 7. Testar a Integração

#### Testar Localmente

1. Inicie o servidor de desenvolvimento:
   \`\`\`bash
   npm run dev
   \`\`\`

2. Teste o endpoint de sincronização:
   \`\`\`bash
   curl -X POST http://localhost:3001/api/cron/sync-instagram \
     -H "Authorization: Bearer {seu_cron_secret}"
   \`\`\`

3. Se tudo estiver correto, você verá:
   \`\`\`json
   {
     "success": true,
     "postsCount": 10,
     "lastUpdated": "2025-10-10T10:00:00.000Z",
     "message": "Posts sincronizados com sucesso"
   }
   \`\`\`

4. Verifique o arquivo gerado em `public/data/instagram-cache.json`

#### Testar em Produção

1. Após o deploy, o Vercel Cron Job rodará automaticamente às 7h BRT (10h UTC)
2. Você pode verificar os logs no Vercel Dashboard
3. Ou force uma sincronização manual via:
   \`\`\`bash
   curl -X POST https://seu-dominio.vercel.app/api/cron/sync-instagram \
     -H "Authorization: Bearer {seu_cron_secret}"
   \`\`\`

## Funcionamento

### Fluxo de Sincronização

1. **Cron Job** (diário às 7h BRT):
   - Vercel executa `/api/cron/sync-instagram`
   - API busca últimos 10 posts do Instagram
   - Dados são salvos em `public/data/instagram-cache.json`

2. **Exibição no Site**:
   - Componente `InstagramSection` carrega posts do cache
   - Se cache não existir, usa posts mockados como fallback
   - Imagens são otimizadas via Next.js Image

### Cache

O cache é um arquivo JSON estático servido pelo CDN da Vercel:
- Atualizado 1x por dia
- Fallback automático para posts mockados se houver erro
- Sem requisições diretas à API do Instagram no client-side

### Performance

- **CDN**: Cache servido pela edge network da Vercel
- **SEO**: Posts carregam no client, mas não afetam SEO inicial
- **UX**: Loading state com posts mockados para evitar layout shift

## Troubleshooting

### Token Expirado

**Sintoma:** Posts não atualizam, erro 401/400 nos logs

**Solução:**
1. Gere um novo token de longa duração (passos 3.1 e 3.2)
2. Atualize a variável `INSTAGRAM_ACCESS_TOKEN` na Vercel
3. Force uma nova sincronização

### Posts Não Aparecem

**Sintoma:** Site mostra posts mockados mesmo após sincronização

**Verificar:**
1. Arquivo `public/data/instagram-cache.json` existe e tem dados?
2. Variáveis de ambiente configuradas corretamente?
3. Logs do cron job mostram sucesso?

**Solução:**
1. Teste o endpoint manualmente (veja seção "Testar a Integração")
2. Verifique os logs na Vercel Dashboard
3. Confirme que o token não expirou

### Cron Job Não Executa

**Sintoma:** Sincronização não acontece automaticamente

**Verificar:**
1. Arquivo `vercel.json` existe com configuração do cron?
2. Projeto está em plano Pro ou superior da Vercel?
3. Variável `CRON_SECRET` configurada na Vercel?

**Nota:** Vercel Cron Jobs requerem plano pago para mais de 1 execução/dia.

### Limite de API Excedido

**Sintoma:** Erro 429 (rate limit) nos logs

**Solução:**
- Instagram Graph API tem limite de ~200 requisições/hora
- Com 1 sincronização/dia, você está bem abaixo do limite
- Se necessário, reduza a frequência de sincronização

## Limitações

1. **Expiração do Token**: Access tokens expiram a cada 60 dias e precisam ser renovados manualmente
2. **Rate Limiting**: API tem limite de requisições (200/hora é mais que suficiente para 1x/dia)
3. **Tipo de Conta**: Apenas contas Instagram Business/Creator funcionam
4. **Tipos de Mídia**: Apenas IMAGE e CAROUSEL_ALBUM são exibidos (vídeos são filtrados)

## Renovação do Token (a cada 60 dias)

Configure um lembrete para renovar o token antes de expirar:

1. Gere novo token (passos 3.1 e 3.2)
2. Atualize `INSTAGRAM_ACCESS_TOKEN` na Vercel
3. Faça um redeploy ou aguarde próxima sincronização

## Suporte

Para mais informações sobre a Instagram Graph API:
- [Documentação Oficial](https://developers.facebook.com/docs/instagram-api)
- [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
- [Access Token Debugger](https://developers.facebook.com/tools/debug/accesstoken/)
