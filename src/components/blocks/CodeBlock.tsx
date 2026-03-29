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
    <div className="my-1 rounded-lg bg-gray-50 border border-gray-200 overflow-hidden">
      {/* Language selector header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-gray-100/80 border-b border-gray-200">
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowLangPicker(!showLangPicker)}
            className="text-xs text-gray-500 hover:text-gray-700 font-mono px-1.5 py-0.5 rounded hover:bg-gray-200 transition-colors"
          >
            {block.language || 'plaintext'}
          </button>
          {showLangPicker && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto w-40">
              {LANGUAGES.map(lang => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => handleLangSelect(lang)}
                  className={`w-full text-left px-3 py-1.5 text-xs font-mono hover:bg-blue-50 ${
                    lang === (block.language || 'plaintext') ? 'bg-blue-50 text-blue-600' : 'text-gray-600'
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
          className="text-xs text-gray-400 hover:text-gray-600 px-1.5 py-0.5 rounded hover:bg-gray-200 transition-colors"
        >
          Copy
        </button>
      </div>

      {/* Code editor */}
      <pre
        contentEditable
        suppressContentEditableWarning
        data-block-editor
        className="px-4 py-3 text-sm font-mono text-gray-800 leading-relaxed outline-none overflow-x-auto whitespace-pre-wrap break-words"
        onInput={handleContentChange}
        spellCheck={false}
      >
        {block.content}
      </pre>
    </div>
  );
}
