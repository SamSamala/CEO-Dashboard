export interface ParsedFile {
  headers: string[];
  rows: Record<string, string>[];
  totalRows: number;
}

export interface ColumnMapping {
  sourceColumn: string;
  targetKey: string | null;
  confidence?: number;
}

export interface MappingTemplate {
  id: string;
  name: string;
  description?: string | null;
  sourceType: string;
  departmentId?: string | null;
  mapping: Record<string, string>;
}
