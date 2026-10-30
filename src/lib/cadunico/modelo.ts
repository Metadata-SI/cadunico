/**
 * Modelo de complemento da base, gerado no navegador a partir de schema.json.
 * Não fica em public/ porque o repositório guarda *.xlsx no Git LFS, que a Vercel não baixa.
 * As linhas de exemplo são FICTÍCIAS (códigos familiares 999...), só para mostrar o formato.
 */
import * as XLSX from "xlsx";
import schema from "./schema.json";

type Example = Record<number, string | number | Date>;

const date = (text: string) => {
  const [day = 1, month = 1, year = 2000] = text.split("/").map(Number);
  return new Date(year, month - 1, day);
};

// Valores da família (repetidos em todas as linhas dos membros).
const familia = (codigo: string, overrides: Example = {}): Example => ({
  0: 2408102, // código IBGE de Natal
  1: codigo,
  2: date("15/03/2019"),
  3: date("10/02/2026"),
  4: 3,
  5: 2,
  6: date("10/02/2026"),
  8: "PONTA NEGRA",
  11: 150,
  12: 2,
  13: 450,
  14: 1,
  15: 0,
  16: 1,
  17: 1,
  18: 4,
  19: 2,
  22: 1,
  24: 1,
  25: 1,
  26: 1,
  27: 1,
  29: 2,
  35: 2,
  38: 3,
  39: 1,
  43: 120,
  44: 60,
  45: 110,
  46: 400,
  52: "CRAS EXEMPLO",
  54: 2,
  55: 2,
  56: 0,
  ...overrides,
});

// Valores de cada pessoa.
const pessoa = (overrides: Example): Example => ({
  59: 3,
  60: 2,
  73: 1,
  79: 2,
  80: 0,
  81: 0,
  82: 0,
  83: 0,
  84: 0,
  85: 0,
  86: 0,
  87: 0,
  94: 1,
  121: 0,
  ...overrides,
});

const exemplos = (): Example[] => [
  {
    ...familia("99900000001"),
    ...pessoa({
      61: 2,
      62: date("20/05/1990"),
      63: 1,
      64: 4,
      72: 6,
      95: 3,
      107: 5,
      108: 1,
      111: 1,
    }),
  },
  {
    ...familia("99900000001"),
    ...pessoa({ 61: 1, 62: date("02/08/2015"), 63: 3, 64: 4, 72: 2, 95: 1, 107: 2, 108: 2 }),
  },
  {
    ...familia("99900000001"),
    ...pessoa({ 61: 2, 62: date("11/01/2022"), 63: 3, 64: 4, 72: 0, 95: 4, 107: 1, 108: 2 }),
  },
  {
    ...familia("99900000002", {
      8: "FELIPE CAMARAO",
      11: 0,
      12: 1,
      13: 0,
      38: 1,
      46: 0,
      52: "CREAS EXEMPLO",
    }),
    ...pessoa({
      61: 1,
      62: date("07/09/1978"),
      63: 1,
      64: 2,
      72: 8,
      95: 3,
      107: 2,
      108: 2,
      121: 1,
      122: 1,
      130: 3,
      150: 1,
      152: 1,
    }),
  },
];

const INSTRUCOES = [
  ["Modelo de complemento da base do Cadastro Único — Natal/RN"],
  [],
  ["Como preencher"],
  [
    '1. Use a aba "tudo": uma linha por PESSOA, com as 169 colunas na ordem do modelo (A até FM). Não mude, remova nem reordene os cabeçalhos.',
  ],
  [
    "2. Apague as 4 linhas de exemplo antes de enviar. Elas são fictícias (códigos familiares 99900000001 e 99900000002).",
  ],
  [
    "3. A coluna B (Código familiar) é obrigatória. Pessoas da mesma família repetem o mesmo código e os mesmos dados da família.",
  ],
  [
    '4. Preencha os campos codificados com o NÚMERO do código, como na exportação oficial do CadÚnico (ex.: Sexo: 1 = Masculino, 2 = Feminino). Os códigos estão na aba "Colunas".',
  ],
  ["5. Datas no formato dd/mm/aaaa. Valores em reais só com números (ex.: 150 ou 150,50)."],
  ["6. Campos sem informação podem ficar em branco."],
  [],
  ["Atenção: substituição de famílias"],
  [
    "Se o Código familiar já existir na base, a família inteira é substituída pelos membros enviados na planilha. Envie sempre todos os membros da família.",
  ],
  [],
  ["Dados pessoais"],
  [
    "A planilha preenchida contém dados pessoais protegidos pela LGPD. Envie apenas pela aba Fontes de Dados do observatório e não compartilhe por e-mail ou mensagens.",
  ],
];

export function buildTemplateWorkbook(): XLSX.WorkBook {
  const columns = schema.columns;
  const header = columns.map((column) => column.label);
  const dataRows = exemplos().map((example) =>
    columns.map((column) => example[column.index] ?? null),
  );
  const sheetTudo = XLSX.utils.aoa_to_sheet([header, ...dataRows], { cellDates: true });
  for (const column of columns.filter((item) => item.date)) {
    for (let row = 1; row <= dataRows.length; row++) {
      const cell = sheetTudo[XLSX.utils.encode_cell({ r: row, c: column.index })];
      if (cell) cell.z = "dd/mm/yyyy";
    }
  }
  sheetTudo["!cols"] = columns.map((column) => ({
    wch: Math.min(40, Math.max(12, column.label.length + 2)),
  }));

  const sheetColunas = XLSX.utils.aoa_to_sheet([
    [
      "Coluna",
      "Cabeçalho (copiar exatamente)",
      "Campo no CadÚnico",
      "Obrigatória",
      "Usada nos indicadores",
      "Valores aceitos",
    ],
    ...columns.map((column) => [
      column.letter,
      column.label,
      column.field ?? "",
      column.required ? "Sim" : "Não",
      column.used ? "Sim" : "Não",
      column.values
        ? Object.entries(column.values)
            .map(([code, label]) => `${code} = ${label}`)
            .join("; ")
        : column.date
          ? "Data (dd/mm/aaaa)"
          : "Texto ou número livre",
    ]),
  ]);
  sheetColunas["!cols"] = [
    { wch: 8 },
    { wch: 55 },
    { wch: 32 },
    { wch: 12 },
    { wch: 20 },
    { wch: 120 },
  ];

  const sheetInstrucoes = XLSX.utils.aoa_to_sheet(INSTRUCOES);
  sheetInstrucoes["!cols"] = [{ wch: 150 }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheetInstrucoes, "Instrucoes");
  XLSX.utils.book_append_sheet(workbook, sheetColunas, "Colunas");
  XLSX.utils.book_append_sheet(workbook, sheetTudo, "tudo");
  return workbook;
}

export function downloadTemplate() {
  XLSX.writeFile(buildTemplateWorkbook(), "modelo-complemento-cadunico.xlsx", {
    compression: true,
  });
}
