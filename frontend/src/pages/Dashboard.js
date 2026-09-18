import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getAuthHeaders } from '../utils/auth';
import { toast } from 'sonner';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Search, Eye, Edit, Trash2, Users, CheckCircle2, PauseCircle, Layers } from 'lucide-react';
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

export default function Dashboard() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const canManage = user.role === 'administrator' || user.role === 'superuser';
  const isClientManager = user.role === 'client_manager';
  const [scope, setScope] = useState(isClientManager ? 'mine' : 'all');

  useEffect(() => {
    fetchClients();
  }, [search, scope]);

  const fetchClients = async () => {
    try {
      const response = await axios.get(`${API}/clients`, {
        headers: getAuthHeaders(),
        params: { search, scope }
      });
      setClients(response.data);
    } catch (error) {
      toast.error('Failed to fetch clients');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`${API}/clients/${deleteId}`, {
        headers: getAuthHeaders()
      });
      toast.success('Client deleted successfully');
      setDeleteId(null);
      fetchClients();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete client');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      active: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
      inactive: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
      'opt in': 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
      'opt out': 'bg-red-50 text-red-700 ring-1 ring-red-200'
    };
    return colors[status?.toLowerCase()] || 'bg-primary/10 text-primary ring-1 ring-primary/20';
  };

  const activeCount = clients.filter((c) => ['active', 'opt in'].includes(c.client_status?.toLowerCase())).length;
  const inactiveCount = clients.length - activeCount;
  const platformCount = new Set(clients.map((c) => c.platform).filter(Boolean)).size;

  const stats = [
    { label: 'Total Clients', value: clients.length, icon: Users, tint: 'bg-primary/10 text-primary' },
    { label: 'Active', value: activeCount, icon: CheckCircle2, tint: 'bg-emerald-50 text-emerald-600' },
    { label: 'Inactive', value: inactiveCount, icon: PauseCircle, tint: 'bg-slate-100 text-slate-500' },
    { label: 'Platforms', value: platformCount, icon: Layers, tint: 'bg-indigo-50 text-indigo-600' },
  ];

  const clientColor = (name) => {
    const palette = ['from-primary to-indigo-500', 'from-emerald-500 to-teal-500', 'from-fuchsia-500 to-purple-500', 'from-amber-500 to-orange-500', 'from-sky-500 to-blue-500'];
    const idx = (name || '').split('').reduce((a, ch) => a + ch.charCodeAt(0), 0) % palette.length;
    return palette[idx];
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" data-testid="dashboard-stats">
          {stats.map(({ label, value, icon: Icon, tint }, i) => (
            <div
              key={label}
              className="glass-card rounded-2xl p-5 flex items-center justify-between animate-rise"
              style={{ animationDelay: `${i * 70}ms` }}
              data-testid={`stat-${label.toLowerCase().replace(/\s/g, '-')}`}
            >
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
                <p className="font-display text-3xl font-bold text-foreground mt-1 font-data">{value}</p>
              </div>
              <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${tint}`}>
                <Icon className="h-6 w-6" strokeWidth={1.75} />
              </div>
            </div>
          ))}
        </div>

        {/* Search bar */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
            <Input
              type="text"
              placeholder="Search by client name or policy ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="search-clients-input"
              className="pl-10 h-11 rounded-xl bg-white border-border focus-visible:ring-2 focus-visible:ring-primary/30"
            />
          </div>
          {isClientManager && (
            <div className="inline-flex rounded-xl border border-border bg-white p-1" data-testid="client-scope-toggle">
              {[['mine', 'My Clients'], ['all', 'All Clients']].map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setScope(val)}
                  data-testid={`client-scope-${val}`}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${scope === val ? 'bg-primary text-white' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Clients table */}
        <div className="glass-card rounded-2xl overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-sm text-muted-foreground">Loading clients...</div>
          ) : clients.length === 0 ? (
            <div className="p-16 text-center">
              <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Users className="h-7 w-7 text-primary" strokeWidth={1.5} />
              </div>
              <p className="font-display text-lg font-semibold text-foreground">No clients yet</p>
              <p className="text-sm text-muted-foreground mt-1">Get started by adding your first client.</p>
              {canManage && (
                <Button
                  onClick={() => navigate('/clients/new')}
                  className="mt-5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl px-5 font-semibold shadow-lg shadow-primary/20"
                  data-testid="empty-state-add-button"
                >
                  Add Your First Client
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/60 border-b border-border">
                  <tr>
                    <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">Policy ID</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">Client Name</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">Platform</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">Status</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">Account Type</th>
                    <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((client) => (
                    <tr
                      key={client.id}
                      className="border-b border-border/60 last:border-0 hover:bg-primary/[0.03] transition-colors"
                      data-testid={`client-row-${client.id}`}
                    >
                      <td className="px-6 py-4 text-sm font-data font-medium text-muted-foreground">{client.policy_id}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`h-9 w-9 rounded-lg bg-gradient-to-br ${clientColor(client.client_name)} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                            {(client.client_name || '?').slice(0, 2).toUpperCase()}
                          </div>
                          <span className="text-sm font-semibold text-foreground">{client.client_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground">{client.platform}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(client.client_status)}`}>
                          {client.client_status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground">{client.account_type}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/clients/${client.id}`)}
                            data-testid={`view-client-${client.id}`}
                            className="rounded-lg hover:bg-primary/10 hover:text-primary"
                          >
                            <Eye className="h-4 w-4" strokeWidth={1.5} />
                          </Button>
                          {canManage && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate(`/clients/${client.id}/edit`)}
                                data-testid={`edit-client-${client.id}`}
                                className="rounded-lg hover:bg-primary/10 hover:text-primary"
                              >
                                <Edit className="h-4 w-4" strokeWidth={1.5} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteId(client.id)}
                                data-testid={`delete-client-${client.id}`}
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

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Client</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this client? This action cannot be undone.
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
