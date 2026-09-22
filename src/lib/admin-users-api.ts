import { supabase } from "@/lib/supabase";
import type { UserRole } from "@/lib/auth-context";

export interface ManagedUser {
  id: string;
  email: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
  lastSignInAt: string | null;
}

async function authHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sessão expirada. Faça login novamente.");
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

async function parseErrorOrThrow(response: Response) {
  if (response.ok) return;
  const body = await response.json().catch(() => null);
  throw new Error(body?.error ?? "Não foi possível concluir a operação.");
}

export async function listUsers(): Promise<{ users: ManagedUser[]; currentUserId: string }> {
  const response = await fetch("/api/admin-users", { headers: await authHeaders() });
  await parseErrorOrThrow(response);
  return response.json();
}

export async function createUser(email: string, role: UserRole) {
  const response = await fetch("/api/admin-users", {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ action: "create", email, role }),
  });
  await parseErrorOrThrow(response);
}

async function targetAction(
  action: "delete" | "deactivate" | "activate" | "resetPassword",
  id: string,
) {
  const response = await fetch("/api/admin-users", {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ action, id }),
  });
  await parseErrorOrThrow(response);
}

export const deleteUser = (id: string) => targetAction("delete", id);
export const deactivateUser = (id: string) => targetAction("deactivate", id);
export const activateUser = (id: string) => targetAction("activate", id);
export const resetPassword = (id: string) => targetAction("resetPassword", id);
