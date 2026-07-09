// ─── FilesCellEditor — Notion-model file panel: Upload | Link tabs ───────────
// Upload accepts the picker, drag-drop anywhere on the panel, and Ctrl+V paste;
// every extension is welcome. Storage goes through the host's uploadFile seam
// when provided; otherwise files ≤ 8 MB inline as data URLs so the offline
// store round-trips them across every engine (the value is plain JSON).
// ponytail: data-URL ceiling — wire the host upload seam for big videos.

import React, { useRef, useState } from 'react';
import { Eye, Link2, Trash2, Upload } from 'lucide-react';
import type { FileAttachment, PropertyValue } from '../../types/database';
import { useHostAdapters } from '../../hooks/useHostAdapters';
import { CellPortal } from './CellPortal';
import { FilePreviewModal } from './FilePreviewModal';
import { cn } from '../../utils/cn';

const DATA_URL_LIMIT = 8 * 1024 * 1024;

export function fileKind(nameOrType: string): FileAttachment['type'] {
  const lower = nameOrType.toLowerCase();
  if (/^image\/|\.(png|jpe?g|gif|webp|svg|avif|bmp|ico)$/.test(lower) || /\.(png|jpe?g|gif|webp|svg|avif)($|\?)/.test(lower)) return 'image';
  if (/pdf/.test(lower)) return 'pdf';
  if (/\.(docx?|odt|rtf|txt|md|xlsx?|csv|pptx?)($|\?)/.test(lower)) return 'doc';
  return 'other';
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

interface FilesCellEditorProps {
  value: PropertyValue;
  onUpdate: (value: PropertyValue) => void;
  onClose: () => void;
}

export function FilesCellEditor({ value, onUpdate, onClose }: Readonly<FilesCellEditorProps>) {
  const attachments: FileAttachment[] = Array.isArray(value) ? value : [];
  const [tab, setTab] = useState<'upload' | 'link'>('upload');
  const [linkUrl, setLinkUrl] = useState('');
  const [note, setNote] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { uploadFile } = useHostAdapters();

  // Always read the LATEST committed list — a slow/overlapping upload must
  // append, never replace what a previous ingest already added. The optimistic
  // write lets a second ingest that lands before the re-render see the first.
  const attachmentsRef = useRef(attachments);
  attachmentsRef.current = attachments;
  const append = (added: FileAttachment[]) => {
    if (added.length === 0) return;
    const next = [...attachmentsRef.current, ...added];
    attachmentsRef.current = next;
    onUpdate(next);
  };

  // Callers MUST pass a snapshot array ([...fileList]) — FileList is live and
  // empties when the input resets / the drop event ends, mid-await.
  const ingestFiles = async (files: readonly File[]) => {
    const added: FileAttachment[] = [];
    const skipped: string[] = [];
    for (const file of files) {
      try {
        if (uploadFile) {
          added.push(await uploadFile(file));
        } else if (file.size <= DATA_URL_LIMIT) {
          added.push({
            id: `f-${Date.now().toString(36)}-${added.length}`,
            name: file.name,
            url: await readAsDataUrl(file),
            type: fileKind(file.type || file.name),
            size: file.size,
          });
        } else {
          skipped.push(file.name);
        }
      } catch {
        skipped.push(file.name);
      }
    }
    setNote(skipped.length > 0 ? `Too large to attach inline (>8 MB): ${skipped.join(', ')} — use the Link tab with a hosted URL.` : null);
    append(added);
  };

  const addLink = () => {
    const url = linkUrl.trim();
    if (!url) return;
    const name = url.split('/').pop()?.split('?')[0] || url;
    append([{ id: `f-${Date.now().toString(36)}`, name, url, type: fileKind(url) }]);
    setLinkUrl('');
  };

  const tabButton = (id: 'upload' | 'link', label: string) => (
    <button type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
      className={cn(`px-3 py-1.5 text-sm rounded-md transition-colors ${tab === id ? 'text-ink font-medium bg-surface-tertiary' : 'text-ink-muted hover:bg-hover-surface'}`)}>
      {label}
    </button>
  );

  return (
    <>
    <CellPortal onClose={onClose} minWidth={300} maxHeight="70vh">
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); void ingestFiles([...e.dataTransfer.files]); }}
        onPaste={e => {
          const files = [...e.clipboardData.files];
          if (files.length > 0) { e.preventDefault(); void ingestFiles(files); }
        }}
        className={cn(`flex flex-col ${dragOver ? 'outline outline-2 -outline-offset-2 outline-accent rounded-lg' : ''}`)}
      >
        <div role="tablist" className={cn("flex items-center gap-1 px-2 pt-2 pb-1 border-b border-line")}>
          {tabButton('upload', 'Upload')}
          {tabButton('link', 'Link')}
        </div>

        {attachments.length > 0 && (
          <div className={cn("max-h-36 overflow-y-auto border-b border-line py-1")}>
            {attachments.map((file, i) => (
              <div key={file.id} className={cn("group/file flex items-center gap-2 px-3 py-1 text-sm text-ink-body")}>
                {file.type === 'image'
                  ? <img src={file.url} alt="" className={cn("w-6 h-6 rounded object-cover shrink-0")} />
                  : <Upload className={cn("w-3.5 h-3.5 text-ink-muted shrink-0")} />}
                <button type="button" title={`Preview ${file.name}`}
                  onClick={() => setPreviewIndex(i)}
                  className={cn("truncate flex-1 text-left text-ink-body hover:underline hover:text-hover-text-strong")}>
                  {file.name}
                </button>
                <button type="button" aria-label={`Preview ${file.name}`} title="Preview"
                  onClick={() => setPreviewIndex(i)}
                  className={cn("shrink-0 px-1.5 py-0.5 rounded bg-surface-tertiary text-ink-muted hover:bg-hover-surface3 hover:text-ink-body flex items-center gap-1")}>
                  <Eye className={cn("w-3.5 h-3.5")} />
                </button>
                <button type="button" aria-label={`Remove ${file.name}`}
                  onClick={() => onUpdate(attachments.filter(entry => entry.id !== file.id))}
                  className={cn("shrink-0 p-0.5 rounded text-ink-muted opacity-0 group-hover/file:opacity-100 hover:text-danger-text hover:bg-hover-surface2")}>
                  <Trash2 className={cn("w-3.5 h-3.5")} />
                </button>
              </div>
            ))}
          </div>
        )}

        {tab === 'upload' ? (
          <div className={cn("p-3 flex flex-col items-center gap-2")}>
            <input ref={inputRef} type="file" multiple hidden
              onChange={e => { if (e.target.files?.length) void ingestFiles([...e.target.files]); e.target.value = ''; }} />
            <button type="button" onClick={() => inputRef.current?.click()}
              className={cn("w-full max-w-[280px] px-3 py-1.5 text-sm font-medium rounded-md bg-accent text-ink-inverse hover:opacity-90 transition-opacity")}>
              Choose a file
            </button>
            <div className={cn("text-xs text-ink-muted text-center")}>
              or drop files here · Ctrl+V to paste
            </div>
            {note && <div className={cn("text-xs text-warning-text text-center")}>{note}</div>}
          </div>
        ) : (
          <div className={cn("p-3 flex items-center gap-2")}>
            <input
              autoFocus
              value={linkUrl}
              onChange={e => setLinkUrl(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addLink(); }}
              placeholder="Paste a file or image URL…"
              className={cn("flex-1 px-2 py-1 text-sm bg-surface-secondary rounded-md outline-none text-ink placeholder:text-ink-muted")}
            />
            <button type="button" onClick={addLink}
              className={cn("px-2.5 py-1 text-sm rounded-md bg-surface-tertiary text-ink-body hover:bg-hover-surface3 flex items-center gap-1")}>
              <Link2 className={cn("w-3.5 h-3.5")} /> Add
            </button>
          </div>
        )}
      </div>
    </CellPortal>
    {previewIndex !== null && previewIndex < attachments.length && (
      <FilePreviewModal
        attachments={attachments}
        index={previewIndex}
        onIndexChange={setPreviewIndex}
        onClose={() => setPreviewIndex(null)}
      />
    )}
    </>
  );
}
