import { ConversionResult } from '@/types';
import { buildOutputFilename, getMimeType } from '@/lib/utils';
import { getExtension } from '@/lib/fileDetector';

/* eslint-disable @typescript-eslint/no-explicit-any */
let ffmpegInstance: any = null;
let ffmpegLoadPromise: Promise<any> | null = null;

async function getFFmpeg(onLoadProgress?: (msg: string) => void) {
  if (ffmpegInstance) return ffmpegInstance;

  if (ffmpegLoadPromise) {
    return ffmpegLoadPromise;
  }

  ffmpegLoadPromise = (async () => {
    onLoadProgress?.('Loading conversion engine...');
    const { FFmpeg } = await import('@ffmpeg/ffmpeg');
    const { toBlobURL } = await import('@ffmpeg/util');

    const ffmpeg = new FFmpeg();

    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';

    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });

    ffmpegInstance = ffmpeg;
    return ffmpeg;
  })();

  return ffmpegLoadPromise;
}

function getOutputMimeType(targetFormat: string): string {
  return getMimeType(targetFormat);
}

function getFFmpegArgs(sourceExt: string, targetFormat: string): string[] {
  const audioFormats = ['mp3', 'wav', 'flac', 'ogg', 'aac', 'm4a', 'wma', 'opus'];
  const videoFormats = ['mp4', 'webm', 'avi', 'mov', 'mkv', 'flv', 'wmv', 'm4v'];

  // Audio → Audio
  if (audioFormats.includes(sourceExt) && audioFormats.includes(targetFormat)) {
    const args = ['-i', `input.${sourceExt}`];
    switch (targetFormat) {
      case 'mp3':
        args.push('-codec:a', 'libmp3lame', '-b:a', '192k');
        break;
      case 'aac':
      case 'm4a':
        args.push('-codec:a', 'aac', '-b:a', '192k');
        break;
      case 'ogg':
        args.push('-codec:a', 'libvorbis', '-b:a', '192k');
        break;
      case 'flac':
        args.push('-codec:a', 'flac');
        break;
      case 'wav':
        args.push('-codec:a', 'pcm_s16le');
        break;
      case 'opus':
        args.push('-codec:a', 'libopus', '-b:a', '128k');
        break;
      case 'wma':
        args.push('-codec:a', 'wmav2', '-b:a', '192k');
        break;
    }
    args.push(`output.${targetFormat}`);
    return args;
  }

  // Video → Video
  if (videoFormats.includes(sourceExt) && videoFormats.includes(targetFormat)) {
    // WebM needs VP8/VP9 + Vorbis/Opus, not libx264
    if (targetFormat === 'webm') {
      return [
        '-i', `input.${sourceExt}`,
        '-c:v', 'libvpx', '-b:v', '1M', '-crf', '30',
        '-c:a', 'libvorbis', '-b:a', '128k',
        `output.${targetFormat}`,
      ];
    }
    return [
      '-i', `input.${sourceExt}`,
      '-c:v', 'libx264', '-preset', 'fast',
      '-c:a', 'aac',
      `output.${targetFormat}`,
    ];
  }

  // Video → Audio (extract)
  if (videoFormats.includes(sourceExt) && audioFormats.includes(targetFormat)) {
    const args = ['-i', `input.${sourceExt}`, '-vn'];
    switch (targetFormat) {
      case 'mp3':
        args.push('-codec:a', 'libmp3lame', '-b:a', '192k');
        break;
      case 'aac':
      case 'm4a':
        args.push('-codec:a', 'aac', '-b:a', '192k');
        break;
      case 'ogg':
        args.push('-codec:a', 'libvorbis', '-b:a', '192k');
        break;
      case 'wav':
        args.push('-codec:a', 'pcm_s16le');
        break;
      case 'flac':
        args.push('-codec:a', 'flac');
        break;
      case 'opus':
        args.push('-codec:a', 'libopus', '-b:a', '128k');
        break;
    }
    args.push(`output.${targetFormat}`);
    return args;
  }

  // Video → GIF
  if (videoFormats.includes(sourceExt) && targetFormat === 'gif') {
    return [
      '-i', `input.${sourceExt}`,
      '-vf', 'fps=10,scale=480:-1:flags=lanczos',
      '-t', '10',
      `output.gif`,
    ];
  }

  // Fallback
  return ['-i', `input.${sourceExt}`, `output.${targetFormat}`];
}

export async function convertMedia(
  file: File,
  targetFormat: string,
  onProgress?: (progress: number) => void
): Promise<ConversionResult> {
  onProgress?.(5);

  const ffmpeg = await getFFmpeg();
  onProgress?.(20);

  const sourceExt = getExtension(file.name);
  const inputName = `input.${sourceExt}`;
  const outputName = `output.${targetFormat}`;

  // Write input file to ffmpeg virtual FS
  const { fetchFile } = await import('@ffmpeg/util');
  await ffmpeg.writeFile(inputName, await fetchFile(file));
  onProgress?.(30);

  // Progress tracking
  ffmpeg.on('progress', ({ progress }: { progress: number }) => {
    const clampedProgress = Math.min(Math.max(progress, 0), 1);
    onProgress?.(30 + Math.round(clampedProgress * 60));
  });

  // Execute conversion
  const args = getFFmpegArgs(sourceExt, targetFormat);
  await ffmpeg.exec(args);
  onProgress?.(92);

  // Read output
  const data = await ffmpeg.readFile(outputName);

  // Clean up
  try {
    await ffmpeg.deleteFile(inputName);
    await ffmpeg.deleteFile(outputName);
  } catch {
    // Ignore cleanup errors
  }

  onProgress?.(100);

  const blob = new Blob([data], { type: getOutputMimeType(targetFormat) });

  return {
    blob,
    filename: buildOutputFilename(file.name, targetFormat),
  };
}

export function isFFmpegLoaded(): boolean {
  return ffmpegInstance !== null;
}
