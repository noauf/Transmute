import { ConversionResult } from '@/types';
import { buildOutputFilename, getMimeType } from '@/lib/utils';

/**
 * Encode raw RGBA pixel data into a minimal TIFF (uncompressed).
 * Returns a Blob with image/tiff MIME type.
 */
function encodeRGBAToTiff(
  rgba: Uint8ClampedArray,
  width: number,
  height: number
): Blob {
  const pixelCount = width * height;

  // Convert RGBA → RGB (TIFF without alpha)
  const rgb = new Uint8Array(pixelCount * 3);
  for (let i = 0; i < pixelCount; i++) {
    rgb[i * 3] = rgba[i * 4];
    rgb[i * 3 + 1] = rgba[i * 4 + 1];
    rgb[i * 3 + 2] = rgba[i * 4 + 2];
  }

  const stripByteCount = rgb.length;
  const ifdEntryCount = 12;
  const ifdSize = 2 + ifdEntryCount * 12 + 4; // count + entries + next IFD offset

  // Layout: header (8) + IFD (ifdSize) + strip offset value & bits per sample data (inline) + pixel data
  const headerSize = 8;
  const bitsPerSampleOffset = headerSize + ifdSize;
  const stripDataOffset = bitsPerSampleOffset + 6; // 3 shorts for BitsPerSample
  const fileSize = stripDataOffset + stripByteCount;

  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  // TIFF Header (little-endian)
  view.setUint16(0, 0x4949, false); // 'II' = little-endian
  view.setUint16(2, 42, true);       // TIFF magic
  view.setUint32(4, 8, true);        // Offset to first IFD

  // IFD
  let offset = 8;
  view.setUint16(offset, ifdEntryCount, true);
  offset += 2;

  function writeIfdEntry(tag: number, type: number, count: number, value: number) {
    view.setUint16(offset, tag, true);
    view.setUint16(offset + 2, type, true);
    view.setUint32(offset + 4, count, true);
    view.setUint32(offset + 8, value, true);
    offset += 12;
  }

  // ImageWidth (256)
  writeIfdEntry(256, 3, 1, width);
  // ImageLength (257)
  writeIfdEntry(257, 3, 1, height);
  // BitsPerSample (258) — 3 values (8,8,8), must point to offset
  writeIfdEntry(258, 3, 3, bitsPerSampleOffset);
  // Compression (259) — 1 = no compression
  writeIfdEntry(259, 3, 1, 1);
  // PhotometricInterpretation (262) — 2 = RGB
  writeIfdEntry(262, 3, 1, 2);
  // StripOffsets (273)
  writeIfdEntry(273, 4, 1, stripDataOffset);
  // SamplesPerPixel (277) — 3
  writeIfdEntry(277, 3, 1, 3);
  // RowsPerStrip (278)
  writeIfdEntry(278, 3, 1, height);
  // StripByteCounts (279)
  writeIfdEntry(279, 4, 1, stripByteCount);
  // XResolution (282) — use rational 72/1 — pack inline as offset to rational
  // Actually for simplicity, store a dummy value. 72 DPI.
  writeIfdEntry(282, 5, 1, 0); // Will skip proper rational — just placeholder
  // YResolution (283)
  writeIfdEntry(283, 5, 1, 0);
  // ResolutionUnit (296) — 2 = inches
  writeIfdEntry(296, 3, 1, 2);

  // Next IFD offset = 0 (no more IFDs)
  view.setUint32(offset, 0, true);

  // BitsPerSample values at bitsPerSampleOffset
  view.setUint16(bitsPerSampleOffset, 8, true);
  view.setUint16(bitsPerSampleOffset + 2, 8, true);
  view.setUint16(bitsPerSampleOffset + 4, 8, true);

  // Pixel data
  bytes.set(rgb, stripDataOffset);

  return new Blob([buffer], { type: 'image/tiff' });
}

/**
 * Encode raw RGBA pixel data into a basic ICO file (single icon, 256x256 max, BMP format).
 */
function encodeRGBAToIco(
  rgba: Uint8ClampedArray,
  width: number,
  height: number
): Blob {
  // ICO specs: max 256x256 per entry. If larger, we'll resize via canvas before calling this.
  const w = Math.min(width, 256);
  const h = Math.min(height, 256);

  // BMP pixel data: BGRA, bottom-up
  const bmpPixelSize = w * h * 4;
  const andMaskRowSize = Math.ceil(w / 8);
  const andMaskRowPadded = (andMaskRowSize + 3) & ~3;
  const andMaskSize = andMaskRowPadded * h;

  const bmpHeaderSize = 40; // BITMAPINFOHEADER
  const imageSize = bmpHeaderSize + bmpPixelSize + andMaskSize;

  // ICO header: 6 bytes + 1 entry (16 bytes) + image data
  const icoHeaderSize = 6;
  const icoEntrySize = 16;
  const fileSize = icoHeaderSize + icoEntrySize + imageSize;

  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);

  // ICO Header
  view.setUint16(0, 0, true);       // Reserved
  view.setUint16(2, 1, true);       // Type: 1 = ICO
  view.setUint16(4, 1, true);       // Count: 1 image

  // ICO Directory Entry
  const entryOffset = 6;
  view.setUint8(entryOffset, w === 256 ? 0 : w);      // Width (0 = 256)
  view.setUint8(entryOffset + 1, h === 256 ? 0 : h);  // Height (0 = 256)
  view.setUint8(entryOffset + 2, 0);                    // Color palette
  view.setUint8(entryOffset + 3, 0);                    // Reserved
  view.setUint16(entryOffset + 4, 1, true);             // Color planes
  view.setUint16(entryOffset + 6, 32, true);            // Bits per pixel
  view.setUint32(entryOffset + 8, imageSize, true);     // Image data size
  view.setUint32(entryOffset + 12, icoHeaderSize + icoEntrySize, true); // Offset to image data

  // BMP Info Header (BITMAPINFOHEADER)
  const bmpOffset = icoHeaderSize + icoEntrySize;
  view.setUint32(bmpOffset, 40, true);           // Header size
  view.setInt32(bmpOffset + 4, w, true);         // Width
  view.setInt32(bmpOffset + 8, h * 2, true);     // Height (doubled for ICO — includes AND mask)
  view.setUint16(bmpOffset + 12, 1, true);       // Planes
  view.setUint16(bmpOffset + 14, 32, true);      // Bits per pixel
  view.setUint32(bmpOffset + 16, 0, true);       // Compression (none)
  view.setUint32(bmpOffset + 20, bmpPixelSize + andMaskSize, true); // Image size
  view.setUint32(bmpOffset + 24, 0, true);       // X pixels per meter
  view.setUint32(bmpOffset + 28, 0, true);       // Y pixels per meter
  view.setUint32(bmpOffset + 32, 0, true);       // Colors used
  view.setUint32(bmpOffset + 36, 0, true);       // Important colors

  // BMP Pixel data (BGRA, bottom-up)
  const pixelOffset = bmpOffset + bmpHeaderSize;
  const pixels = new Uint8Array(buffer);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const srcIdx = ((h - 1 - y) * width + x) * 4; // bottom-up, use original width for source
      const dstIdx = pixelOffset + (y * w + x) * 4;
      pixels[dstIdx] = rgba[srcIdx + 2];     // B
      pixels[dstIdx + 1] = rgba[srcIdx + 1]; // G
      pixels[dstIdx + 2] = rgba[srcIdx];     // R
      pixels[dstIdx + 3] = rgba[srcIdx + 3]; // A
    }
  }

  // AND mask (all zeros = fully opaque)
  // Already initialized to 0

  return new Blob([buffer], { type: 'image/x-icon' });
}

export async function convertImage(
  file: File,
  targetFormat: string,
  onProgress?: (progress: number) => void
): Promise<ConversionResult> {
  onProgress?.(10);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      onProgress?.(50);

      let drawWidth = img.naturalWidth;
      let drawHeight = img.naturalHeight;

      // ICO: clamp to 256x256
      if (targetFormat === 'ico') {
        if (drawWidth > 256 || drawHeight > 256) {
          const scale = Math.min(256 / drawWidth, 256 / drawHeight);
          drawWidth = Math.round(drawWidth * scale);
          drawHeight = Math.round(drawHeight * scale);
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = drawWidth;
      canvas.height = drawHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      // White background for formats that don't support transparency
      if (['jpg', 'jpeg', 'bmp', 'tiff', 'tif'].includes(targetFormat)) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.drawImage(img, 0, 0, drawWidth, drawHeight);
      onProgress?.(80);

      // TIFF — custom encoder (browsers don't support canvas.toBlob for TIFF)
      if (targetFormat === 'tiff' || targetFormat === 'tif') {
        const imageData = ctx.getImageData(0, 0, drawWidth, drawHeight);
        const blob = encodeRGBAToTiff(imageData.data, drawWidth, drawHeight);
        onProgress?.(100);
        resolve({
          blob,
          filename: buildOutputFilename(file.name, targetFormat),
        });
        return;
      }

      // ICO — custom encoder
      if (targetFormat === 'ico') {
        const imageData = ctx.getImageData(0, 0, drawWidth, drawHeight);
        const blob = encodeRGBAToIco(imageData.data, drawWidth, drawHeight);
        onProgress?.(100);
        resolve({
          blob,
          filename: buildOutputFilename(file.name, targetFormat),
        });
        return;
      }

      // Standard browser-supported formats
      const mimeType = getMimeType(targetFormat);
      const quality = ['jpg', 'jpeg', 'webp', 'avif'].includes(targetFormat) ? 0.92 : undefined;

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error(`Failed to convert to ${targetFormat}. Your browser may not support this format.`));
            return;
          }
          onProgress?.(100);
          resolve({
            blob,
            filename: buildOutputFilename(file.name, targetFormat),
          });
        },
        mimeType,
        quality
      );
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}
