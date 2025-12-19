import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useWhatsAppInstances, useCreateConversation } from "@/hooks/whatsapp";
import { toast } from "sonner";
import { normalizeBrazilianPhone } from "@/utils/phoneUtils";

interface NewConversationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instanceId: string;
  onSuccess?: (conversationId: string) => void;
}

const phoneRegex = /^(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)?\d{4,5}-?\d{4}$/;

const formSchema = z.object({
  instanceId: z.string().min(1, "Selecione uma instância"),
  phoneNumber: z
    .string()
    .min(10, "Número muito curto")
    .max(20, "Número muito longo")
    .refine((val) => phoneRegex.test(val), {
      message: "Formato inválido. Ex: (11) 98765-4321 ou 11987654321",
    }),
  contactName: z.string().min(2, "Nome muito curto").max(100, "Nome muito longo"),
});

type FormValues = z.infer<typeof formSchema>;

const NewConversationModal = ({
  open,
  onOpenChange,
  instanceId,
  onSuccess,
}: NewConversationModalProps) => {
  const { instances, isLoading: loadingInstances } = useWhatsAppInstances();
  const { mutate: createConversation, isPending } = useCreateConversation();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      instanceId: instanceId || "",
      phoneNumber: "",
      contactName: "",
    },
  });

  // Auto-select first instance if only one exists or if no instance is selected
  useEffect(() => {
    if (instances.length > 0 && !form.getValues('instanceId')) {
      form.setValue('instanceId', instances[0].id);
    }
  }, [instances, form]);

  const onSubmit = (values: FormValues) => {
    // Normalize phone number and add country code 55 automatically
    const normalizedPhone = normalizeBrazilianPhone(values.phoneNumber);

    createConversation(
      {
        instanceId: values.instanceId,
        phoneNumber: normalizedPhone,
        contactName: values.contactName,
      },
      {
        onSuccess: (data) => {
          toast.success("Conversa criada com sucesso!");
          form.reset();
          onSuccess?.(data.conversation.id);
        },
        onError: (error) => {
          toast.error("Erro ao criar conversa", {
            description: error.message,
          });
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Nova Conversa</DialogTitle>
          <DialogDescription>
            Crie uma nova conversa com um contato do WhatsApp
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Instance selection (only if multiple instances or no instance selected) */}
            {(instances.length > 1 || !form.watch('instanceId')) && (
              <FormField
                control={form.control}
                name="instanceId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Instância</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={loadingInstances}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma instância" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {instances.map((instance) => (
                          <SelectItem key={instance.id} value={instance.id}>
                            {instance.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Phone number */}
            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número de Telefone</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="(91) 91516-1370"
                      {...field}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    O código do país (55) será adicionado automaticamente
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Contact name */}
            <FormField
              control={form.control}
              name="contactName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Contato</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="João Silva"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Criando..." : "Criar Conversa"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default NewConversationModal;
