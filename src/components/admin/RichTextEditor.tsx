'use client';

import React, { useState, useRef } from 'react';
import {
  Heading2,
  Heading3,
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
  Code,
  Link as LinkIcon,
  Eye,
  Code2,
} from 'lucide-react';

interface RichTextEditorProps {
  id?: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  rows?: number;
}

export function RichTextEditor({
  id = 'rich-editor',
  value,
  onChange,
  placeholder = 'Write HTML content...',
  rows = 10,
}: RichTextEditorProps) {
  const [viewMode, setViewMode] = useState<'editor' | 'preview'>('editor');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertTag = (tag: string, closeTag?: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.substring(start, end);
    const closing = closeTag || `</${tag}>`;
    const open = `<${tag}>`;

    const replacement = `${open}${selected || 'Content'}${closing}`;
    const newValue = value.substring(0, start) + replacement + value.substring(end);

    onChange(newValue);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + open.length, start + open.length + (selected.length || 7));
    }, 0);
  };

  const insertLink = () => {
    const url = prompt('Enter URL (e.g. https://example.com or /products):');
    if (!url) return;

    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.substring(start, end) || 'link text';
    const replacement = `<a href="${url}">${selected}</a>`;

    const newValue = value.substring(0, start) + replacement + value.substring(end);
    onChange(newValue);
  };

  return (
    <div className="rounded-xl border border-input bg-background overflow-hidden focus-within:ring-2 focus-within:ring-primary/20">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between border-b border-border bg-muted/40 p-1.5 gap-1">
        <div className="flex items-center gap-0.5 flex-wrap">
          <button
            type="button"
            onClick={() => insertTag('h2')}
            className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="Heading 2 (<h2>)"
          >
            <Heading2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => insertTag('h3')}
            className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="Heading 3 (<h3>)"
          >
            <Heading3 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => insertTag('strong')}
            className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="Bold (<strong>)"
          >
            <Bold className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => insertTag('em')}
            className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="Italic (<em>)"
          >
            <Italic className="h-4 w-4" />
          </button>
          <div className="h-4 w-px bg-border mx-1" />
          <button
            type="button"
            onClick={() => insertTag('p')}
            className="rounded px-2 py-1 text-xs font-bold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="Paragraph (<p>)"
          >
            P
          </button>
          <button
            type="button"
            onClick={() => insertTag('ul><li>', '</li></ul>')}
            className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="Bullet List (<ul><li>)"
          >
            <List className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => insertTag('ol><li>', '</li></ol>')}
            className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="Numbered List (<ol><li>)"
          >
            <ListOrdered className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => insertTag('blockquote')}
            className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="Blockquote (<blockquote>)"
          >
            <Quote className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => insertTag('code')}
            className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="Code (<code>)"
          >
            <Code className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={insertLink}
            className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="Insert Link (<a>)"
          >
            <LinkIcon className="h-4 w-4" />
          </button>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 bg-background rounded-lg border border-border p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setViewMode('editor')}
            className={`flex items-center gap-1 rounded px-2 py-1 font-semibold transition-colors ${
              viewMode === 'editor'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Code2 className="h-3.5 w-3.5" />
            <span>HTML Editor</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('preview')}
            className={`flex items-center gap-1 rounded px-2 py-1 font-semibold transition-colors ${
              viewMode === 'preview'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Eye className="h-3.5 w-3.5" />
            <span>Live Preview</span>
          </button>
        </div>
      </div>

      {/* Editor Body */}
      {viewMode === 'editor' ? (
        <textarea
          id={id}
          ref={textareaRef}
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent p-4 font-mono text-xs text-foreground focus:outline-none resize-y"
        />
      ) : (
        <div
          className="p-4 prose prose-neutral dark:prose-invert max-w-none text-foreground leading-relaxed min-h-[160px] bg-card/40 [&>h2]:text-xl [&>h2]:font-bold [&>h3]:text-lg [&>h3]:font-bold [&>p]:text-xs [&>p]:text-muted-foreground [&>ul]:list-disc [&>ul]:pl-5 [&>ol]:list-decimal [&>ol]:pl-5 [&>blockquote]:border-l-4 [&>blockquote]:border-primary [&>blockquote]:pl-3 [&>blockquote]:italic [&>a]:text-primary [&>a]:underline"
          dangerouslySetInnerHTML={{ __html: value || '<p className="text-xs text-muted-foreground italic">Nothing to preview</p>' }}
        />
      )}
    </div>
  );
}
