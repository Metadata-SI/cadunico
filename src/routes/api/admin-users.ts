import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getAdminClient, requireAdmin } from "@/lib/supabase-admin";

const DEFAULT_PASSWORD = "123456";
/** Maior duração de banimento aceita pelo GoTrue — usada para representar "acesso desativado". */
const BAN_DURATION = "876000h";

const createSchema = z.object({
  action: z.literal("create"),
  email: z.string().trim().toLowerCase().email(),
  role: z.enum(["admin", "usuario"]),
});

const targetActionSchema = z.object({
  action: z.enum(["delete", "deactivate", "activate", "resetPassword"]),
  id: z.string().min(1),
});

const bodySchema = z.union([createSchema, targetActionSchema]);

interface UsuarioRow {
  id: string;
  email: string;
  role: string;
  ativo: boolean;
  created_at: string;
  last_sign_in_at: string | null;
}

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export const Route = createFileRoute("/api/admin-users")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const admin = await requireAdmin(request);
        if (!admin) return jsonError("Acesso negado.", 403);

        const supabaseAdmin = getAdminClient();
        const { data, error } = await supabaseAdmin
          .from("usuarios")
          .select("id, email, role, ativo, created_at, last_sign_in_at")
          .order("email");
        if (error) return jsonError(error.message, 502);

        const users = (data as UsuarioRow[]).map((u) => ({
          id: u.id,
          email: u.email,
          role: u.role === "admin" ? "admin" : "usuario",
          active: u.ativo,
          createdAt: u.created_at,
          lastSignInAt: u.last_sign_in_at,
        }));

        return Response.json({ users, currentUserId: admin.id });
      },

      POST: async ({ request }) => {
        const admin = await requireAdmin(request);
        if (!admin) return jsonError("Acesso negado.", 403);

        const parsed = bodySchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return jsonError("Requisição inválida.", 400);

        const supabaseAdmin = getAdminClient();
        const body = parsed.data;

        if (body.action === "create") {
          const { data, error } = await supabaseAdmin.auth.admin.createUser({
            email: body.email,
            password: DEFAULT_PASSWORD,
            email_confirm: true,
            app_metadata: { role: body.role, must_change_password: true },
          });
          if (error) return jsonError(error.message, 400);
          return Response.json({ user: data.user });
        }

        if (body.id === admin.id && (body.action === "delete" || body.action === "deactivate")) {
          return jsonError("Você não pode excluir ou desativar seu próprio usuário.", 400);
        }

        if (body.action === "delete") {
          const { error } = await supabaseAdmin.auth.admin.deleteUser(body.id);
          if (error) return jsonError(error.message, 400);
          return Response.json({ ok: true });
        }

        if (body.action === "deactivate") {
          const { error } = await supabaseAdmin.auth.admin.updateUserById(body.id, {
            ban_duration: BAN_DURATION,
          });
          if (error) return jsonError(error.message, 400);
          return Response.json({ ok: true });
        }

        if (body.action === "activate") {
          const { error } = await supabaseAdmin.auth.admin.updateUserById(body.id, {
            ban_duration: "none",
          });
          if (error) return jsonError(error.message, 400);
          return Response.json({ ok: true });
        }

        // resetPassword
        const { error } = await supabaseAdmin.auth.admin.updateUserById(body.id, {
          password: DEFAULT_PASSWORD,
          app_metadata: { must_change_password: true },
        });
        if (error) return jsonError(error.message, 400);
        return Response.json({ ok: true });
      },
    },
  },
});
