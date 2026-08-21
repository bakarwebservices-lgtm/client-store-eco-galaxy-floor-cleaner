import { z } from 'zod';

export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'image/avif',
];

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export const mediaUploadSchema = z.object({
  altText: z
    .string({ required_error: 'Alt text is required for accessibility and SEO' })
    .min(1, 'Alt text is required and cannot be empty')
    .max(255, 'Alt text must be under 255 characters'),
});

export const mediaUpdateSchema = z.object({
  altText: z
    .string()
    .min(1, 'Alt text cannot be empty')
    .max(255, 'Alt text must be under 255 characters'),
});

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

  // 1. JPEG signature: FF D8 FF
  if (declaredMimeType === 'image/jpeg') {
    const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    if (!isJpeg) {
      return { isValid: false, error: 'Invalid JPEG file content: binary signature does not match image/jpeg.' };
    }
    return { isValid: true, sanitizedBuffer: buffer };
  }

  // 2. PNG signature: 89 50 4E 47 0D 0A 1A 0A
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

  // 3. GIF signature: GIF87a or GIF89a (47 49 46 38)
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

  // 4. WebP signature: RIFF (bytes 0-3) and WEBP (bytes 8-11)
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

  // 5. AVIF signature: ftyp box containing avif / avis / mif1
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

  // 6. SVG validation and sanitization:
  if (declaredMimeType === 'image/svg+xml') {
    const textContent = buffer.toString('utf8');

    // Basic structure check: must contain <svg
    if (!textContent.includes('<svg')) {
      return { isValid: false, error: 'Invalid SVG file: root <svg> element missing.' };
    }

    // Adversarial security check: block dangerous constructs
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

    // If active scripts were detected, reject or return sanitized version
    if (hadMaliciousPayload) {
      // Clean up any remaining residue
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

  return { isValid: false, error: 'Unsupported media file type.' };
}

