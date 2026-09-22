import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  LogIn,
  Loader2,
  Mail,
  Lock,
  Eye,
  EyeOff,
  BarChart3,
  MapPin,
  Users2,
  ArrowRight,
} from "lucide-react";

import { useAuth } from "@/lib/auth-context";
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

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      {
        title: "Entrar — Observatório do Cadastro Único de Natal/RN",
      },
    ],
  }),
  component: LoginPage,
});

const loginSchema = z.object({
  email: z.string().min(1, "Informe seu e-mail.").email("E-mail inválido."),
  password: z.string().min(1, "Informe sua senha."),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function LoginPage() {
  const { session, loading, signIn } = useAuth();
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    if (!loading && session) {
      navigate({ to: "/", replace: true });
    }
  }, [loading, session, navigate]);

  async function onSubmit(values: LoginFormValues) {
    setSubmitError(null);
    const { error } = await signIn(values.email, values.password);
    if (error) {
      setSubmitError(error);
      return;
    }
    navigate({ to: "/", replace: true });
  }

  return (
    <div className="relative min-h-screen w-full bg-background font-sans antialiased lg:grid lg:grid-cols-12">
      {/* ─────────────────────────────────────────────────────────────
          LADO ESQUERDO: Painel Institucional e Destaque Visual (Desktop)
         ───────────────────────────────────────────────────────────── */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-[#080b26] p-10 text-white lg:col-span-6 lg:flex xl:col-span-7 xl:p-14 2xl:p-16">
        {/* Iluminação ambiente suave de fundo (sem textura de quadrados/grade) */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute -left-24 -top-24 h-[520px] w-[520px] rounded-full bg-primary/25 blur-[120px]" />
          <div className="absolute -bottom-20 right-0 h-[480px] w-[480px] rounded-full bg-blue-500/20 blur-[130px]" />
          <div className="absolute right-1/4 top-1/3 h-72 w-72 rounded-full bg-indigo-500/15 blur-[90px]" />
        </div>

        {/* Topo institucional */}
        <div className="relative z-10 flex items-center">
          <div className="flex items-center gap-4">
            <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-white/10 p-2.5 backdrop-blur-md ring-1 ring-white/20 sm:size-18">
              <img
                src="/logo-icone-natal.png"
                alt="Brasão de Natal"
                className="h-full w-auto object-contain drop-shadow"
              />
            </div>
            <div>
              <p className="text-base font-bold uppercase tracking-wide text-blue-300 sm:text-lg">
                Prefeitura Municipal do Natal
              </p>
              <p className="mt-0.5 text-xs text-white/80 sm:text-sm">
                SEMTAS • Secretaria Municipal de Trabalho e Assistência Social
              </p>
            </div>
          </div>
        </div>

        {/* Centro: Título, Apresentação e Cards de Destaque */}
        <div className="relative z-10 my-auto py-10">
          <h1 className="text-3xl font-bold tracking-tight text-white xl:text-4xl 2xl:text-5xl">
            Observatório do{" "}
            <span className="bg-gradient-to-r from-blue-300 via-sky-200 to-white bg-clip-text text-transparent">
              Cadastro Único
            </span>
          </h1>

          <p className="mt-4 max-w-xl text-base leading-relaxed text-white/80 xl:text-lg">
            Plataforma estratégica para tomada de decisão, monitoramento territorial e formulação de
            políticas públicas baseadas em evidências para o município de Natal/RN.
          </p>

          {/* Cards de destaques */}
          <div className="mt-8 grid max-w-2xl gap-3 sm:grid-cols-3">
            <div className="group rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-md transition-all hover:border-white/20 hover:bg-white/[0.09]">
              <div className="flex size-9 items-center justify-center rounded-lg bg-blue-500/20 text-blue-300">
                <MapPin className="size-4" />
              </div>
              <p className="mt-3 text-sm font-semibold text-white">Análise Territorial</p>
              <p className="mt-1 text-xs leading-normal text-white/60">
                Distribuição de famílias e vulnerabilidade por regiões e bairros.
              </p>
            </div>

            <div className="group rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-md transition-all hover:border-white/20 hover:bg-white/[0.09]">
              <div className="flex size-9 items-center justify-center rounded-lg bg-sky-500/20 text-sky-300">
                <Users2 className="size-4" />
              </div>
              <p className="mt-3 text-sm font-semibold text-white">Perfil Populacional</p>
              <p className="mt-1 text-xs leading-normal text-white/60">
                Estatísticas de faixas etárias, composição familiar e renda.
              </p>
            </div>

            <div className="group rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-md transition-all hover:border-white/20 hover:bg-white/[0.09]">
              <div className="flex size-9 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-300">
                <BarChart3 className="size-4" />
              </div>
              <p className="mt-3 text-sm font-semibold text-white">Benefícios Sociais</p>
              <p className="mt-1 text-xs leading-normal text-white/60">
                Acompanhamento detalhado do Bolsa Família e programas municipais.
              </p>
            </div>
          </div>
        </div>

        {/* Rodapé do lado esquerdo limpo e elegante */}
        <div className="relative z-10" />
      </div>

      {/* ─────────────────────────────────────────────────────────────
          LADO DIREITO: Formulário de Autenticação + Logos Oficiais
         ───────────────────────────────────────────────────────────── */}
      <div className="relative flex min-h-screen flex-col items-center justify-center bg-slate-50/70 p-6 dark:bg-background/95 sm:p-10 lg:col-span-6 lg:p-12 xl:col-span-5 xl:p-16">
        {/* Efeito decorativo de fundo sutil */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute right-0 top-0 h-96 w-96 -translate-y-1/2 translate-x-1/3 rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-80 w-80 -translate-x-1/3 translate-y-1/3 rounded-full bg-blue-500/5 blur-3xl" />
        </div>

        {/* Bloco Central: Logos Oficiais + Card de Login */}
        <div className="relative z-10 w-full max-w-md">
          {/* Logos no lado direito (sem card branco envolvente, direto na interface) */}
          <div className="mb-7 flex flex-wrap items-center justify-center gap-x-4 gap-y-3">
            <img
              src="/logo-cadunico.png"
              alt="Cadastro Único"
              className="h-8 w-auto object-contain sm:h-9"
            />
            <span className="h-5 w-px bg-border/80" aria-hidden="true" />
            <img
              src="/logo-prefeitura-natal.png"
              alt="Prefeitura de Natal"
              className="h-10 w-auto object-contain sm:h-11"
            />
            <span className="h-5 w-px bg-border/80" aria-hidden="true" />
            <img
              src="/logo-metadata-footer.png"
              alt="Metadata SI"
              className="h-4.5 w-auto object-contain sm:h-5"
            />
          </div>

          {/* Card de Login */}
          <div className="rounded-2xl border border-border/80 bg-card p-7 shadow-xl shadow-slate-200/50 dark:shadow-none sm:p-9">
            {/* Ícone e Cabeçalho do Card */}
            <div className="mb-6 flex flex-col items-center text-center sm:items-start sm:text-left">
              <div className="mb-3.5 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
                <LogIn className="size-5" aria-hidden="true" />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                Acessar Plataforma
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Informe suas credenciais para acessar o painel de indicadores e dados do Cadastro Único.
              </p>
            </div>

            {/* Formulário */}
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
                {submitError ? (
                  <Alert variant="destructive" className="border-destructive/30 bg-destructive/10 text-destructive text-sm">
                    <AlertDescription className="font-medium">{submitError}</AlertDescription>
                  </Alert>
                ) : null}

                {/* Campo E-mail */}
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold text-foreground">E-mail</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail
                            className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                            aria-hidden="true"
                          />
                          <Input
                            type="email"
                            autoComplete="email"
                            placeholder="seu.email@natal.rn.gov.br"
                            className="h-11 rounded-xl pl-10 text-sm transition-all focus-visible:ring-2 focus-visible:ring-primary/30"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Campo Senha */}
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel className="text-xs font-semibold text-foreground">Senha</FormLabel>
                      </div>
                      <FormControl>
                        <div className="relative">
                          <Lock
                            className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                            aria-hidden="true"
                          />
                          <Input
                            type={showPassword ? "text" : "password"}
                            autoComplete="current-password"
                            placeholder="••••••••"
                            className="h-11 rounded-xl pl-10 pr-10 text-sm transition-all focus-visible:ring-2 focus-visible:ring-primary/30"
                            {...field}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                            aria-label={showPassword ? "Ocultar senha" : "Exibir senha"}
                          >
                            {showPassword ? (
                              <EyeOff className="size-4" aria-hidden="true" />
                            ) : (
                              <Eye className="size-4" aria-hidden="true" />
                            )}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Botão de Envio */}
                <Button
                  type="submit"
                  size="lg"
                  className="group mt-2 h-11 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-md shadow-primary/25 transition-all hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/30 active:scale-[0.99]"
                  disabled={form.formState.isSubmitting}
                >
                  {form.formState.isSubmitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                      <span>Autenticando...</span>
                    </>
                  ) : (
                    <>
                      <span>Entrar no Observatório</span>
                      <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </div>
        </div>
      </div>
    </div>
  );
}
