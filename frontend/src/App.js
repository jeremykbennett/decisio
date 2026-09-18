import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import ClientForm from './pages/ClientForm';
import ClientDetail from './pages/ClientDetail';
import Campaigns from './pages/Campaigns';
import CampaignForm from './pages/CampaignForm';
import Settings from './pages/Settings';
import CampaignSettings from './pages/CampaignSettings';
import UserManagement from './pages/UserManagement';
import ProtectedRoute from './components/ProtectedRoute';
import { Toaster } from './components/ui/sonner';
import './App.css';

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/clients/new"
            element={
              <ProtectedRoute>
                <ClientForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/clients/:id/edit"
            element={
              <ProtectedRoute>
                <ClientForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/clients/:id"
            element={
              <ProtectedRoute>
                <ClientDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/campaign-settings"
            element={
              <ProtectedRoute>
                <CampaignSettings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/user-management"
            element={
              <ProtectedRoute>
                <UserManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/campaigns"
            element={
              <ProtectedRoute>
                <Campaigns />
              </ProtectedRoute>
            }
          />
          <Route
            path="/clients/:clientId/campaigns/new"
            element={
              <ProtectedRoute>
                <CampaignForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/clients/:clientId/campaigns/:id/edit"
            element={
              <ProtectedRoute>
                <CampaignForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/campaigns/:id/edit"
            element={
              <ProtectedRoute>
                <CampaignForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/campaigns/:id"
            element={
              <ProtectedRoute>
                <CampaignForm />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </div>
  );
}

export default App;
