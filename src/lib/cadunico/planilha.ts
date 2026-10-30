/**
 * Leitura e geração de planilhas no navegador (aba Fontes de Dados).
 * Nada aqui sai do computador do usuário, exceto as linhas enviadas em lotes para a API.
 */
import * as XLSX from "xlsx";
import schema from "./schema.json";
import { COLUMN_COUNT, familyCodeOf, type Counter, type RawValue } from "./aggregate";

export interface ColumnInfo {
  index: number;
  letter: string;
  label: string;
  field: string | null;
  values: Record<string, string> | null;
  used: boolean;
  date: boolean;
  required: boolean;
}

export const COLUMNS: ColumnInfo[] = schema.columns.map((column) => ({
  index: column.index,
  letter: column.letter,
  label: column.label,
  field: column.field ?? null,
  values: (column.values as Record<string, string> | null) ?? null,
  used: column.used,
  date: column.date,
  required: column.required,
}));

export interface ColumnProblem {
  letter: string;
  expected: string;
  found: string | null;
}

export interface ParsedComplement {
  rows: RawValue[][];
  families: number;
  /** Colunas fora de ordem ou com nome diferente do esperado. */
  problems: ColumnProblem[];
  /** Linhas da planilha (numeração do Excel) sem Código familiar. */
  missingFamilyCode: number[];
  extraColumns: number;
  sheetName: string;
}

/** Minúsculas, sem acentos e só com letras e números. */
export function simplified(value: unknown) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[^\p{ASCII}]/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/** Compara cabeçalhos ignorando acentos, espaços e caracteres corrompidos na exportação. */
function headerMatches(found: unknown, column: (typeof schema.columns)[number]) {
  const value = simplified(found);
  if (value === simplified(column.label) || value === simplified(column.header)) return true;
  const skeleton = (text: string) => text.replace(/[aeiou]/g, "");
  return skeleton(value) === skeleton(simplified(column.label));
}

/** Mesmo formato do datetime.isoformat() do Python: AAAA-MM-DDTHH:MM:SS. */
function excelDateToIso(serial: number) {
  const date = XLSX.SSF.parse_date_code(serial);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.y}-${pad(date.m)}-${pad(date.d)}T${pad(date.H)}:${pad(date.M)}:${pad(date.S)}`;
}

function cellValue(cell: XLSX.CellObject | undefined): RawValue {
  if (!cell || cell.t === "z" || cell.t === "e") return null;
  if (cell.t === "n") {
    const value = cell.v as number;
    return cell.z && XLSX.SSF.is_date(cell.z) ? excelDateToIso(value) : value;
  }
  if (cell.t === "b") return cell.v ? 1 : 0;
  if (cell.t === "d") return (cell.v as Date).toISOString().slice(0, 19);
  const text = String(cell.v ?? "");
  return text.trim() === "" ? null : text;
}

export async function readComplement(file: File): Promise<ParsedComplement> {
  const workbook = XLSX.read(await file.arrayBuffer(), {
    type: "array",
    cellDates: false,
    cellNF: true,
    cellText: false,
  });
  const sheetName = workbook.SheetNames.includes(schema.sheetName)
    ? schema.sheetName
    : workbook.SheetNames[0];
  const sheet = sheetName ? workbook.Sheets[sheetName] : undefined;
  if (!sheetName || !sheet?.["!ref"]) throw new Error("A planilha está vazia.");

  const range = XLSX.utils.decode_range(sheet["!ref"]);
  const at = (row: number, column: number) =>
    sheet[XLSX.utils.encode_cell({ r: row, c: column })] as XLSX.CellObject | undefined;

  const problems: ColumnProblem[] = [];
  for (const column of schema.columns) {
    const found = at(range.s.r, column.index)?.v;
    if (!headerMatches(found, column)) {
      problems.push({
        letter: column.letter,
        expected: column.label,
        found: found === undefined || found === null || found === "" ? null : String(found),
      });
    }
  }

  const rows: RawValue[][] = [];
  const missingFamilyCode: number[] = [];
  const families = new Set<string>();
  for (let rowIndex = range.s.r + 1; rowIndex <= range.e.r; rowIndex++) {
    const values: RawValue[] = [];
    for (let column = 0; column < COLUMN_COUNT; column++)
      values.push(cellValue(at(rowIndex, column)));
    if (values.every((value) => value === null)) continue;
    if (values[1] === null) {
      missingFamilyCode.push(rowIndex + 1);
      continue;
    }
    rows.push(values);
    families.add(familyCodeOf(values));
  }

  return {
    rows,
    families: families.size,
    problems,
    missingFamilyCode,
    extraColumns: Math.max(0, range.e.c + 1 - COLUMN_COUNT),
    sheetName,
  };
}

/** Divide as linhas em lotes sem separar membros da mesma família. */
export function batchesByFamily(rows: RawValue[][], maxRows = 500): RawValue[][][] {
  const byFamily = new Map<string, RawValue[][]>();
  for (const row of rows) {
    const code = familyCodeOf(row);
    const members = byFamily.get(code);
    if (members) members.push(row);
    else byFamily.set(code, [row]);
  }
  const batches: RawValue[][][] = [];
  let current: RawValue[][] = [];
  for (const members of byFamily.values()) {
    if (current.length && current.length + members.length > maxRows) {
      batches.push(current);
      current = [];
    }
    current.push(...members);
  }
  if (current.length) batches.push(current);
  return batches;
}

const SCALAR_LABELS: Array<[string, string]> = [
  ["persons", "Pessoas"],
  ["families", "Famílias"],
  ["familyPbf", "Famílias com PBF"],
  ["personPbf", "Pessoas com PBF"],
  ["incomeCount", "Famílias com renda informada"],
  ["incomeTotal", "Soma da renda total das famílias (R$)"],
  ["incomePerCapita", "Soma da renda per capita (R$)"],
  ["updated24", "Famílias atualizadas há até 24 meses"],
  ["risk", "Famílias em risco social"],
  ["foodRisk", "Famílias em risco de insegurança alimentar"],
  ["indigenous", "Famílias indígenas"],
  ["quilombola", "Famílias quilombolas"],
  ["pcd", "Pessoas com deficiência"],
  ["childLabor", "Pessoas com marcação de trabalho infantil"],
  ["children", "Pessoas de 0 a 17 anos"],
  ["street", "Pessoas em situação de rua"],
];

const COUNTER_LABELS: Array<[string, string]> = [
  ["gender", "Sexo"],
  ["age", "Faixa etária"],
  ["race", "Cor ou raça"],
  ["relationship", "Parentesco com o responsável familiar"],
  ["familyStatus", "Estado cadastral da família"],
  ["householdSize", "Pessoas no domicílio"],
  ["updateMonths", "Meses desde a última atualização cadastral"],
  ["housingType", "Espécie do domicílio"],
  ["rooms", "Cômodos do domicílio"],
  ["sanitation", "Saneamento e serviços do domicílio"],
  ["groups", "Grupos tradicionais e específicos"],
  ["disabilities", "Tipo de deficiência"],
  ["school", "Frequenta escola"],
  ["education", "Grau de instrução"],
  ["work", "Trabalhou na semana passada"],
  ["occupation", "Função principal"],
  ["streetTime", "Tempo em situação de rua"],
  ["streetSleep", "Onde dorme (situação de rua)"],
  ["services", "Atendimentos (situação de rua)"],
  ["expenses", "Famílias com despesa informada"],
];

type CubeRow = Record<string, unknown> & {
  filters: Record<string, string>;
  latestUpdate?: string | null;
};

function filterColumns(row: CubeRow) {
  return {
    Zona: row.filters["zona"],
    Localidade: row.filters["localidade"],
    "CRAS/CREAS": row.filters["equipamento"],
    "Faixa de renda per capita": row.filters["faixaRenda"],
    "Recebe PBF (família)": row.filters["pbf"],
  };
}

/** Planilha com o cubo agregado: totais por combinação de filtros e distribuições. */
export function downloadAggregatedWorkbook(cube: CubeRow[]) {
  const sorted = [...cube].sort((a, b) =>
    Object.values(filterColumns(a))
      .join("|")
      .localeCompare(Object.values(filterColumns(b)).join("|"), "pt-BR"),
  );

  const summary = sorted.map((row) => {
    const result: Record<string, unknown> = filterColumns(row);
    for (const [key, label] of SCALAR_LABELS) result[label] = Number(row[key] ?? 0);
    const incomeCount = Number(row["incomeCount"] ?? 0);
    result["Renda per capita média (R$)"] = incomeCount
      ? Number(row["incomePerCapita"] ?? 0) / incomeCount
      : 0;
    result["Última atualização cadastral"] = row.latestUpdate ?? "";
    return result;
  });

  const distributions: Record<string, unknown>[] = [];
  for (const row of sorted) {
    for (const [key, label] of COUNTER_LABELS) {
      for (const [category, value] of Object.entries((row[key] as Counter) ?? {})) {
        distributions.push({
          ...filterColumns(row),
          Indicador: label,
          Categoria: category,
          Quantidade: value,
        });
      }
    }
  }

  const readme = [
    ["Base agregada do Cadastro Único — Natal/RN"],
    [`Gerada em ${new Date().toLocaleString("pt-BR")}`],
    [],
    [
      "Esta planilha não contém dados pessoais: cada linha soma as famílias e pessoas de uma combinação de filtros.",
    ],
    ["Aba Resumo: totais por zona, localidade, CRAS/CREAS, faixa de renda e PBF."],
    [
      "Aba Distribuicoes: contagens por categoria (sexo, faixa etária, escolaridade etc.) na mesma combinação de filtros.",
    ],
    [
      "Indicadores de família (renda, domicílio, saneamento, despesas) contam famílias; os demais contam pessoas.",
    ],
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(readme), "Leia-me");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summary), "Resumo");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(distributions), "Distribuicoes");
  const today = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `base-agregada-cadunico-natal-${today}.xlsx`, { compression: true });
}
