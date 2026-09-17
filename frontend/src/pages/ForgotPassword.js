import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { ArrowLeft, Mail, Copy, CheckCircle2 } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetData, setResetData] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${API}/auth/forgot-password`, { email });
      setResetData(response.data);
      toast.success('Password reset link generated');
    } catch (error) {
      toast.error('Failed to generate reset link');
    } finally {
      setLoading(false);
    }
  };

  const copyResetLink = () => {
    const fullUrl = `${window.location.origin}/reset-password?token=${resetData.token}`;
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    toast.success('Reset link copied to clipboard');
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-neutral-50">
      <div className="w-full max-w-md p-8 bg-white border border-border rounded-none shadow-sm">
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight text-primary">Reset Password</h1>
          <p className="text-sm text-muted-foreground mt-2 uppercase tracking-wider">
            Enter your email to get a reset link
          </p>
        </div>

        {!resetData ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs uppercase tracking-wider font-medium">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                data-testid="forgot-password-email-input"
                required
                className="rounded-none border-b border-input focus-visible:ring-1 focus-visible:ring-primary"
                placeholder="you@company.com"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              data-testid="forgot-password-submit-button"
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-none px-6 py-2.5 text-sm font-medium tracking-wide uppercase"
            >
              {loading ? 'Generating link...' : 'Get Reset Link'}
            </Button>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-center mb-4">
              <div className="p-3 bg-green-100 rounded-full">
                <Mail className="h-8 w-8 text-green-600" strokeWidth={1.5} />
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-none p-4">
              <p className="text-sm text-blue-900 mb-2 font-medium">Password Reset Link Generated</p>
              <p className="text-xs text-blue-700 mb-4">
                Copy the link below and paste it in your browser to reset your password. This link will expire in 1 hour.
              </p>
              
              <div className="bg-white border border-blue-300 rounded-none p-3 mb-3 break-all text-xs font-mono text-blue-900">
                {window.location.origin}/reset-password?token={resetData.token}
              </div>

              <Button
                onClick={copyResetLink}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-none"
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" strokeWidth={1.5} />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" strokeWidth={1.5} />
                    Copy Reset Link
                  </>
                )}
              </Button>
            </div>

            <div className="text-center">
              <Link
                to="/login"
                className="text-sm text-primary hover:underline inline-flex items-center"
              >
                <ArrowLeft className="h-3 w-3 mr-1" strokeWidth={1.5} />
                Back to Login
              </Link>
            </div>
          </div>
        )}

        {!resetData && (
          <div className="mt-6 text-center">
            <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center">
              <ArrowLeft className="h-3 w-3 mr-1" strokeWidth={1.5} />
              Back to Login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
