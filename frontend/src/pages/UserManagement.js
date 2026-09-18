import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getAuthHeaders } from '../utils/auth';
import { toast } from 'sonner';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Shield, Trash2, Plus } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';

const BACKEND_URL = (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ROLE_LABELS = {
  superuser: 'Superuser',
  administrator: 'Administrator',
  client_manager: 'Client Manager',
  marketer: 'Marketer'
};

const ROLE_DESCRIPTIONS = {
  superuser: 'Full access + user management',
  administrator: 'Manage clients, campaigns, settings',
  client_manager: 'View all clients (read-only)',
  marketer: 'View assigned clients only'
};

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', password: '', full_name: '', role: 'marketer' });
  const [creating, setCreating] = useState(false);
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API}/users`, {
        headers: getAuthHeaders()
      });
      setUsers(response.data);
    } catch (error) {
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await axios.put(
        `${API}/users/${userId}?role=${newRole}`,
        {},
        { headers: getAuthHeaders() }
      );
      toast.success('User role updated successfully');
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update user role');
    }
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`${API}/users/${deleteId}`, {
        headers: getAuthHeaders()
      });
      toast.success('User deleted successfully');
      setDeleteId(null);
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete user');
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.email || !newUser.password || !newUser.full_name) {
      toast.error('All fields are required');
      return;
    }

    setCreating(true);
    try {
      await axios.post(`${API}/users`, newUser, {
        headers: getAuthHeaders()
      });
      toast.success('User created successfully');
      setShowCreateDialog(false);
      setNewUser({ email: '', password: '', full_name: '', role: 'marketer' });
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create user');
    } finally {
      setCreating(false);
    }
  };

  const getRoleBadgeColor = (role) => {
    const colors = {
      superuser: 'bg-purple-50 text-purple-700 ring-1 ring-purple-200',
      administrator: 'bg-primary/10 text-primary ring-1 ring-primary/20',
      client_manager: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
      marketer: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'
    };
    return colors[role] || 'bg-slate-100 text-slate-600 ring-1 ring-slate-200';
  };

  const avatarColor = (name) => {
    const palette = ['from-primary to-indigo-500', 'from-emerald-500 to-teal-500', 'from-fuchsia-500 to-purple-500', 'from-amber-500 to-orange-500', 'from-sky-500 to-blue-500'];
    const idx = (name || '').split('').reduce((a, ch) => a + ch.charCodeAt(0), 0) % palette.length;
    return palette[idx];
  };

  const initials = (name) => (name || 'U').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

  return (
    <Layout pageTitle="User Management">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              Manage user accounts and permissions. Superuser privileges required.
            </p>
          </div>
          <Button
            onClick={() => setShowCreateDialog(true)}
            data-testid="create-user-button"
            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-semibold shadow-lg shadow-primary/20"
          >
            <Plus className="h-4 w-4 mr-2" strokeWidth={1.5} />
            Create User
          </Button>
        </div>

        <div className="glass-card rounded-2xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading users...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/60 border-b border-border">
                  <tr>
                    <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-4">User</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-4">Email</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-4">Role</th>
                    <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-4">Change Role</th>
                    <th className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-border/60 last:border-0 hover:bg-primary/[0.03] transition-colors"
                      data-testid={`user-row-${user.id}`}
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={`h-9 w-9 rounded-full bg-gradient-to-br ${avatarColor(user.full_name)} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                            {initials(user.full_name)}
                          </div>
                          <span className="text-sm font-semibold text-foreground">{user.full_name}</span>
                          {user.id === currentUser.id && (
                            <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full font-medium">You</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-sm text-foreground">{user.email}</td>
                      <td className="p-4">
                        <div>
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                            {user.role === 'superuser' && <Shield className="h-3 w-3 mr-1" strokeWidth={1.75} />}
                            {ROLE_LABELS[user.role]}
                          </span>
                          <p className="text-xs text-muted-foreground mt-1">{ROLE_DESCRIPTIONS[user.role]}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        {user.id !== currentUser.id ? (
                          <Select
                            value={user.role}
                            onValueChange={(value) => handleRoleChange(user.id, value)}
                          >
                            <SelectTrigger data-testid={`role-select-${user.id}`} className="rounded-xl h-11 w-48">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="superuser">Superuser</SelectItem>
                              <SelectItem value="administrator">Administrator</SelectItem>
                              <SelectItem value="client_manager">Client Manager</SelectItem>
                              <SelectItem value="marketer">Marketer</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-xs text-muted-foreground">Cannot change own role</span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        {user.id !== currentUser.id ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteId(user.id)}
                            data-testid={`delete-user-${user.id}`}
                            className="rounded-xl hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this user? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create User Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>
              Add a new user with specified role and permissions.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name *</Label>
              <Input
                id="full_name"
                value={newUser.full_name}
                onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                placeholder="John Doe"
                className="rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                placeholder="user@company.com"
                className="rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                placeholder="••••••••"
                className="rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role *</Label>
              <Select
                value={newUser.role}
                onValueChange={(value) => setNewUser({ ...newUser, role: value })}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="superuser">Superuser - Full access + user management</SelectItem>
                  <SelectItem value="administrator">Administrator - Manage clients & campaigns</SelectItem>
                  <SelectItem value="client_manager">Client Manager - View only</SelectItem>
                  <SelectItem value="marketer">Marketer - View assigned only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateUser}
              disabled={creating}
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-semibold shadow-lg shadow-primary/20"
            >
              {creating ? 'Creating...' : 'Create User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
