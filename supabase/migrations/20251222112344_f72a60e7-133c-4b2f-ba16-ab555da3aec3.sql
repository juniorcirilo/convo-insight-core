-- =============================================
-- ETAPA 1: CRIAR TABELAS DE SETORES
-- =============================================

-- 1.1 Criar tabela de setores
CREATE TABLE public.sectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID NOT NULL REFERENCES public.whatsapp_instances(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(instance_id, name)
);

-- Habilitar RLS
ALTER TABLE public.sectors ENABLE ROW LEVEL SECURITY;

-- Índice para performance
CREATE INDEX idx_sectors_instance_id ON public.sectors(instance_id);
CREATE INDEX idx_sectors_is_default ON public.sectors(is_default) WHERE is_default = true;

-- Trigger para updated_at
CREATE TRIGGER update_sectors_updated_at
  BEFORE UPDATE ON public.sectors
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 1.2 Criar tabela pivô usuário-setor
CREATE TABLE public.user_sectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sector_id UUID NOT NULL REFERENCES public.sectors(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, sector_id)
);

-- Habilitar RLS
ALTER TABLE public.user_sectors ENABLE ROW LEVEL SECURITY;

-- Índices para performance
CREATE INDEX idx_user_sectors_user_id ON public.user_sectors(user_id);
CREATE INDEX idx_user_sectors_sector_id ON public.user_sectors(sector_id);
CREATE INDEX idx_user_sectors_is_primary ON public.user_sectors(is_primary) WHERE is_primary = true;

-- 1.3 Adicionar sector_id em whatsapp_conversations
ALTER TABLE public.whatsapp_conversations 
ADD COLUMN sector_id UUID REFERENCES public.sectors(id) ON DELETE SET NULL;

CREATE INDEX idx_conversations_sector_id ON public.whatsapp_conversations(sector_id);

-- 1.4 Adicionar sector_id em assignment_rules
ALTER TABLE public.assignment_rules 
ADD COLUMN sector_id UUID REFERENCES public.sectors(id) ON DELETE SET NULL;

CREATE INDEX idx_assignment_rules_sector_id ON public.assignment_rules(sector_id);

-- =============================================
-- ETAPA 2: FUNÇÕES DE SEGURANÇA
-- =============================================

-- 2.1 Função para verificar pertencimento ao setor
CREATE OR REPLACE FUNCTION public.user_belongs_to_sector(_user_id uuid, _sector_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_sectors
    WHERE user_id = _user_id AND sector_id = _sector_id
  )
$$;

-- 2.2 Função para verificar se usuário pertence à instância via setor
CREATE OR REPLACE FUNCTION public.user_belongs_to_instance(_user_id uuid, _instance_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_sectors us
    JOIN public.sectors s ON s.id = us.sector_id
    WHERE us.user_id = _user_id AND s.instance_id = _instance_id
  )
$$;

-- 2.3 Atualizar can_access_conversation para considerar setor
CREATE OR REPLACE FUNCTION public.can_access_conversation(_user_id uuid, _conversation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    -- Admins e supervisors podem ver tudo
    SELECT 1 WHERE has_role(_user_id, 'admin'::app_role)
    UNION
    SELECT 1 WHERE has_role(_user_id, 'supervisor'::app_role)
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

-- =============================================
-- ETAPA 3: POLÍTICAS RLS PARA SETORES
-- =============================================

-- 3.1 RLS para sectors

-- Admins podem gerenciar todos os setores
CREATE POLICY "Admins can manage all sectors" ON public.sectors
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Supervisors podem gerenciar setores das suas instâncias
CREATE POLICY "Supervisors can manage instance sectors" ON public.sectors
FOR ALL USING (
  has_role(auth.uid(), 'supervisor'::app_role) 
  AND user_belongs_to_instance(auth.uid(), instance_id)
)
WITH CHECK (
  has_role(auth.uid(), 'supervisor'::app_role) 
  AND user_belongs_to_instance(auth.uid(), instance_id)
);

-- Usuários autenticados podem ver setores da sua instância
CREATE POLICY "Users can view their instance sectors" ON public.sectors
FOR SELECT USING (
  auth.uid() IS NOT NULL 
  AND user_belongs_to_instance(auth.uid(), instance_id)
);

-- 3.2 RLS para user_sectors

-- Admins podem gerenciar todos os vínculos
CREATE POLICY "Admins can manage all user sectors" ON public.user_sectors
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Supervisors podem gerenciar vínculos dos setores da sua instância
CREATE POLICY "Supervisors can manage sector users" ON public.user_sectors
FOR ALL USING (
  has_role(auth.uid(), 'supervisor'::app_role)
  AND EXISTS (
    SELECT 1 FROM sectors s 
    WHERE s.id = sector_id 
    AND user_belongs_to_instance(auth.uid(), s.instance_id)
  )
)
WITH CHECK (
  has_role(auth.uid(), 'supervisor'::app_role)
  AND EXISTS (
    SELECT 1 FROM sectors s 
    WHERE s.id = sector_id 
    AND user_belongs_to_instance(auth.uid(), s.instance_id)
  )
);

-- Usuários podem ver membros dos seus setores
CREATE POLICY "Users can view sector members" ON public.user_sectors
FOR SELECT USING (
  auth.uid() IS NOT NULL
  AND (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_sectors us2 
      WHERE us2.user_id = auth.uid() AND us2.sector_id = sector_id
    )
  )
);

-- =============================================
-- ETAPA 4: MIGRAÇÃO DE DADOS EXISTENTES
-- =============================================

-- 4.1 Criar setor "Geral" padrão para cada instância existente
INSERT INTO public.sectors (instance_id, name, is_default, description)
SELECT id, 'Geral', true, 'Setor padrão criado automaticamente'
FROM public.whatsapp_instances
ON CONFLICT (instance_id, name) DO NOTHING;

-- 4.2 Vincular todos os usuários ativos ao setor padrão de todas as instâncias
INSERT INTO public.user_sectors (user_id, sector_id, is_primary)
SELECT p.id, s.id, true
FROM public.profiles p
CROSS JOIN public.sectors s
WHERE s.is_default = true AND p.is_active = true
ON CONFLICT (user_id, sector_id) DO NOTHING;

-- 4.3 Atribuir conversas existentes ao setor padrão da sua instância
UPDATE public.whatsapp_conversations c
SET sector_id = (
  SELECT s.id FROM public.sectors s 
  WHERE s.instance_id = c.instance_id 
  AND s.is_default = true
  LIMIT 1
)
WHERE c.sector_id IS NULL;

-- =============================================
-- ETAPA 5: CONSTRAINT PARA SETOR PADRÃO ÚNICO
-- =============================================

-- Função para validar apenas um setor padrão por instância
CREATE OR REPLACE FUNCTION public.validate_single_default_sector()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_default = true THEN
    -- Remove is_default de outros setores da mesma instância
    UPDATE public.sectors 
    SET is_default = false 
    WHERE instance_id = NEW.instance_id 
      AND id != NEW.id 
      AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER ensure_single_default_sector
  BEFORE INSERT OR UPDATE ON public.sectors
  FOR EACH ROW
  WHEN (NEW.is_default = true)
  EXECUTE FUNCTION public.validate_single_default_sector();