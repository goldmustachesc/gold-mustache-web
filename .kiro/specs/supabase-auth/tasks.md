# Implementation Plan

## 1. Setup e Dependências

- [x] 1.1 Instalar dependências do Supabase, forms e Prisma
  - Instalar `@supabase/supabase-js`, `@supabase/ssr`
  - Instalar `react-hook-form`, `@hookform/resolvers`, `zod`
  - Instalar `sonner`, `@tanstack/react-query`
  - Instalar `prisma`, `@prisma/client`
  - _Requirements: 1.1, 2.1, 3.1_

- [x] 1.2 Configurar Prisma com Supabase
  - Inicializar Prisma: `npx prisma init`
  - Configurar DATABASE_URL no `.env` para Supabase Postgres
  - Criar schema inicial em `prisma/schema.prisma` com model User (linked to auth.users)
  - Criar `src/lib/prisma.ts` com singleton client
  - _Requirements: 1.1_

- [x] 1.3 Criar Supabase clients (browser, server, middleware)
  - Criar `src/lib/supabase/client.ts` para browser
  - Criar `src/lib/supabase/server.ts` para server components
  - Criar `src/lib/supabase/middleware.ts` para session refresh
  - _Requirements: 2.4, 6.3_

## 2. Validação e Schemas

- [x] 2.1 Criar schemas Zod para formulários de auth
  - Criar `src/lib/validations/auth.ts`
  - Implementar loginSchema, signupSchema, resetSchema, newPasswordSchema
  - _Requirements: 1.3, 1.4, 7.1, 7.2_

- [ ]* 2.2 Property test: Schema validation
  - **Property 1: Schema validation rejects invalid inputs**
  - **Property 2: Schema validation accepts valid inputs**
  - **Validates: Requirements 1.3, 1.4**

- [ ]* 2.3 Property test: Password confirmation
  - **Property 3: Password confirmation must match**
  - **Validates: Requirements 1.3**

## 3. Auth Service e Hooks

- [x] 3.1 Criar auth service
  - Criar `src/services/auth.ts`
  - Implementar signUp, signIn, signInWithGoogle, signOut
  - Implementar resetPassword, updatePassword, getUser, getSession
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 5.2_

- [x] 3.2 Criar React Query provider e hooks
  - Criar `src/providers/query-provider.tsx`
  - Criar `src/hooks/useAuth.ts` com useUser, useSignIn, useSignUp, useSignOut
  - _Requirements: 2.1, 4.1_

## 4. Middleware e Proteção de Rotas

- [x] 4.1 Atualizar middleware para auth + i18n
  - Modificar `src/middleware.ts` para combinar auth e i18n
  - Implementar verificação de sessão para rotas protegidas
  - Configurar redirect para login quando não autenticado
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ]* 4.2 Property test: Middleware routing
  - **Property 4: Middleware redirects unauthenticated requests**
  - **Property 5: Middleware allows authenticated requests**
  - **Validates: Requirements 6.1, 6.2**

## 5. Checkpoint

- [x] 5. Checkpoint - Garantir que todos os testes passam
  - _Verificado: auth implementado e funcional, testes passam_

## 6. Componentes UI de Auth

- [x] 6.1 Criar componentes base de auth
  - Criar `src/components/auth/AuthCard.tsx` (wrapper layout)
  - Criar `src/components/auth/GoogleButton.tsx`
  - Criar `src/components/auth/FormField.tsx` (input com error)
  - _Requirements: 3.1, 7.1_

- [x] 6.2 Criar formulário de Login
  - Criar `src/components/auth/LoginForm.tsx`
  - Integrar react-hook-form + zod + sonner
  - Implementar login com email/senha e Google
  - _Requirements: 2.1, 2.2, 2.3, 3.1_

- [x] 6.3 Criar formulário de Signup
  - Criar `src/components/auth/SignupForm.tsx`
  - Implementar validação e feedback de erros
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 6.4 Criar formulários de Reset Password
  - Criar `src/components/auth/ResetPasswordForm.tsx`
  - Criar `src/components/auth/NewPasswordForm.tsx`
  - _Requirements: 5.1, 5.2, 5.3_

- [ ]* 6.5 Property test: Form submission validation
  - **Property 6: Form submission blocked with invalid data**
  - **Validates: Requirements 7.2, 7.4**

## 7. Páginas e Rotas

- [x] 7.1 Criar páginas de auth (grupo público)
  - Criar `src/app/[locale]/(auth)/login/page.tsx`
  - Criar `src/app/[locale]/(auth)/signup/page.tsx`
  - Criar `src/app/[locale]/(auth)/reset-password/page.tsx`
  - Criar `src/app/[locale]/(auth)/layout.tsx`
  - _Requirements: 1.1, 2.1, 5.1_

- [x] 7.2 Criar callback route para OAuth
  - Criar `src/app/[locale]/(auth)/auth/callback/route.ts`
  - Implementar troca de code por session
  - _Requirements: 3.2, 3.3, 3.4_

- [x] 7.3 Criar área protegida (dashboard)
  - Criar `src/app/[locale]/(protected)/layout.tsx` com auth check
  - Criar `src/app/[locale]/(protected)/dashboard/page.tsx`
  - Implementar botão de logout
  - _Requirements: 4.1, 4.2, 4.3, 6.1, 6.2_

## 8. Traduções i18n

- [x] 8.1 Adicionar traduções de auth
  - Adicionar mensagens em `src/i18n/messages/pt-BR.json`
  - Adicionar mensagens em `src/i18n/messages/en.json`
  - Adicionar mensagens em `src/i18n/messages/es.json`
  - _Requirements: 7.3_

## 9. Configuração Google OAuth no Supabase

- [x] 9.1 Documentar setup do Google OAuth
  - Criar `docs/google-oauth-setup.md` com instruções
  - Configurar redirect URLs no Supabase Dashboard
  - _Requirements: 3.1_

## 10. Final Checkpoint

- [x] 10. Final Checkpoint - Garantir que todos os testes passam
  - _Verificado: auth completo e em produção, testes passam_
