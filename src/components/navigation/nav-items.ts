import {
  LayoutDashboard,
  GraduationCap,
  CheckSquare,
  Timer,
  Calendar,
  Wallet,
  Plane,
  BookOpen,
  Film,
  Flame,
  FileText,
  FolderClosed,
  BarChart3,
  Settings,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const navSections: NavSection[] = [
  {
    title: 'Core',
    items: [
      { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { title: 'Academics', href: '/academics', icon: GraduationCap },
      { title: 'Tasks', href: '/productivity', icon: CheckSquare },
      { title: 'Pomodoro', href: '/pomodoro', icon: Timer },
      { title: 'Calendar', href: '/calendar', icon: Calendar },
    ],
  },
  {
    title: 'Personal',
    items: [
      { title: 'Finance', href: '/finance', icon: Wallet },
      { title: 'Travel', href: '/travel', icon: Plane },
      { title: 'Books', href: '/books', icon: BookOpen },
      { title: 'Entertainment', href: '/entertainment', icon: Film },
      { title: 'Habits & Goals', href: '/habits', icon: Flame },
      { title: 'Notes', href: '/notes', icon: FileText },
      { title: 'Documents', href: '/documents', icon: FolderClosed },
    ],
  },
  {
    title: 'System',
    items: [
      { title: 'Analytics', href: '/analytics', icon: BarChart3 },
      { title: 'Settings', href: '/settings', icon: Settings },
    ],
  },
];

export const mobilePrimaryNav: NavItem[] = [
  { title: 'Home', href: '/dashboard', icon: LayoutDashboard },
  { title: 'Academics', href: '/academics', icon: GraduationCap },
  { title: 'Tasks', href: '/productivity', icon: CheckSquare },
  { title: 'Calendar', href: '/calendar', icon: Calendar },
];
