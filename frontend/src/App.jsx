import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import VehicleDetail from './pages/VehicleDetail';
import ContactPage from './pages/ContactPage';
import Admin from './pages/Admin';
import TwoFactorSetup from './pages/TwoFactorSetup';
import TwoFactorValidate from './pages/TwoFactorValidate';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#030712' }}>
      <div style={{ color: '#f59e0b', fontSize: '24px' }}>Loading...</div>
    </div>
  );
  return user ? children : <Navigate to="/login" />;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/vehicle/:id" element={<PrivateRoute><VehicleDetail /></PrivateRoute>} />
          <Route path="/contact/:tagId" element={<ContactPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
