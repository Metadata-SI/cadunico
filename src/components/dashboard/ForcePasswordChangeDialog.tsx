import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const schema = z
  .object({
    password: z
      .string()
      .min(6, "A senha precisa ter pelo menos 6 caracteres.")
      .refine((value) => value !== "123456", "Escolha uma senha diferente da padrão."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem.",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

/**
 * Bloqueia o uso do painel até o usuário trocar a senha padrão (123456) no
 * primeiro acesso ou logo após um reset feito por um admin. Sem botão de
 * fechar/escape de propósito — não é um Dialog do shadcn.
 */
export function ForcePasswordChangeDialog() {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  async function onSubmit(values: FormValues) {
    setSubmitError(null);

    const { error: updateError } = await supabase.auth.updateUser({ password: values.password });
    if (updateError) {
      setSubmitError(
        updateError.message.toLowerCase().includes("at least")
          ? "A senha precisa ter pelo menos 6 caracteres."
          : "Não foi possível salvar a nova senha. Tente novamente.",
      );
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    const response = await fetch("/api/first-login", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      setSubmitError("Senha salva, mas houve um problema ao concluir. Recarregue a página.");
      return;
    }

    await supabase.auth.refreshSession();
    toast.success("Senha atualizada com sucesso.");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-sm rounded-lg border bg-background p-6 shadow-lg">
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <KeyRound className="size-5" aria-hidden />
          </span>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">Defina sua senha</h2>
          <p className="text-sm text-muted-foreground">
            Este é seu primeiro acesso (ou sua senha foi redefinida). Por segurança, escolha uma
            senha só sua antes de continuar.
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-5 flex flex-col gap-4">
            {submitError ? (
              <Alert variant="destructive">
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            ) : null}

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nova senha</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirmar senha</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="mt-2" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Salvando...
                </>
              ) : (
                "Salvar nova senha"
              )}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
