import { z } from 'zod';

export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'image/avif',
];

export const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/ogg',
  'video/x-m4v',
];

export const ALLOWED_MEDIA_TYPES = [
  ...ALLOWED_IMAGE_TYPES,
  ...ALLOWED_VIDEO_TYPES,
];

export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB to comfortably support product showcase videos

export const mediaUploadSchema = z.object({
  altText: z
    .string()
    .max(255, 'Alt text must be under 255 characters')
    .optional()
    .default('Product Media Asset'),
});

export const mediaUpdateSchema = z.object({
  altText: z
    .string()
    .min(1, 'Alt text cannot be empty')
    .max(255, 'Alt text must be under 255 characters'),
});

export function isVideoMimeType(mimeType: string): boolean {
  return ALLOWED_VIDEO_TYPES.includes(mimeType) || mimeType.startsWith('video/');
}

/**
 * Validates actual binary content (magic bytes) against declared MIME type
 * and sanitizes SVG files to prevent XSS / malicious code execution.
 */
export function validateImageSignature(
  buffer: Buffer,
  declaredMimeType: string
): { isValid: boolean; sanitizedBuffer?: Buffer; error?: string } {
  if (!buffer || buffer.length < 4) {
    return { isValid: false, error: 'File buffer is too small or empty.' };
  }

  // ==========================================
  // 1. IMAGE FORMATS
  // ==========================================

  // JPEG signature: FF D8 FF
  if (declaredMimeType === 'image/jpeg') {
    const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    if (!isJpeg) {
      return { isValid: false, error: 'Invalid JPEG file content: binary signature does not match image/jpeg.' };
    }
    return { isValid: true, sanitizedBuffer: buffer };
  }

  // PNG signature: 89 50 4E 47 0D 0A 1A 0A
  if (declaredMimeType === 'image/png') {
    const isPng =
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47;
    if (!isPng) {
      return { isValid: false, error: 'Invalid PNG file content: binary signature does not match image/png.' };
    }
    return { isValid: true, sanitizedBuffer: buffer };
  }

  // GIF signature: GIF87a or GIF89a (47 49 46 38)
  if (declaredMimeType === 'image/gif') {
    const isGif =
      buffer[0] === 0x47 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x38;
    if (!isGif) {
      return { isValid: false, error: 'Invalid GIF file content: binary signature does not match image/gif.' };
    }
    return { isValid: true, sanitizedBuffer: buffer };
  }

  // WebP signature: RIFF (bytes 0-3) and WEBP (bytes 8-11)
  if (declaredMimeType === 'image/webp') {
    const isRiff =
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46;
    const isWebp =
      buffer.length >= 12 &&
      buffer[8] === 0x57 &&
      buffer[9] === 0x45 &&
      buffer[10] === 0x42 &&
      buffer[11] === 0x50;
    if (!isRiff || !isWebp) {
      return { isValid: false, error: 'Invalid WebP file content: binary signature does not match image/webp.' };
    }
    return { isValid: true, sanitizedBuffer: buffer };
  }

  // AVIF signature: ftyp box containing avif / avis / mif1
  if (declaredMimeType === 'image/avif') {
    if (buffer.length < 12) {
      return { isValid: false, error: 'Invalid AVIF file: header too short.' };
    }
    const headerStr = buffer.subarray(4, 12).toString('ascii');
    const isAvif =
      headerStr.includes('ftyp') ||
      headerStr.includes('avif') ||
      headerStr.includes('avis') ||
      headerStr.includes('mif1');
    if (!isAvif) {
      return { isValid: false, error: 'Invalid AVIF file content: binary signature does not match image/avif.' };
    }
    return { isValid: true, sanitizedBuffer: buffer };
  }

  // SVG validation and sanitization:
  if (declaredMimeType === 'image/svg+xml') {
    const textContent = buffer.toString('utf8');

    if (!textContent.includes('<svg')) {
      return { isValid: false, error: 'Invalid SVG file: root <svg> element missing.' };
    }

    const dangerousPatterns = [
      /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
      /<script[\s\S]*?>/gi,
      /on\w+\s*=\s*["'][^"']*["']/gi,
      /on\w+\s*=\s*[^>\s]+/gi,
      /javascript\s*:/gi,
      /<iframe[\s\S]*?>/gi,
      /<embed[\s\S]*?>/gi,
      /<object[\s\S]*?>/gi,
      /<!ENTITY/gi,
    ];

    let sanitizedSvg = textContent;
    let hadMaliciousPayload = false;

    for (const pattern of dangerousPatterns) {
      if (pattern.test(sanitizedSvg)) {
        hadMaliciousPayload = true;
        sanitizedSvg = sanitizedSvg.replace(pattern, '');
      }
    }

    if (hadMaliciousPayload) {
      sanitizedSvg = sanitizedSvg
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/on\w+="[^"]*"/gi, '')
        .replace(/on\w+='[^']*'/gi, '');
    }

    return {
      isValid: true,
      sanitizedBuffer: Buffer.from(sanitizedSvg, 'utf8'),
    };
  }

  // ==========================================
  // 2. VIDEO FORMATS
  // ==========================================

  // MP4 / M4V / QuickTime MOV signature: ftyp box or moov/mdat box
  if (declaredMimeType === 'video/mp4' || declaredMimeType === 'video/x-m4v' || declaredMimeType === 'video/quicktime') {
    if (buffer.length < 8) {
      return { isValid: false, error: 'Invalid video file: header too short.' };
    }
    const boxType = buffer.subarray(4, 8).toString('ascii');
    const isMp4OrMov =
      boxType === 'ftyp' ||
      boxType === 'moov' ||
      boxType === 'mdat' ||
      boxType === 'wide' ||
      boxType === 'skip';
    if (!isMp4OrMov) {
      return { isValid: false, error: 'Invalid video file content: binary signature does not match MP4/MOV.' };
    }
    return { isValid: true, sanitizedBuffer: buffer };
  }

  // WebM signature: EBML ID 1A 45 DF A3 at beginning
  if (declaredMimeType === 'video/webm') {
    const isWebm =
      buffer[0] === 0x1a &&
      buffer[1] === 0x45 &&
      buffer[2] === 0xdf &&
      buffer[3] === 0xa3;
    if (!isWebm) {
      return { isValid: false, error: 'Invalid WebM file content: binary signature does not match video/webm.' };
    }
    return { isValid: true, sanitizedBuffer: buffer };
  }

  // OGG video signature: OggS
  if (declaredMimeType === 'video/ogg') {
    const isOgg =
      buffer[0] === 0x4f &&
      buffer[1] === 0x67 &&
      buffer[2] === 0x67 &&
      buffer[3] === 0x53;
    if (!isOgg) {
      return { isValid: false, error: 'Invalid OGG video content: binary signature does not match video/ogg.' };
    }
    return { isValid: true, sanitizedBuffer: buffer };
  }

  return { isValid: false, error: 'Unsupported media file type.' };
}
