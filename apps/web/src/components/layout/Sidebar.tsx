import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, ClipboardCheck, ImagePlus, Target, Trophy,
  FlaskConical, FileText, Leaf, BarChart3, Settings, Users,
  Building2, ChevronLeft, ShieldCheck, LogOut, Sparkles, Map,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { authService } from '@/services/auth.service';
import type { UserRole } from '@/types';

interface NavItem {
  label: string;
  to: string;
  icon: React.ElementType;
  roles: UserRole[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard',        to: '/dashboard',      icon: LayoutDashboard, roles: ['SUPERADMIN', 'ADMIN_5S', 'AUDITOR', 'KEPALA_DIVISI'] },
  { label: 'Audit 5S',         to: '/audit',          icon: ClipboardCheck,  roles: ['SUPERADMIN', 'ADMIN_5S', 'AUDITOR', 'KEPALA_DIVISI'] },
  { label: 'Before & After',   to: '/before-after',   icon: ImagePlus,       roles: ['SUPERADMIN', 'ADMIN_5S', 'AUDITOR', 'KEPALA_DIVISI', 'PIC'] },
  { label: 'KPI / OKR',        to: '/kpi-okr',        icon: Target,          roles: ['SUPERADMIN', 'ADMIN_5S', 'KEPALA_DIVISI'] },
  { label: 'Kompetisi',        to: '/competition',    icon: Trophy,          roles: ['SUPERADMIN', 'ADMIN_5S', 'AUDITOR', 'KEPALA_DIVISI', 'PIC', 'ANGGOTA'] },
  { label: 'Gamifikasi',       to: '/gamification',   icon: Sparkles,        roles: ['SUPERADMIN', 'ADMIN_5S', 'AUDITOR', 'KEPALA_DIVISI', 'PIC', 'ANGGOTA'] },
  { label: 'Proyek QCC',       to: '/qcc',            icon: FlaskConical,    roles: ['SUPERADMIN', 'ADMIN_5S', 'KEPALA_DIVISI', 'PIC'] },
  { label: 'Digital Twin',     to: '/digital-twin',   icon: Map,             roles: ['SUPERADMIN', 'ADMIN_5S', 'AUDITOR', 'KEPALA_DIVISI', 'PIC'] },
  { label: 'Standar ISO',      to: '/iso',            icon: FileText,        roles: ['SUPERADMIN', 'ADMIN_5S'] },
  { label: 'PROPER KLHK',      to: '/proper',         icon: Leaf,            roles: ['SUPERADMIN', 'ADMIN_5S'] },
  { label: 'Laporan',          to: '/reports',        icon: BarChart3,       roles: ['SUPERADMIN', 'ADMIN_5S', 'KEPALA_DIVISI'] },
  { label: 'Master Data',      to: '/master-data',    icon: Building2,       roles: ['SUPERADMIN', 'ADMIN_5S'] },
  { label: 'Pengguna',         to: '/users',          icon: Users,           roles: ['SUPERADMIN', 'ADMIN_5S'] },
  { label: 'Pengaturan',       to: '/settings',       icon: Settings,        roles: ['SUPERADMIN', 'ADMIN_5S'] },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { user, logout } = useAuthStore();
  const location = useLocation();

  const visibleItems = navItems.filter(
    (item) => user && item.roles.includes(user.role)
  );

  const handleLogout = async () => {
    try { await authService.logout(); } catch { /* ignore */ }
    logout();
    window.location.href = '/login';
  };

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-screen bg-gray-900 text-white flex flex-col transition-all duration-300 z-40',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700 min-h-[64px]">
        {!collapsed && (
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div className="overflow-hidden">
              <p className="font-bold text-sm leading-tight truncate">5S Enterprise</p>
              <p className="text-xs text-gray-400 truncate">{user?.company?.name || ''}</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center mx-auto">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
        )}
        <button
          onClick={onToggle}
          className={cn(
            'p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors flex-shrink-0',
            collapsed && 'hidden'
          )}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname.startsWith(item.to);

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group',
                isActive
                  ? 'bg-primary text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white',
                collapsed && 'justify-center px-2'
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* User Footer */}
      <div className="border-t border-gray-700 p-3">
        {!collapsed ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-2">
              <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-primary">
                  {user?.name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.name}</p>
                <p className="text-xs text-gray-400 truncate">{user?.role}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-red-400 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Keluar
            </button>
          </div>
        ) : (
          <button
            onClick={handleLogout}
            className="w-full flex justify-center p-2 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-red-400 transition-colors"
            title="Keluar"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </aside>
  );
}
