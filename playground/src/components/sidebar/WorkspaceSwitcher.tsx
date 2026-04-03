import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useUserStore } from '../../store/useUserStore';
import { UserSwitcherPanel } from './UserSwitcherPanel';

/**
 * The header button at the very top of the sidebar.
 * Shows: [emoji] [workspace name] [chevron]
 * Click → opens the UserSwitcherPanel dropdown.
 */
export const WorkspaceSwitcher: React.FC = () => {
  const [open, setOpen] = useState(false);

  const persona         = useUserStore(s => s.activePersona());
  const session         = useUserStore(s => s.activeSession());
  const workspaceName   = session?.privateWorkspaces[0]?.name ?? 'My Workspace';

  return (
    <div className="relative px-2 pt-2 pb-1">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={[
          'w-full flex items-center gap-2 h-8 px-2 rounded-md',
          'transition-colors duration-100 cursor-pointer select-none',
          open
            ? 'bg-[var(--color-surface-tertiary)]'
            : 'hover:bg-[var(--color-surface-hover)]',
        ].join(' ')}
      >
        {/* User emoji as workspace avatar */}
        <span className="text-base leading-none">{persona?.emoji ?? '⬜'}</span>

        <span className="flex-1 text-sm font-semibold text-[var(--color-ink)] truncate text-left">
          {workspaceName}
        </span>

        <ChevronDown
          size={14}
          className={[
            'shrink-0 text-[var(--color-ink-muted)] transition-transform duration-150',
            open ? 'rotate-180' : '',
          ].join(' ')}
        />
      </button>

      {open && <UserSwitcherPanel onClose={() => setOpen(false)} />}
    </div>
  );
};
