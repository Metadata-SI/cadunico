"""Gera src/lib/cadunico/schema.json com as 169 colunas da base do Cadastro Unico.

Le apenas a linha de cabecalho da base (nenhum dado pessoal) e o dicionario de codigos.
Usa so a biblioteca padrao, lendo o XML interno do .xlsx, porque a base tem mais de 100 MB.

Uso: python scripts/build-cadunico-schema.py <base.xlsx> <dicionariotudo.xlsx>
"""

import json
import os
import re
import sys
import unicodedata
import zipfile
from html import unescape

OUTPUT = os.path.join("src", "lib", "cadunico", "schema.json")

# Cabecalhos que vieram com problema de codificacao na base original.
LABEL_FIXES = {
    1: "Código familiar",
    7: "REGIÃO / ZONA",
    22: "Água canalizada no domicilio",
}

# Colunas lidas por scripts/build-dashboard-cube.py e src/lib/cadunico/aggregate.ts.
USED_COLUMNS = {
    1, 3, 4, 8, 11, 12, 13, 14, 15, 17, 18, 22, 24, 25, 26, 27, 29, 35, 38,
    43, 44, 45, 46, 47, 48, 49, 52, 54, 55, 56, 60, 61, 63, 64, 72, 73,
    79, 80, 81, 82, 83, 84, 85, 86, 87, 95, 107, 108, 111,
    121, 122, 124, 126, 128, 130, 150, 151, 152, 153, 154, 155,
}

DATE_COLUMNS = {2, 3, 6, 62}


def normalized(value):
    value = "" if value is None else str(value).strip()
    value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode().lower()
    return " ".join("".join(char if char.isalnum() else " " for char in value).split())


def code(value):
    return str(value).strip()


def column_letter(index):
    letters = ""
    index += 1
    while index:
        index, remainder = divmod(index - 1, 26)
        letters = chr(65 + remainder) + letters
    return letters


def column_index(letters):
    result = 0
    for char in letters:
        result = result * 26 + ord(char) - 64
    return result - 1


def cell_text(xml):
    return unescape("".join(re.findall(r"<t[^>]*>([^<]*)</t>", xml)))


def read_rows(path, max_rows=None):
    """Le as linhas da primeira planilha como listas de textos."""
    archive = zipfile.ZipFile(path)
    sheet_xml = b""
    with archive.open("xl/worksheets/sheet1.xml") as sheet:
        while True:
            chunk = sheet.read(1 << 20)
            if not chunk:
                break
            sheet_xml += chunk
            if max_rows and sheet_xml.count(b"</row>") >= max_rows:
                break
    sheet_xml = sheet_xml.decode("utf-8", errors="ignore")
    raw_rows = re.findall(r"<row[^>]*>(.*?)</row>", sheet_xml, re.S)[:max_rows]
    cells_by_row = [
        re.findall(r'<c r="([A-Z]+)\d+"([^>]*?)(?:/>|>(.*?)</c>)', row, re.S) for row in raw_rows
    ]
    needed = {
        int(re.search(r"<v>([^<]*)</v>", body).group(1))
        for cells in cells_by_row
        for _, attrs, body in cells
        if 't="s"' in attrs and body and "<v>" in body
    }
    shared = {}
    if needed and "xl/sharedStrings.xml" in archive.namelist():
        with archive.open("xl/sharedStrings.xml") as strings:
            buffer = ""
            index = -1
            while len(shared) < len(needed):
                chunk = strings.read(1 << 20)
                if not chunk:
                    break
                buffer += chunk.decode("utf-8", errors="ignore")
                parts = buffer.split("</si>")
                buffer = parts.pop()
                for part in parts:
                    index += 1
                    if index in needed:
                        shared[index] = cell_text(part)
    rows = []
    for cells in cells_by_row:
        row = {}
        for letters, attrs, body in cells:
            body = body or ""
            if 't="s"' in attrs:
                value = shared.get(int(re.search(r"<v>([^<]*)</v>", body).group(1)))
            elif 't="inlineStr"' in attrs:
                value = cell_text(body)
            else:
                match = re.search(r"<v>([^<]*)</v>", body)
                value = unescape(match.group(1)) if match else None
            row[column_index(letters)] = value
        width = max(row) + 1 if row else 0
        rows.append([row.get(index) for index in range(width)])
    return rows


def parse_answers(answers):
    mapping = {}
    for item in str(answers).split("#"):
        match = re.match(r"^\s*([^\-]+?)\s*-\s*(.+?)\s*$", item)
        if match:
            mapping[code(match.group(1))] = match.group(2).strip()
    return mapping


def main():
    base_path, dictionary_path = sys.argv[1], sys.argv[2]
    headers = read_rows(base_path, max_rows=1)[0]
    dictionary = read_rows(dictionary_path)[1:]

    fields = {}
    decoders = {}
    for row in dictionary:
        row = (row + [None, None, None])[:3]
        field, description, answers = row
        if not description:
            continue
        key = normalized(description)
        fields.setdefault(key, field)
        mapping = parse_answers(answers) if answers else {}
        # Mesma regra de scripts/build-dashboard-cube.py: a ultima descricao vence.
        if mapping:
            decoders[key] = mapping

    columns = []
    for index, header in enumerate(headers):
        key = normalized(header)
        columns.append({
            "index": index,
            "letter": column_letter(index),
            "header": header,
            "label": LABEL_FIXES.get(index, " ".join(str(header).split())),
            "field": fields.get(key),
            "values": decoders.get(key),
            "used": index in USED_COLUMNS,
            "date": index in DATE_COLUMNS,
            "required": index == 1,
        })

    os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
    with open(OUTPUT, "w", encoding="utf-8", newline="\n") as output:
        json.dump({"sheetName": "tudo", "columns": columns}, output, ensure_ascii=False, indent=2)
        output.write("\n")
    print(f"{len(columns)} colunas gravadas em {OUTPUT}")


if __name__ == "__main__":
    main()
