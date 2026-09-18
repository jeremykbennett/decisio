import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getAuthHeaders } from '../utils/auth';
import { toast } from 'sonner';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Search, Eye, Edit, Trash2, Calendar, Plus, Package, Download } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
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

const BACKEND_URL = (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const canManage = user.role === 'administrator' || user.role === 'superuser';
  const isCampaignManager = user.role === 'marketer';
  const [scope, setScope] = useState(isCampaignManager ? 'mine' : 'all');

  useEffect(() => {
    fetchCampaigns();
  }, [search, scope]);

  const fetchCampaigns = async () => {
    try {
      const response = await axios.get(`${API}/campaigns`, {
        headers: getAuthHeaders(),
        params: { search, scope }
      });
      setCampaigns(response.data);
    } catch (error) {
      toast.error('Failed to fetch campaigns');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`${API}/campaigns/${deleteId}`, { headers: getAuthHeaders() });
      toast.success('Campaign deleted successfully');
      setDeleteId(null);
      fetchCampaigns();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete campaign');
    }
  };

  const exportDecisions = async (campaignId, name, type) => {
    try {
      const res = await axios.get(`${API}/campaigns/${campaignId}/export/${type}`, {
        headers: getAuthHeaders(),
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      const safe = (name || 'campaign').replace(/[^a-z0-9\-_ ]/gi, '').trim().replace(/\s+/g, '_');
      a.download = `${safe}_${type}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Export downloaded');
    } catch (error) {
      toast.error('Failed to export decisions');
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

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative w-72 max-w-full">
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

            {isCampaignManager && (
              <div className="inline-flex rounded-xl border border-border bg-white p-1" data-testid="campaign-scope-toggle">
                {[['mine', 'My Campaigns'], ['all', 'All Campaigns']].map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => setScope(val)}
                    data-testid={`scope-${val}`}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${scope === val ? 'bg-primary text-white' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {canManage && (
            <Button
              onClick={() => navigate('/campaigns/new')}
              data-testid="new-campaign-button"
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl px-5 font-semibold shadow-lg shadow-primary/20"
            >
              <Plus className="h-4 w-4 mr-2" strokeWidth={2} />
              New Campaign
            </Button>
          )}
        </div>

        <div className="glass-card rounded-2xl overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-sm text-muted-foreground">Loading campaigns...</div>
          ) : campaigns.length === 0 ? (
            <div className="p-16 text-center">
              <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Calendar className="h-7 w-7 text-primary" strokeWidth={1.5} />
              </div>
              <p className="font-display text-lg font-semibold text-foreground">
                {isCampaignManager && scope === 'mine' ? 'No campaigns assigned to you' : 'No campaigns yet'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {canManage ? 'Create a global campaign that applies to all clients.' : 'Campaigns will appear here once created.'}
              </p>
              {canManage && (
                <Button
                  onClick={() => navigate('/campaigns/new')}
                  className="mt-5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl px-5 font-semibold shadow-lg shadow-primary/20"
                  data-testid="empty-state-add-button"
                >
                  Create Your First Campaign
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/60 border-b border-border">
                  <tr>
                    <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">Campaign Name</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">Channel</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">Election Period</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">Products</th>
                    <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((campaign) => (
                    <tr
                      key={campaign.id}
                      className="border-b border-border/60 last:border-0 hover:bg-primary/[0.03] transition-colors"
                      data-testid={`campaign-row-${campaign.id}`}
                    >
                      <td className="px-6 py-4 text-sm font-semibold text-foreground">{campaign.campaign_name}</td>
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
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                          <Package className="h-3 w-3" strokeWidth={1.75} />
                          {campaign.campaign_products?.length || 0} product{(campaign.campaign_products?.length || 0) === 1 ? '' : 's'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                data-testid={`export-campaign-${campaign.id}`}
                                className="rounded-lg hover:bg-primary/10 hover:text-primary"
                                title="Export decisions"
                              >
                                <Download className="h-4 w-4" strokeWidth={1.5} />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-xl">
                              <DropdownMenuLabel>Export decisions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                data-testid={`export-optin-${campaign.id}`}
                                onClick={() => exportDecisions(campaign.id, campaign.campaign_name, 'opt_in')}
                              >
                                Opt-ins only
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                data-testid={`export-optout-${campaign.id}`}
                                onClick={() => exportDecisions(campaign.id, campaign.campaign_name, 'opt_out')}
                              >
                                Opt-outs only
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                data-testid={`export-both-${campaign.id}`}
                                onClick={() => exportDecisions(campaign.id, campaign.campaign_name, 'both')}
                              >
                                Opt-ins &amp; Opt-outs
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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
                  ))}
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
              Are you sure you want to delete this campaign? This removes it for all clients and cannot be undone.
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
