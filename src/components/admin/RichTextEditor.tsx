'use client';

import React, { useState, useRef, useEffect } from 'react';
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
  Type,
  RemoveFormatting,
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
  placeholder = 'Write content here (use toolbar above to format headlines, bold text, bullet points)...',
  rows = 8,
}: RichTextEditorProps) {
  const [viewMode, setViewMode] = useState<'visual' | 'code' | 'preview'>('visual');
  const visualRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isInternalChange = useRef(false);

  // Synchronize value to contentEditable div when value changes externally
  useEffect(() => {
    if (visualRef.current && !isInternalChange.current) {
      if (visualRef.current.innerHTML !== value) {
        visualRef.current.innerHTML = value || '';
      }
    }
    isInternalChange.current = false;
  }, [value, viewMode]);

  const handleVisualInput = () => {
    if (!visualRef.current) return;
    const html = visualRef.current.innerHTML;
    isInternalChange.current = true;
    onChange(html);
  };

  const exec = (command: string, arg: string | undefined = undefined) => {
    if (viewMode === 'visual') {
      if (visualRef.current) {
        visualRef.current.focus();
        document.execCommand(command, false, arg);
        handleVisualInput();
      }
    } else if (viewMode === 'code') {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selected = value.substring(start, end);

      let open = '';
      let close = '';

      if (command === 'formatBlock' && arg === '<h2>') {
        open = '<h2>';
        close = '</h2>';
      } else if (command === 'formatBlock' && arg === '<h3>') {
        open = '<h3>';
        close = '</h3>';
      } else if (command === 'formatBlock' && arg === '<p>') {
        open = '<p>';
        close = '</p>';
      } else if (command === 'formatBlock' && arg === '<blockquote>') {
        open = '<blockquote>';
        close = '</blockquote>';
      } else if (command === 'bold') {
        open = '<strong>';
        close = '</strong>';
      } else if (command === 'italic') {
        open = '<em>';
        close = '</em>';
      } else if (command === 'insertUnorderedList') {
        open = '<ul>\n  <li>';
        close = '</li>\n</ul>';
      } else if (command === 'insertOrderedList') {
        open = '<ol>\n  <li>';
        close = '</li>\n</ol>';
      }

      if (open && close) {
        const replacement = `${open}${selected || 'Sample text'}${close}`;
        const newValue = value.substring(0, start) + replacement + value.substring(end);
        onChange(newValue);
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start + open.length, start + open.length + (selected.length || 11));
        }, 0);
      }
    }
  };

  const handleInsertLink = () => {
    const url = prompt('Enter website link or relative URL (e.g. https://... or /products):');
    if (!url) return;

    if (viewMode === 'visual') {
      exec('createLink', url);
    } else if (viewMode === 'code') {
      const textarea = textareaRef.current;
      if (!textarea) return;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selected = value.substring(start, end) || 'link text';
      const replacement = `<a href="${url}">${selected}</a>`;
      const newValue = value.substring(0, start) + replacement + value.substring(end);
      onChange(newValue);
    }
  };

  return (
    <div className="rounded-xl border border-input bg-background overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 shadow-sm">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between border-b border-border bg-muted/40 p-2 gap-2">
        <div className="flex items-center gap-1 flex-wrap">
          <button
            type="button"
            onClick={() => exec('formatBlock', '<h2>')}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold text-foreground hover:bg-muted transition-colors border border-border/60 bg-card"
            title="Heading 2 (Large Headline)"
          >
            <Heading2 className="h-3.5 w-3.5 text-primary" />
            <span>H2</span>
          </button>

          <button
            type="button"
            onClick={() => exec('formatBlock', '<h3>')}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold text-foreground hover:bg-muted transition-colors border border-border/60 bg-card"
            title="Heading 3 (Sub-headline)"
          >
            <Heading3 className="h-3.5 w-3.5 text-primary" />
            <span>H3</span>
          </button>

          <button
            type="button"
            onClick={() => exec('formatBlock', '<p>')}
            className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors border border-border/60 bg-card"
            title="Paragraph"
          >
            <Type className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Paragraph</span>
          </button>

          <div className="h-4 w-px bg-border mx-1" />

          <button
            type="button"
            onClick={() => exec('bold')}
            className="rounded-lg p-1.5 text-foreground hover:bg-muted transition-colors border border-border/60 bg-card"
            title="Bold (Ctrl+B)"
          >
            <Bold className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => exec('italic')}
            className="rounded-lg p-1.5 text-foreground hover:bg-muted transition-colors border border-border/60 bg-card"
            title="Italic (Ctrl+I)"
          >
            <Italic className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => exec('insertUnorderedList')}
            className="rounded-lg p-1.5 text-foreground hover:bg-muted transition-colors border border-border/60 bg-card"
            title="Bullet List"
          >
            <List className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => exec('insertOrderedList')}
            className="rounded-lg p-1.5 text-foreground hover:bg-muted transition-colors border border-border/60 bg-card"
            title="Numbered List"
          >
            <ListOrdered className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => exec('formatBlock', '<blockquote>')}
            className="rounded-lg p-1.5 text-foreground hover:bg-muted transition-colors border border-border/60 bg-card"
            title="Quote Box"
          >
            <Quote className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={handleInsertLink}
            className="rounded-lg p-1.5 text-foreground hover:bg-muted transition-colors border border-border/60 bg-card"
            title="Insert Link"
          >
            <LinkIcon className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => exec('removeFormat')}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="Clear Formatting"
          >
            <RemoveFormatting className="h-4 w-4" />
          </button>
        </div>

        {/* Mode switcher tabs */}
        <div className="flex items-center gap-1 bg-background rounded-lg border border-border p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setViewMode('visual')}
            className={`flex items-center gap-1 rounded px-2.5 py-1 font-semibold transition-colors ${
              viewMode === 'visual'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Type className="h-3.5 w-3.5" />
            <span>Visual</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('code')}
            className={`flex items-center gap-1 rounded px-2.5 py-1 font-semibold transition-colors ${
              viewMode === 'code'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Code2 className="h-3.5 w-3.5" />
            <span>HTML Code</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('preview')}
            className={`flex items-center gap-1 rounded px-2.5 py-1 font-semibold transition-colors ${
              viewMode === 'preview'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Eye className="h-3.5 w-3.5" />
            <span>Preview</span>
          </button>
        </div>
      </div>

      {/* Editor Body */}
      {viewMode === 'visual' && (
        <div
          id={id}
          ref={visualRef}
          contentEditable
          onInput={handleVisualInput}
          onBlur={handleVisualInput}
          data-placeholder={placeholder}
          className="p-4 min-h-[160px] text-xs text-foreground focus:outline-none leading-relaxed prose prose-sm dark:prose-invert max-w-none empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground empty:before:pointer-events-none [&>h2]:text-lg [&>h2]:font-bold [&>h2]:mb-2 [&>h3]:text-base [&>h3]:font-bold [&>h3]:mb-1 [&>p]:mb-2 [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:mb-2 [&>ol]:list-decimal [&>ol]:pl-5 [&>ol]:mb-2 [&>blockquote]:border-l-4 [&>blockquote]:border-primary [&>blockquote]:pl-3 [&>blockquote]:italic [&>a]:text-primary [&>a]:underline"
        />
      )}

      {viewMode === 'code' && (
        <textarea
          id={id}
          ref={textareaRef}
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent p-4 font-mono text-xs text-foreground focus:outline-none resize-y"
        />
      )}

      {viewMode === 'preview' && (
        <div
          className="p-4 prose prose-sm dark:prose-invert max-w-none text-foreground leading-relaxed min-h-[160px] bg-card/40 [&>h2]:text-xl [&>h2]:font-bold [&>h3]:text-lg [&>h3]:font-bold [&>p]:text-xs [&>p]:text-muted-foreground [&>ul]:list-disc [&>ul]:pl-5 [&>ol]:list-decimal [&>ol]:pl-5 [&>blockquote]:border-l-4 [&>blockquote]:border-primary [&>blockquote]:pl-3 [&>blockquote]:italic [&>a]:text-primary [&>a]:underline"
          dangerouslySetInnerHTML={{
            __html: value || '<p class="text-xs text-muted-foreground italic">Nothing to preview yet.</p>',
          }}
        />
      )}
    </div>
  );
}
