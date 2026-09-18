import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { logout } from '../utils/auth';
import { LayoutDashboard, Users, Calendar, Settings, LogOut, Plus, Target, ShieldCheck } from 'lucide-react';
import { Button } from './ui/button';

export const Layout = ({ children, pageTitle }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  const getPageInfo = () => {
    if (pageTitle) return { title: pageTitle, subtitle: null, action: null };

    if (location.pathname.startsWith('/campaigns')) {
      return {
        title: 'Campaign Management',
        subtitle: 'Track and manage campaign decisions',
        action: null
      };
    }

    if (location.pathname === '/dashboard') {
      return {
        title: 'Dashboard',
        subtitle: 'Your workspace at a glance',
        action: null
      };
    }

    return {
      title: 'Client Management',
      subtitle: 'Your clients and their decision records',
      action: (user.role === 'administrator' || user.role === 'superuser') && location.pathname === '/clients' ? (
        <Button
          onClick={() => navigate('/clients/new')}
          data-testid="add-client-button"
          className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl px-5 py-2.5 text-sm font-semibold shadow-lg shadow-primary/20"
        >
          <Plus className="h-4 w-4 mr-2" strokeWidth={2} />
          Add Client
        </Button>
      ) : null
    };
  };

  const { title, subtitle, action } = getPageInfo();

  const role = user.role;
  const isAdmin = role === 'administrator' || role === 'superuser';
  const isCampaignManager = role === 'marketer';
  const isClientManager = role === 'client_manager';

  const initials = (user.full_name || 'U')
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const navItemClass = (active) =>
    `group w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all ${
      active
        ? 'bg-primary text-white shadow-lg shadow-primary/30'
        : 'text-white/60 hover:text-white hover:bg-white/5'
    }`;

  return (
    <div className="flex h-screen app-shell">
      {/* Sidebar */}
      <aside className="w-64 sidebar-ink flex flex-col text-white">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/90 flex items-center justify-center shadow-lg shadow-primary/30">
              <Target className="h-5 w-5 text-white" strokeWidth={1.75} />
            </div>
            <div>
              <h1 className="font-display text-base font-bold tracking-tight text-white">Decisio</h1>
              <p className="text-[10px] text-white/40 uppercase tracking-[0.2em]">Decision Mgmt</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {!isCampaignManager && (
            <button
              onClick={() => navigate('/dashboard')}
              data-testid="nav-dashboard"
              className={navItemClass(location.pathname === '/dashboard')}
            >
              <LayoutDashboard className="h-5 w-5" strokeWidth={1.75} />
              Dashboard
            </button>
          )}

          {!isCampaignManager && (
            <button
              onClick={() => navigate('/clients')}
              data-testid="nav-clients"
              className={navItemClass(isActive('/clients'))}
            >
              <Users className="h-5 w-5" strokeWidth={1.75} />
              Clients
            </button>
          )}

          {!isClientManager && (
            <button
              onClick={() => navigate('/campaigns')}
              data-testid="nav-campaigns"
              className={navItemClass(isActive('/campaigns'))}
            >
              <Calendar className="h-5 w-5" strokeWidth={1.75} />
              Campaigns
            </button>
          )}

          {isAdmin && (
            <>
              <div className="px-4 pt-5 pb-2">
                <p className="text-[10px] uppercase tracking-[0.2em] font-semibold text-white/30">Settings</p>
              </div>
              <button
                onClick={() => navigate('/settings')}
                data-testid="nav-client-settings"
                className={navItemClass(location.pathname === '/settings')}
              >
                <Settings className="h-5 w-5" strokeWidth={1.75} />
                Client Settings
              </button>
              <button
                onClick={() => navigate('/campaign-settings')}
                data-testid="nav-campaign-settings"
                className={navItemClass(location.pathname === '/campaign-settings')}
              >
                <Settings className="h-5 w-5" strokeWidth={1.75} />
                Campaign Settings
              </button>
              {user.role === 'superuser' && (
                <button
                  onClick={() => navigate('/user-management')}
                  data-testid="nav-user-management"
                  className={navItemClass(location.pathname === '/user-management')}
                >
                  <ShieldCheck className="h-5 w-5" strokeWidth={1.75} />
                  User Management
                </button>
              )}
            </>
          )}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-3 px-1">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-xs font-bold shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{user.full_name}</p>
              <p className="text-[10px] text-white/40 uppercase tracking-wider mt-0.5">{user.role?.replace('_', ' ')}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            onClick={handleLogout}
            data-testid="logout-button"
            className="w-full justify-start rounded-xl text-white/60 hover:text-white hover:bg-white/5"
          >
            <LogOut className="h-4 w-4 mr-2" strokeWidth={1.75} />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border px-8 py-5 flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">{title}</h2>
            {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
          {action}
        </div>
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
};

export default Layout;
