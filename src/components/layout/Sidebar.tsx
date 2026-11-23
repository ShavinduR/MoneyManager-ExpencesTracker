import { NavLink } from 'react-router-dom';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { cn } from '@/lib/cn';
import { NAV_ITEMS } from './navItems';
import { LogoMark } from './Logo';

type SidebarProps = { collapsed: boolean; onToggle: () => void };

export const Sidebar = ({ collapsed, onToggle }: SidebarProps) => (
  <aside
    className={cn(
      'sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-zinc-200/80 bg-white/70 backdrop-blur transition-[width] duration-200 md:flex dark:border-ink-800 dark:bg-ink-900/60',
      collapsed ? 'w-[72px]' : 'w-[72px] lg:w-60',
    )}
  >
    <div className={cn('flex h-16 items-center gap-2.5 px-4', collapsed ? 'justify-center px-0' : 'max-lg:justify-center max-lg:px-0')}>
      <LogoMark />
      {!collapsed && (
        <div className="hidden leading-tight lg:block">
          <p className="text-sm font-semibold tracking-tight">Mindset</p>
          <p className="text-[11px] text-zinc-500">Finance Planner</p>
        </div>
      )}
    </div>
    <nav className="flex flex-1 flex-col gap-0.5 px-3 py-2" aria-label="Main">
      {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          title={label}
          className={({ isActive }) =>
            cn(
              'group flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-[background-color,color] duration-150',
              collapsed ? 'justify-center px-0' : 'max-lg:justify-center max-lg:px-0',
              isActive
                ? 'bg-zinc-900 text-white dark:bg-ink-800 dark:text-zinc-50'
                : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-ink-850 dark:hover:text-zinc-100',
            )
          }
        >
          <Icon className="size-[18px] shrink-0" />
          {!collapsed && <span className="hidden truncate lg:inline">{label}</span>}
        </NavLink>
      ))}
    </nav>
    <div className="hidden p-3 lg:block">
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          'flex h-9 w-full items-center gap-3 rounded-xl px-3 text-xs text-zinc-500 transition-[background-color,color] hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-ink-850 dark:hover:text-zinc-200',
          collapsed && 'justify-center px-0',
        )}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
        {!collapsed && 'Collapse'}
      </button>
    </div>
  </aside>
);
