import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getAuthHeaders } from '../utils/auth';
import { toast } from 'sonner';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Search, Eye, Edit, Trash2 } from 'lucide-react';
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

export default function Dashboard() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchClients();
  }, [search]);

  const fetchClients = async () => {
    try {
      const response = await axios.get(`${API}/clients`, {
        headers: getAuthHeaders(),
        params: { search }
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
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      'opt in': 'bg-green-100 text-green-800',
      'opt out': 'bg-red-100 text-red-800'
    };
    return colors[status?.toLowerCase()] || 'bg-blue-100 text-blue-800';
  };

  return (
    <Layout>
      <div className="space-y-6">
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
              className="pl-10 rounded-none border border-input"
            />
          </div>
        </div>

        {/* Clients table */}
        <div className="bg-white border border-border rounded-none overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading clients...</div>
          ) : clients.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-muted-foreground">No clients found</p>
              {user.role === 'administrator' || user.role === 'superuser' && (
                <Button
                  onClick={() => navigate('/clients/new')}
                  className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90 rounded-none"
                  data-testid="empty-state-add-button"
                >
                  Add Your First Client
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Policy ID</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Client Name</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Platform</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Status</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Account Type</th>
                    <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((client) => (
                    <tr
                      key={client.id}
                      className="border-b border-border hover:bg-muted/30 transition-colors"
                      data-testid={`client-row-${client.id}`}
                    >
                      <td className="p-4 text-sm font-mono font-medium text-foreground">{client.policy_id}</td>
                      <td className="p-4 text-sm font-medium text-foreground">{client.client_name}</td>
                      <td className="p-4 text-sm text-foreground">{client.platform}</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-none text-xs font-medium ${getStatusColor(client.client_status)}`}>
                          {client.client_status}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-foreground">{client.account_type}</td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/clients/${client.id}`)}
                            data-testid={`view-client-${client.id}`}
                            className="rounded-none hover:bg-muted"
                          >
                            <Eye className="h-4 w-4" strokeWidth={1.5} />
                          </Button>
                          {user.role === 'administrator' || user.role === 'superuser' && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate(`/clients/${client.id}/edit`)}
                                data-testid={`edit-client-${client.id}`}
                                className="rounded-none hover:bg-muted"
                              >
                                <Edit className="h-4 w-4" strokeWidth={1.5} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteId(client.id)}
                                data-testid={`delete-client-${client.id}`}
                                className="rounded-none hover:bg-destructive/10 hover:text-destructive"
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
        <AlertDialogContent className="rounded-none">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Client</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this client? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-none" data-testid="cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              data-testid="confirm-delete"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-none"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
