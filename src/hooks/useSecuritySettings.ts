import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useSecuritySettings() {
  const queryClient = useQueryClient();

  // Buscar configurações de segurança
  const { data: settings, isLoading } = useQuery({
    queryKey: ["security-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_config")
        .select("key, value")
        .in("key", ["restrict_signup_by_domain", "allowed_email_domains", "require_account_approval"]);

      if (error) throw error;

      const restrictEnabled = data?.find((c) => c.key === "restrict_signup_by_domain")?.value === "true";
      const requireApproval = data?.find((c) => c.key === "require_account_approval")?.value === "true";
      const domainsString = data?.find((c) => c.key === "allowed_email_domains")?.value || "";
      const domains = domainsString
        .split(",")
        .map((d) => d.trim())
        .filter(Boolean);

      return {
        restrictEnabled,
        requireApproval,
        allowedDomains: domains,
      };
    },
  });

  // Atualizar restrição ativada/desativada
  const toggleRestriction = useMutation({
    mutationFn: async ({ enabled, key }: { enabled: boolean; key: string }) => {
      const { error } = await supabase.from("project_config").upsert(
        {
          key: key,
          value: enabled ? "true" : "false",
        },
        { onConflict: "key" }
      );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["security-settings"] });
      toast.success("Configuração atualizada!");
    },
    onError: (error) => {
      console.error("Error updating restriction:", error);
      toast.error("Erro ao atualizar configuração");
    },
  });

  // Adicionar domínio permitido
  const addDomain = useMutation({
    mutationFn: async (domain: string) => {
      const currentDomains = settings?.allowedDomains || [];
      const normalizedDomain = domain.toLowerCase().trim().replace(/^@/, "");

      if (currentDomains.includes(normalizedDomain)) {
        throw new Error("Domínio já existe");
      }

      const newDomains = [...currentDomains, normalizedDomain];

      const { error } = await supabase.from("project_config").upsert(
        {
          key: "allowed_email_domains",
          value: newDomains.join(","),
        },
        { onConflict: "key" }
      );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["security-settings"] });
      toast.success("Domínio adicionado!");
    },
    onError: (error: any) => {
      console.error("Error adding domain:", error);
      toast.error(error.message || "Erro ao adicionar domínio");
    },
  });

  // Remover domínio permitido
  const removeDomain = useMutation({
    mutationFn: async (domain: string) => {
      const currentDomains = settings?.allowedDomains || [];
      const newDomains = currentDomains.filter((d) => d !== domain);

      const { error } = await supabase.from("project_config").upsert(
        {
          key: "allowed_email_domains",
          value: newDomains.join(","),
        },
        { onConflict: "key" }
      );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["security-settings"] });
      toast.success("Domínio removido!");
    },
    onError: (error) => {
      console.error("Error removing domain:", error);
      toast.error("Erro ao remover domínio");
    },
  });

  return {
    settings: settings || { restrictEnabled: false, requireApproval: false, allowedDomains: [] },
    isLoading,
    toggleRestriction,
    addDomain,
    removeDomain,
  };
}
