-- =============================================================================
-- Gold Mustache - RLS Policies para Tabelas Sensíveis (Defesa em Profundidade)
-- =============================================================================
-- CORRIGIDO: Usando nomes corretos das colunas conforme schema Prisma
-- IMPORTANTE:
-- - Este arquivo documenta defesa em profundidade para acesso direto via Supabase.
-- - O fluxo principal do app usa Prisma nas rotas/server actions; portanto ownership
--   de guest token, claim explícito e migração de banimento continuam sendo
--   garantidos na camada de aplicação, não apenas por RLS.
-- - `guest_clients` e `banned_clients` participam do fluxo de claim explícito.
--   Como não há acesso cliente direto legítimo a essas tabelas, qualquer exposição
--   via Supabase client deve ser tratada como deny-by-default.
-- =============================================================================

-- =============================================================================
-- 1. PROFILES - Dados pessoais do usuário
-- Coluna: user_id (mapeado de userId no Prisma)
-- =============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_none" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_none" ON profiles;

CREATE POLICY "profiles_select_own" ON profiles
    FOR SELECT
    USING (auth.uid()::text = user_id);

CREATE POLICY "profiles_insert_none" ON profiles
    FOR INSERT
    WITH CHECK (false);

CREATE POLICY "profiles_update_own" ON profiles
    FOR UPDATE
    USING (auth.uid()::text = user_id)
    WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "profiles_delete_none" ON profiles
    FOR DELETE
    USING (false);

-- =============================================================================
-- 2. LOYALTY_ACCOUNTS - Conta de fidelidade
-- Coluna: profile_id (referencia profiles.id, não user_id diretamente)
-- Precisa de subquery para resolver user_id via profiles
-- =============================================================================

ALTER TABLE loyalty_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_accounts FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "loyalty_accounts_select_own" ON loyalty_accounts;
DROP POLICY IF EXISTS "loyalty_accounts_insert_none" ON loyalty_accounts;
DROP POLICY IF EXISTS "loyalty_accounts_update_none" ON loyalty_accounts;
DROP POLICY IF EXISTS "loyalty_accounts_delete_none" ON loyalty_accounts;

CREATE POLICY "loyalty_accounts_select_own" ON loyalty_accounts
    FOR SELECT
    USING (
        profile_id IN (
            SELECT id FROM profiles WHERE user_id = auth.uid()::text
        )
    );

CREATE POLICY "loyalty_accounts_insert_none" ON loyalty_accounts
    FOR INSERT
    WITH CHECK (false);

CREATE POLICY "loyalty_accounts_update_none" ON loyalty_accounts
    FOR UPDATE
    USING (false);

CREATE POLICY "loyalty_accounts_delete_none" ON loyalty_accounts
    FOR DELETE
    USING (false);

-- =============================================================================
-- 3. APPOINTMENTS - Agendamentos
-- Coluna: client_id (referencia profiles.id, pode ser NULL para guests)
-- Coluna: barber_id (referencia barbers.id)
-- =============================================================================

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "appointments_select_own" ON appointments;
DROP POLICY IF EXISTS "appointments_insert_none" ON appointments;
DROP POLICY IF EXISTS "appointments_update_none" ON appointments;
DROP POLICY IF EXISTS "appointments_delete_none" ON appointments;

-- Cliente vê seus agendamentos OU barbeiro vê agendamentos dele
CREATE POLICY "appointments_select_own" ON appointments
    FOR SELECT
    USING (
        -- Cliente autenticado vê seus próprios
        client_id IN (
            SELECT id FROM profiles WHERE user_id = auth.uid()::text
        )
        OR
        -- Barbeiro vê os atribuídos a ele
        barber_id IN (
            SELECT id FROM barbers WHERE user_id = auth.uid()::text
        )
    );

CREATE POLICY "appointments_insert_none" ON appointments
    FOR INSERT
    WITH CHECK (false);

CREATE POLICY "appointments_update_none" ON appointments
    FOR UPDATE
    USING (false);

CREATE POLICY "appointments_delete_none" ON appointments
    FOR DELETE
    USING (false);

-- =============================================================================
-- 3.1 GUEST_CLIENTS / BANNED_CLIENTS
-- Ownership guest agora é baseado em `access_token` + claim explícito autenticado.
-- Isso acontece no backend do app. Se estas tabelas forem expostas por Supabase
-- client no futuro, a recomendação é manter acesso direto negado por padrão e
-- publicar apenas views/rotas seguras, nunca acesso aberto por telefone.
-- =============================================================================

-- =============================================================================
-- 4. POINT_TRANSACTIONS - Transações de pontos
-- Coluna: loyalty_account_id (referencia loyalty_accounts.id)
-- =============================================================================

ALTER TABLE point_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_transactions FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "point_transactions_select_own" ON point_transactions;
DROP POLICY IF EXISTS "point_transactions_insert_none" ON point_transactions;
DROP POLICY IF EXISTS "point_transactions_update_none" ON point_transactions;
DROP POLICY IF EXISTS "point_transactions_delete_none" ON point_transactions;

CREATE POLICY "point_transactions_select_own" ON point_transactions
    FOR SELECT
    USING (
        loyalty_account_id IN (
            SELECT la.id FROM loyalty_accounts la
            JOIN profiles p ON la.profile_id = p.id
            WHERE p.user_id = auth.uid()::text
        )
    );

CREATE POLICY "point_transactions_insert_none" ON point_transactions
    FOR INSERT
    WITH CHECK (false);

CREATE POLICY "point_transactions_update_none" ON point_transactions
    FOR UPDATE
    USING (false);

CREATE POLICY "point_transactions_delete_none" ON point_transactions
    FOR DELETE
    USING (false);

-- =============================================================================
-- 5. FEEDBACKS - Avaliações
-- Coluna: client_id (referencia profiles.id, pode ser NULL)
-- Coluna: barber_id (referencia barbers.id)
-- =============================================================================

ALTER TABLE feedbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedbacks FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "feedbacks_select_own" ON feedbacks;
DROP POLICY IF EXISTS "feedbacks_insert_none" ON feedbacks;
DROP POLICY IF EXISTS "feedbacks_update_none" ON feedbacks;
DROP POLICY IF EXISTS "feedbacks_delete_none" ON feedbacks;

CREATE POLICY "feedbacks_select_own" ON feedbacks
    FOR SELECT
    USING (
        -- Cliente vê seus feedbacks
        client_id IN (
            SELECT id FROM profiles WHERE user_id = auth.uid()::text
        )
        OR
        -- Barbeiro vê feedbacks sobre ele
        barber_id IN (
            SELECT id FROM barbers WHERE user_id = auth.uid()::text
        )
    );

CREATE POLICY "feedbacks_insert_none" ON feedbacks
    FOR INSERT
    WITH CHECK (false);

CREATE POLICY "feedbacks_update_none" ON feedbacks
    FOR UPDATE
    USING (false);

CREATE POLICY "feedbacks_delete_none" ON feedbacks
    FOR DELETE
    USING (false);

-- =============================================================================
-- 6. REDEMPTIONS - Resgates de recompensas
-- Coluna: loyalty_account_id (referencia loyalty_accounts.id)
-- =============================================================================

ALTER TABLE redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE redemptions FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "redemptions_select_own" ON redemptions;
DROP POLICY IF EXISTS "redemptions_insert_none" ON redemptions;
DROP POLICY IF EXISTS "redemptions_update_none" ON redemptions;
DROP POLICY IF EXISTS "redemptions_delete_none" ON redemptions;

CREATE POLICY "redemptions_select_own" ON redemptions
    FOR SELECT
    USING (
        loyalty_account_id IN (
            SELECT la.id FROM loyalty_accounts la
            JOIN profiles p ON la.profile_id = p.id
            WHERE p.user_id = auth.uid()::text
        )
    );

CREATE POLICY "redemptions_insert_none" ON redemptions
    FOR INSERT
    WITH CHECK (false);

CREATE POLICY "redemptions_update_none" ON redemptions
    FOR UPDATE
    USING (false);

CREATE POLICY "redemptions_delete_none" ON redemptions
    FOR DELETE
    USING (false);

-- =============================================================================
-- VERIFICAÇÃO
-- =============================================================================

SELECT
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'appointments', 'loyalty_accounts', 'point_transactions', 'feedbacks', 'redemptions')
ORDER BY tablename;

SELECT
    tablename,
    policyname,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'appointments', 'loyalty_accounts', 'point_transactions', 'feedbacks', 'redemptions')
ORDER BY tablename, policyname;
