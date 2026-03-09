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

function xmlToJson(text: string): unknown {
  const parser = new XMLParser({ ignoreAttributes: false });
  return parser.parse(text);
}

function jsonToXml(data: unknown): string {
  const builder = new XMLBuilder({ ignoreAttributes: false, format: true });
  return builder.build(typeof data === 'string' ? JSON.parse(data) : data);
}

function jsonToYaml(data: unknown): string {
  return yaml.dump(typeof data === 'string' ? JSON.parse(data) : data);
}

function yamlToJson(text: string): unknown {
  return yaml.load(text);
}

async function tomlToJson(text: string): Promise<unknown> {
  const TOML = await import('smol-toml');
  return TOML.parse(text);
}

async function jsonToToml(data: unknown): Promise<string> {
  const TOML = await import('smol-toml');
  const obj = typeof data === 'string' ? JSON.parse(data) : data;
  return TOML.stringify(obj as Record<string, unknown>);
}

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
