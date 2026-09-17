import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { logout } from '../utils/auth';
import { LayoutDashboard, Users, Calendar, Settings, LogOut, Plus } from 'lucide-react';
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
    if (pageTitle) return { title: pageTitle, action: null };
    
    if (location.pathname.startsWith('/campaigns')) {
      return {
        title: 'Campaign Management',
        action: null  // Campaigns are created from client context
      };
    }
    
    return {
      title: 'Client Management',
      action: (user.role === 'administrator' || user.role === 'superuser') && location.pathname === '/dashboard' ? (
        <Button
          onClick={() => navigate('/clients/new')}
          data-testid="add-client-button"
          className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-none px-6 py-2.5 text-sm font-medium tracking-wide uppercase"
        >
          <Plus className="h-4 w-4 mr-2" strokeWidth={1.5} />
          Add Client
        </Button>
      ) : null
    };
  };

  const { title, action } = getPageInfo();

  return (
    <div className="flex h-screen bg-neutral-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-border flex flex-col">
        <div className="p-6 border-b border-border">
          <h1 className="text-xl font-bold tracking-tight text-primary">Campaign Tracker</h1>
          <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">Decision Management</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <button
            onClick={() => navigate('/dashboard')}
            data-testid="nav-dashboard"
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-none transition-colors ${
              isActive('/dashboard') || (isActive('/clients') && !isActive('/campaigns'))
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted text-foreground'
            }`}
          >
            <LayoutDashboard className="h-5 w-5" strokeWidth={1.5} />
            Dashboard
          </button>
          
          <button
            onClick={() => navigate('/dashboard')}
            data-testid="nav-clients"
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-none transition-colors ${
              isActive('/clients')
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted text-foreground'
            }`}
          >
            <Users className="h-5 w-5" strokeWidth={1.5} />
            Clients
          </button>

          <button
            onClick={() => navigate('/campaigns')}
            data-testid="nav-campaigns"
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-none transition-colors ${
              isActive('/campaigns')
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted text-foreground'
            }`}
          >
            <Calendar className="h-5 w-5" strokeWidth={1.5} />
            Campaigns
          </button>
          
          {(user.role === 'administrator' || user.role === 'superuser') && (
            <>
              <div className="px-4 py-2">
                <p className="text-xs uppercase tracking-wider font-medium text-muted-foreground">Settings</p>
              </div>
              <button
                onClick={() => navigate('/settings')}
                data-testid="nav-client-settings"
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-none transition-colors ${
                  location.pathname === '/settings'
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted text-foreground'
                }`}
              >
                <Settings className="h-5 w-5" strokeWidth={1.5} />
                Client Settings
              </button>
              <button
                onClick={() => navigate('/campaign-settings')}
                data-testid="nav-campaign-settings"
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-none transition-colors ${
                  location.pathname === '/campaign-settings'
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted text-foreground'
                }`}
              >
                <Settings className="h-5 w-5" strokeWidth={1.5} />
                Campaign Settings
              </button>
              {user.role === 'superuser' && (
                <button
                  onClick={() => navigate('/user-management')}
                  data-testid="nav-user-management"
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-none transition-colors ${
                    location.pathname === '/user-management'
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted text-foreground'
                  }`}
                >
                  <Users className="h-5 w-5" strokeWidth={1.5} />
                  User Management
                </button>
              )}
            </>
          )}
        </nav>
        
        <div className="p-4 border-t border-border">
          <div className="mb-4">
            <p className="text-sm font-medium text-foreground">{user.full_name}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">{user.role?.replace('_', ' ')}</p>
          </div>
          <Button
            variant="ghost"
            onClick={handleLogout}
            data-testid="logout-button"
            className="w-full justify-start rounded-none hover:bg-muted"
          >
            <LogOut className="h-4 w-4 mr-2" strokeWidth={1.5} />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-border px-8 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
          {action}
        </div>
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
};

export default Layout;
