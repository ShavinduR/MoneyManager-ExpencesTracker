import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { NAV_ITEMS } from '@/components/layout/navItems';
import { PageHeader } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';

export const MorePage = () => (
  <div className="animate-fade-up">
    <PageHeader title="More" />
    <Card className="divide-y divide-zinc-100 dark:divide-ink-800">
      {NAV_ITEMS.filter((i) => i.mobile === 'more').map(({ to, label, icon: Icon }) => (
        <Link key={to} to={to} className="flex items-center gap-3 px-4 py-4 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-ink-850">
          <span className="flex size-9 items-center justify-center rounded-xl bg-zinc-100 dark:bg-ink-800">
            <Icon className="size-4" />
          </span>
          <span className="flex-1">{label}</span>
          <ChevronRight className="size-4 text-subtle" />
        </Link>
      ))}
    </Card>
  </div>
);
