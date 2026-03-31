import React, { useState, useCallback } from 'react';
import type { BlockRendererProps } from './BlockRenderer';
import { useDatabaseStore } from '../../store/useDatabaseStore';

const LANGUAGES = [
  'plaintext', 'javascript', 'typescript', 'python', 'rust', 'cpp', 'c',
  'java', 'go', 'html', 'css', 'json', 'yaml', 'markdown', 'bash', 'sql',
  'ruby', 'php', 'swift', 'kotlin', 'lua', 'toml',
];

export function CodeBlock({ block, pageId }: BlockRendererProps) {
  const updateBlock = useDatabaseStore(s => s.updateBlock);
  const [showLangPicker, setShowLangPicker] = useState(false);

  const handleContentChange = useCallback(
    (e: React.FormEvent<HTMLPreElement>) => {
      const text = (e.target as HTMLElement).textContent || '';
      updateBlock(pageId, block.id, { content: text });
    },
    [updateBlock, pageId, block.id]
  );

  const handleLangSelect = useCallback(
    (lang: string) => {
      updateBlock(pageId, block.id, { language: lang });
      setShowLangPicker(false);
    },
    [updateBlock, pageId, block.id]
  );

  return (
    <div className="my-1 rounded-lg bg-surface-secondary border border-line overflow-hidden">
      {/* Language selector header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-surface-tertiary-soft2 border-b border-line">
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowLangPicker(!showLangPicker)}
            className="text-xs text-ink-secondary hover:text-hover-text-strong font-mono px-1.5 py-0.5 rounded hover:bg-hover-surface3 transition-colors"
          >
            {block.language || 'plaintext'}
          </button>
          {showLangPicker && (
            <div className="absolute top-full left-0 mt-1 bg-surface-primary border border-line rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto w-40">
              {LANGUAGES.map(lang => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => handleLangSelect(lang)}
                  className={`w-full text-left px-3 py-1.5 text-xs font-mono hover:bg-hover-accent-soft ${
                    lang === (block.language || 'plaintext') ? 'bg-accent-soft text-accent-text-light' : 'text-ink-body-light'
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(block.content);
          }}
          className="text-xs text-ink-muted hover:text-hover-text px-1.5 py-0.5 rounded hover:bg-hover-surface3 transition-colors"
        >
          Copy
        </button>
      </div>

      {/* Code editor */}
      <pre
        contentEditable
        suppressContentEditableWarning
        data-block-editor
        className="px-4 py-3 text-sm font-mono text-ink-strong leading-relaxed outline-none overflow-x-auto whitespace-pre-wrap break-words"
        onInput={handleContentChange}
        spellCheck={false}
      >
        {block.content}
      </pre>
    </div>
  );
}
