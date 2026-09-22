import { createClient } from "@supabase/supabase-js";

/** Só deve ser importado em código server-side (src/routes/api/**\/*.ts). */
function env(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Variável ${name} não configurada`);
  return value;
}

export function getAdminClient() {
  const url = env("SUPABASE_URL").replace(/\/$/, "");
  return createClient(url, env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Valida o token da requisição e devolve o usuário autenticado (ou null). */
export async function getUserFromRequest(request: Request) {
  const token = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return null;

  const admin = getAdminClient();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

/** Valida o token da requisição e confirma que o usuário é admin (app_metadata.role). */
export async function requireAdmin(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user || user.app_metadata?.["role"] !== "admin") return null;
  return user;
}
