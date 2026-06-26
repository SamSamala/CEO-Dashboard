import Papa from "papaparse";
import * as XLSX from "xlsx";
import type { ParsedFile, ColumnMapping } from "@/types/import.types";
import { DEPT_CONFIG } from "@/config/departments.config";

// Sentinel target for the column that carries each row's business date.
// A row mapped to this is NOT stored as a metric — it sets that row's date.
export const DATE_TARGET = "__date__";

const DATE_HEADER_RE = /^(date|day|month|period|business[\s_]?date|reporting[\s_]?date|timestamp|time)$/i;

export function parseCSV(content: string): ParsedFile {
  const result = Papa.parse(content, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  });

  const rows = result.data as Record<string, string>[];
  const headers = result.meta.fields ?? [];

  return { headers, rows, totalRows: rows.length };
}

export function parseExcel(buffer: ArrayBuffer): ParsedFile {
  const workbook = XLSX.read(buffer, { type: "array" });
  return readWorkbook(workbook);
}

export function parseExcelBase64(base64: string): ParsedFile {
  const workbook = XLSX.read(base64, { type: "base64" });
  return readWorkbook(workbook);
}

function readWorkbook(workbook: XLSX.WorkBook): ParsedFile {
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { raw: false, defval: "" }) as Record<string, string>[];
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
  return { headers, rows, totalRows: rows.length };
}

export function autoSuggestMappings(headers: string[], deptSlug: string): ColumnMapping[] {
  const config = DEPT_CONFIG.find((d) => d.slug === deptSlug);

  return headers.map((header) => {
    // A date column is recognised regardless of department.
    if (DATE_HEADER_RE.test(header.trim())) {
      return { sourceColumn: header, targetKey: DATE_TARGET, confidence: 1 };
    }

    if (!config) return { sourceColumn: header, targetKey: null };

    const normalized = header.toLowerCase().replace(/[^a-z0-9]/g, "_");
    let bestMatch: string | null = null;
    let bestScore = 0;

    for (const kpi of config.kpis) {
      const score =
        stringSimilarity(normalized, kpi.key) +
        stringSimilarity(normalized, kpi.label.toLowerCase().replace(/\s+/g, "_"));
      if (score > bestScore && score > 0.5) {
        bestScore = score;
        bestMatch = kpi.key;
      }
    }

    return { sourceColumn: header, targetKey: bestMatch, confidence: bestScore };
  });
}

export function applyMapping(
  rows: Record<string, string>[],
  mappings: ColumnMapping[]
): Record<string, number>[] {
  const valueMappings = mappings.filter((m) => m.targetKey && m.targetKey !== DATE_TARGET);
  return rows.map((row) => {
    const mapped: Record<string, number> = {};
    for (const m of valueMappings) {
      const rawValue = row[m.sourceColumn];
      const numValue = parseFloat(rawValue?.replace(/[,$%\s]/g, "") ?? "");
      if (!isNaN(numValue)) {
        mapped[m.targetKey!] = numValue;
      }
    }
    return mapped;
  });
}

/**
 * Returns one business date per row. If a column is mapped to DATE_TARGET, each
 * row uses its own parsed date; otherwise every row falls back to `fallbackISO`
 * (the single "Import Date" chosen in the form).
 */
export function extractRowDates(
  rows: Record<string, string>[],
  mappings: ColumnMapping[],
  fallbackISO: string
): Date[] {
  const dateColumn = mappings.find((m) => m.targetKey === DATE_TARGET)?.sourceColumn;
  const fallback = new Date(fallbackISO);
  return rows.map((row) => {
    if (dateColumn) {
      const parsed = parseFlexibleDate((row[dateColumn] ?? "").trim());
      if (parsed) return parsed;
    }
    return fallback;
  });
}

// Accepts YYYY-MM-DD, YYYY-MM (→ first of month), and anything Date can parse.
function parseFlexibleDate(raw: string): Date | null {
  if (!raw) return null;
  const yearMonth = /^(\d{4})-(\d{1,2})$/.exec(raw);
  if (yearMonth) {
    return new Date(Date.UTC(Number(yearMonth[1]), Number(yearMonth[2]) - 1, 1));
  }
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

function stringSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.8;
  const aWords = new Set(a.split(/[_\s]+/));
  const bWords = new Set(b.split(/[_\s]+/));
  const intersection = [...aWords].filter((w) => bWords.has(w)).length;
  const union = new Set([...aWords, ...bWords]).size;
  return union > 0 ? intersection / union : 0;
}
