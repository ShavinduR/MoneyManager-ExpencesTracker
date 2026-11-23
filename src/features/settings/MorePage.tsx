import { Link } from "react-router-dom";
import { ChevronRight, CircleHelp, Smartphone } from "lucide-react";
import { NAV_ITEMS } from "@/components/layout/navItems";
import { PageHeader } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { useUiStore } from "@/store/uiStore";

const rowClass =
  "flex w-full items-center gap-3 px-4 py-4 text-left text-sm font-medium hover:bg-zinc-50 dark:hover:bg-ink-850";
const iconClass =
  "flex size-9 items-center justify-center rounded-xl bg-zinc-100 dark:bg-ink-800";

export const MorePage = () => {
  const openSync = useUiStore((s) => s.openSync);
  const openHelp = useUiStore((s) => s.openHelp);
  return (
    <div className="animate-fade-up">
      <PageHeader title="More" />
      <Card className="divide-y divide-zinc-100 dark:divide-ink-800">
        {NAV_ITEMS.filter((i) => i.mobile === "more").map(
          ({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="flex items-center gap-3 px-4 py-4 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-ink-850"
            >
              <span className="flex size-9 items-center justify-center rounded-xl bg-zinc-100 dark:bg-ink-800">
                <Icon className="size-4" />
              </span>
              <span className="flex-1">{label}</span>
              <ChevronRight className="size-4 text-subtle" />
            </Link>
          ),
        )}
      </Card>
      <Card className="mt-4 divide-y divide-zinc-100 dark:divide-ink-800">
        <button
          type="button"
          onClick={openSync}
          aria-haspopup="dialog"
          className={rowClass}
        >
          <span className={iconClass}>
            <Smartphone className="size-4" />
          </span>
          <span className="flex-1">Sync devices</span>
          <ChevronRight className="size-4 text-subtle" />
        </button>
        <button
          type="button"
          onClick={openHelp}
          aria-haspopup="dialog"
          className={rowClass}
        >
          <span className={iconClass}>
            <CircleHelp className="size-4" />
          </span>
          <span className="flex-1">How it works</span>
          <ChevronRight className="size-4 text-subtle" />
        </button>
      </Card>
    </div>
  );
};
