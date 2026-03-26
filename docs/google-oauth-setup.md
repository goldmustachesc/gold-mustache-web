# Configuração do Google OAuth com Supabase

## 1. Criar projeto no Google Cloud Console

1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um novo projeto ou selecione um existente
3. Vá em **APIs & Services > Credentials**
4. Clique em **Create Credentials > OAuth client ID**
5. Selecione **Web application**
6. Configure:
   - **Name**: Gold Mustache Auth
   - **Authorized JavaScript origins**: 
     - `http://localhost:3001` (desenvolvimento)
     - `https://www.goldmustachebarbearia.com.br` (produção)
   - **Authorized redirect URIs**:
     - `https://wkickkimvghrcnamvefx.supabase.co/auth/v1/callback`

7. Copie o **Client ID** e **Client Secret**

## 2. Configurar no Supabase Dashboard

1. Acesse [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto
3. Vá em **Authentication > Providers**
4. Encontre **Google** e clique para expandir
5. Ative o provider
6. Cole o **Client ID** e **Client Secret** do Google
7. Salve as configurações

## 3. Configurar OAuth Consent Screen (Google)

1. No Google Cloud Console, vá em **APIs & Services > OAuth consent screen**
2. Selecione **External** (para usuários externos)
3. Preencha:
   - **App name**: Gold Mustache Barbearia
   - **User support email**: seu email
   - **Developer contact**: seu email
4. Em **Scopes**, adicione:
   - `email`
   - `profile`
   - `openid`
5. Salve e publique o app

## 4. URLs de Callback

### Desenvolvimento
```
http://localhost:3001/pt-BR/auth/callback
http://localhost:3001/en/auth/callback
http://localhost:3001/es/auth/callback
```

### Produção
```
https://www.goldmustachebarbearia.com.br/pt-BR/auth/callback
https://www.goldmustachebarbearia.com.br/en/auth/callback
https://www.goldmustachebarbearia.com.br/es/auth/callback
```

## 5. Variáveis de Ambiente

Certifique-se de ter no `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://wkickkimvghrcnamvefx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key
```

## 6. Testar

1. Rode o projeto: `npm run dev`
2. Acesse: `http://localhost:3001/pt-BR/login`
3. Clique em "Continuar com Google"
4. Faça login com sua conta Google
5. Você deve ser redirecionado para o dashboard

## Troubleshooting

### Erro "redirect_uri_mismatch"
- Verifique se a URL de callback está correta no Google Cloud Console
- A URL deve ser exatamente: `https://[PROJECT_REF].supabase.co/auth/v1/callback`

### Erro "access_denied"
- Verifique se o OAuth consent screen está publicado
- Verifique se os scopes estão configurados corretamente

### Usuário não é criado
- Verifique se o provider Google está ativo no Supabase
- Verifique os logs em **Supabase Dashboard > Logs > Auth**
