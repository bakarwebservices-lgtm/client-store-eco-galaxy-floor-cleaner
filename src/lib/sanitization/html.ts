import sanitizeHtml from 'sanitize-html';

export const sanitizeOptions: sanitizeHtml.IOptions = {
  allowedTags: [
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'p',
    'span',
    'div',
    'a',
    'ul',
    'ol',
    'li',
    'b',
    'i',
    'strong',
    'em',
    'strike',
    'code',
    'pre',
    'hr',
    'br',
    'blockquote',
    'table',
    'thead',
    'tbody',
    'tfoot',
    'tr',
    'th',
    'td',
    'img',
    'figure',
    'figcaption',
    'mark',
  ],
  allowedAttributes: {
    a: ['href', 'name', 'target', 'rel', 'title', 'class'],
    img: ['src', 'srcset', 'alt', 'title', 'width', 'height', 'loading', 'class'],
    '*': ['class', 'style', 'id'],
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesByTag: {
    img: ['http', 'https', 'data'],
  },
  transformTags: {
    a: (tagName, attribs) => {
      // Ensure external links have safe rel attributes
      if (attribs.href && !attribs.href.startsWith('/') && !attribs.href.startsWith('#')) {
        return {
          tagName: 'a',
          attribs: {
            ...attribs,
            rel: 'noopener noreferrer nofollow',
            target: attribs.target || '_blank',
          },
        };
      }
      return { tagName: 'a', attribs };
    },
  },
};

/**
 * Strips all dangerous tags (<script>, <iframe>, <object>, etc.) and event attributes
 * (onload, onerror, onclick) from raw HTML to prevent stored XSS attacks.
 */
export function sanitizeRichText(dirtyHtml: string | null | undefined): string {
  if (!dirtyHtml || typeof dirtyHtml !== 'string') return '';
  return sanitizeHtml(dirtyHtml, sanitizeOptions);
}
