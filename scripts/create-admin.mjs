import process from "node:process";
import { createClient } from "@supabase/supabase-js";

const DEFAULT_PASSWORD = "123456";

const [, , emailArg, roleArg] = process.argv;
const email = emailArg?.trim().toLowerCase();
const role = roleArg === "usuario" ? "usuario" : "admin";

if (!email) {
  console.error("Uso: npm run bootstrap:admin -- <email> [admin|usuario]");
  process.exit(1);
}

const projectUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!projectUrl || !serviceRoleKey) {
  console.error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente (.env).");
  process.exit(1);
}

const supabase = createClient(projectUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data, error } = await supabase.auth.admin.createUser({
  email,
  password: DEFAULT_PASSWORD,
  email_confirm: true,
  app_metadata: { role, must_change_password: true },
});

if (error) {
  console.error(`Falha ao criar usuário: ${error.message}`);
  process.exit(1);
}

console.log(`Usuário criado: ${data.user.email} (${role})`);
console.log(`Senha inicial: ${DEFAULT_PASSWORD}`);
