import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export type UserRole = "admin" | "usuario";

/** Único e-mail com acesso à aba "Fontes de Dados". */
export const FONTES_DADOS_ALLOWED_EMAIL = "dashboard@metadatasi.com.br";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  /** Papel do usuário logado (app_metadata.role, só alterável via painel de Usuários). */
  role: UserRole;
  /** true quando o usuário ainda está com a senha padrão (123456) e precisa trocá-la. */
  mustChangePassword: boolean;
  /** true enquanto a sessão inicial ainda está sendo verificada. */
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setLoading(false);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? traduzirErro(error.message) : null };
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  const user = session?.user ?? null;
  const role: UserRole = user?.app_metadata?.["role"] === "admin" ? "admin" : "usuario";
  const mustChangePassword = user?.app_metadata?.["must_change_password"] === true;

  return (
    <AuthContext.Provider
      value={{ session, user, role, mustChangePassword, loading, signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  }
  return ctx;
}

function traduzirErro(message: string): string {
  if (message.toLowerCase().includes("invalid login credentials")) {
    return "E-mail ou senha inválidos.";
  }
  if (message.toLowerCase().includes("email not confirmed")) {
    return "E-mail ainda não confirmado. Verifique sua caixa de entrada.";
  }
  if (message.toLowerCase().includes("banned") || message.toLowerCase().includes("disabled")) {
    return "Este acesso foi desativado. Fale com um administrador.";
  }
  return "Não foi possível entrar. Tente novamente em instantes.";
}
