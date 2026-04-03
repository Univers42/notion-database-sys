// ── Seed data: pre-created pages per workspace ───────────────────────────────
// Each workspace gets different pages with real Block[] content so we can test
// the rendering pipeline without any API.

import type { Block } from '@src/types/database';

// ── Helper to generate unique IDs ────────────────────────────────────────────

let _counter = 0;
function bid(): string {
  return `block-${++_counter}-${Math.random().toString(36).slice(2, 8)}`;
}

// ── Block factory helpers ────────────────────────────────────────────────────

function p(text: string): Block {
  return { id: bid(), type: 'paragraph', content: text };
}
function h1(text: string): Block {
  return { id: bid(), type: 'heading_1', content: text };
}
function h2(text: string): Block {
  return { id: bid(), type: 'heading_2', content: text };
}
function h3(text: string): Block {
  return { id: bid(), type: 'heading_3', content: text };
}
function bullet(text: string): Block {
  return { id: bid(), type: 'bulleted_list', content: text };
}
function numbered(text: string): Block {
  return { id: bid(), type: 'numbered_list', content: text };
}
function todo(text: string, checked = false): Block {
  return { id: bid(), type: 'to_do', content: text, checked };
}
function code(text: string, language = 'typescript'): Block {
  return { id: bid(), type: 'code', content: text, language };
}
function quote(text: string): Block {
  return { id: bid(), type: 'quote', content: text };
}
function callout(text: string, icon = '💡'): Block {
  return { id: bid(), type: 'callout', content: text, color: icon };
}
function divider(): Block {
  return { id: bid(), type: 'divider', content: '' };
}
function toggle(text: string, children: Block[] = []): Block {
  return { id: bid(), type: 'toggle', content: text, children, collapsed: true };
}

// ── Exported page definitions ────────────────────────────────────────────────

export interface SeedPage {
  _id:           string;
  title:         string;
  icon?:         string;
  workspaceId:   string;
  parentPageId?: string | null;
  databaseId?:   string | null;
  archivedAt?:   string | null;
  content:       Block[];
}

// ── Admin workspace pages ────────────────────────────────────────────────────

const adminWsId = 'mock-ws-private-0';

const gettingStarted: SeedPage = {
  _id: 'page-admin-getting-started',
  title: 'Getting Started',
  icon: '🚀',
  workspaceId: adminWsId,
  content: [
    h1('Welcome to the Playground'),
    p('This is a local-first Notion clone playground. Everything runs in the browser — no backend required.'),
    divider(),
    h2('Quick overview'),
    p('The sidebar mirrors the real Notion layout. You can navigate pages, create new ones, and switch between users.'),
    callout('This playground uses the exact same Block rendering pipeline as the main dashboard.', '💡'),
    h2('What you can do'),
    bullet('Browse and open pages in the sidebar'),
    bullet('Create new pages via the + button'),
    bullet('Switch between 3 pre-defined user accounts'),
    bullet('See how different block types render'),
    divider(),
    h2('Block types supported'),
    p('The content you see here is stored as a JSON array of Block objects. Each block has a type, content, and optional metadata.'),
    h3('Text & headings'),
    p('Paragraphs, headings (H1–H6), bold, italic — the basics of any document.'),
    h3('Lists'),
    bullet('Bulleted lists like this one'),
    bullet('With multiple items'),
    numbered('Numbered items too'),
    numbered('In order'),
    h3('To-dos'),
    todo('Set up the playground', true),
    todo('Add seed data with blocks', true),
    todo('Test the block renderer'),
    todo('Build something cool'),
    h3('Code'),
    code('const greeting = "Hello from the Playground!";\nconsole.log(greeting);\n\n// Block content is just JSON\nconst block: Block = {\n  id: "abc123",\n  type: "paragraph",\n  content: "Some text here"\n};', 'typescript'),
    h3('Callouts & quotes'),
    callout('Callouts are great for drawing attention to important information.', '📌'),
    quote('"The best way to predict the future is to invent it." — Alan Kay'),
    h3('Toggles'),
    toggle('Click to expand this toggle', [
      p('Hidden content inside a toggle block. You can nest any kind of block here.'),
      bullet('Like list items'),
      bullet('Or anything else'),
    ]),
  ],
};

const projectRoadmap: SeedPage = {
  _id: 'page-admin-roadmap',
  title: 'Project Roadmap',
  icon: '🗺️',
  workspaceId: adminWsId,
  content: [
    h1('Roadmap — Q2 2026'),
    p('This page tracks the high-level goals and milestones for the current quarter.'),
    divider(),
    h2('✅ Completed'),
    todo('MongoDB adapter for workspace CRUD', true),
    todo('PostgreSQL adapter for analytics queries', true),
    todo('Multi-user auth with JWT refresh tokens', true),
    todo('Sidebar redesign matching real Notion layout', true),
    divider(),
    h2('🔄 In progress'),
    todo('Offline-first page store with seed data'),
    todo('Block-based content rendering in playground'),
    todo('Drag-and-drop block reordering'),
    divider(),
    h2('📋 Planned'),
    todo('Real-time collaboration via WebSockets'),
    todo('Slash command menu in playground'),
    todo('Page cover images and custom icons'),
    todo('Database views (table, board, gallery)'),
    divider(),
    h2('Architecture notes'),
    p('The system uses a layered DBMS architecture:'),
    numbered('API layer (Fastify) handles auth and routing'),
    numbered('Service layer abstracts over MongoDB / PostgreSQL'),
    numbered('Store layer (Zustand) manages client state'),
    numbered('Component layer renders blocks and views'),
    code('// Simplified request flow\nclient → API route → service → adapter → DB\n                                          ↓\n                   Zustand store ← response ←', 'plaintext'),
    callout('The playground bypasses the API entirely — all data lives in Zustand stores in-memory.', 'ℹ️'),
  ],
};

const meetingNotes: SeedPage = {
  _id: 'page-admin-meetings',
  title: 'Meeting Notes',
  icon: '📝',
  workspaceId: adminWsId,
  content: [
    h1('Weekly Sync — March 28'),
    p('Attendees: Dylan, Alex, Sam'),
    divider(),
    h2('Agenda'),
    numbered('Playground status update'),
    numbered('Block rendering progress'),
    numbered('Next steps'),
    divider(),
    h2('Discussion'),
    h3('Playground status'),
    p('The playground is now fully functional offline. Seed data provides realistic page content for testing.'),
    quote('"We should make sure each user sees different content in their private workspace." — Dylan'),
    h3('Block rendering'),
    p('We are reusing the Block type from the main project. The playground has its own lightweight renderer that supports all common block types.'),
    callout('Decision: Use read-only rendering for now, add editing later.', '✅'),
    h3('Action items'),
    todo('Dylan: Finalize seed data for all 3 users', true),
    todo('Alex: Review the design system page'),
    todo('Sam: Test the guest experience'),
    divider(),
    p('Next meeting: April 4, 2026'),
  ],
};

// ── Alex (collaborator) workspace pages ──────────────────────────────────────

const alexWsId = 'mock-ws-private-1';

const designSystem: SeedPage = {
  _id: 'page-alex-design',
  title: 'Design System',
  icon: '🎨',
  workspaceId: alexWsId,
  content: [
    h1('Design System v2'),
    p('This document outlines the design tokens, component patterns, and visual guidelines for the project.'),
    divider(),
    h2('Color tokens'),
    p('We use CSS custom properties for all colors. This allows seamless light/dark theme switching.'),
    code(':root {\n  --color-ink:              #37352f;\n  --color-ink-muted:        #787774;\n  --color-ink-faint:        #b4b4b0;\n  --color-surface-primary:  #ffffff;\n  --color-surface-secondary:#f7f6f3;\n  --color-accent:           #2383e2;\n  --color-line:             #e9e9e7;\n}', 'css'),
    h2('Typography'),
    p('Base font: system-ui. We use a modular scale for heading sizes.'),
    bullet('H1: 2xl (24px), bold'),
    bullet('H2: xl (20px), semibold'),
    bullet('H3: lg (18px), semibold'),
    bullet('Body: sm (14px), normal'),
    bullet('Caption: xs (12px), muted'),
    h2('Component patterns'),
    h3('Sidebar nav items'),
    p('Each sidebar row is 30px tall, 6px border-radius, with a 22×22 icon slot.'),
    code('<SidebarNavItem\n  icon={<Home size={16} />}\n  label="Home"\n  active={true}\n  onClick={handleClick}\n/>', 'typescript'),
    h3('Callouts'),
    callout('Use callouts to highlight important info.', '💡'),
    callout('Warnings use a different emoji and color scheme.', '⚠️'),
    callout('Errors for critical blockers.', '❗'),
    divider(),
    h2('Dark mode'),
    p('All colors are defined via CSS variables. Toggle by applying a class to <html>:'),
    code('document.documentElement.classList.toggle("dark");', 'javascript'),
    toggle('Full dark mode token list', [
      code(':root.dark {\n  --color-ink:              #ffffffcf;\n  --color-ink-muted:        #ffffff73;\n  --color-surface-primary:  #191919;\n  --color-surface-secondary:#202020;\n  --color-accent:           #529cca;\n  --color-line:             #ffffff14;\n}', 'css'),
    ]),
  ],
};

const sprintReview: SeedPage = {
  _id: 'page-alex-sprint',
  title: 'Sprint Review',
  icon: '🏃',
  workspaceId: alexWsId,
  content: [
    h1('Sprint 12 Review'),
    p('Sprint: March 18 — March 29, 2026'),
    divider(),
    h2('Velocity'),
    p('Completed 24 out of 28 story points (86%).'),
    callout('Best sprint velocity this quarter!', '🔥'),
    h2('Completed stories'),
    todo('Sidebar component redesign', true),
    todo('Workspace switcher with chevron dropdown', true),
    todo('Section headers with hover actions', true),
    todo('Page tree item with recursive expand', true),
    todo('Offline mock fallback for dev mode', true),
    h2('Carried over'),
    todo('Inline database views in page content'),
    todo('Slash command menu integration'),
    todo('Cover image upload support'),
    divider(),
    h2('Retrospective'),
    h3('What went well'),
    bullet('Fast delivery of sidebar components'),
    bullet('Clean separation between playground and main app'),
    bullet('Good use of existing block types'),
    h3('What to improve'),
    bullet('Need better error handling in offline mode'),
    bullet('Page content rendering should use the real Block pipeline'),
    quote('"Let\'s focus on rendering quality next sprint." — Alex'),
  ],
};

// ── Sam (guest) workspace pages ──────────────────────────────────────────────

const samWsId = 'mock-ws-private-2';

const quickNotes: SeedPage = {
  _id: 'page-sam-notes',
  title: 'Quick Notes',
  icon: '📋',
  workspaceId: samWsId,
  content: [
    h1('Quick Notes'),
    p('A place to jot down ideas and thoughts.'),
    divider(),
    h2('April 2026'),
    p('Started exploring the Notion playground. The offline mode works great!'),
    bullet('Sidebar looks exactly like the real Notion'),
    bullet('Block rendering is clean and readable'),
    bullet('User switching is instant'),
    divider(),
    h2('Ideas'),
    callout('What if we added a "Daily journal" template that auto-creates a page for each day?', '💡'),
    todo('Try building a personal dashboard'),
    todo('Explore the formula engine'),
    todo('Test database views when available'),
  ],
};

const readingList: SeedPage = {
  _id: 'page-sam-reading',
  title: 'Reading List',
  icon: '📚',
  workspaceId: samWsId,
  content: [
    h1('Reading List'),
    p('Books and articles to check out.'),
    divider(),
    h2('Currently reading'),
    bullet('"Designing Data-Intensive Applications" — Martin Kleppmann'),
    p('Great deep-dive into distributed systems patterns. Relevant for our multi-DB adapter approach.'),
    h2('Up next'),
    bullet('"The Pragmatic Programmer" — Hunt & Thomas'),
    bullet('"Refactoring UI" — Wathan & Schoger'),
    bullet('"Algorithms to Live By" — Christian & Griffiths'),
    h2('Finished'),
    todo('"Clean Code" — Robert C. Martin', true),
    todo('"You Don\'t Know JS" — Kyle Simpson', true),
    todo('"Eloquent JavaScript" — Marijn Haverbeke', true),
    divider(),
    quote('"A reader lives a thousand lives before he dies. The man who never reads lives only one." — George R.R. Martin'),
  ],
};

// ── Shared workspace pages (visible to multiple users) ───────────────────────

export const SHARED_WORKSPACE_ID = 'mock-ws-shared-team';
export const SHARED_WORKSPACE = {
  _id: SHARED_WORKSPACE_ID,
  name: 'Team Workspace',
  slug: 'team',
  ownerId: 'mock-user-0', // admin owns it
};

const teamWiki: SeedPage = {
  _id: 'page-shared-wiki',
  title: 'Team Wiki',
  icon: '📖',
  workspaceId: SHARED_WORKSPACE_ID,
  content: [
    h1('Team Wiki'),
    p('Shared knowledge base for the whole team.'),
    divider(),
    h2('Onboarding'),
    p('Welcome to the team! Here\'s what you need to know:'),
    numbered('Clone the repo and run pnpm install'),
    numbered('Copy .env.example to .env'),
    numbered('Run make dev-all to start both the API and playground'),
    numbered('Open http://localhost:3001 in your browser'),
    callout('If the API isn\'t running, the playground falls back to offline mode with seed data.', 'ℹ️'),
    h2('Architecture'),
    p('The project has two main parts:'),
    bullet('src/ — The main Notion database system (components, stores, types)'),
    bullet('playground/ — A standalone Vite app for UI development and testing'),
    code('notion-database-sys/\n├── src/           # Main project\n│   ├── components/  # React components\n│   ├── store/       # Zustand stores\n│   ├── types/       # TypeScript types\n│   └── lib/         # Engine, formula, markdown, syntax\n├── playground/    # Playground app\n│   └── src/\n│       ├── components/sidebar/  # Notion sidebar\n│       ├── store/               # Page & user stores\n│       └── data/                # Seed data\n└── packages/api/  # Fastify backend', 'plaintext'),
    h2('Useful commands'),
    code('# Start everything\nmake dev-all\n\n# Just the playground (offline mode)\ncd playground && make dev\n\n# Type check\nnpx tsc --noEmit\n\n# Run tests\npnpm test', 'bash'),
  ],
};

// ── Export all seed pages grouped by workspace ───────────────────────────────

export const SEED_PAGES: SeedPage[] = [
  // Admin
  gettingStarted,
  projectRoadmap,
  meetingNotes,
  // Alex
  designSystem,
  sprintReview,
  // Sam
  quickNotes,
  readingList,
  // Shared
  teamWiki,
];

/** Get seed pages for a specific workspace */
export function seedPagesForWorkspace(wsId: string): SeedPage[] {
  return SEED_PAGES.filter(p => p.workspaceId === wsId);
}
