import { describe, it, expect } from 'vitest';
import { validateImageSignature, mediaUploadSchema } from './media';

describe('Media File Signature and Upload Validation', () => {
  it('validates mandatory altText schema correctly', () => {
    const valid = mediaUploadSchema.safeParse({ altText: 'Diamond engagement ring hero shot' });
    expect(valid.success).toBe(true);

    const empty = mediaUploadSchema.safeParse({ altText: '' });
    expect(empty.success).toBe(false);
  });

  it('verifies valid JPEG magic bytes (FF D8 FF)', () => {
    const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
    const res = validateImageSignature(jpegBuffer, 'image/jpeg');
    expect(res.isValid).toBe(true);
  });

  it('rejects fake JPEG with text or non-JPEG content', () => {
    const fakeBuffer = Buffer.from('<!DOCTYPE html><html><body>malicious</body></html>', 'utf8');
    const res = validateImageSignature(fakeBuffer, 'image/jpeg');
    expect(res.isValid).toBe(false);
    expect(res.error).toContain('binary signature does not match image/jpeg');
  });

  it('verifies valid PNG magic bytes (89 50 4E 47)', () => {
    const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const res = validateImageSignature(pngBuffer, 'image/png');
    expect(res.isValid).toBe(true);
  });

  it('verifies valid WebP signature (RIFF ... WEBP)', () => {
    const webpHeader = Buffer.from([
      0x52, 0x49, 0x46, 0x46, // RIFF
      0x00, 0x00, 0x00, 0x00, // Size
      0x57, 0x45, 0x42, 0x50, // WEBP
    ]);
    const res = validateImageSignature(webpHeader, 'image/webp');
    expect(res.isValid).toBe(true);
  });

  it('sanitizes SVG with malicious <script> tags and onload handlers', () => {
    const maliciousSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" onload="alert(1)">
      <circle cx="50" cy="50" r="40" fill="red" />
      <script>alert(document.cookie);</script>
    </svg>`;
    const svgBuffer = Buffer.from(maliciousSvg, 'utf8');
    const res = validateImageSignature(svgBuffer, 'image/svg+xml');
    expect(res.isValid).toBe(true);
    expect(res.sanitizedBuffer).toBeDefined();
    const cleanSvg = res.sanitizedBuffer!.toString('utf8');
    expect(cleanSvg).not.toContain('<script>');
    expect(cleanSvg).not.toContain('alert(1)');
    expect(cleanSvg).toContain('<circle');
  });

  it('rejects invalid SVG missing root <svg> element', () => {
    const nonSvg = Buffer.from('<html><body><div>not an svg</div></body></html>', 'utf8');
    const res = validateImageSignature(nonSvg, 'image/svg+xml');
    expect(res.isValid).toBe(false);
  });
});
