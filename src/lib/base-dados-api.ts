import { supabase } from "@/lib/supabase";
import type { RawValue } from "@/lib/cadunico/aggregate";

const BUCKET = "excel-fontes";

export interface BaseFile {
  nome: string;
  caminho: string;
  tipo: "original" | "complemento";
  tamanho: number;
  atualizadoEm: string | null;
  url: string | null;
}

export interface Carga {
  id: string;
  arquivo: string;
  caminho: string;
  usuario_email: string;
  linhas: number;
  familias_novas: number;
  familias_substituidas: number;
  status: "processando" | "concluida" | "erro";
  erro: string | null;
  criado_em: string;
  concluido_em: string | null;
}

export interface BaseStatus {
  preparada: boolean;
  motivo: string | null;
  familias: number;
  arquivos: BaseFile[];
  cargas: Carga[];
}

export interface BatchResult {
  linhas: number;
  familiasNovas: number;
  familiasSubstituidas: number;
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

async function post<T>(body: Record<string, unknown>): Promise<T> {
  const response = await fetch("/api/base-dados", {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(body),
  });
  await parseErrorOrThrow(response);
  return response.json();
}

export async function getBaseStatus(): Promise<BaseStatus> {
  const response = await fetch("/api/base-dados", { headers: await authHeaders() });
  await parseErrorOrThrow(response);
  return response.json();
}

export interface UploadProgress {
  etapa: "arquivo" | "lotes";
  concluidos: number;
  total: number;
}

/**
 * Envia um complemento: guarda o arquivo original no Storage e aplica as linhas em lotes
 * (cada lote com famílias inteiras). Famílias já existentes são substituídas.
 */
export async function uploadComplement(
  file: File,
  batches: RawValue[][][],
  onProgress: (progress: UploadProgress) => void,
): Promise<BatchResult> {
  const { cargaId, caminho, token } = await post<{
    cargaId: string;
    caminho: string;
    token: string;
  }>({ action: "iniciar", arquivo: file.name });

  const totals: BatchResult = { linhas: 0, familiasNovas: 0, familiasSubstituidas: 0 };
  try {
    onProgress({ etapa: "arquivo", concluidos: 0, total: batches.length });
    const upload = await supabase.storage.from(BUCKET).uploadToSignedUrl(caminho, token, file, {
      contentType: file.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    if (upload.error) throw new Error(`Falha ao guardar o arquivo: ${upload.error.message}`);

    for (const [index, linhas] of batches.entries()) {
      onProgress({ etapa: "lotes", concluidos: index, total: batches.length });
      const result = await post<BatchResult>({ action: "lote", cargaId, linhas });
      totals.linhas += result.linhas;
      totals.familiasNovas += result.familiasNovas;
      totals.familiasSubstituidas += result.familiasSubstituidas;
    }
    onProgress({ etapa: "lotes", concluidos: batches.length, total: batches.length });

    await post({ action: "finalizar", cargaId, status: "concluida", ...totals });
    return totals;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha desconhecida.";
    await post({ action: "finalizar", cargaId, status: "erro", erro: message, ...totals }).catch(
      () => undefined,
    );
    throw new Error(message);
  }
}
