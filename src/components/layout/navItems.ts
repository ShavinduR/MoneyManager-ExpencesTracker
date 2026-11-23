import { BarChart3, CalendarDays, CreditCard, Landmark, LayoutDashboard, Settings, Target, type LucideIcon } from 'lucide-react';

export type NavItem = { to: string; label: string; icon: LucideIcon; mobile: 'primary' | 'more' };

export const NAV_ITEMS: readonly NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, mobile: 'primary' },
  { to: '/monthly', label: 'Monthly', icon: CalendarDays, mobile: 'primary' },
  { to: '/debts', label: 'Debts', icon: CreditCard, mobile: 'primary' },
  { to: '/goals', label: 'Goals', icon: Target, mobile: 'primary' },
  { to: '/summary', label: 'Year Summary', icon: BarChart3, mobile: 'more' },
  { to: '/accounts', label: 'Bank Accounts', icon: Landmark, mobile: 'more' },
  { to: '/settings', label: 'Settings', icon: Settings, mobile: 'more' },
];
