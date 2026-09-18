import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { isAuthenticated, authAPI } from '../utils/auth';

export const ProtectedRoute = ({ children, bypassPasswordGate = false }) => {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [mustChange, setMustChange] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      if (!isAuthenticated()) {
        setLoading(false);
        return;
      }

      try {
        const profile = await authAPI.getProfile();
        localStorage.setItem('user', JSON.stringify(profile));
        setMustChange(!!profile.must_change_password);
        setAuthenticated(true);
      } catch (error) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setAuthenticated(false);
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }

  if (mustChange && !bypassPasswordGate) {
    return <Navigate to="/change-password" replace />;
  }

  return children;
};

export default ProtectedRoute;
