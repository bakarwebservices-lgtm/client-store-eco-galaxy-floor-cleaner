import React from 'react';

interface SafeHtmlProps {
  content?: string | null;
  className?: string;
  as?: 'div' | 'p' | 'span';
}

/**
 * Universal Storefront Content Renderer.
 * Detects whether content is HTML or plain text.
 * - If HTML: Renders safely with proper typography styles, eliminating raw HTML tags (<p>, <strong>, <ul>) on screen.
 * - If Plain Text: Renders with preserved line-breaks (whitespace-pre-line).
 */
export function SafeHtml({ content, className = '', as = 'div' }: SafeHtmlProps) {
  if (!content || typeof content !== 'string') return null;

  const hasHtmlTags = /<[a-z][\s\S]*>/i.test(content);

  if (hasHtmlTags) {
    const Tag = as === 'p' ? 'div' : as;
    return (
      <Tag
        className={`prose prose-neutral dark:prose-invert max-w-none text-muted-foreground leading-relaxed [&>p]:mb-2 [&>ul]:list-disc [&>ul]:pl-4 [&>ul]:space-y-1 [&>ol]:list-decimal [&>ol]:pl-4 [&>ol]:space-y-1 [&>strong]:text-foreground [&>h2]:text-base [&>h2]:font-bold [&>h2]:text-foreground [&>h3]:text-sm [&>h3]:font-bold [&>h3]:text-foreground ${className}`}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  }

  const Tag = as;
  return <Tag className={`whitespace-pre-line ${className}`}>{content}</Tag>;
}
