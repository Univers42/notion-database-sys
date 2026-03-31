// ─── pageSlice — page CRUD and block mutation actions ────────────────────────
import type { Page, Block, DatabaseSchema, SchemaProperty } from '../../types/database';

export interface PageSliceState {
  pages: Record<string, Page>;
  openPageId: string | null;
}

export interface PageSliceActions {
  addPage: (databaseId: string, properties?: Record<string, unknown>) => string;
  updatePageProperty: (pageId: string, propertyId: string, value: unknown) => void;
  deletePage: (pageId: string) => void;
  duplicatePage: (pageId: string) => void;
  updatePageContent: (pageId: string, content: Block[]) => void;
  changeBlockType: (pageId: string, blockId: string, newType: Block['type']) => void;
  insertBlock: (pageId: string, afterBlockId: string | null, block: Block) => void;
  deleteBlock: (pageId: string, blockId: string) => void;
  moveBlock: (pageId: string, blockId: string, targetIndex: number) => void;
  toggleBlockChecked: (pageId: string, blockId: string) => void;
  toggleBlockCollapsed: (pageId: string, blockId: string) => void;
  updateBlock: (pageId: string, blockId: string, updates: Partial<Block>) => void;
  openPage: (pageId: string | null) => void;
}

export type PageSlice = PageSliceState & PageSliceActions;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createPageSlice(set: (partial: any) => void, get: () => any): PageSliceActions {
  const now = (): string => new Date().toISOString();

  return {
    addPage: (databaseId, properties = {}) => {
      const id = crypto.randomUUID();
      const db: DatabaseSchema | undefined = get().databases[databaseId];
      if (!db) return id;

      const props = { ...properties };
      if (db.titlePropertyId && !props[db.titlePropertyId]) {
        props[db.titlePropertyId] = '';
      }

      const dbUpdates: Record<string, SchemaProperty> = {};
      for (const prop of Object.values(db.properties)) {
        if (prop.type === 'id' && !props[prop.id]) {
          const counter = prop.autoIncrement || 1;
          props[prop.id] = `${prop.prefix || ''}${counter}`;
          dbUpdates[prop.id] = { ...prop, autoIncrement: counter + 1 };
        }
      }

      const newPage: Page = {
        id,
        databaseId,
        properties: props,
        content: [],
        createdAt: now(),
        updatedAt: now(),
        createdBy: 'You',
        lastEditedBy: 'You',
      };
      set((state: any) => {
        const updatedDb = Object.keys(dbUpdates).length > 0
          ? {
              ...state.databases,
              [databaseId]: {
                ...state.databases[databaseId],
                properties: { ...state.databases[databaseId].properties, ...dbUpdates },
              },
            }
          : state.databases;
        return { pages: { ...state.pages, [id]: newPage }, databases: updatedDb };
      });
      return id;
    },

    updatePageProperty: (pageId, propertyId, value) => set((state: any) => {
      const page = state.pages[pageId];
      if (!page) return state;
      return {
        pages: {
          ...state.pages,
          [pageId]: {
            ...page,
            properties: { ...page.properties, [propertyId]: value },
            updatedAt: now(),
            lastEditedBy: 'You',
          },
        },
      };
    }),

    deletePage: (pageId) => set((state: any) => {
      const newPages = { ...state.pages };
      delete newPages[pageId];
      return { pages: newPages, openPageId: state.openPageId === pageId ? null : state.openPageId };
    }),

    duplicatePage: (pageId) => {
      const state = get();
      const page = state.pages[pageId];
      if (!page) return;
      const id = crypto.randomUUID();
      const newPage: Page = {
        ...page,
        id,
        properties: { ...page.properties },
        content: [...page.content],
        createdAt: now(),
        updatedAt: now(),
      };
      const db = state.databases[page.databaseId];
      if (db?.titlePropertyId && newPage.properties[db.titlePropertyId]) {
        newPage.properties[db.titlePropertyId] += ' (copy)';
      }
      set({ pages: { ...state.pages, [id]: newPage } });
    },

    updatePageContent: (pageId, content) => set((state: any) => {
      const page = state.pages[pageId];
      if (!page) return state;
      return {
        pages: {
          ...state.pages,
          [pageId]: { ...page, content, updatedAt: now(), lastEditedBy: 'You' },
        },
      };
    }),

    changeBlockType: (pageId, blockId, newType) => set((state: any) => {
      const page = state.pages[pageId];
      if (!page?.content) return state;
      const content = page.content.map((b: Block) =>
        b.id === blockId ? { ...b, type: newType } : b,
      );
      return { pages: { ...state.pages, [pageId]: { ...page, content, updatedAt: now(), lastEditedBy: 'You' } } };
    }),

    insertBlock: (pageId, afterBlockId, block) => set((state: any) => {
      const page = state.pages[pageId];
      if (!page) return state;
      const content = [...(page.content || [])];
      if (afterBlockId === null) {
        content.unshift(block);
      } else {
        const idx = content.findIndex((b: Block) => b.id === afterBlockId);
        content.splice(idx + 1, 0, block);
      }
      return { pages: { ...state.pages, [pageId]: { ...page, content, updatedAt: now(), lastEditedBy: 'You' } } };
    }),

    deleteBlock: (pageId, blockId) => set((state: any) => {
      const page = state.pages[pageId];
      if (!page?.content) return state;
      const content = page.content.filter((b: Block) => b.id !== blockId);
      return { pages: { ...state.pages, [pageId]: { ...page, content, updatedAt: now(), lastEditedBy: 'You' } } };
    }),

    moveBlock: (pageId, blockId, targetIndex) => set((state: any) => {
      const page = state.pages[pageId];
      if (!page?.content) return state;
      const content = [...page.content];
      const fromIdx = content.findIndex((b: Block) => b.id === blockId);
      if (fromIdx === -1) return state;
      const [moved] = content.splice(fromIdx, 1);
      content.splice(targetIndex, 0, moved);
      return { pages: { ...state.pages, [pageId]: { ...page, content, updatedAt: now(), lastEditedBy: 'You' } } };
    }),

    toggleBlockChecked: (pageId, blockId) => set((state: any) => {
      const page = state.pages[pageId];
      if (!page?.content) return state;
      const content = page.content.map((b: Block) =>
        b.id === blockId ? { ...b, checked: !b.checked } : b,
      );
      return { pages: { ...state.pages, [pageId]: { ...page, content, updatedAt: now(), lastEditedBy: 'You' } } };
    }),

    toggleBlockCollapsed: (pageId, blockId) => set((state: any) => {
      const page = state.pages[pageId];
      if (!page?.content) return state;
      const content = page.content.map((b: Block) =>
        b.id === blockId ? { ...b, collapsed: !b.collapsed } : b,
      );
      return { pages: { ...state.pages, [pageId]: { ...page, content, updatedAt: now(), lastEditedBy: 'You' } } };
    }),

    updateBlock: (pageId, blockId, updates) => set((state: any) => {
      const page = state.pages[pageId];
      if (!page?.content) return state;
      const content = page.content.map((b: Block) =>
        b.id === blockId ? { ...b, ...updates } : b,
      );
      return { pages: { ...state.pages, [pageId]: { ...page, content, updatedAt: now(), lastEditedBy: 'You' } } };
    }),

    openPage: (pageId) => set({ openPageId: pageId }),
  };
}
