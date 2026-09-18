import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { getAuthHeaders } from '../utils/auth';
import { toast } from 'sonner';
import Layout from '../components/Layout';
import ActivityTimeline from '../components/ActivityTimeline';
import { Button } from '../components/ui/button';
import { ArrowLeft, Edit, Mail, Phone, FileText, MessageSquare, Calendar, Plus, Activity, Users, Sparkles } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [managers, setManagers] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const canManage = user.role === 'administrator' || user.role === 'superuser';

  useEffect(() => {
    fetchClient();
    fetchCampaigns();
    fetchActivities();
  }, [id]);

  const fetchClient = async () => {
    try {
      const response = await axios.get(`${API}/clients/${id}`, {
        headers: getAuthHeaders()
      });
      setClient(response.data);

      if (response.data.client_managers?.length > 0) {
        const usersResponse = await axios.get(`${API}/users/search`, {
          headers: getAuthHeaders()
        });
        const allUsers = usersResponse.data;
        const clientManagers = allUsers.filter(u =>
          response.data.client_managers.includes(u.id)
        );
        setManagers(clientManagers);
      }
    } catch (error) {
      toast.error('Failed to fetch client details');
    } finally {
      setLoading(false);
    }
  };

  const fetchCampaigns = async () => {
    try {
      const response = await axios.get(`${API}/clients/${id}/campaigns`, {
        headers: getAuthHeaders()
      });
      setCampaigns(response.data);
    } catch (error) {
      console.error('Failed to fetch campaigns');
    }
  };

  const fetchActivities = async () => {
    try {
      const response = await axios.get(`${API}/clients/${id}/activity`, {
        headers: getAuthHeaders()
      });
      setActivities(response.data);
    } catch (error) {
      console.error('Failed to fetch activities');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getStatusColor = (status) => {
    const colors = {
      'opt in': 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
      'opt out': 'bg-red-50 text-red-700 ring-1 ring-red-200',
      active: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
      inactive: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'
    };
    return colors[status?.toLowerCase()] || 'bg-primary/10 text-primary ring-1 ring-primary/20';
  };

  const getPlanColor = (plan) => {
    if (plan === 'UHC') return 'bg-blue-50 text-blue-700 ring-1 ring-blue-200';
    if (plan === 'Surest') return 'bg-purple-50 text-purple-700 ring-1 ring-purple-200';
    return 'bg-slate-100 text-slate-600 ring-1 ring-slate-200';
  };

  const clientColor = (name) => {
    const palette = ['from-primary to-indigo-500', 'from-emerald-500 to-teal-500', 'from-fuchsia-500 to-purple-500', 'from-amber-500 to-orange-500', 'from-sky-500 to-blue-500'];
    const idx = (name || '').split('').reduce((a, ch) => a + ch.charCodeAt(0), 0) % palette.length;
    return palette[idx];
  };

  const pill = 'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium';

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-12 text-sm text-muted-foreground">Loading client details...</div>
      </Layout>
    );
  }

  if (!client) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-sm text-muted-foreground">Client not found</p>
          <Button onClick={() => navigate('/clients')} className="mt-4 rounded-xl">Back to Clients</Button>
        </div>
      </Layout>
    );
  }

  const commChannels = [
    { key: 'global_status_email', label: 'Email', icon: Mail, testid: 'global-status-email-box' },
    { key: 'global_status_direct_mail', label: 'Direct Mail', icon: FileText, testid: 'global-status-mail-box' },
    { key: 'global_status_phone', label: 'Phone', icon: Phone, testid: 'global-status-phone-box' },
    { key: 'global_status_direct_sms', label: 'Direct SMS', icon: MessageSquare, testid: 'global-status-sms-box' },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate('/clients')}
            data-testid="back-button"
            className="rounded-xl hover:bg-muted -ml-3"
          >
            <ArrowLeft className="h-4 w-4 mr-2" strokeWidth={1.75} />
            Back to Clients
          </Button>

          {canManage && (
            <Button
              onClick={() => navigate(`/clients/${id}/edit`)}
              data-testid="edit-client-button"
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl px-5 font-semibold shadow-lg shadow-primary/20"
            >
              <Edit className="h-4 w-4 mr-2" strokeWidth={1.75} />
              Edit Client
            </Button>
          )}
        </div>

        {/* Hero card */}
        <div className="glass-card rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center gap-5 animate-rise" data-testid="client-main-info">
          <div className={`h-16 w-16 rounded-2xl bg-gradient-to-br ${clientColor(client.client_name)} flex items-center justify-center text-white text-xl font-bold shrink-0`}>
            {(client.client_name || '?').slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-display text-2xl font-bold text-foreground truncate">{client.client_name}</h2>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="font-data text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md">{client.policy_id}</span>
              <span className={`${pill} ${getStatusColor(client.client_status)}`}>{client.client_status}</span>
              <span className={`${pill} ${getPlanColor(client.plan)}`}>{client.plan}</span>
            </div>
          </div>
          <div className="flex gap-6 sm:border-l sm:border-border sm:pl-6">
            <div>
              <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Platform</p>
              <p className="text-sm font-semibold text-foreground mt-1">{client.platform}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Account</p>
              <p className="text-sm font-semibold text-foreground mt-1">{client.account_type}</p>
            </div>
          </div>
        </div>

        {/* Communication status grid */}
        <div>
          <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-3">Global Communication Status</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {commChannels.map(({ key, label, icon: Icon, testid }, i) => (
              <div
                key={key}
                className="glass-card rounded-2xl p-5 flex flex-col items-center text-center animate-rise"
                style={{ animationDelay: `${i * 60}ms` }}
                data-testid={testid}
              >
                <div className="mb-3 h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Icon className="h-5 w-5 text-primary" strokeWidth={1.75} />
                </div>
                <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-2">{label}</p>
                <span className={`${pill} ${getStatusColor(client[key])}`}>{client[key]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Engagement + Managers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="glass-card rounded-2xl p-6" data-testid="engagement-info">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-4 w-4 text-primary" strokeWidth={1.75} />
              <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Engagement Solutions</p>
            </div>
            <div className="flex items-center justify-center h-16">
              <span className={`inline-flex items-center px-5 py-2 rounded-full text-base font-semibold ${
                client.engagement_solutions_client === 'Yes'
                  ? 'bg-primary/10 text-primary ring-1 ring-primary/20'
                  : 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'
              }`}>
                {client.engagement_solutions_client}
              </span>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-6" data-testid="managers-info">
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-4 w-4 text-primary" strokeWidth={1.75} />
              <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Client Manager(s)</p>
            </div>
            <div className="space-y-3">
              {managers.length > 0 ? (
                managers.map((manager) => (
                  <div key={manager.id} className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                      {(manager.full_name || 'U').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-foreground truncate">{manager.full_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{manager.email}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No managers assigned</p>
              )}
            </div>
          </div>
        </div>

        {/* Campaigns Section */}
        <div className="glass-card rounded-2xl p-6" data-testid="campaigns-section">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" strokeWidth={1.75} />
              <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Campaigns</p>
            </div>
            {canManage && (
              <Button
                onClick={() => navigate(`/clients/${id}/campaigns/new`)}
                data-testid="add-campaign-to-client"
                className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl px-4 py-2 text-xs font-semibold"
              >
                <Plus className="h-3 w-3 mr-2" strokeWidth={2} />
                Add Campaign
              </Button>
            )}
          </div>
          {campaigns.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No campaigns for this client yet</p>
          ) : (
            <div className="space-y-3">
              {campaigns.map((campaign) => (
                <div
                  key={campaign.id}
                  className="flex items-center justify-between p-4 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/[0.03] transition-all cursor-pointer"
                  onClick={() => navigate(`/clients/${id}/campaigns/${campaign.id}/edit`)}
                  data-testid={`campaign-item-${campaign.id}`}
                >
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-foreground">{campaign.campaign_name}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" strokeWidth={1.75} />
                        {formatDate(campaign.election_start_date)} - {formatDate(campaign.election_end_date)}
                      </span>
                      <span>•</span>
                      <span>{campaign.channel}</span>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                    {campaign.campaign_products?.length || 0} products
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Activity Timeline Section */}
        <div className="glass-card rounded-2xl p-6" data-testid="activity-timeline">
          <div className="flex items-center gap-2 mb-6">
            <Activity className="h-4 w-4 text-primary" strokeWidth={1.75} />
            <h3 className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Activity Timeline</h3>
          </div>
          <ActivityTimeline activities={activities} />
        </div>
      </div>
    </Layout>
  );
}
