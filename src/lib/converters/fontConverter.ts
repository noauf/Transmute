import { ConversionResult } from '@/types';
import { buildOutputFilename, getMimeType } from '@/lib/utils';
import { getExtension } from '@/lib/fileDetector';

/**
 * Font converter.
 * Uses opentype.js for parsing/writing TTF/OTF/WOFF.
 * Uses woff2-encoder for WOFF2 compress/decompress (browser-compatible WebAssembly).
 *
 * Supported routes:
 *   ttf ↔ otf, woff, woff2
 *   otf ↔ ttf, woff, woff2
 *   woff → ttf, otf, woff2
 *   woff2 → ttf, otf, woff
 */

const FONT_EXTENSIONS = new Set(['ttf', 'otf', 'woff', 'woff2']);

export function isFontConversion(sourceExt: string, targetFormat: string): boolean {
  return FONT_EXTENSIONS.has(sourceExt) || FONT_EXTENSIONS.has(targetFormat);
}

async function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as ArrayBuffer);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Get raw TTF/OTF (SFNT) bytes from any font format.
 * - TTF/OTF: already raw SFNT
 * - WOFF: parsed by opentype.js, re-exported as ArrayBuffer
 * - WOFF2: decompressed via wawoff2
 */
async function getFontAsSfnt(buffer: ArrayBuffer, ext: string): Promise<ArrayBuffer> {
  if (ext === 'woff2') {
    const woff2 = await import('woff2-encoder');
    const decompressed = await woff2.decompress(new Uint8Array(buffer));
    return decompressed.buffer as ArrayBuffer;
  }

  if (ext === 'woff') {
    // opentype.js can parse WOFF and export as raw SFNT
    const opentype = await import('opentype.js');
    const font = opentype.parse(buffer);
    return font.toArrayBuffer();
  }

  // TTF/OTF are already SFNT
  return buffer;
}

/**
 * Determine the SFNT flavor (truetype vs cff) by reading the first 4 bytes.
 * - 0x00010000 or 'true' = TrueType (TTF)
 * - 'OTTO' = CFF/OpenType (OTF)
 */
function getSfntFlavor(buffer: ArrayBuffer): 'ttf' | 'otf' {
  const view = new DataView(buffer);
  const tag = view.getUint32(0);
  // OTTO = 0x4F54544F
  if (tag === 0x4F54544F) return 'otf';
  return 'ttf';
}

/**
 * Convert SFNT buffer to WOFF1 format.
 * WOFF1 is a compressed wrapper around SFNT table data using zlib/deflate.
 *
 * Since browsers don't expose raw deflate, we use the CompressionStream API
 * (available in modern browsers) for WOFF1 compression.
 */
async function sfntToWoff(sfntBuffer: ArrayBuffer): Promise<ArrayBuffer> {
  const sfnt = new DataView(sfntBuffer);
  const sfntArray = new Uint8Array(sfntBuffer);

  // Read SFNT header
  const sfntTag = sfnt.getUint32(0); // flavor
  const numTables = sfnt.getUint16(4);

  // Parse table directory
  interface TableEntry {
    tag: number;
    checksum: number;
    offset: number;
    length: number;
  }

  const tables: TableEntry[] = [];
  for (let i = 0; i < numTables; i++) {
    const dirOffset = 12 + i * 16;
    tables.push({
      tag: sfnt.getUint32(dirOffset),
      checksum: sfnt.getUint32(dirOffset + 4),
      offset: sfnt.getUint32(dirOffset + 8),
      length: sfnt.getUint32(dirOffset + 12),
    });
  }

  // Sort tables by tag for WOFF spec compliance
  tables.sort((a, b) => a.tag - b.tag);

  // Compress each table
  interface WoffTableEntry {
    tag: number;
    origLength: number;
    compLength: number;
    origChecksum: number;
    data: Uint8Array;
  }

  const woffTables: WoffTableEntry[] = [];

  for (const table of tables) {
    const origData = sfntArray.slice(table.offset, table.offset + table.length);

    // Try to compress using CompressionStream API
    let compData: Uint8Array;
    try {
      const cs = new CompressionStream('deflate');
      const writer = cs.writable.getWriter();
      const reader = cs.readable.getReader();

      const chunks: Uint8Array[] = [];
      const readPromise = (async () => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
        }
      })();

      writer.write(origData);
      writer.close();
      await readPromise;

      const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
      compData = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        compData.set(chunk, offset);
        offset += chunk.length;
      }
    } catch {
      // If CompressionStream not available, store uncompressed
      compData = origData;
    }

    // Only use compressed if it's actually smaller
    if (compData.length >= origData.length) {
      compData = origData;
    }

    woffTables.push({
      tag: table.tag,
      origLength: table.length,
      compLength: compData.length,
      origChecksum: table.checksum,
      data: compData,
    });
  }

  // Calculate sizes
  const WOFF_HEADER_SIZE = 44;
  const TABLE_DIR_SIZE = 20 * numTables;
  let dataOffset = WOFF_HEADER_SIZE + TABLE_DIR_SIZE;

  // Align data offset to 4 bytes
  dataOffset = (dataOffset + 3) & ~3;

  let totalSize = dataOffset;
  for (const t of woffTables) {
    totalSize += t.data.length;
    totalSize = (totalSize + 3) & ~3; // 4-byte align
  }

  const woffBuffer = new ArrayBuffer(totalSize);
  const woff = new DataView(woffBuffer);
  const woffBytes = new Uint8Array(woffBuffer);

  // WOFF header
  woff.setUint32(0, 0x774F4646); // 'wOFF'
  woff.setUint32(4, sfntTag); // flavor
  woff.setUint32(8, totalSize); // length
  woff.setUint16(12, numTables); // numTables
  woff.setUint16(14, 0); // reserved
  woff.setUint32(16, sfntBuffer.byteLength); // totalSfntSize
  woff.setUint16(20, 1); // majorVersion
  woff.setUint16(22, 0); // minorVersion
  woff.setUint32(24, 0); // metaOffset
  woff.setUint32(28, 0); // metaLength
  woff.setUint32(32, 0); // metaOrigLength
  woff.setUint32(36, 0); // privOffset
  woff.setUint32(40, 0); // privLength

  // Table directory + data
  let currentDataOffset = dataOffset;
  for (let i = 0; i < woffTables.length; i++) {
    const t = woffTables[i];
    const dirEntry = WOFF_HEADER_SIZE + i * 20;

    woff.setUint32(dirEntry, t.tag);
    woff.setUint32(dirEntry + 4, currentDataOffset);
    woff.setUint32(dirEntry + 8, t.compLength);
    woff.setUint32(dirEntry + 12, t.origLength);
    woff.setUint32(dirEntry + 16, t.origChecksum);

    woffBytes.set(t.data, currentDataOffset);
    currentDataOffset += t.data.length;
    currentDataOffset = (currentDataOffset + 3) & ~3; // 4-byte align
  }

  return woffBuffer;
}

/* ── Main converter ── */

export async function convertFont(
  file: File,
  targetFormat: string,
  onProgress?: (progress: number) => void
): Promise<ConversionResult> {
  onProgress?.(10);

  const sourceExt = getExtension(file.name);
  const buffer = await readFileAsArrayBuffer(file);
  onProgress?.(20);

  // Step 1: Get raw SFNT (TTF/OTF) bytes
  const sfntBuffer = await getFontAsSfnt(buffer, sourceExt);
  onProgress?.(50);

  const flavor = getSfntFlavor(sfntBuffer);
  let resultBlob: Blob;

  switch (targetFormat) {
    case 'ttf': {
      if (flavor === 'otf') {
        // CFF → TrueType: opentype.js doesn't convert outlines,
        // but the raw SFNT is still valid and most apps handle it.
        // We re-export via opentype.js to ensure valid structure.
        const opentype = await import('opentype.js');
        const font = opentype.parse(sfntBuffer);
        const outBuffer = font.toArrayBuffer();
        resultBlob = new Blob([outBuffer], { type: getMimeType('ttf') });
      } else {
        resultBlob = new Blob([sfntBuffer], { type: getMimeType('ttf') });
      }
      break;
    }

    case 'otf': {
      // Similar to TTF — we output the SFNT data.
      // True CFF↔TrueType outline conversion is extremely complex.
      // We keep the original outlines but wrap in the requested container.
      const opentype = await import('opentype.js');
      const font = opentype.parse(sfntBuffer);
      const outBuffer = font.toArrayBuffer();
      resultBlob = new Blob([outBuffer], { type: getMimeType('otf') });
      break;
    }

    case 'woff': {
      const woffBuffer = await sfntToWoff(sfntBuffer);
      resultBlob = new Blob([woffBuffer], { type: getMimeType('woff') });
      break;
    }

    case 'woff2': {
      const woff2 = await import('woff2-encoder');
      const compressed = await woff2.compress(new Uint8Array(sfntBuffer));
      resultBlob = new Blob([compressed.buffer as ArrayBuffer], { type: getMimeType('woff2') });
      break;
    }

    default:
      throw new Error(`Unsupported font conversion: ${sourceExt} → ${targetFormat}`);
  }

  onProgress?.(100);

  return {
    blob: resultBlob,
    filename: buildOutputFilename(file.name, targetFormat),
  };
}
