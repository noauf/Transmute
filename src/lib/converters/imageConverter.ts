import { ConversionResult } from '@/types';
import { buildOutputFilename, getMimeType } from '@/lib/utils';

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

      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      // White background for formats that don't support transparency
      if (['jpg', 'jpeg', 'bmp'].includes(targetFormat)) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.drawImage(img, 0, 0);
      onProgress?.(80);

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
