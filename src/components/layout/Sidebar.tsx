import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  GraduationCap, 
  UserCog, 
  Calendar, 
  ClipboardList,
  BookOpen,
  Wallet,
  Bell,
  MessageSquare,
  Library,
  Package,
  Settings,
  LogOut,
  ChevronDown,
  School,
  Trophy,
  FileText,
  Receipt,
  AlertTriangle,
  ClipboardCheck,
  Banknote,
  ArrowUpCircle,
  FileCheck,
  Heart,
  CalendarClock,
  Globe,
  Activity,
  ToggleLeft,
  Megaphone,
  TicketIcon,
  HeartPulse,
  Gauge,
  BarChart3,
  CreditCard,
  Download,
  Palette,
  Send,
  ShieldCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useSchoolSettings } from '@/hooks/useSchoolSettings';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles?: string[];
  children?: { label: string; href: string }[];
}

const schoolNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { 
    label: 'Students', 
    href: '/students', 
    icon: GraduationCap,
    roles: ['director', 'principal', 'headmaster', 'teacher', 'admin_staff'],
  },
  { 
    label: 'Staff', 
    href: '/staff', 
    icon: UserCog,
    roles: ['director', 'principal', 'headmaster', 'admin_staff'],
  },
  { 
    label: 'Classes', 
    href: '/classes', 
    icon: School,
    roles: ['director', 'principal', 'headmaster', 'teacher'],
  },
  { 
    label: 'Attendance', 
    href: '/attendance', 
    icon: ClipboardList,
    roles: ['director', 'principal', 'headmaster', 'teacher'],
  },
  { 
    label: 'Timetable', 
    href: '/timetable', 
    icon: Calendar,
    roles: ['director', 'principal', 'headmaster', 'teacher', 'student'],
  },
  { 
    label: 'Gradebook', 
    href: '/gradebook', 
    icon: BookOpen,
    roles: ['director', 'principal', 'headmaster', 'teacher'],
  },
  { 
    label: 'Report Cards', 
    href: '/report-cards', 
    icon: FileText,
    roles: ['director', 'principal', 'headmaster', 'teacher', 'parent', 'student'],
  },
  { 
    label: 'Transcripts', 
    href: '/student-transcripts', 
    icon: FileText,
    roles: ['director', 'principal', 'headmaster', 'admin_staff'],
  },
  {
    label: 'Fees & Payments', 
    href: '/fees', 
    icon: Wallet,
    roles: ['director', 'principal', 'headmaster', 'admin_staff'],
  },
  { 
    label: 'Fee Defaulters', 
    href: '/fee-defaulters', 
    icon: AlertTriangle,
    roles: ['director', 'principal', 'headmaster', 'admin_staff'],
  },
  { 
    label: 'Fee Obligations', 
    href: '/fee-obligations', 
    icon: ClipboardCheck,
    roles: ['director', 'principal', 'headmaster', 'admin_staff'],
  },
  { 
    label: 'Student Promotion', 
    href: '/student-promotion', 
    icon: ArrowUpCircle,
    roles: ['director', 'principal', 'headmaster'],
  },
  { 
    label: 'Payroll', 
    href: '/payroll', 
    icon: Banknote,
    roles: ['director'],
  },
  { 
    label: 'Weekly Reports',
    href: '/weekly-reports', 
    icon: FileCheck,
    roles: ['director', 'principal', 'headmaster', 'teacher'],
  },
  { 
    label: 'Exam Schedule',
    href: '/exam-schedule', 
    icon: CalendarClock,
    roles: ['director', 'principal', 'headmaster', 'teacher'],
  },
  { 
    label: 'Academic Calendar',
    href: '/academic-calendar', 
    icon: Calendar,
    roles: ['director', 'principal', 'headmaster', 'teacher', 'admin_staff'],
  },
  {
    label: 'Notice Board',
    href: '/notices', 
    icon: Bell,
    roles: ['director', 'principal', 'headmaster', 'teacher', 'admin_staff', 'non_teaching_staff', 'parent', 'student'],
  },
  { 
    label: 'Messages', 
    href: '/messages', 
    icon: MessageSquare,
    roles: ['director', 'principal', 'headmaster', 'teacher', 'admin_staff', 'non_teaching_staff'],
  },
  { 
    label: 'Clubs', 
    href: '/clubs', 
    icon: Trophy,
    roles: ['director', 'principal', 'headmaster', 'teacher', 'student'],
  },
  { 
    label: 'Library', 
    href: '/library', 
    icon: Library,
    roles: ['director', 'admin_staff'],
  },
  { 
    label: 'Inventory', 
    href: '/inventory', 
    icon: Package,
    roles: ['director', 'admin_staff'],
  },
  { 
    label: 'Parents Portal', 
    href: '/parents', 
    icon: Users,
    roles: ['parent'],
  },
  { 
    label: 'Payment History', 
    href: '/payment-history', 
    icon: Receipt,
    roles: ['parent'],
  },
  { 
    label: 'Alumni Portal', 
    href: '/alumni', 
    icon: Heart,
    roles: ['alumni'],
  },
  { 
    label: 'Settings', 
    href: '/settings', 
    icon: Settings,
    roles: ['director'],
  },
];

const superAdminNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/super-admin', icon: LayoutDashboard },
  { label: 'Analytics', href: '/super-admin?tab=analytics', icon: Globe },
  { label: 'Schools', href: '/super-admin?tab=schools', icon: School },
  { label: 'Users & Roles', href: '/super-admin?tab=users', icon: Users },
  { label: 'Features', href: '/super-admin?tab=features', icon: ToggleLeft },
  { label: 'Announcements', href: '/super-admin?tab=announcements', icon: Megaphone },
  { label: 'Audit Logs', href: '/super-admin?tab=audit', icon: Activity },
  { label: 'Support', href: '/super-admin?tab=tickets', icon: TicketIcon },
  { label: 'Health', href: '/super-admin?tab=health', icon: HeartPulse },
  { label: 'Quotas', href: '/super-admin?tab=quotas', icon: Gauge },
  { label: 'Compare', href: '/super-admin?tab=compare', icon: BarChart3 },
  { label: 'Billing', href: '/super-admin?tab=subscriptions', icon: CreditCard },
  { label: 'Backup', href: '/super-admin?tab=backup', icon: Download },
  { label: 'Branding', href: '/super-admin?tab=whitelabel', icon: Palette },
  { label: 'Onboarding', href: '/super-admin?tab=onboarding', icon: Send },
  { label: 'Settings', href: '/super-admin?tab=platform', icon: Settings },
];

export const Sidebar: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { role, signOut, profile } = useAuth();
  const { data: settings } = useSchoolSettings();

  const isSuperAdmin = role === 'super_admin';
  const navItemsToShow = isSuperAdmin ? superAdminNavItems : schoolNavItems;

  const filteredNavItems = navItemsToShow.filter(item => {
    if (isSuperAdmin) return true;
    if (!item.roles) return true;
    return role && item.roles.includes(role);
  });

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-foreground/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed left-0 top-0 z-50 h-screen w-64 bg-sidebar text-sidebar-foreground",
        "flex flex-col transition-transform duration-300 ease-in-out",
        "lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Logo */}
        <div className="flex items-center gap-3 p-6 border-b border-sidebar-border">
        {isSuperAdmin ? (
          <>
            <div className="h-10 w-10 rounded-lg bg-destructive flex items-center justify-center">
              <ShieldCheck className="h-6 w-6 text-destructive-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="font-bold text-sm truncate">Super Admin</h1>
              <p className="text-xs text-sidebar-foreground/70 truncate">Platform Management</p>
            </div>
          </>
        ) : (
          <>
            {settings?.logo_url ? (
              <img 
                src={settings.logo_url} 
                alt={settings.school_name} 
                className="h-10 w-10 rounded-lg object-cover"
              />
            ) : (
              <div className="h-10 w-10 rounded-lg bg-sidebar-primary flex items-center justify-center">
                <GraduationCap className="h-6 w-6 text-sidebar-primary-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="font-bold text-sm truncate">
                {settings?.school_name || 'School Management'}
              </h1>
              <p className="text-xs text-sidebar-foreground/70 truncate">
                {settings?.current_session || '2024/2025'}
              </p>
            </div>
          </>
        )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <ul className="space-y-1">
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href || 
                location.pathname.startsWith(item.href + '/');

              return (
                <li key={item.href}>
                  <Link
                    to={item.href}
                    onClick={onClose}
                    className={cn("nav-link", isActive && "active")}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User section */}
        <div className="border-t border-sidebar-border p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-full bg-sidebar-accent flex items-center justify-center">
              <span className="text-sm font-medium">
                {profile?.first_name?.[0] || profile?.email?.[0]?.toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {profile?.first_name 
                  ? `${profile.first_name} ${profile.last_name || ''}`.trim() 
                  : profile?.email}
              </p>
              <p className="text-xs text-sidebar-foreground/70 capitalize">
                {role?.replace('_', ' ') || 'User'}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={signOut}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>
    </>
  );
};
