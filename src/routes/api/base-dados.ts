import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getAdminClient, requireFontesDadosUser } from "@/lib/supabase-admin";
import {
  COLUMN_COUNT,
  CUBE_SOURCE,
  buildFamilies,
  compactStats,
  emptyStats,
  mergeStats,
  type CubeFilters,
  type Stats,
} from "@/lib/cadunico/aggregate";

const BUCKET = "excel-fontes";
const COMPLEMENT_FOLDER = "complementos";
const SIGNED_URL_SECONDS = 60 * 60;
const MAX_ROWS_PER_BATCH = 2000;
const NOT_INFORMED = "Nao informado";

const cellValue = z.union([z.string(), z.number(), z.null()]);

const bodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("iniciar"),
    arquivo: z.string().trim().min(1).max(200),
  }),
  z.object({
    action: z.literal("lote"),
    cargaId: z.string().uuid(),
    linhas: z.array(z.array(cellValue).max(COLUMN_COUNT)).min(1).max(MAX_ROWS_PER_BATCH),
  }),
  z.object({
    action: z.literal("finalizar"),
    cargaId: z.string().uuid(),
    status: z.enum(["concluida", "erro"]),
    linhas: z.number().int().min(0),
    familiasNovas: z.number().int().min(0),
    familiasSubstituidas: z.number().int().min(0),
    erro: z.string().max(1000).optional(),
  }),
]);

interface ExistingFamily {
  codigo_familiar: string;
  cell_key: string;
  stats: Partial<Stats>;
}

type CubeCell = Stats & { filters: CubeFilters; latestUpdate?: string | null };

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

/** A base só aceita complementos depois de rodar build-dashboard-cube.py na versão por família. */
async function checkReady(admin: ReturnType<typeof getAdminClient>) {
  const families = await admin
    .from("cadunico_familias")
    .select("codigo_familiar", { count: "exact", head: true });
  if (families.error) {
    return {
      ready: false,
      familias: 0,
      motivo: "Tabela cadunico_familias não encontrada. Rode supabase/base-dados.sql.",
    };
  }
  const legacy = await admin
    .from("excel_rows")
    .select("id", { count: "exact", head: true })
    .eq("source_file", CUBE_SOURCE)
    .eq("sheet_name", "filters");
  const familias = families.count ?? 0;
  if (!familias || (legacy.count ?? 0) > 0) {
    return {
      ready: false,
      familias,
      motivo:
        "A base ainda não foi preparada para receber complementos. Rode scripts/build-dashboard-cube.py.",
    };
  }
  return { ready: true, familias, motivo: null };
}

function safeFileName(name: string) {
  const cleaned = name
    .normalize("NFKD")
    .replace(/[^\p{ASCII}]/gu, "")
    .replace(/[^A-Za-z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return cleaned || "complemento.xlsx";
}

async function listFiles(admin: ReturnType<typeof getAdminClient>) {
  const storage = admin.storage.from(BUCKET);
  const [root, complements] = await Promise.all([
    storage.list("", { limit: 100, sortBy: { column: "name", order: "asc" } }),
    storage.list(COMPLEMENT_FOLDER, {
      limit: 1000,
      sortBy: { column: "created_at", order: "desc" },
    }),
  ]);
  const files = [
    ...(root.data ?? [])
      .filter((file) => file.id && /\.xlsx?$/i.test(file.name))
      .map((file) => ({ ...file, path: file.name, tipo: "original" as const })),
    ...(complements.data ?? [])
      .filter((file) => file.id)
      .map((file) => ({
        ...file,
        path: `${COMPLEMENT_FOLDER}/${file.name}`,
        tipo: "complemento" as const,
      })),
  ];
  if (!files.length) return [];

  const signed = await storage.createSignedUrls(
    files.map((file) => file.path),
    SIGNED_URL_SECONDS,
    { download: true },
  );
  const urls = new Map((signed.data ?? []).map((item) => [item.path, item.signedUrl]));
  return files.map((file) => ({
    nome: file.name,
    caminho: file.path,
    tipo: file.tipo,
    tamanho: Number(file.metadata?.["size"] ?? 0),
    atualizadoEm: file.updated_at ?? file.created_at ?? null,
    url: urls.get(file.path) ?? null,
  }));
}

async function processBatch(
  admin: ReturnType<typeof getAdminClient>,
  cargaId: string,
  rows: z.infer<typeof cellValue>[][],
) {
  const families = buildFamilies(rows);
  if (families.some((family) => family.codigoFamiliar === NOT_INFORMED)) {
    throw new Response(null, { status: 400, statusText: "Há linhas sem Código familiar." });
  }

  const existing = new Map<string, ExistingFamily>();
  const codes = families.map((family) => family.codigoFamiliar);
  for (let offset = 0; offset < codes.length; offset += 200) {
    const { data, error } = await admin
      .from("cadunico_familias")
      .select("codigo_familiar, cell_key, stats")
      .in("codigo_familiar", codes.slice(offset, offset + 200));
    if (error) throw new Error(error.message);
    for (const family of data as ExistingFamily[]) existing.set(family.codigo_familiar, family);
  }

  const keys = new Set<string>();
  for (const family of families) {
    keys.add(family.cellKey);
    const previous = existing.get(family.codigoFamiliar);
    if (previous) keys.add(previous.cell_key);
  }
  const { data: cellRows, error: cellsError } = await admin.rpc("obter_celulas_cubo", {
    p_keys: [...keys],
  });
  if (cellsError) throw new Error(cellsError.message);

  const cells = new Map<string, CubeCell>();
  for (const row of (cellRows ?? []) as Array<{ cell_key: string; data: Partial<CubeCell> }>) {
    cells.set(row.cell_key, Object.assign(emptyStats(), row.data) as CubeCell);
  }
  const cellFor = (key: string, filters?: CubeFilters) => {
    let cell = cells.get(key);
    if (!cell) {
      const [zona, localidade, equipamento, faixaRenda, pbf] = JSON.parse(key) as string[];
      cell = Object.assign(emptyStats(), {
        filters: filters ?? { zona, localidade, equipamento, faixaRenda, pbf },
      }) as CubeCell;
      cells.set(key, cell);
    }
    return cell;
  };

  for (const family of families) {
    const previous = existing.get(family.codigoFamiliar);
    if (previous) mergeStats(cellFor(previous.cell_key), previous.stats, -1);
    mergeStats(cellFor(family.cellKey, family.filters), family.stats, 1);
  }

  const { error } = await admin.rpc("aplicar_carga_cadunico", {
    p_familias: families.map((family) => ({
      codigo_familiar: family.codigoFamiliar,
      cell_key: family.cellKey,
      latest_update: family.latestUpdate,
      stats: compactStats(family.stats),
      carga_id: cargaId,
    })),
    p_celulas: [...cells.entries()].map(([key, cell]) => {
      const { latestUpdate: _latestUpdate, ...data } = cell;
      return { cell_key: key, data: cell.persons > 0 || cell.families > 0 ? data : null };
    }),
  });
  if (error) throw new Error(error.message);

  const replaced = families.filter((family) => existing.has(family.codigoFamiliar)).length;
  return {
    linhas: rows.length,
    familiasNovas: families.length - replaced,
    familiasSubstituidas: replaced,
  };
}

export const Route = createFileRoute("/api/base-dados")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const user = await requireFontesDadosUser(request);
        if (!user) return jsonError("Acesso negado.", 403);

        try {
          const admin = getAdminClient();
          const [status, arquivos, cargas] = await Promise.all([
            checkReady(admin),
            listFiles(admin),
            admin
              .from("cadunico_cargas")
              .select(
                "id, arquivo, caminho, usuario_email, linhas, familias_novas, familias_substituidas, status, erro, criado_em, concluido_em",
              )
              .order("criado_em", { ascending: false })
              .limit(20),
          ]);
          return Response.json({
            preparada: status.ready,
            motivo: status.motivo,
            familias: status.familias,
            arquivos,
            cargas: cargas.data ?? [],
          });
        } catch (error) {
          return jsonError(
            error instanceof Error ? error.message : "Falha ao consultar a base.",
            502,
          );
        }
      },

      POST: async ({ request }) => {
        const user = await requireFontesDadosUser(request);
        if (!user) return jsonError("Acesso negado.", 403);

        const parsed = bodySchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return jsonError("Requisição inválida.", 400);
        const body = parsed.data;
        const admin = getAdminClient();

        try {
          if (body.action === "iniciar") {
            const status = await checkReady(admin);
            if (!status.ready) return jsonError(status.motivo ?? "Base indisponível.", 409);

            const stamp = new Date().toISOString().replace(/[:.]/g, "-");
            const caminho = `${COMPLEMENT_FOLDER}/${stamp}_${safeFileName(body.arquivo)}`;
            const upload = await admin.storage.from(BUCKET).createSignedUploadUrl(caminho);
            if (upload.error) return jsonError(upload.error.message, 502);

            const { data, error } = await admin
              .from("cadunico_cargas")
              .insert({ arquivo: body.arquivo, caminho, usuario_email: user.email ?? "" })
              .select("id")
              .single();
            if (error) return jsonError(error.message, 502);
            return Response.json({ cargaId: data.id, caminho, token: upload.data.token });
          }

          const { data: carga, error: cargaError } = await admin
            .from("cadunico_cargas")
            .select("status")
            .eq("id", body.cargaId)
            .maybeSingle();
          if (cargaError) return jsonError(cargaError.message, 502);
          if (!carga) return jsonError("Atualização não encontrada.", 404);
          if (carga.status !== "processando") {
            return jsonError("Esta atualização já foi encerrada.", 409);
          }

          if (body.action === "lote") {
            return Response.json(await processBatch(admin, body.cargaId, body.linhas));
          }

          const { error } = await admin
            .from("cadunico_cargas")
            .update({
              status: body.status,
              linhas: body.linhas,
              familias_novas: body.familiasNovas,
              familias_substituidas: body.familiasSubstituidas,
              erro: body.erro ?? null,
              concluido_em: new Date().toISOString(),
            })
            .eq("id", body.cargaId);
          if (error) return jsonError(error.message, 502);
          return Response.json({ ok: true });
        } catch (error) {
          if (error instanceof Response) return jsonError(error.statusText, error.status);
          return jsonError(
            error instanceof Error ? error.message : "Falha ao atualizar a base.",
            502,
          );
        }
      },
    },
  },
});
