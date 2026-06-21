import Papa from "papaparse";
import * as XLSX from "xlsx";
import type { ParsedFile, ColumnMapping } from "@/types/import.types";
import { DEPT_CONFIG } from "@/config/departments.config";

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
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { raw: false, defval: "" }) as Record<string, string>[];
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
  return { headers, rows, totalRows: rows.length };
}

export function autoSuggestMappings(headers: string[], deptSlug: string): ColumnMapping[] {
  const config = DEPT_CONFIG.find((d) => d.slug === deptSlug);
  if (!config) return headers.map((h) => ({ sourceColumn: h, targetKey: null }));

  return headers.map((header) => {
    const normalized = header.toLowerCase().replace(/[^a-z0-9]/g, "_");
    let bestMatch: string | null = null;
    let bestScore = 0;

    for (const kpi of config.kpis) {
      const score = stringSimilarity(normalized, kpi.key) + stringSimilarity(normalized, kpi.label.toLowerCase().replace(/\s+/g, "_"));
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
  const validMappings = mappings.filter((m) => m.targetKey !== null);
  return rows.map((row) => {
    const mapped: Record<string, number> = {};
    for (const m of validMappings) {
      const rawValue = row[m.sourceColumn];
      const numValue = parseFloat(rawValue?.replace(/[,$%]/g, "") ?? "");
      if (!isNaN(numValue)) {
        mapped[m.targetKey!] = numValue;
      }
    }
    return mapped;
  });
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
