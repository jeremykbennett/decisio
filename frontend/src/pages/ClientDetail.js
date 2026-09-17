import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { getAuthHeaders } from '../utils/auth';
import { toast } from 'sonner';
import Layout from '../components/Layout';
import ActivityTimeline from '../components/ActivityTimeline';
import { Button } from '../components/ui/button';
import { ArrowLeft, Edit, Mail, Phone, FileText, MessageSquare, Calendar, Plus, Activity } from 'lucide-react';

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
      
      // Fetch manager details
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
      'opt in': 'bg-green-100 text-green-800',
      'opt out': 'bg-red-100 text-red-800',
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800'
    };
    return colors[status?.toLowerCase()] || 'bg-blue-100 text-blue-800';
  };

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
          <Button onClick={() => navigate('/dashboard')} className="mt-4 rounded-none">Back to Dashboard</Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            data-testid="back-button"
            className="rounded-none hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4 mr-2" strokeWidth={1.5} />
            Back to Dashboard
          </Button>
          
          {user.role === 'administrator' || user.role === 'superuser' && (
            <Button
              onClick={() => navigate(`/clients/${id}/edit`)}
              data-testid="edit-client-button"
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-none"
            >
              <Edit className="h-4 w-4 mr-2" strokeWidth={1.5} />
              Edit Client
            </Button>
          )}
        </div>

        {/* Row 1: 4 boxes */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Box 1: Client Name, Policy ID, Status */}
          <div className="bg-white border border-border rounded-none p-6" data-testid="client-main-info">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Client Name:</span>
                <span className="text-sm font-semibold">{client.client_name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Policy ID:</span>
                <span className="text-sm font-mono font-medium">{client.policy_id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Status:</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-none text-xs font-medium ${getStatusColor(client.client_status)}`}>
                  {client.client_status}
                </span>
              </div>
            </div>
          </div>

          {/* Box 2: Account Type, Platform, Plan with color highlights */}
          <div className="bg-white border border-border rounded-none p-6" data-testid="client-details">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Account Type:</span>
                <span className="text-sm font-medium">{client.account_type}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Platform:</span>
                <span className="text-sm font-medium">{client.platform}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Plan:</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-none text-xs font-medium ${
                  client.plan === 'UHC' ? 'bg-blue-100 text-blue-800' : 
                  client.plan === 'Surest' ? 'bg-purple-100 text-purple-800' : 
                  'bg-gray-100 text-gray-800'
                }`}>
                  {client.plan}
                </span>
              </div>
            </div>
          </div>

          {/* Box 3: Global Status Email */}
          <div className="bg-white border border-border rounded-none p-6" data-testid="global-status-email-box">
            <div className="flex flex-col items-center text-center h-full justify-center">
              <div className="mb-3 p-3 bg-muted rounded-none">
                <Mail className="h-6 w-6 text-primary" strokeWidth={1.5} />
              </div>
              <p className="text-xs uppercase tracking-wider font-medium text-muted-foreground mb-2">Email</p>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-none text-xs font-medium ${getStatusColor(client.global_status_email)}`}>
                {client.global_status_email}
              </span>
            </div>
          </div>

          {/* Box 4: Global Status Direct Mail */}
          <div className="bg-white border border-border rounded-none p-6" data-testid="global-status-mail-box">
            <div className="flex flex-col items-center text-center h-full justify-center">
              <div className="mb-3 p-3 bg-muted rounded-none">
                <FileText className="h-6 w-6 text-primary" strokeWidth={1.5} />
              </div>
              <p className="text-xs uppercase tracking-wider font-medium text-muted-foreground mb-2">Direct Mail</p>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-none text-xs font-medium ${getStatusColor(client.global_status_direct_mail)}`}>
                {client.global_status_direct_mail}
              </span>
            </div>
          </div>
        </div>

        {/* Row 2: Engagement Solutions and Client Managers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Engagement Solutions */}
          <div className="bg-white border border-border rounded-none p-6" data-testid="engagement-info">
            <p className="text-xs uppercase tracking-wider font-medium text-muted-foreground mb-3">Engagement Solutions Client</p>
            <div className="flex items-center justify-center h-20">
              <span className={`inline-flex items-center px-4 py-2 rounded-none text-base font-medium ${
                client.engagement_solutions_client === 'Yes' 
                  ? 'bg-blue-100 text-blue-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {client.engagement_solutions_client}
              </span>
            </div>
          </div>

          {/* Client Managers */}
          <div className="bg-white border border-border rounded-none p-6" data-testid="managers-info">
            <p className="text-xs uppercase tracking-wider font-medium text-muted-foreground mb-4">Client Manager(s)</p>
            <div className="space-y-3">
              {managers.length > 0 ? (
                managers.map((manager) => (
                  <div key={manager.id} className="text-sm">
                    <p className="font-medium">{manager.full_name}</p>
                    <p className="text-xs text-muted-foreground">{manager.email}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No managers assigned</p>
              )}
            </div>
          </div>
        </div>

        {/* Row 3: Remaining Global Communication Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-border rounded-none p-6" data-testid="global-status-phone-box">
            <div className="flex flex-col items-center text-center">
              <div className="mb-3 p-3 bg-muted rounded-none">
                <Phone className="h-6 w-6 text-primary" strokeWidth={1.5} />
              </div>
              <p className="text-xs uppercase tracking-wider font-medium text-muted-foreground mb-2">Phone</p>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-none text-xs font-medium ${getStatusColor(client.global_status_phone)}`}>
                {client.global_status_phone}
              </span>
            </div>
          </div>

          <div className="bg-white border border-border rounded-none p-6" data-testid="global-status-sms-box">
            <div className="flex flex-col items-center text-center">
              <div className="mb-3 p-3 bg-muted rounded-none">
                <MessageSquare className="h-6 w-6 text-primary" strokeWidth={1.5} />
              </div>
              <p className="text-xs uppercase tracking-wider font-medium text-muted-foreground mb-2">Direct SMS</p>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-none text-xs font-medium ${getStatusColor(client.global_status_direct_sms)}`}>
                {client.global_status_direct_sms}
              </span>
            </div>
          </div>
        </div>

        {/* Campaigns Section */}
        <div className="bg-white border border-border rounded-none p-6" data-testid="campaigns-section">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs uppercase tracking-wider font-medium text-muted-foreground">Campaigns</p>
            {user.role === 'administrator' || user.role === 'superuser' && (
              <Button
                onClick={() => navigate(`/clients/${id}/campaigns/new`)}
                data-testid="add-campaign-to-client"
                className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-none px-4 py-2 text-xs font-medium tracking-wide uppercase"
              >
                <Plus className="h-3 w-3 mr-2" strokeWidth={1.5} />
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
                  className="flex items-center justify-between p-4 border border-border rounded-none hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => navigate(`/clients/${id}/campaigns/${campaign.id}/edit`)}
                  data-testid={`campaign-item-${campaign.id}`}
                >
                  <div className="flex-1">
                    <p className="font-medium text-sm">{campaign.campaign_name}</p>
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" strokeWidth={1.5} />
                        {formatDate(campaign.election_start_date)} - {formatDate(campaign.election_end_date)}
                      </span>
                      <span>•</span>
                      <span>{campaign.channel}</span>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {campaign.campaign_products?.length || 0} products
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Activity Timeline Section */}
        <div className="bg-white border border-border rounded-none p-6" data-testid="activity-timeline">
          <div className="flex items-center gap-2 mb-6">
            <Activity className="h-5 w-5 text-primary" strokeWidth={1.5} />
            <h3 className="text-xs uppercase tracking-wider font-medium text-muted-foreground">Activity Timeline</h3>
          </div>
          <ActivityTimeline activities={activities} />
        </div>
      </div>
    </Layout>
  );
}
