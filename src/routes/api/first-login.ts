import { createFileRoute } from "@tanstack/react-router";
import { getAdminClient, getUserFromRequest } from "@/lib/supabase-admin";

/**
 * Chamado pelo próprio usuário logo após trocar a senha padrão (123456).
 * Só limpa a flag da conta do chamador — não recebe id, não precisa ser admin.
 */
export const Route = createFileRoute("/api/first-login")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const user = await getUserFromRequest(request);
        if (!user) return Response.json({ error: "Acesso negado." }, { status: 403 });

        const { error } = await getAdminClient().auth.admin.updateUserById(user.id, {
          app_metadata: { must_change_password: false },
        });
        if (error) return Response.json({ error: error.message }, { status: 400 });

        return Response.json({ ok: true });
      },
    },
  },
});
