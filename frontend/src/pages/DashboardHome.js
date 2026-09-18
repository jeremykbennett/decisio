import React from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Users, Calendar, LayoutDashboard, ArrowRight, Hammer } from 'lucide-react';

export default function DashboardHome() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isCampaignManager = user.role === 'marketer';
  const isClientManager = user.role === 'client_manager';

  const allQuickLinks = [
    {
      title: 'Clients',
      description: 'View and manage your clients and their decision records.',
      icon: Users,
      to: '/clients',
      tint: 'bg-primary/10 text-primary',
      testid: 'quicklink-clients',
      hidden: isCampaignManager,
    },
    {
      title: 'Campaigns',
      description: 'Track campaign decisions across every client and channel.',
      icon: Calendar,
      to: '/campaigns',
      tint: 'bg-emerald-50 text-emerald-600',
      testid: 'quicklink-campaigns',
      hidden: isClientManager,
    },
  ];
  const quickLinks = allQuickLinks.filter((l) => !l.hidden);

  return (
    <Layout>
      <div className="space-y-8" data-testid="dashboard-home">
        {/* Welcome banner */}
        <div className="glass-card rounded-2xl p-8 relative overflow-hidden animate-rise">
          <div className="absolute -top-16 -right-10 w-64 h-64 rounded-full bg-primary/5 blur-3xl" />
          <div className="relative z-10">
            <p className="text-xs uppercase tracking-[0.2em] font-semibold text-primary">Welcome back</p>
            <h2 className="font-display text-3xl font-bold text-foreground mt-2">
              Hello, {user.full_name || 'there'}
            </h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-lg">
              This is your workspace home. Jump straight into your clients or campaigns below.
            </p>
          </div>
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quickLinks.map(({ title, description, icon: Icon, to, tint, testid }, i) => (
            <button
              key={title}
              onClick={() => navigate(to)}
              data-testid={testid}
              style={{ animationDelay: `${i * 80}ms` }}
              className="group glass-card rounded-2xl p-6 text-left flex items-start gap-4 hover:border-primary/40 transition-all animate-rise"
            >
              <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${tint}`}>
                <Icon className="h-6 w-6" strokeWidth={1.75} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-lg font-semibold text-foreground">{title}</h3>
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" strokeWidth={2} />
                </div>
                <p className="text-sm text-muted-foreground mt-1">{description}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Coming soon */}
        <div className="glass-card rounded-2xl p-8 flex flex-col items-center text-center" data-testid="dashboard-coming-soon">
          <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <Hammer className="h-7 w-7 text-muted-foreground" strokeWidth={1.5} />
          </div>
          <div className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4 text-primary" strokeWidth={1.75} />
            <h3 className="font-display text-lg font-semibold text-foreground">Dashboard analytics coming soon</h3>
          </div>
          <p className="text-sm text-muted-foreground mt-2 max-w-md">
            Charts and insights across your clients and campaigns will live here. For now, use the quick links above to get things done.
          </p>
          <Button
            onClick={() => navigate('/clients')}
            data-testid="dashboard-go-clients"
            className="mt-5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl px-5 font-semibold shadow-lg shadow-primary/20"
          >
            Go to Clients
          </Button>
        </div>
      </div>
    </Layout>
  );
}
