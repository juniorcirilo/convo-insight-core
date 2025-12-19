import { useState, useEffect } from 'react';
import { useWhatsAppInstances, useWhatsAppMacros, useAssignmentRules } from '@/hooks/whatsapp';
import { useTeamManagement } from '@/hooks/useTeamManagement';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Rocket, Users, Zap, Settings as SettingsIcon, BarChart3, UserCircle } from 'lucide-react';

export interface SetupStep {
  id: string;
  category: string;
  title: string;
  description: string;
  icon: any;
  action?: () => void;
  actionLabel?: string;
  completed: boolean;
}

export interface SetupCategory {
  id: string;
  title: string;
  steps: SetupStep[];
  progress: number;
}

const STORAGE_KEY = 'whatsapp-setup-guide-manual';

export const useSetupProgress = () => {
  const { instances } = useWhatsAppInstances();
  const { members } = useTeamManagement();
  const { macros } = useWhatsAppMacros();
  const { rules: assignmentRules } = useAssignmentRules();
  
  // Manual completions stored in localStorage
  const [manualCompletions, setManualCompletions] = useState<string[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  // Check if has received first message
  const { data: hasMessages = false } = useQuery({
    queryKey: ['setup-check-messages'],
    queryFn: async () => {
      const { count } = await supabase
        .from('whatsapp_messages')
        .select('*', { count: 'exact', head: true })
        .limit(1);
      return (count || 0) > 0;
    },
  });

  // Check if has supervisors or admins
  const hasSupervisorsOrAdmins = members.filter(m => 
    m.role === 'admin' || m.role === 'supervisor'
  ).length > 0;

  // Persist manual completions
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(manualCompletions));
  }, [manualCompletions]);

  const toggleManualCompletion = (stepId: string) => {
    setManualCompletions(prev => 
      prev.includes(stepId) 
        ? prev.filter(id => id !== stepId)
        : [...prev, stepId]
    );
  };

  const isManuallyCompleted = (stepId: string) => manualCompletions.includes(stepId);

  // Build categories with steps
  const categories: SetupCategory[] = [
    {
      id: 'initial',
      title: 'Configuração Inicial',
      steps: [
        {
          id: 'connect-instance',
          category: 'initial',
          title: 'Conectar instância do WhatsApp',
          description: 'Configure sua primeira instância da Evolution API para começar a receber mensagens.',
          icon: Rocket,
          completed: instances.length > 0 && instances.some(i => i.status === 'connected'),
        },
        {
          id: 'first-message',
          category: 'initial',
          title: 'Receber primeira mensagem',
          description: 'Aguarde a primeira mensagem chegar na sua instância conectada.',
          icon: BarChart3,
          completed: hasMessages,
        },
      ],
      progress: 0,
    },
    {
      id: 'team',
      title: 'Montar Equipe',
      steps: [
        {
          id: 'invite-member',
          category: 'team',
          title: 'Convidar membro da equipe',
          description: 'Adicione outros agentes para ajudar no atendimento.',
          icon: Users,
          completed: members.length >= 2,
        },
        {
          id: 'define-hierarchy',
          category: 'team',
          title: 'Definir hierarquia',
          description: 'Configure supervisores ou administradores para gerenciar a equipe.',
          icon: UserCircle,
          completed: hasSupervisorsOrAdmins,
        },
      ],
      progress: 0,
    },
    {
      id: 'productivity',
      title: 'Produtividade',
      steps: [
        {
          id: 'create-macro',
          category: 'productivity',
          title: 'Criar primeira macro',
          description: 'Configure respostas rápidas para agilizar o atendimento.',
          icon: Zap,
          completed: macros.length > 0,
        },
        {
          id: 'configure-assignment',
          category: 'productivity',
          title: 'Configurar regra de atribuição',
          description: 'Automatize a distribuição de conversas entre os agentes.',
          icon: SettingsIcon,
          completed: assignmentRules.length > 0,
        },
      ],
      progress: 0,
    },
    {
      id: 'explore',
      title: 'Explorar Recursos',
      steps: [
        {
          id: 'visit-reports',
          category: 'explore',
          title: 'Conhecer relatórios',
          description: 'Explore métricas e análises de desempenho da equipe.',
          icon: BarChart3,
          completed: isManuallyCompleted('visit-reports'),
        },
        {
          id: 'visit-contacts',
          category: 'explore',
          title: 'Explorar visualização de contatos',
          description: 'Veja o histórico completo e análises de cada cliente.',
          icon: UserCircle,
          completed: isManuallyCompleted('visit-contacts'),
        },
      ],
      progress: 0,
    },
  ];

  // Calculate progress for each category
  categories.forEach(category => {
    const completedSteps = category.steps.filter(s => s.completed).length;
    category.progress = Math.round((completedSteps / category.steps.length) * 100);
  });

  // Calculate overall progress
  const allSteps = categories.flatMap(c => c.steps);
  const completedCount = allSteps.filter(s => s.completed).length;
  const totalProgress = Math.round((completedCount / allSteps.length) * 100);
  const remainingSteps = allSteps.length - completedCount;

  const resetProgress = () => {
    setManualCompletions([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  return {
    categories,
    totalProgress,
    remainingSteps,
    completedCount,
    totalSteps: allSteps.length,
    toggleManualCompletion,
    resetProgress,
  };
};
