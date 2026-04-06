/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   CodeBlock.tsx                                      :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: dlesieur <dlesieur@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2026/04/01 16:34:40 by dlesieur          #+#    #+#             */
/*   Updated: 2026/04/04 11:45:00 by dlesieur         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
} from "react";
import type { BlockRendererProps } from "./BlockRenderer";
import { useDatabaseStore } from "../../store/dbms/hardcoded/useDatabaseStore";
import { tokenize, renderTokensToHtml } from "../../lib/syntax/tokenizer";
import { cn } from "../../utils/cn";

const LANGUAGES = [
  "plaintext",
  "javascript",
  "typescript",
  "python",
  "rust",
  "cpp",
  "c",
  "java",
  "go",
  "html",
  "css",
  "json",
  "yaml",
  "markdown",
  "bash",
  "sql",
  "ruby",
  "php",
  "swift",
  "kotlin",
  "lua",
  "toml",
  "mermaid",
];

/** Renders a code block with syntax highlighting and language selector. */
export function CodeBlock({ block, pageId }: Readonly<BlockRendererProps>) {
  const updateBlock = useDatabaseStore((s) => s.updateBlock);
  const [showLangPicker, setShowLangPicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [localContent, setLocalContent] = useState(block.content);
  const [isFocused, setIsFocused] = useState(false);

  // Sync from store when content changes externally
  useEffect(() => {
    if (!isFocused) {
      setLocalContent(block.content);
    }
  }, [block.content, isFocused]);

  // Auto-resize textarea to match content
  const syncHeight = useCallback(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = "0";
      ta.style.height = ta.scrollHeight + "px";
    }
  }, []);

  useEffect(() => {
    syncHeight();
  }, [localContent, syncHeight]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const text = e.target.value;
      setLocalContent(text);
      updateBlock(pageId, block.id, { content: text });
    },
    [updateBlock, pageId, block.id],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Tab inserts 2 spaces instead of changing focus
      if (e.key === "Tab") {
        e.preventDefault();
        const ta = e.currentTarget;
        const { selectionStart, selectionEnd } = ta;
        const before = localContent.slice(0, selectionStart);
        const after = localContent.slice(selectionEnd);
        const newContent = before + "  " + after;
        setLocalContent(newContent);
        updateBlock(pageId, block.id, { content: newContent });
        // Restore caret after the inserted spaces
        requestAnimationFrame(() => {
          ta.selectionStart = ta.selectionEnd = selectionStart + 2;
        });
      }
    },
    [localContent, updateBlock, pageId, block.id],
  );

  const handleLangSelect = useCallback(
    (lang: string) => {
      updateBlock(pageId, block.id, { language: lang });
      setShowLangPicker(false);
    },
    [updateBlock, pageId, block.id],
  );

  // Memoize syntax highlighting
  const highlightedHtml = useMemo(() => {
    const lang = block.language || "plaintext";
    const tokens = tokenize(localContent, lang);
    return renderTokensToHtml(tokens);
  }, [localContent, block.language]);

  return (
    <div
      className={cn(
        "my-1 rounded-lg bg-surface-secondary border border-line overflow-visible relative",
        showLangPicker && "z-50",
      )}
    >
      {/* Language selector header */}
      <div
        className={cn(
          "flex items-center justify-between px-3 py-1.5 bg-surface-tertiary-soft2 border-b border-line",
        )}
      >
        <div className={cn("relative")}>
          <button
            type="button"
            onClick={() => setShowLangPicker(!showLangPicker)}
            className={cn(
              "text-xs text-ink-secondary hover:text-hover-text-strong font-mono px-1.5 py-0.5 rounded hover:bg-hover-surface3 transition-colors",
            )}
          >
            {block.language || "plaintext"}
          </button>
          {showLangPicker && (
            <div
              className={cn(
                "absolute top-full left-0 mt-1 bg-surface-primary border border-line rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto w-40",
              )}
            >
              {LANGUAGES.map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => handleLangSelect(lang)}
                  className={cn(
                    `w-full text-left px-3 py-1.5 text-xs font-mono hover:bg-hover-accent-soft ${
                      lang === (block.language || "plaintext")
                        ? "bg-accent-soft text-accent-text-light"
                        : "text-ink-body-light"
                    }`,
                  )}
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
          className={cn(
            "text-xs text-ink-muted hover:text-hover-text px-1.5 py-0.5 rounded hover:bg-hover-surface3 transition-colors",
          )}
        >
          Copy
        </button>
      </div>

      {/* Code editor with syntax highlighting overlay */}
      <div className={cn("relative")}>
        {/* Highlighted code layer (visual, behind textarea) */}
        <pre
          aria-hidden
          className={cn(
            "px-4 py-3 text-sm font-mono leading-relaxed whitespace-pre-wrap break-words pointer-events-none",
          )}
          dangerouslySetInnerHTML={{ __html: highlightedHtml + "\n" }}
        />
        {/* Textarea layer (input, transparent text on top) */}
        <textarea
          ref={textareaRef}
          value={localContent}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          spellCheck={false}
          className={cn(
            "absolute inset-0 px-4 py-3 text-sm font-mono leading-relaxed whitespace-pre-wrap break-words bg-transparent text-transparent caret-ink-strong outline-none resize-none overflow-hidden w-full",
          )}
        />
      </div>

      {/* Mermaid preview */}
      {block.language === "mermaid" && block.content.trim() && (
        <MermaidPreview code={block.content} />
      )}
    </div>
  );
}

/** Live mermaid diagram preview below the code editor */
function MermaidPreview({ code }: Readonly<{ code: string }>) {
  const [svgHtml, setSvgHtml] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    const renderMermaid = async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: "neutral",
          securityLevel: "loose",
        });
        const id = `mermaid-${Date.now()}`;
        const { svg } = await mermaid.render(id, code);
        if (!cancelled) {
          setSvgHtml(svg);
          setError("");
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Invalid mermaid syntax",
          );
          setSvgHtml("");
        }
      }
    };
    const timer = setTimeout(renderMermaid, 500); // debounce
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [code]);

  if (error) {
    return (
      <div
        className={cn(
          "px-4 py-2 text-xs text-danger border-t border-line bg-danger-surface-muted",
        )}
      >
        Mermaid: {error}
      </div>
    );
  }
  if (!svgHtml) return null;

  return (
    <div
      className={cn(
        "border-t border-line bg-surface-primary p-4 flex justify-center overflow-auto",
      )}
      dangerouslySetInnerHTML={{ __html: svgHtml }}
    />
  );
}
