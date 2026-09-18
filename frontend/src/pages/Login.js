import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../utils/auth';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Eye, EyeOff, Target, ShieldCheck, TrendingUp, ArrowRight } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await authAPI.login({ email, password });
      localStorage.setItem('token', response.access_token);
      localStorage.setItem('user', JSON.stringify(response.user));
      toast.success('Login successful');
      if (response.user?.must_change_password) {
        navigate('/change-password');
      } else if (response.user?.role === 'marketer') {
        navigate('/campaigns');
      } else {
        navigate('/clients');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-background" data-testid="login-page">
      {/* Brand panel */}
      <div className="hidden lg:flex lg:w-[46%] login-hero relative overflow-hidden flex-col justify-between p-14 text-white">
        <div className="absolute inset-0 login-grid opacity-70" />
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-secondary/20 blur-3xl animate-float" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center backdrop-blur-sm">
            <Target className="h-6 w-6 text-white" strokeWidth={1.75} />
          </div>
          <div>
            <p className="font-display font-bold text-lg leading-tight">Decisio</p>
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/50">Decision Management</p>
          </div>
        </div>

        <div className="relative z-10 max-w-md">
          <h2 className="font-display text-4xl xl:text-5xl font-extrabold leading-[1.05]">
            Every campaign decision,<br />
            <span className="text-white/60">tracked with clarity.</span>
          </h2>
          <p className="mt-5 text-white/60 text-base leading-relaxed">
            Manage clients, orchestrate campaigns and keep a defensible record of
            every choice your team makes — all in one workspace.
          </p>

          <div className="mt-10 space-y-4">
            {[
              { icon: ShieldCheck, text: 'Role-based access & full audit trail' },
              { icon: TrendingUp, text: 'Real-time campaign decision insights' },
            ].map(({ icon: Icon, text }, i) => (
              <div key={i} className="flex items-center gap-3 text-white/75 text-sm">
                <div className="h-9 w-9 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center">
                  <Icon className="h-4 w-4" strokeWidth={1.75} />
                </div>
                {text}
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-xs text-white/40">© {new Date().getFullYear()} Decisio · Decision Management System</p>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 app-shell">
        <div className="w-full max-w-sm animate-rise">
          <div className="lg:hidden mb-8 flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-primary flex items-center justify-center">
              <Target className="h-6 w-6 text-white" strokeWidth={1.75} />
            </div>
            <div>
              <p className="font-display font-bold text-lg text-foreground">Decisio</p>
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Decision Management</p>
            </div>
          </div>

          <div className="mb-8">
            <h1 className="font-display text-3xl font-bold text-foreground">Welcome back</h1>
            <p className="text-sm text-muted-foreground mt-2">Sign in to your workspace to continue.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                data-testid="login-email-input"
                required
                className="h-11 rounded-xl bg-white border-border focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary"
                placeholder="you@company.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  data-testid="login-password-input"
                  required
                  className="h-11 rounded-xl bg-white border-border focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary pr-11"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  data-testid="toggle-password-visibility"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" strokeWidth={1.5} />
                  ) : (
                    <Eye className="h-4 w-4" strokeWidth={1.5} />
                  )}
                </button>
              </div>
              <div className="flex justify-end">
                <Link to="/forgot-password" className="text-xs text-primary hover:underline font-medium" data-testid="forgot-password-link">
                  Forgot your password?
                </Link>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              data-testid="login-submit-button"
              className="group w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl text-sm font-semibold tracking-wide shadow-lg shadow-primary/25 transition-all"
            >
              {loading ? 'Signing in...' : (
                <span className="flex items-center justify-center gap-2">
                  Sign In
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2} />
                </span>
              )}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary hover:underline font-semibold" data-testid="register-link">
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
