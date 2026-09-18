import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getAuthHeaders } from '../utils/auth';
import { toast } from 'sonner';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Search, Eye, Edit, Trash2, Calendar } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [clients, setClients] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const canManage = user.role === 'administrator' || user.role === 'superuser';

  useEffect(() => {
    fetchCampaigns();
    fetchClients();
  }, [search]);

  const fetchCampaigns = async () => {
    try {
      const response = await axios.get(`${API}/campaigns`, {
        headers: getAuthHeaders(),
        params: { search }
      });
      setCampaigns(response.data);
    } catch (error) {
      toast.error('Failed to fetch campaigns');
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await axios.get(`${API}/clients`, {
        headers: getAuthHeaders()
      });
      const clientMap = {};
      response.data.forEach(client => {
        clientMap[client.id] = client.client_name;
      });
      setClients(clientMap);
    } catch (error) {
      console.error('Failed to fetch clients');
    }
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`${API}/campaigns/${deleteId}`, {
        headers: getAuthHeaders()
      });
      toast.success('Campaign deleted successfully');
      setDeleteId(null);
      fetchCampaigns();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete campaign');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const channelColor = (channel) => {
    const c = (channel || '').toLowerCase();
    if (c.includes('email')) return 'bg-primary/10 text-primary ring-1 ring-primary/20';
    if (c.includes('mail')) return 'bg-amber-50 text-amber-700 ring-1 ring-amber-200';
    if (c.includes('phone') || c.includes('call')) return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200';
    if (c.includes('sms') || c.includes('text')) return 'bg-fuchsia-50 text-fuchsia-700 ring-1 ring-fuchsia-200';
    return 'bg-slate-100 text-slate-600 ring-1 ring-slate-200';
  };

  const clientColor = (name) => {
    const palette = ['from-primary to-indigo-500', 'from-emerald-500 to-teal-500', 'from-fuchsia-500 to-purple-500', 'from-amber-500 to-orange-500', 'from-sky-500 to-blue-500'];
    const idx = (name || '').split('').reduce((a, ch) => a + ch.charCodeAt(0), 0) % palette.length;
    return palette[idx];
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
            <Input
              type="text"
              placeholder="Search campaigns..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="search-campaigns-input"
              className="pl-10 h-11 rounded-xl bg-white border-border focus-visible:ring-2 focus-visible:ring-primary/30"
            />
          </div>
        </div>

        <div className="glass-card rounded-2xl overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-sm text-muted-foreground">Loading campaigns...</div>
          ) : campaigns.length === 0 ? (
            <div className="p-16 text-center">
              <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Calendar className="h-7 w-7 text-primary" strokeWidth={1.5} />
              </div>
              <p className="font-display text-lg font-semibold text-foreground">No campaigns yet</p>
              <p className="text-sm text-muted-foreground mt-1">Campaigns are created from a client's page.</p>
              {canManage && (
                <Button
                  onClick={() => navigate('/dashboard')}
                  className="mt-5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl px-5 font-semibold shadow-lg shadow-primary/20"
                  data-testid="empty-state-add-button"
                >
                  Go to Clients
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/60 border-b border-border">
                  <tr>
                    <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">Campaign Name</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">Client</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">Channel</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">Election Period</th>
                    <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((campaign) => {
                    const clientName = clients[campaign.client_id] || 'Unknown';
                    return (
                      <tr
                        key={campaign.id}
                        className="border-b border-border/60 last:border-0 hover:bg-primary/[0.03] transition-colors"
                        data-testid={`campaign-row-${campaign.id}`}
                      >
                        <td className="px-6 py-4 text-sm font-semibold text-foreground">{campaign.campaign_name}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`h-8 w-8 rounded-lg bg-gradient-to-br ${clientColor(clientName)} flex items-center justify-center text-white text-[10px] font-bold shrink-0`}>
                              {clientName.slice(0, 2).toUpperCase()}
                            </div>
                            <span className="text-sm text-foreground">{clientName}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${channelColor(campaign.channel)}`}>
                            {campaign.channel}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-foreground">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.75} />
                            <span className="font-data text-xs">{formatDate(campaign.election_start_date)} — {formatDate(campaign.election_end_date)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/campaigns/${campaign.id}`)}
                              data-testid={`view-campaign-${campaign.id}`}
                              className="rounded-lg hover:bg-primary/10 hover:text-primary"
                            >
                              <Eye className="h-4 w-4" strokeWidth={1.5} />
                            </Button>
                            {canManage && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => navigate(`/campaigns/${campaign.id}/edit`)}
                                  data-testid={`edit-campaign-${campaign.id}`}
                                  className="rounded-lg hover:bg-primary/10 hover:text-primary"
                                >
                                  <Edit className="h-4 w-4" strokeWidth={1.5} />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeleteId(campaign.id)}
                                  data-testid={`delete-campaign-${campaign.id}`}
                                  className="rounded-lg hover:bg-destructive/10 hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Campaign</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this campaign? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl" data-testid="cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              data-testid="confirm-delete"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
