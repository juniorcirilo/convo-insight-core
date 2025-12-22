-- 1. Atualizar can_access_conversation para limitar supervisores à instância
CREATE OR REPLACE FUNCTION public.can_access_conversation(_user_id uuid, _conversation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    -- Admins podem ver tudo
    SELECT 1 WHERE has_role(_user_id, 'admin'::app_role)
    UNION
    -- Supervisors veem conversas da sua instância
    SELECT 1 FROM whatsapp_conversations c
    WHERE c.id = _conversation_id 
      AND has_role(_user_id, 'supervisor'::app_role)
      AND user_belongs_to_instance(_user_id, c.instance_id)
    UNION
    -- Agentes veem conversas atribuídas a eles
    SELECT 1 FROM whatsapp_conversations
    WHERE id = _conversation_id AND assigned_to = _user_id
    UNION
    -- Agentes veem conversas não atribuídas do seu setor
    SELECT 1 FROM whatsapp_conversations c
    WHERE c.id = _conversation_id 
      AND c.assigned_to IS NULL
      AND c.sector_id IS NOT NULL
      AND user_belongs_to_sector(_user_id, c.sector_id)
    UNION
    -- Fallback: conversas sem setor na instância do usuário (fila geral)
    SELECT 1 FROM whatsapp_conversations c
    WHERE c.id = _conversation_id 
      AND c.assigned_to IS NULL
      AND c.sector_id IS NULL
      AND user_belongs_to_instance(_user_id, c.instance_id)
  )
$$;

-- 2. Atualizar RLS de whatsapp_contacts para filtrar por instância
DROP POLICY IF EXISTS "Authenticated users can view contacts" ON public.whatsapp_contacts;

CREATE POLICY "Users can view contacts of their instances"
ON public.whatsapp_contacts
FOR SELECT USING (
  auth.uid() IS NOT NULL
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR user_belongs_to_instance(auth.uid(), instance_id)
  )
);

-- 3. Função auxiliar para verificar se agente pertence ao setor da conversa
CREATE OR REPLACE FUNCTION public.agent_can_be_assigned_to_conversation(_agent_id uuid, _conversation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- Admins podem atribuir qualquer agente
    has_role(auth.uid(), 'admin'::app_role)
    OR
    -- Se conversa não tem setor, qualquer agente da instância pode ser atribuído
    EXISTS (
      SELECT 1 FROM whatsapp_conversations c
      WHERE c.id = _conversation_id
      AND c.sector_id IS NULL
      AND user_belongs_to_instance(_agent_id, c.instance_id)
    )
    OR
    -- Agente pertence ao setor da conversa
    EXISTS (
      SELECT 1 FROM whatsapp_conversations c
      WHERE c.id = _conversation_id
      AND c.sector_id IS NOT NULL
      AND user_belongs_to_sector(_agent_id, c.sector_id)
    )
$$;