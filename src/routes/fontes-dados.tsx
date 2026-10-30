import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type ChangeEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Download,
  FileSpreadsheet,
  History,
  Loader2,
  Rows3,
  ShieldAlert,
  Upload,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";

import { SectionTitle } from "@/components/dashboard/SectionTitle";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/lib/auth-context";
import { canAccessFontesDados } from "@/lib/access";
import { useDashboardData } from "@/lib/dashboard-data";
import {
  getBaseStatus,
  uploadComplement,
  type BatchResult,
  type UploadProgress,
} from "@/lib/base-dados-api";
import {
  COLUMNS,
  TEMPLATE_URL,
  batchesByFamily,
  downloadAggregatedWorkbook,
  readComplement,
  simplified,
  type ParsedComplement,
} from "@/lib/cadunico/planilha";
import { formatDate, formatValue } from "@/utils/format";

export const Route = createFileRoute("/fontes-dados")({
  head: () => ({
    meta: [
      { title: "Fontes de Dados - Cadastro Unico de Natal/RN" },
      {
        name: "description",
        content: "Download e atualização da base do Cadastro Único usada pelo observatório.",
      },
    ],
  }),
  component: FontesDadosPage,
});

function FontesDadosPage() {
  const { user } = useAuth();

  if (!canAccessFontesDados(user?.email)) {
    return (
      <div className="panel flex flex-col items-center gap-3 p-10 text-center">
        <ShieldAlert className="size-8 text-muted-foreground" aria-hidden />
        <h1 className="text-lg font-semibold text-foreground">Acesso restrito</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Esta área é exclusiva para um usuário específico do observatório.
        </p>
      </div>
    );
  }

  return <FontesDadosContent />;
}

function formatBytes(bytes: number) {
  if (!bytes) return "—";
  if (bytes < 1024 * 1024) return `${formatValue(bytes / 1024)} KB`;
  return `${formatValue(bytes / (1024 * 1024), "decimal")} MB`;
}

function FontesDadosContent() {
  const { data, loading } = useDashboardData();
  const status = useQuery({ queryKey: ["base-dados"], queryFn: getBaseStatus });
  const people = data.visaoGeralCards.find((card) => card.id === "pessoas")?.value ?? 0;
  const completed = status.data?.cargas.filter((carga) => carga.status === "concluida") ?? [];

  const items = [
    {
      label: "Pessoas na base",
      value: loading ? "Carregando..." : formatValue(people),
      detail: "Soma de todas as combinações de filtros",
      icon: UsersRound,
    },
    {
      label: "Famílias na base",
      value: status.isLoading ? "Carregando..." : formatValue(status.data?.familias ?? 0),
      detail: "Famílias com contribuição registrada",
      icon: Rows3,
    },
    {
      label: "Última atualização cadastral",
      value: loading ? "Carregando..." : formatDate(data.ultimaAtualizacao),
      detail: "Data mais recente informada pelas famílias",
      icon: Database,
    },
    {
      label: "Complementos enviados",
      value: status.isLoading ? "Carregando..." : formatValue(completed.length),
      detail: completed[0] ? `Último em ${formatDate(completed[0].criado_em)}` : "Nenhum até agora",
      icon: History,
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      <SectionTitle
        title="Base de dados"
        description="Baixe a base do Cadastro Único em Excel ou envie uma planilha para complementá-la."
      />
      {status.error ? (
        <p className="text-sm text-destructive">{(status.error as Error).message}</p>
      ) : null}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map(({ label, value, detail, icon: Icon }) => (
          <article key={label} className="panel p-5">
            <Icon className="mb-4 size-5 text-primary" aria-hidden />
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            <p className="mt-1 text-xl font-semibold text-foreground">{value}</p>
            <p className="mt-2 text-xs text-muted-foreground">{detail}</p>
          </article>
        ))}
      </section>

      <DownloadSection />
      <UploadSection ready={status.data?.preparada ?? false} reason={status.data?.motivo ?? null} />
      <ColumnsSection />
      <HistorySection />
    </div>
  );
}

function DownloadSection() {
  const status = useQuery({ queryKey: ["base-dados"], queryFn: getBaseStatus });
  const [downloading, setDownloading] = useState(false);
  const files = status.data?.arquivos ?? [];

  async function downloadAggregated() {
    setDownloading(true);
    try {
      const response = await fetch("/api/dashboard-cube");
      if (!response.ok) throw new Error("Não foi possível carregar a base agregada.");
      downloadAggregatedWorkbook(await response.json());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao gerar a planilha.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <SectionTitle
        title="Baixar a base"
        description="Escolha entre a base agregada (sem dados pessoais) e os arquivos completos por pessoa."
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <article className="panel flex flex-col gap-4 p-5">
          <div className="flex items-start gap-3">
            <FileSpreadsheet className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
            <div>
              <h3 className="text-sm font-semibold text-foreground">Base agregada</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Totais de pessoas e famílias por zona, localidade, CRAS/CREAS, faixa de renda e PBF,
                com as distribuições usadas nos gráficos. Não contém dados pessoais.
              </p>
            </div>
          </div>
          <Button className="self-start" onClick={downloadAggregated} disabled={downloading}>
            {downloading ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Download className="size-4" aria-hidden />
            )}
            Baixar base agregada (.xlsx)
          </Button>
        </article>

        <article className="panel flex flex-col gap-4 p-5">
          <div className="flex items-start gap-3">
            <Database className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
            <div>
              <h3 className="text-sm font-semibold text-foreground">Base completa por pessoa</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Planilha original e complementos enviados, uma linha por pessoa. Contém dados
                pessoais protegidos pela LGPD: não compartilhe fora da equipe autorizada.
              </p>
            </div>
          </div>
          {status.isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando arquivos...</p>
          ) : files.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum arquivo encontrado no Storage. A planilha original é enviada pelo script{" "}
              <code>scripts/import-supabase.mjs</code>.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {files.map((file) => (
                <li key={file.caminho} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{file.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {file.tipo === "original" ? "Base original" : "Complemento"} ·{" "}
                      {formatBytes(file.tamanho)}
                      {file.atualizadoEm ? ` · ${formatDate(file.atualizadoEm)}` : ""}
                    </p>
                  </div>
                  {file.url ? (
                    <Button variant="outline" size="sm" asChild>
                      <a href={file.url} download={file.nome}>
                        <Download className="size-4" aria-hidden />
                        Baixar
                      </a>
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </article>
      </div>
    </section>
  );
}

function UploadSection({ ready, reason }: { ready: boolean; reason: string | null }) {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ParsedComplement | null>(null);
  const [reading, setReading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [result, setResult] = useState<BatchResult | null>(null);

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    setFile(selected);
    setParsed(null);
    setResult(null);
    if (!selected) return;
    setReading(true);
    try {
      setParsed(await readComplement(selected));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível ler a planilha.");
    } finally {
      setReading(false);
    }
  }

  const upload = useMutation({
    mutationFn: () => uploadComplement(file!, batchesByFamily(parsed!.rows), setProgress),
    onSuccess: (totals) => {
      setResult(totals);
      toast.success("Base atualizada.");
      queryClient.invalidateQueries({ queryKey: ["dashboard-cube"] });
      queryClient.invalidateQueries({ queryKey: ["base-dados"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
      queryClient.invalidateQueries({ queryKey: ["base-dados"] });
    },
    onSettled: () => setProgress(null),
  });

  const valid =
    parsed !== null &&
    parsed.problems.length === 0 &&
    parsed.missingFamilyCode.length === 0 &&
    parsed.rows.length > 0;
  const percent = progress?.total ? Math.round((progress.concluidos / progress.total) * 100) : 0;

  return (
    <section className="flex flex-col gap-4">
      <SectionTitle
        title="Atualizar dados"
        description="Envie uma planilha no layout do Cadastro Único para complementar a base."
      />

      {!ready && reason ? (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" aria-hidden />
          <AlertTitle>Envio indisponível</AlertTitle>
          <AlertDescription>{reason}</AlertDescription>
        </Alert>
      ) : null}

      <div className="panel flex flex-col gap-6 p-5">
        <ol className="grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
          <li className="rounded-lg border border-border bg-muted/40 p-4">
            <p className="font-semibold text-foreground">1. Baixe o modelo</p>
            <p className="mt-1 text-muted-foreground">
              Aba <strong>tudo</strong> com as 169 colunas na ordem certa, aba{" "}
              <strong>Colunas</strong> com os códigos aceitos e duas linhas fictícias de exemplo.
            </p>
            <Button variant="outline" size="sm" className="mt-3" asChild>
              <a href={TEMPLATE_URL} download>
                <Download className="size-4" aria-hidden />
                Baixar modelo (.xlsx)
              </a>
            </Button>
          </li>
          <li className="rounded-lg border border-border bg-muted/40 p-4">
            <p className="font-semibold text-foreground">2. Preencha uma linha por pessoa</p>
            <p className="mt-1 text-muted-foreground">
              Apague as linhas de exemplo. Use os códigos numéricos do Cadastro Único, como na
              exportação oficial. <strong>Código familiar</strong> (coluna B) é obrigatório.
            </p>
          </li>
          <li className="rounded-lg border border-border bg-muted/40 p-4">
            <p className="font-semibold text-foreground">3. Envie a família completa</p>
            <p className="mt-1 text-muted-foreground">
              Se o Código familiar já existir na base, a família inteira é{" "}
              <strong>substituída</strong> pelos membros enviados. Inclua todos os membros.
            </p>
          </li>
        </ol>

        <div className="flex flex-col gap-3">
          <label htmlFor="complemento" className="text-sm font-medium text-foreground">
            Planilha de complemento (.xlsx)
          </label>
          <Input
            id="complemento"
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFile}
            disabled={upload.isPending}
            className="max-w-md"
          />
          {reading ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden /> Lendo e validando a
              planilha...
            </p>
          ) : null}
        </div>

        {parsed ? <ValidationReport parsed={parsed} /> : null}

        {progress ? (
          <div className="flex flex-col gap-2">
            <Progress value={percent} />
            <p className="text-xs text-muted-foreground">
              {progress.etapa === "arquivo"
                ? "Guardando o arquivo..."
                : `Aplicando lote ${Math.min(progress.concluidos + 1, progress.total)} de ${progress.total}...`}
            </p>
          </div>
        ) : null}

        {result ? (
          <Alert>
            <CheckCircle2 className="size-4" aria-hidden />
            <AlertTitle>Base atualizada</AlertTitle>
            <AlertDescription>
              {formatValue(result.linhas)} pessoas aplicadas: {formatValue(result.familiasNovas)}{" "}
              famílias novas e {formatValue(result.familiasSubstituidas)} famílias substituídas. Os
              gráficos podem levar até 15 minutos para refletir a mudança.
            </AlertDescription>
          </Alert>
        ) : null}

        <Button
          className="self-start"
          onClick={() => upload.mutate()}
          disabled={!ready || !valid || upload.isPending}
        >
          {upload.isPending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Upload className="size-4" aria-hidden />
          )}
          Enviar e atualizar a base
        </Button>
      </div>
    </section>
  );
}

function ValidationReport({ parsed }: { parsed: ParsedComplement }) {
  const ok = parsed.problems.length === 0 && parsed.missingFamilyCode.length === 0;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2 text-sm">
        <Badge variant="secondary">Aba lida: {parsed.sheetName}</Badge>
        <Badge variant="secondary">{formatValue(parsed.rows.length)} pessoas</Badge>
        <Badge variant="secondary">{formatValue(parsed.families)} famílias</Badge>
        {ok ? (
          <Badge className="gap-1">
            <CheckCircle2 className="size-3" aria-hidden /> Colunas corretas
          </Badge>
        ) : null}
      </div>

      {parsed.extraColumns > 0 ? (
        <p className="text-xs text-muted-foreground">
          {parsed.extraColumns} coluna(s) após a coluna FM serão ignoradas.
        </p>
      ) : null}

      {parsed.problems.length > 0 ? (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" aria-hidden />
          <AlertTitle>{parsed.problems.length} coluna(s) fora do layout esperado</AlertTitle>
          <AlertDescription>
            <p className="mb-2">
              Os cabeçalhos precisam estar na mesma ordem do modelo. Corrija e selecione o arquivo
              de novo.
            </p>
            <ul className="flex flex-col gap-1 text-xs">
              {parsed.problems.slice(0, 12).map((problem) => (
                <li key={problem.letter}>
                  <strong>Coluna {problem.letter}:</strong> esperado “{problem.expected}”,
                  encontrado {problem.found ? `“${problem.found}”` : "vazio"}
                </li>
              ))}
              {parsed.problems.length > 12 ? (
                <li>e mais {parsed.problems.length - 12} coluna(s).</li>
              ) : null}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}

      {parsed.missingFamilyCode.length > 0 ? (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" aria-hidden />
          <AlertTitle>Linhas sem Código familiar</AlertTitle>
          <AlertDescription>
            Preencha a coluna B nas linhas {parsed.missingFamilyCode.slice(0, 20).join(", ")}
            {parsed.missingFamilyCode.length > 20
              ? ` e mais ${parsed.missingFamilyCode.length - 20}`
              : ""}
            .
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}

function ColumnsSection() {
  const [search, setSearch] = useState("");
  const [onlyUsed, setOnlyUsed] = useState(false);
  const columns = useMemo(() => {
    const term = simplified(search);
    return COLUMNS.filter((column) => {
      if (onlyUsed && !column.used) return false;
      if (!term) return true;
      return simplified(`${column.letter} ${column.label} ${column.field ?? ""}`).includes(term);
    });
  }, [search, onlyUsed]);

  return (
    <section className="flex flex-col gap-4">
      <SectionTitle
        title="Colunas esperadas"
        description="Ordem, nome e valores aceitos de cada coluna da planilha (A até FM)."
      />
      <div className="panel flex flex-col gap-4 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            placeholder="Buscar por coluna, nome ou campo (ex.: renda, BJ, cod_sexo)"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="sm:max-w-sm"
          />
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={onlyUsed}
              onChange={(event) => setOnlyUsed(event.target.checked)}
              className="size-4 accent-primary"
            />
            Só colunas usadas nos indicadores
          </label>
          <span className="text-xs text-muted-foreground sm:ml-auto">
            {columns.length} de {COLUMNS.length} colunas
          </span>
        </div>
        <div className="max-h-[520px] overflow-auto rounded-lg border border-border">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-muted">
              <TableRow>
                <TableHead className="w-16">Coluna</TableHead>
                <TableHead>Cabeçalho</TableHead>
                <TableHead>Campo CadÚnico</TableHead>
                <TableHead>Valores aceitos</TableHead>
                <TableHead className="w-44">Uso</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {columns.map((column) => (
                <TableRow key={column.index}>
                  <TableCell className="font-mono text-xs font-semibold">{column.letter}</TableCell>
                  <TableCell className="text-sm">{column.label}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {column.field ?? "—"}
                  </TableCell>
                  <TableCell className="max-w-md text-xs text-muted-foreground">
                    {column.values
                      ? Object.entries(column.values)
                          .map(([valueCode, label]) => `${valueCode} = ${label}`)
                          .join(" · ")
                      : column.date
                        ? "Data (dd/mm/aaaa)"
                        : "Texto ou número livre"}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {column.required ? <Badge variant="destructive">Obrigatória</Badge> : null}
                      {column.used ? <Badge variant="secondary">Indicadores</Badge> : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </section>
  );
}

function HistorySection() {
  const status = useQuery({ queryKey: ["base-dados"], queryFn: getBaseStatus });
  const cargas = status.data?.cargas ?? [];
  const statusLabel = {
    processando: "Processando",
    concluida: "Concluída",
    erro: "Erro",
  } as const;

  return (
    <section className="flex flex-col gap-4">
      <SectionTitle
        title="Histórico de atualizações"
        description="Últimos 20 complementos enviados por esta aba."
      />
      <div className="panel overflow-x-auto p-5">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/60">
              <TableHead>Data</TableHead>
              <TableHead>Arquivo</TableHead>
              <TableHead>Enviado por</TableHead>
              <TableHead className="text-right">Pessoas</TableHead>
              <TableHead className="text-right">Famílias novas</TableHead>
              <TableHead className="text-right">Substituídas</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cargas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                  {status.isLoading ? "Carregando..." : "Nenhum complemento enviado ainda."}
                </TableCell>
              </TableRow>
            ) : (
              cargas.map((carga) => (
                <TableRow key={carga.id}>
                  <TableCell className="whitespace-nowrap">{formatDate(carga.criado_em)}</TableCell>
                  <TableCell className="max-w-xs truncate" title={carga.arquivo}>
                    {carga.arquivo}
                  </TableCell>
                  <TableCell>{carga.usuario_email}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatValue(carga.linhas)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatValue(carga.familias_novas)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatValue(carga.familias_substituidas)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={carga.status === "erro" ? "destructive" : "secondary"}
                      title={carga.erro ?? undefined}
                    >
                      {statusLabel[carga.status]}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
