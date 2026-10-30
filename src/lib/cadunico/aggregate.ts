/**
 * Agregação da base do Cadastro Único por família.
 *
 * Porte fiel de scripts/build-dashboard-cube.py: cada família gera uma "contribuição"
 * (FamilyStats) e cada célula do cubo (combinação de filtros) é a soma das contribuições
 * das suas famílias. Assim, substituir uma família é subtrair a contribuição antiga e
 * somar a nova. Qualquer mudança aqui precisa ser replicada no script Python.
 */
import schema from "./schema.json";

export type RawValue = string | number | null;
export type Counter = Record<string, number>;

export const CUBE_SOURCE = "dashboard_cube_v4";
export const COLUMN_COUNT = 169;
export const FAMILY_CODE_COLUMN = 1;

export interface CubeFilters {
  zona: string;
  localidade: string;
  equipamento: string;
  faixaRenda: string;
  pbf: string;
}

const SCALAR_KEYS = [
  "persons",
  "families",
  "familyPbf",
  "incomeTotal",
  "incomePerCapita",
  "incomeCount",
  "updated24",
  "risk",
  "foodRisk",
  "indigenous",
  "quilombola",
  "personPbf",
  "pcd",
  "childLabor",
  "children",
  "street",
] as const;

const COUNTER_KEYS = [
  "gender",
  "age",
  "race",
  "relationship",
  "familyStatus",
  "householdSize",
  "updateMonths",
  "housingType",
  "rooms",
  "sanitation",
  "groups",
  "disabilities",
  "school",
  "education",
  "work",
  "occupation",
  "streetTime",
  "streetSleep",
  "services",
  "expenses",
] as const;

type ScalarKey = (typeof SCALAR_KEYS)[number];
type CounterKey = (typeof COUNTER_KEYS)[number];

export type Stats = Record<ScalarKey, number> &
  Record<CounterKey, Counter> & { expenseAmounts: Record<string, Counter> };

export interface FamilyStats {
  codigoFamiliar: string;
  filters: CubeFilters;
  cellKey: string;
  latestUpdate: string | null;
  stats: Stats;
}

const decoders: Record<number, Record<string, string>> = Object.fromEntries(
  schema.columns
    .filter((column) => column.values)
    .map((column) => [column.index, column.values as Record<string, string>]),
);

const OFFICIAL_NEIGHBORHOODS: Record<string, string> = {
  ALECRIM: "Alecrim",
  "AREIA PRETA": "Areia Preta",
  "BARRO VERMELHO": "Barro Vermelho",
  "BOM PASTOR": "Bom Pastor",
  CANDELARIA: "Candelaria",
  "CAPIM MACIO": "Capim Macio",
  "CIDADE ALTA": "Cidade Alta",
  "CIDADE DA ESPERANCA": "Cidade da Esperanca",
  "CIDADE NOVA": "Cidade Nova",
  "DIX SEPT ROSADO": "Dix-Sept Rosado",
  "FELIPE CAMARAO": "Filipe Camarao",
  GUARAPES: "Guarapes",
  IGAPO: "Igapo",
  "JARDIM PROGRESSO": "Jardim Progresso",
  "LAGOA AZUL": "Lagoa Azul",
  "LAGOA NOVA": "Lagoa Nova",
  "LAGOA SECA": "Lagoa Seca",
  "MAE LUIZA": "Mae Luiza",
  "MORRO BRANCO": "Morro Branco",
  NEOPOLIS: "Neopolis",
  NORDESTE: "Nordeste",
  "NOSSA SENHORA DA APRESENTACAO": "Nossa Senhora da Apresentacao",
  "NOSSA SENHORA DE NAZARE": "Nossa Senhora de Nazare",
  "NOVA DESCOBERTA": "Nova Descoberta",
  PAJUCARA: "Pajucara",
  "PARQUE DAS COLINAS": "Parque das Colinas",
  PETROPOLIS: "Petropolis",
  PITIMBU: "Pitimbu",
  PLANALTO: "Planalto",
  "PONTA NEGRA": "Ponta Negra",
  POTENGI: "Potengi",
  "PRAIA DO MEIO": "Praia do Meio",
  QUINTAS: "Quintas",
  REDINHA: "Redinha",
  RIBEIRA: "Ribeira",
  ROCAS: "Rocas",
  SALINAS: "Salinas",
  "SANTOS REIS": "Santos Reis",
  TIROL: "Tirol",
};

const NEIGHBORHOOD_ZONES: Record<string, string> = {
  ALECRIM: "Leste",
  "AREIA PRETA": "Leste",
  "BARRO VERMELHO": "Leste",
  "BOM PASTOR": "Oeste",
  CANDELARIA: "Sul",
  "CAPIM MACIO": "Sul",
  "CIDADE ALTA": "Leste",
  "CIDADE DA ESPERANCA": "Oeste",
  "CIDADE NOVA": "Oeste",
  "DIX SEPT ROSADO": "Oeste",
  "FELIPE CAMARAO": "Oeste",
  "FILIPE CAMARAO": "Oeste", // nome oficial usado por canonicalNeighborhood
  GUARAPES: "Oeste",
  IGAPO: "Norte",
  "LAGOA AZUL": "Norte",
  "LAGOA NOVA": "Sul",
  "LAGOA SECA": "Leste",
  "MAE LUIZA": "Leste",
  "MORRO BRANCO": "Sul",
  NEOPOLIS: "Sul",
  NORDESTE: "Oeste",
  "NOSSA SENHORA DA APRESENTACAO": "Norte",
  "NOSSA SENHORA DE NAZARE": "Oeste",
  "NOVA DESCOBERTA": "Sul",
  PAJUCARA: "Norte",
  "PARQUE DAS COLINAS": "Sul",
  PETROPOLIS: "Leste",
  PITIMBU: "Sul",
  PLANALTO: "Oeste",
  "PONTA NEGRA": "Sul",
  POTENGI: "Norte",
  "PRAIA DO MEIO": "Leste",
  QUINTAS: "Oeste",
  REDINHA: "Norte",
  RIBEIRA: "Leste",
  ROCAS: "Leste",
  SALINAS: "Norte",
  "SANTOS REIS": "Leste",
  TIROL: "Leste",
};

const NEIGHBORHOOD_RULES: Array<[RegExp, string]> = [
  [/APRESENT|\bN\s*S\s*A\b/, "NOSSA SENHORA DA APRESENTACAO"],
  [/NAZARE/, "NOSSA SENHORA DE NAZARE"],
  [/ALECR|AECRIM|ALEGRIM|ALENGRIM|ALERIM|ALCRIM|ALENCRIM/, "ALECRIM"],
  [/AREA PRETA/, "AREIA PRETA"],
  [/C\s*IDADE (?:DA )?E/, "CIDADE DA ESPERANCA"],
  [/^NOVA CIDADE$/, "CIDADE NOVA"],
  [/PET|PEPRO|P[T]?ROPOL/, "PETROPOLIS"],
  [/DIX.*SEPT|DIA SEPT|DIX DEPT|DIX SEP|DIX SERT|DIX SERPT|^SEPT ROSADO$/, "DIX SEPT ROSADO"],
  [/NEOP|NOEPO|NEOPO|NEO P/, "NEOPOLIS"],
  [/GUARAP/, "GUARAPES"],
  [/IGAP/, "IGAPO"],
  [/MAE LUIZA/, "MAE LUIZA"],
  [/FELIPE CAMAR|FILIPE CAMAR/, "FELIPE CAMARAO"],
  [/NOVA DESC|NOVA DECO|NOVA DESO|NOVA DESCOR/, "NOVA DESCOBERTA"],
  [/PAJUC|PJUC|PACUC|PACUJ|PAJAC|PAJC|PAJUAC|PAJUA|PAJUR/, "PAJUCARA"],
  [/LAGOA A?Z/, "LAGOA AZUL"],
  [/NOR.*DESTE|NODESTE|NOSDESTE|NOREDESTE|NOEDESTE/, "NORDESTE"],
  [/BARRO VERM|BAIRRO VERM/, "BARRO VERMELHO"],
  [/SANTO.*REI/, "SANTOS REIS"],
  [/QUINT|QUIT|QIU|QUNT/, "QUINTAS"],
  [/PRAI.*MEIO|PRIA.*MEIO|PRAIO.*MEIO/, "PRAIA DO MEIO"],
  [/POT|POTE|POTR|PONTENG/, "POTENGI"],
  [/PONTA.*NEG|PONTANEGRA|PONSTA NEG/, "PONTA NEGRA"],
  [/PIT|PINT/, "PITIMBU"],
];

function text(value: RawValue | undefined): string {
  if (value === null || value === undefined || String(value).trim() === "") return "Nao informado";
  return String(value).trim();
}

export function normalized(value: RawValue | undefined): string {
  return text(value)
    .normalize("NFKD")
    .replace(/[^\p{ASCII}]/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, " ")
    .split(" ")
    .filter(Boolean)
    .join(" ");
}

function jaroWinkler(left: string, right: string): number {
  if (left === right) return 1;
  if (!left || !right) return 0;
  const distance = Math.floor(Math.max(left.length, right.length) / 2) - 1;
  const leftMatches = new Array<boolean>(left.length).fill(false);
  const rightMatches = new Array<boolean>(right.length).fill(false);
  let matches = 0;
  for (let index = 0; index < left.length; index++) {
    const start = Math.max(0, index - distance);
    const end = Math.min(index + distance + 1, right.length);
    for (let candidate = start; candidate < end; candidate++) {
      if (rightMatches[candidate] || left[index] !== right[candidate]) continue;
      leftMatches[index] = true;
      rightMatches[candidate] = true;
      matches++;
      break;
    }
  }
  if (!matches) return 0;
  const leftChars = [...left].filter((_, index) => leftMatches[index]);
  const rightChars = [...right].filter((_, index) => rightMatches[index]);
  const transpositions = leftChars.filter((char, index) => char !== rightChars[index]).length / 2;
  const jaro =
    (matches / left.length + matches / right.length + (matches - transpositions) / matches) / 3;
  let prefix = 0;
  for (let index = 0; index < Math.min(4, left.length, right.length); index++) {
    if (left[index] !== right[index]) break;
    prefix++;
  }
  return jaro + prefix * 0.1 * (1 - jaro);
}

function canonicalNeighborhood(value: string): string {
  const cleaned = normalized(value).toUpperCase();
  if (!cleaned || cleaned === "NAO INFORMADO") return "Nao informado";
  const official = OFFICIAL_NEIGHBORHOODS[cleaned];
  if (official) return official.toUpperCase();
  for (const [pattern, key] of NEIGHBORHOOD_RULES) {
    if (pattern.test(cleaned)) return OFFICIAL_NEIGHBORHOODS[key]!.toUpperCase();
  }
  let bestKey = "";
  let similarity = -1;
  for (const candidate of Object.keys(OFFICIAL_NEIGHBORHOODS)) {
    const score = jaroWinkler(cleaned, candidate);
    if (score > similarity) {
      bestKey = candidate;
      similarity = score;
    }
  }
  if (similarity >= 0.85) return OFFICIAL_NEIGHBORHOODS[bestKey]!.toUpperCase();
  return text(value).trim().toUpperCase();
}

function neighborhoodZone(value: string): string {
  return NEIGHBORHOOD_ZONES[normalized(value).toUpperCase()] ?? "Nao informado";
}

function code(value: RawValue | undefined): string {
  return text(value);
}

function decoded(index: number, value: RawValue | undefined): string {
  if (value === null || value === undefined) return "Nao informado";
  return decoders[index]?.[code(value)] ?? text(value);
}

function toNumber(value: RawValue | undefined): number {
  if (value === null || value === undefined || value === "") return 0;
  const result = Number(typeof value === "string" ? value.trim() : value);
  return Number.isFinite(result) ? result : 0;
}

function marked(value: RawValue | undefined): boolean {
  const result = normalized(value);
  return result === "1" || result.startsWith("sim") || result.includes("opcao marcada");
}

/** Equivalente ao f"{valor:g}" do Python (6 algarismos significativos). */
function formatG(value: number): string {
  if (value === 0) return "0";
  const [mantissa = "0", exponentText = "0"] = value.toExponential(5).split("e");
  const exponent = Number(exponentText);
  if (exponent < -4 || exponent >= 6) {
    const trimmed = mantissa.includes(".") ? mantissa.replace(/\.?0+$/, "") : mantissa;
    return `${trimmed}e${exponent < 0 ? "-" : "+"}${String(Math.abs(exponent)).padStart(2, "0")}`;
  }
  return String(Number(value.toPrecision(6)));
}

export function emptyStats(): Stats {
  const stats = { expenseAmounts: {} } as Stats;
  for (const key of SCALAR_KEYS) stats[key] = 0;
  for (const key of COUNTER_KEYS) stats[key] = {};
  return stats;
}

function add(counter: Counter, value: RawValue | undefined, amount = 1) {
  const label = text(value);
  counter[label] = (counter[label] ?? 0) + amount;
}

export function cellKeyOf(filters: CubeFilters): string {
  return JSON.stringify([
    filters.zona,
    filters.localidade,
    filters.equipamento,
    filters.faixaRenda,
    filters.pbf,
  ]);
}

/**
 * Código familiar normalizado: códigos numéricos perdem zeros à esquerda e o ".0" que o
 * Excel às vezes acrescenta, para que "0123" e 123 identifiquem a mesma família.
 */
export function familyCodeOf(row: RawValue[]): string {
  const value = text(row[FAMILY_CODE_COLUMN]);
  if (!/^\d+(\.0+)?$/.test(value)) return value;
  return value.replace(/\.0+$/, "").replace(/^0+(?=\d)/, "");
}

function filtersOf(values: RawValue[]): CubeFilters {
  const localidade = canonicalNeighborhood(decoded(8, values[8]));
  return {
    zona: neighborhoodZone(localidade),
    localidade,
    equipamento: decoded(52, values[52]),
    faixaRenda: decoded(12, values[12]),
    pbf: decoded(14, values[14]),
  };
}

const DISABILITY_FIELDS: Array<[number, string]> = [
  [80, "Cegueira"],
  [81, "Baixa visao"],
  [82, "Surdez severa ou profunda"],
  [83, "Surdez leve ou moderada"],
  [84, "Deficiencia fisica"],
  [85, "Deficiencia mental ou intelectual"],
  [86, "Sindrome de Down"],
  [87, "Transtorno ou doenca mental"],
];
const STREET_SLEEP_FIELDS: Array<[number, string]> = [
  [122, "Rua"],
  [124, "Albergue"],
  [126, "Domicilio particular"],
  [128, "Outra forma"],
];
const SERVICE_FIELDS: Array<[number, string]> = [
  [150, "CRAS"],
  [151, "CREAS"],
  [152, "Centro POP"],
  [153, "Instituicao governamental"],
  [154, "Instituicao nao governamental"],
  [155, "Hospital ou clinica"],
];
const EXPENSE_FIELDS: Array<[number, string]> = [
  [43, "Energia"],
  [44, "Agua"],
  [45, "Gas"],
  [46, "Alimentacao"],
  [47, "Transporte"],
  [48, "Aluguel"],
  [49, "Medicamentos"],
];

function addPerson(stats: Stats, values: RawValue[]) {
  stats.persons += 1;
  stats.personPbf += Number(marked(decoded(73, values[73])));
  stats.pcd += Number(marked(decoded(79, values[79])));
  stats.childLabor += Number(marked(decoded(60, values[60])));
  stats.children += Number(["0", "1", "2", "3"].includes(code(values[72])));
  stats.street += Number(marked(decoded(121, values[121])));
  add(stats.gender, decoded(61, values[61]));
  add(stats.age, decoded(72, values[72]));
  add(stats.race, decoded(64, values[64]));
  add(stats.relationship, decoded(63, values[63]));
  add(stats.school, decoded(95, values[95]));
  add(stats.education, decoded(107, values[107]));
  add(stats.work, decoded(108, values[108]));
  add(stats.occupation, decoded(111, values[111]));

  if (marked(decoded(121, values[121]))) {
    add(stats.streetTime, decoded(130, values[130]));
    for (const [index, label] of STREET_SLEEP_FIELDS) {
      if (marked(decoded(index, values[index]))) add(stats.streetSleep, label);
    }
    for (const [index, label] of SERVICE_FIELDS) {
      if (marked(decoded(index, values[index]))) add(stats.services, label);
    }
  }

  for (const [index, label] of DISABILITY_FIELDS) {
    if (marked(values[index])) add(stats.disabilities, label);
  }
}

const ADEQUATE_SEWAGE = new Set(["rede coletora de esgoto ou pluvial", "fossa septica"]);
const GARBAGE_COLLECTED = new Set(["e coletado diretamente", "e coletado indiretamente"]);

function addFamily(stats: Stats, values: RawValue[]): string | null {
  stats.families += 1;
  stats.familyPbf += Number(marked(decoded(14, values[14])));
  stats.incomePerCapita += toNumber(values[11]);
  stats.incomeTotal += toNumber(values[13]);
  stats.incomeCount += 1;
  stats.updated24 += Number(["0", "1", "2"].includes(code(values[15])));
  stats.risk += Number(marked(decoded(54, values[54])));
  stats.foodRisk += Number(marked(decoded(55, values[55])));
  stats.indigenous += Number(marked(decoded(29, values[29])));
  stats.quilombola += Number(marked(decoded(35, values[35])));
  add(stats.familyStatus, decoded(4, values[4]));
  add(stats.householdSize, values[38]);
  add(stats.updateMonths, decoded(15, values[15]));
  add(stats.housingType, decoded(17, values[17]));
  add(stats.rooms, values[18]);
  add(stats.groups, decoded(56, values[56]));
  if (marked(decoded(22, values[22]))) add(stats.sanitation, "Agua canalizada");
  if (marked(decoded(24, values[24]))) add(stats.sanitation, "Banheiro");
  if (ADEQUATE_SEWAGE.has(normalized(decoded(25, values[25]))))
    add(stats.sanitation, "Esgotamento adequado");
  if (GARBAGE_COLLECTED.has(normalized(decoded(26, values[26]))))
    add(stats.sanitation, "Coleta de lixo");
  if (normalized(decoded(27, values[27])).startsWith("eletrica"))
    add(stats.sanitation, "Iluminacao eletrica");
  for (const [index, label] of EXPENSE_FIELDS) {
    const amount = toNumber(values[index]);
    if (amount > 0) {
      add(stats.expenses, label);
      add((stats.expenseAmounts[label] ??= {}), formatG(amount));
    }
  }
  // Datas chegam como texto ISO (AAAA-MM-DDTHH:MM:SS), igual ao isoformat() do Python.
  const updated = values[3];
  return updated ? String(updated) : null;
}

/**
 * Agrupa as linhas (uma por pessoa) por código familiar e calcula a contribuição de cada
 * família. Os dados de família (localidade, renda, domicílio...) vêm da primeira linha.
 */
export function buildFamilies(rows: RawValue[][]): FamilyStats[] {
  const families = new Map<string, FamilyStats>();
  for (const row of rows) {
    const codigoFamiliar = familyCodeOf(row);
    let family = families.get(codigoFamiliar);
    if (!family) {
      const filters = filtersOf(row);
      const stats = emptyStats();
      const latestUpdate = addFamily(stats, row);
      family = { codigoFamiliar, filters, cellKey: cellKeyOf(filters), latestUpdate, stats };
      families.set(codigoFamiliar, family);
    }
    addPerson(family.stats, row);
  }
  return [...families.values()];
}

function mergeCounter(target: Counter, source: Counter | undefined, sign: number) {
  for (const [label, value] of Object.entries(source ?? {})) {
    const next = (target[label] ?? 0) + sign * value;
    if (Math.abs(next) < 1e-9) delete target[label];
    else target[label] = next;
  }
}

/** Soma (sign = 1) ou subtrai (sign = -1) uma contribuição de família de uma célula. */
export function mergeStats(target: Stats, source: Partial<Stats>, sign: 1 | -1) {
  for (const key of SCALAR_KEYS) {
    const next = (target[key] ?? 0) + sign * Number(source[key] ?? 0);
    target[key] = Math.abs(next) < 1e-6 ? 0 : next;
  }
  for (const key of COUNTER_KEYS) {
    target[key] ??= {};
    mergeCounter(target[key], source[key], sign);
  }
  target.expenseAmounts ??= {};
  for (const [label, amounts] of Object.entries(source.expenseAmounts ?? {})) {
    const counter = (target.expenseAmounts[label] ??= {});
    mergeCounter(counter, amounts, sign);
    if (!Object.keys(counter).length) delete target.expenseAmounts[label];
  }
}

/** Remove zeros e contadores vazios — formato gravado em cadunico_familias. */
export function compactStats(stats: Stats): Partial<Stats> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(stats)) {
    if (typeof value === "number") {
      if (value !== 0) result[key] = value;
    } else if (Object.keys(value).length) {
      result[key] = value;
    }
  }
  return result as Partial<Stats>;
}
