import { NavLink, useLocation } from 'react-router-dom';
import { MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/cn';
import { NAV_ITEMS } from './navItems';

const itemClass = (isActive: boolean): string =>
  cn(
    'flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[10.5px] font-medium transition-colors duration-150',
    isActive ? 'text-zinc-900 dark:text-accent-400' : 'text-muted dark:text-subtle',
  );

export const BottomNav = () => {
  const { pathname } = useLocation();
  const moreRoutes = NAV_ITEMS.filter((i) => i.mobile === 'more').map((i) => i.to);
  const moreActive = pathname === '/more' || moreRoutes.some((r) => pathname.startsWith(r));
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200/80 bg-white/85 backdrop-blur-xl safe-bottom md:hidden dark:border-ink-800 dark:bg-ink-900/85"
    >
      <div className="flex h-16 items-stretch">
        {NAV_ITEMS.filter((i) => i.mobile === 'primary').map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => itemClass(isActive)}>
            {({ isActive }) => (
              <>
                <span className={cn('flex h-7 w-12 items-center justify-center rounded-full transition-colors duration-150', isActive && 'bg-zinc-100 dark:bg-accent-500/15')}>
                  <Icon className="size-[19px]" />
                </span>
                {label}
              </>
            )}
          </NavLink>
        ))}
        <NavLink to="/more" className={() => itemClass(moreActive)}>
          <span className={cn('flex h-7 w-12 items-center justify-center rounded-full', moreActive && 'bg-zinc-100 dark:bg-accent-500/15')}>
            <MoreHorizontal className="size-[19px]" />
          </span>
          More
        </NavLink>
      </div>
    </nav>
  );
};
