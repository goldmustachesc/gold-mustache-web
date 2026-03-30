-- =============================================================================
-- Gold Mustache - RLS Policies para tabela notifications
-- =============================================================================
-- Este script deve ser executado no Supabase Dashboard (SQL Editor) para cada
-- ambiente (staging e production) separadamente.
--
-- PRÉ-REQUISITOS:
-- 1. A tabela "notifications" já existe (criada via Prisma migrate)
-- 2. A coluna "user_id" contém o UUID do usuário Supabase Auth
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Verificar estado atual
-- -----------------------------------------------------------------------------
-- Execute estas queries primeiro para entender o estado atual:

-- Verificar se RLS está habilitado:
SELECT
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename = 'notifications';

-- Listar policies existentes:
SELECT
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'notifications';

-- Verificar se Realtime está habilitado para a tabela:
SELECT
    schemaname,
    tablename,
    pubname
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename = 'notifications';

-- -----------------------------------------------------------------------------
-- 2. Habilitar RLS na tabela notifications
-- -----------------------------------------------------------------------------
-- IMPORTANTE: Isso NÃO afeta acessos via service_role ou Prisma server-side.
-- Afeta APENAS acessos via anon_key ou authenticated user no cliente.

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Forçar RLS para o owner da tabela também (segurança adicional)
ALTER TABLE notifications FORCE ROW LEVEL SECURITY;

-- Remover policies antigas para permitir reexecução segura do script
DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
DROP POLICY IF EXISTS "notifications_insert_none" ON notifications;
DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
DROP POLICY IF EXISTS "notifications_delete_own" ON notifications;

-- -----------------------------------------------------------------------------
-- 3. Policy para SELECT - Usuário só vê suas próprias notificações
-- -----------------------------------------------------------------------------
-- NOTA: user_id é tipo TEXT, auth.uid() retorna UUID, então usamos ::text cast
CREATE POLICY "notifications_select_own" ON notifications
    FOR SELECT
    USING (auth.uid()::text = user_id);

-- -----------------------------------------------------------------------------
-- 4. Policy para INSERT - Desabilitar inserção direta pelo cliente
-- -----------------------------------------------------------------------------
-- Notificações são criadas pelo servidor (Prisma). Clientes não devem inserir.
-- Se houver caso de uso futuro, ajustar esta policy.

-- Opção A: Bloquear completamente (recomendado)
CREATE POLICY "notifications_insert_none" ON notifications
    FOR INSERT
    WITH CHECK (false);

-- Opção B: Se precisar permitir inserção pelo próprio usuário (NÃO RECOMENDADO)
-- CREATE POLICY "notifications_insert_own" ON notifications
--     FOR INSERT
--     WITH CHECK (auth.uid()::text = user_id);

-- -----------------------------------------------------------------------------
-- 5. Policy para UPDATE - Usuário só atualiza suas próprias notificações
-- -----------------------------------------------------------------------------
-- Permite marcar como lida. Restringe a apenas o campo "read" se possível.

CREATE POLICY "notifications_update_own" ON notifications
    FOR UPDATE
    USING (auth.uid()::text = user_id)
    WITH CHECK (auth.uid()::text = user_id);

-- -----------------------------------------------------------------------------
-- 6. Policy para DELETE - Usuário só deleta suas próprias notificações
-- -----------------------------------------------------------------------------
-- Se exclusão pelo cliente não for necessária, trocar por false.

CREATE POLICY "notifications_delete_own" ON notifications
    FOR DELETE
    USING (auth.uid()::text = user_id);

-- -----------------------------------------------------------------------------
-- 7. Verificar policies aplicadas
-- -----------------------------------------------------------------------------
SELECT
    policyname,
    cmd,
    qual AS using_expression,
    with_check AS with_check_expression
FROM pg_policies
WHERE tablename = 'notifications'
ORDER BY policyname;

-- -----------------------------------------------------------------------------
-- 8. Teste de isolamento (executar manualmente)
-- -----------------------------------------------------------------------------
-- Simular acesso como um usuário específico:
--
-- SET ROLE authenticated;
-- SET request.jwt.claims TO '{"sub": "USER_A_UUID"}';
-- SELECT * FROM notifications;
-- -- Deve retornar APENAS notificações do USER_A
--
-- SET request.jwt.claims TO '{"sub": "USER_B_UUID"}';
-- SELECT * FROM notifications;
-- -- Deve retornar APENAS notificações do USER_B

-- -----------------------------------------------------------------------------
-- ROLLBACK (se precisar reverter)
-- -----------------------------------------------------------------------------
-- DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
-- DROP POLICY IF EXISTS "notifications_insert_none" ON notifications;
-- DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
-- DROP POLICY IF EXISTS "notifications_delete_own" ON notifications;
-- ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
