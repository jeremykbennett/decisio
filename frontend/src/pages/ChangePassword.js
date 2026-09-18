import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI, logout } from '../utils/auth';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { ShieldCheck, Eye, EyeOff, ArrowRight, LogOut } from 'lucide-react';

export default function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await authAPI.changePassword({ current_password: currentPassword, new_password: newPassword });
      const updated = { ...user, must_change_password: false };
      localStorage.setItem('user', JSON.stringify(updated));
      toast.success('Password updated successfully');
      navigate('/clients');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center app-shell px-6 py-12" data-testid="change-password-page">
      <div className="w-full max-w-md animate-rise">
        <div className="glass-card rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-11 w-11 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
              <ShieldCheck className="h-6 w-6 text-white" strokeWidth={1.75} />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-foreground">Set a new password</h1>
              <p className="text-xs text-muted-foreground mt-0.5">Signed in as {user.email}</p>
            </div>
          </div>

          <div className="mb-6 p-3 rounded-xl bg-primary/[0.06] border border-primary/15 text-sm text-foreground/80">
            For your security, you must replace your temporary password before continuing.
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current" className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                Temporary Password
              </Label>
              <div className="relative">
                <Input
                  id="current"
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  data-testid="current-password-input"
                  required
                  className="h-11 rounded-xl bg-white pr-11"
                  placeholder="Enter the temporary password"
                />
                <button type="button" onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new" className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                New Password
              </Label>
              <div className="relative">
                <Input
                  id="new"
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  data-testid="new-password-input"
                  required
                  className="h-11 rounded-xl bg-white pr-11"
                  placeholder="At least 8 characters"
                />
                <button type="button" onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm" className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                Confirm New Password
              </Label>
              <Input
                id="confirm"
                type={showNew ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                data-testid="confirm-password-input"
                required
                className="h-11 rounded-xl bg-white"
                placeholder="Re-enter new password"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              data-testid="change-password-submit"
              className="group w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl text-sm font-semibold shadow-lg shadow-primary/25"
            >
              {loading ? 'Updating...' : (
                <span className="flex items-center justify-center gap-2">
                  Update Password
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2} />
                </span>
              )}
            </Button>
          </form>

          <button
            onClick={handleSignOut}
            data-testid="change-password-signout"
            className="mt-6 w-full flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign out instead
          </button>
        </div>
      </div>
    </div>
  );
}
