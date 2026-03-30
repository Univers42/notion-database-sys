// ═══════════════════════════════════════════════════════════════════════════════
// React Renderer — AST → React.ReactElement
// ═══════════════════════════════════════════════════════════════════════════════
//
// Converts BlockNode[] into a React element tree for direct rendering inside a
// React application. Each AST node maps to a semantic HTML element.
//
// Usage:
//   import { parse } from '../parser';
//   import { MarkdownView, renderReact } from './react';
//
//   // Option A: component
//   <MarkdownView markdown="# Hello" className="article" />
//
//   // Option B: direct call
//   const elements = renderReact(parse('# Hello'));
// ═══════════════════════════════════════════════════════════════════════════════

import React from 'react';
import type { BlockNode, InlineNode } from '../ast';
import { parse } from '../parser';

// ─── Options ─────────────────────────────────────────────────────────────────

export interface ReactRenderOptions {
  /** CSS class prefix (default: 'md') */
  classPrefix?: string;
  /** Open external links in new tab (default: true) */
  externalLinks?: boolean;
  /** Custom code block renderer (for syntax highlighting integrations) */
  codeBlockRenderer?: (lang: string, code: string, meta?: string) => React.ReactElement;
  /** Custom math renderer */
  mathRenderer?: (value: string, display: boolean) => React.ReactElement;
  /** Custom image renderer */
  imageRenderer?: (src: string, alt: string, title?: string) => React.ReactElement;
  /** Callback for checkbox toggle in task lists */
  onTaskToggle?: (index: number, checked: boolean) => void;
}

const defaults: Required<Omit<ReactRenderOptions, 'codeBlockRenderer' | 'mathRenderer' | 'imageRenderer' | 'onTaskToggle'>> = {
  classPrefix: 'md',
  externalLinks: true,
};

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Convert AST block nodes into a React element array.
 */
export function renderReact(
  blocks: BlockNode[],
  opts?: ReactRenderOptions,
): React.ReactElement[] {
  const o = { ...defaults, ...opts };
  return blocks.map((b, i) => renderBlock(b, o, i));
}

/**
 * Convenience component: parses markdown and renders it.
 */
export function MarkdownView({
  markdown,
  blocks,
  className,
  ...opts
}: { markdown?: string; blocks?: BlockNode[]; className?: string } & ReactRenderOptions) {
  const ast = blocks ?? (markdown ? parse(markdown) : []);
  const elements = renderReact(ast, opts);
  return React.createElement('div', { className: className ?? `${opts.classPrefix ?? 'md'}-content` }, ...elements);
}

// ═══════════════════════════════════════════════════════════════════════════════
// BLOCK RENDERING
// ═══════════════════════════════════════════════════════════════════════════════

let _taskIndex = 0;

function renderBlock(
  node: BlockNode,
  o: ReactRenderOptions & typeof defaults,
  key: number | string,
): React.ReactElement {
  switch (node.type) {
    case 'document':
      return React.createElement(React.Fragment, { key }, ...node.children.map((c, i) => renderBlock(c, o, i)));

    case 'paragraph':
      return React.createElement('p', { key }, ...renderInlines(node.children, o));

    case 'heading': {
      const tag = `h${node.level}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
      return React.createElement(tag, { key, id: node.id || undefined }, ...renderInlines(node.children, o));
    }

    case 'blockquote':
      return React.createElement('blockquote', { key }, ...node.children.map((c, i) => renderBlock(c, o, i)));

    case 'code_block': {
      if (o.codeBlockRenderer && node.lang) {
        return React.createElement(React.Fragment, { key }, o.codeBlockRenderer(node.lang, node.value, node.meta));
      }
      const code = React.createElement('code', {
        className: node.lang ? `language-${node.lang}` : undefined,
      }, node.value);
      return React.createElement('pre', { key, 'data-meta': node.meta || undefined }, code);
    }

    case 'unordered_list':
      return React.createElement('ul', { key },
        ...node.children.map((item, i) =>
          React.createElement('li', { key: i }, ...item.children.map((b, j) => renderBlock(b, o, j)))
        )
      );

    case 'ordered_list':
      return React.createElement('ol', { key, start: node.start !== 1 ? node.start : undefined },
        ...node.children.map((item, i) =>
          React.createElement('li', { key: i }, ...item.children.map((b, j) => renderBlock(b, o, j)))
        )
      );

    case 'task_list': {
      _taskIndex = 0;
      return React.createElement('ul', { key, className: `${o.classPrefix}-task-list` },
        ...node.children.map((item, i) => {
          const idx = _taskIndex++;
          const checkbox = React.createElement('input', {
            type: 'checkbox',
            checked: item.checked,
            onChange: o.onTaskToggle ? () => o.onTaskToggle!(idx, !item.checked) : undefined,
            readOnly: !o.onTaskToggle,
            className: `${o.classPrefix}-task-checkbox`,
          });
          return React.createElement('li', { key: i, className: `${o.classPrefix}-task-item` },
            checkbox,
            ...item.children.map((b, j) => renderBlock(b, o, j))
          );
        })
      );
    }

    case 'thematic_break':
      return React.createElement('hr', { key });

    case 'table':
      return renderTable(node, o, key);

    case 'callout': {
      const cls = `${o.classPrefix}-callout ${o.classPrefix}-callout-${node.kind}`;
      const title = node.title.length
        ? React.createElement('div', { className: `${o.classPrefix}-callout-title`, key: 'title' }, ...renderInlines(node.title, o))
        : null;
      const body = node.children.map((c, i) => renderBlock(c, o, i));
      return React.createElement('div', { key, className: cls }, title, ...body);
    }

    case 'math_block': {
      if (o.mathRenderer) {
        return React.createElement(React.Fragment, { key }, o.mathRenderer(node.value, true));
      }
      return React.createElement('div', { key, className: `${o.classPrefix}-math-block` }, node.value);
    }

    case 'html_block':
      return React.createElement('div', { key, dangerouslySetInnerHTML: { __html: node.value } });

    case 'footnote_def': {
      return React.createElement('div', { key, id: `fn-${node.label}`, className: `${o.classPrefix}-footnote` },
        React.createElement('sup', null, node.label),
        ...node.children.map((c, i) => renderBlock(c, o, i))
      );
    }

    case 'definition_list':
      return React.createElement('dl', { key },
        ...node.items.flatMap((item, i) => [
          React.createElement('dt', { key: `dt-${i}` }, ...renderInlines(item.term, o)),
          ...item.definitions.map((def, j) =>
            React.createElement('dd', { key: `dd-${i}-${j}` }, ...renderInlines(def, o))
          ),
        ])
      );

    case 'toggle': {
      return React.createElement('details', { key },
        React.createElement('summary', null, ...renderInlines(node.summary, o)),
        ...node.children.map((c, i) => renderBlock(c, o, i))
      );
    }

    default:
      return React.createElement(React.Fragment, { key });
  }
}

// ─── Table ───────────────────────────────────────────────────────────────────

function renderTable(
  node: Extract<BlockNode, { type: 'table' }>,
  o: ReactRenderOptions & typeof defaults,
  key: number | string,
): React.ReactElement {
  const alignStyle = (i: number): React.CSSProperties | undefined => {
    const a = node.alignments[i];
    return a ? { textAlign: a } : undefined;
  };

  const thead = React.createElement('thead', null,
    React.createElement('tr', null,
      ...node.head.cells.map((c, i) =>
        React.createElement('th', { key: i, style: alignStyle(i) }, ...renderInlines(c.children, o))
      )
    )
  );

  const tbody = React.createElement('tbody', null,
    ...node.rows.map((row, ri) =>
      React.createElement('tr', { key: ri },
        ...row.cells.map((c, ci) =>
          React.createElement('td', { key: ci, style: alignStyle(ci) }, ...renderInlines(c.children, o))
        )
      )
    )
  );

  return React.createElement('table', { key }, thead, tbody);
}

// ═══════════════════════════════════════════════════════════════════════════════
// INLINE RENDERING
// ═══════════════════════════════════════════════════════════════════════════════

function renderInlines(
  nodes: InlineNode[],
  o: ReactRenderOptions & typeof defaults,
): React.ReactNode[] {
  return nodes.map((n, i) => renderInlineNode(n, o, i));
}

function renderInlineNode(
  node: InlineNode,
  o: ReactRenderOptions & typeof defaults,
  key: number | string,
): React.ReactNode {
  switch (node.type) {
    case 'text':
      return node.value;

    case 'bold':
      return React.createElement('strong', { key }, ...renderInlines(node.children, o));

    case 'italic':
      return React.createElement('em', { key }, ...renderInlines(node.children, o));

    case 'bold_italic':
      return React.createElement('strong', { key },
        React.createElement('em', null, ...renderInlines(node.children, o))
      );

    case 'strikethrough':
      return React.createElement('del', { key }, ...renderInlines(node.children, o));

    case 'underline':
      return React.createElement('u', { key }, ...renderInlines(node.children, o));

    case 'code':
      return React.createElement('code', { key }, node.value);

    case 'link': {
      const isExt = isExternal(node.href);
      const props: Record<string, unknown> = {
        key,
        href: node.href,
        title: node.title || undefined,
        ...(o.externalLinks && isExt ? { target: '_blank', rel: 'noopener noreferrer' } : {}),
      };
      return React.createElement('a', props, ...renderInlines(node.children, o));
    }

    case 'image': {
      if (o.imageRenderer) {
        return o.imageRenderer(node.src, node.alt, node.title);
      }
      return React.createElement('img', {
        key,
        src: node.src,
        alt: node.alt,
        title: node.title || undefined,
      });
    }

    case 'line_break':
      return React.createElement('br', { key });

    case 'highlight':
      return React.createElement('mark', { key }, ...renderInlines(node.children, o));

    case 'math_inline': {
      if (o.mathRenderer) {
        return o.mathRenderer(node.value, false);
      }
      return React.createElement('span', { key, className: `${o.classPrefix}-math-inline` }, node.value);
    }

    case 'footnote_ref':
      return React.createElement('sup', { key },
        React.createElement('a', { href: `#fn-${node.label}` }, `[${node.label}]`)
      );

    case 'emoji':
      return React.createElement('span', { key, role: 'img', 'aria-label': node.raw, title: `:${node.raw}:` }, node.value);

    default:
      return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function isExternal(href: string): boolean {
  return /^https?:\/\//.test(href);
}
