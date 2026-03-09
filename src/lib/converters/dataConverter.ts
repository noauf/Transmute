import Papa from 'papaparse';
import yaml from 'js-yaml';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import { ConversionResult } from '@/types';
import { buildOutputFilename, getMimeType } from '@/lib/utils';
import { getExtension } from '@/lib/fileDetector';

async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

/* ── CSV / TSV ── */

function csvToJson(text: string): object[] {
  const result = Papa.parse(text, { header: true, skipEmptyLines: true });
  return result.data as object[];
}

function jsonToCsv(data: unknown): string {
  const arr = Array.isArray(data) ? data : [data];
  return Papa.unparse(arr);
}

function tsvToJson(text: string): object[] {
  const result = Papa.parse(text, { header: true, skipEmptyLines: true, delimiter: '\t' });
  return result.data as object[];
}

function jsonToTsv(data: unknown): string {
  const arr = Array.isArray(data) ? data : [data];
  return Papa.unparse(arr, { delimiter: '\t' });
}

/* ── XML ── */

function xmlToJson(text: string): unknown {
  const parser = new XMLParser({ ignoreAttributes: false });
  return parser.parse(text);
}

function jsonToXml(data: unknown): string {
  const builder = new XMLBuilder({ ignoreAttributes: false, format: true });
  return builder.build(typeof data === 'string' ? JSON.parse(data) : data);
}

/* ── YAML ── */

function jsonToYaml(data: unknown): string {
  return yaml.dump(typeof data === 'string' ? JSON.parse(data) : data);
}

function yamlToJson(text: string): unknown {
  return yaml.load(text);
}

/* ── TOML ── */

async function tomlToJson(text: string): Promise<unknown> {
  const TOML = await import('smol-toml');
  return TOML.parse(text);
}

async function jsonToToml(data: unknown): Promise<string> {
  const TOML = await import('smol-toml');
  const obj = typeof data === 'string' ? JSON.parse(data) : data;
  return TOML.stringify(obj as Record<string, unknown>);
}

/* ── INI ── */

function iniToJson(text: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  let currentSection = '';

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith(';') || trimmed.startsWith('#')) continue;

    const sectionMatch = trimmed.match(/^\[(.+)\]$/);
    if (sectionMatch) {
      currentSection = sectionMatch[1];
      if (!result[currentSection]) result[currentSection] = {};
      continue;
    }

    const kvMatch = trimmed.match(/^([^=]+)=(.*)$/);
    if (kvMatch) {
      const key = kvMatch[1].trim();
      let value: unknown = kvMatch[2].trim();
      // Auto-type: numbers, booleans
      if (value === 'true') value = true;
      else if (value === 'false') value = false;
      else if (/^-?\d+\.?\d*$/.test(value as string)) value = Number(value);

      if (currentSection) {
        (result[currentSection] as Record<string, unknown>)[key] = value;
      } else {
        result[key] = value;
      }
    }
  }
  return result;
}

function jsonToIni(data: unknown): string {
  const obj = typeof data === 'string' ? JSON.parse(data) : data;
  if (typeof obj !== 'object' || obj === null) return String(obj);

  const lines: string[] = [];
  const topLevel: string[] = [];
  const sections: string[] = [];

  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sections.push(`[${key}]`);
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        sections.push(`${k}=${v}`);
      }
      sections.push('');
    } else {
      topLevel.push(`${key}=${value}`);
    }
  }

  if (topLevel.length) lines.push(...topLevel, '');
  lines.push(...sections);
  return lines.join('\n');
}

/* ── ENV ── */

function envToJson(text: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.substring(0, eqIdx).trim();
    let value = trimmed.substring(eqIdx + 1).trim();
    // Strip surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

function jsonToEnv(data: unknown): string {
  const obj = typeof data === 'string' ? JSON.parse(data) : data;
  if (typeof obj !== 'object' || obj === null) return '';
  const flat = flattenForEnv(obj as Record<string, unknown>);
  return Object.entries(flat).map(([k, v]) => `${k}=${v}`).join('\n');
}

function flattenForEnv(obj: Record<string, unknown>, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    const envKey = prefix ? `${prefix}_${key}` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(result, flattenForEnv(value as Record<string, unknown>, envKey));
    } else {
      result[envKey.toUpperCase()] = String(value);
    }
  }
  return result;
}

/* ── Properties (Java .properties) ── */

function propertiesToJson(text: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('!')) continue;
    // Split on first = or :
    const match = trimmed.match(/^([^=:]+)[=:](.*)$/);
    if (match) {
      result[match[1].trim()] = match[2].trim();
    }
  }
  return result;
}

function jsonToProperties(data: unknown): string {
  const obj = typeof data === 'string' ? JSON.parse(data) : data;
  if (typeof obj !== 'object' || obj === null) return '';
  const flat = flattenForEnv(obj as Record<string, unknown>);
  return Object.entries(flat).map(([k, v]) => `${k}=${v}`).join('\n');
}

/* ── NDJSON / JSONL ── */

function ndjsonToJson(text: string): unknown[] {
  return text
    .split(/\r?\n/)
    .filter(line => line.trim())
    .map(line => JSON.parse(line));
}

function jsonToNdjson(data: unknown): string {
  const arr = Array.isArray(data) ? data : [data];
  return arr.map(item => JSON.stringify(item)).join('\n');
}

/* ── SQL (write only — generates INSERT statements) ── */

function jsonToSql(data: unknown): string {
  const arr = Array.isArray(data) ? data : [data];
  if (arr.length === 0) return '-- No data';

  const first = arr[0] as Record<string, unknown>;
  if (typeof first !== 'object' || first === null) {
    return `-- Data:\n-- ${JSON.stringify(data)}`;
  }

  const columns = Object.keys(first);
  const tableName = 'data';
  const lines: string[] = [
    `-- Generated by Transmute`,
    `-- ${arr.length} rows`,
    '',
    `CREATE TABLE IF NOT EXISTS "${tableName}" (`,
    columns.map((col, i) => `  "${col}" TEXT${i < columns.length - 1 ? ',' : ''}`).join('\n'),
    ');',
    '',
  ];

  for (const row of arr) {
    const r = row as Record<string, unknown>;
    const values = columns.map(col => {
      const v = r[col];
      if (v === null || v === undefined) return 'NULL';
      if (typeof v === 'number') return String(v);
      return `'${String(v).replace(/'/g, "''")}'`;
    });
    lines.push(`INSERT INTO "${tableName}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${values.join(', ')});`);
  }

  return lines.join('\n');
}

function sqlToJson(text: string): unknown {
  // Basic parser: extract INSERT statements
  const rows: Record<string, string>[] = [];
  const insertRegex = /INSERT\s+INTO\s+"?(\w+)"?\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\);?/gi;
  let match;

  while ((match = insertRegex.exec(text)) !== null) {
    const columns = match[2].split(',').map(c => c.trim().replace(/"/g, ''));
    const valuesRaw = match[3];
    // Simple value parsing
    const values = valuesRaw.split(',').map(v => {
      v = v.trim();
      if (v === 'NULL') return '';
      if ((v.startsWith("'") && v.endsWith("'")) || (v.startsWith('"') && v.endsWith('"'))) {
        return v.slice(1, -1);
      }
      return v;
    });

    const row: Record<string, string> = {};
    columns.forEach((col, i) => { row[col] = values[i] || ''; });
    rows.push(row);
  }

  return rows.length > 0 ? rows : { raw: text, note: 'Could not parse SQL INSERT statements' };
}

/* ── Intermediate conversion pipeline ── */

async function toIntermediate(file: File, ext: string): Promise<unknown> {
  const text = await readFileAsText(file);

  switch (ext) {
    case 'json':
      return JSON.parse(text);
    case 'csv':
      return csvToJson(text);
    case 'tsv':
      return tsvToJson(text);
    case 'xml':
      return xmlToJson(text);
    case 'yaml':
    case 'yml':
      return yamlToJson(text);
    case 'toml':
      return tomlToJson(text);
    case 'ini':
      return iniToJson(text);
    case 'env':
      return envToJson(text);
    case 'properties':
      return propertiesToJson(text);
    case 'ndjson':
    case 'jsonl':
      return ndjsonToJson(text);
    case 'sql':
      return sqlToJson(text);
    default:
      throw new Error(`Unsupported source format: ${ext}`);
  }
}

async function fromIntermediate(data: unknown, targetFormat: string): Promise<string> {
  switch (targetFormat) {
    case 'json':
      return JSON.stringify(data, null, 2);
    case 'csv':
      return jsonToCsv(data);
    case 'tsv':
      return jsonToTsv(data);
    case 'xml':
      return jsonToXml(data);
    case 'yaml':
    case 'yml':
      return jsonToYaml(data);
    case 'toml':
      return jsonToToml(data);
    case 'ini':
      return jsonToIni(data);
    case 'env':
      return jsonToEnv(data);
    case 'properties':
      return jsonToProperties(data);
    case 'ndjson':
    case 'jsonl':
      return jsonToNdjson(data);
    case 'sql':
      return jsonToSql(data);
    default:
      throw new Error(`Unsupported target format: ${targetFormat}`);
  }
}

export async function convertData(
  file: File,
  targetFormat: string,
  onProgress?: (progress: number) => void
): Promise<ConversionResult> {
  onProgress?.(20);

  const ext = getExtension(file.name);
  const intermediate = await toIntermediate(file, ext);
  onProgress?.(60);

  const output = await fromIntermediate(intermediate, targetFormat);
  onProgress?.(90);

  const blob = new Blob([output], { type: getMimeType(targetFormat) });
  onProgress?.(100);

  return {
    blob,
    filename: buildOutputFilename(file.name, targetFormat),
  };
}
