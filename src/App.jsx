import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Upload from './pages/Upload';
import Dashboard from './pages/Dashboard';
import Leaderboard from './pages/Leaderboard';
import Rewards from './pages/Rewards';
import Ledger from './pages/Ledger';
import Seed from './pages/Seed';
import StravaCallback from './pages/StravaCallback';
import StravaMockLogin from './pages/StravaMockLogin';
import VerifierDashboard from './pages/VerifierDashboard';

function WithNav({ children }) {
  return <><Navbar />{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<WithNav><Home /></WithNav>} />
          <Route path="/upload" element={<ProtectedRoute><WithNav><Upload /></WithNav></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><WithNav><Dashboard /></WithNav></ProtectedRoute>} />
          <Route path="/leaderboard" element={<ProtectedRoute><WithNav><Leaderboard /></WithNav></ProtectedRoute>} />
          <Route path="/rewards" element={<ProtectedRoute><WithNav><Rewards /></WithNav></ProtectedRoute>} />
          <Route path="/ledger" element={<ProtectedRoute><WithNav><Ledger /></WithNav></ProtectedRoute>} />
          <Route path="/seed" element={<ProtectedRoute><WithNav><Seed /></WithNav></ProtectedRoute>} />
          <Route path="/verify" element={<ProtectedRoute><WithNav><VerifierDashboard /></WithNav></ProtectedRoute>} />
          <Route path="/strava/callback" element={<StravaCallback />} />
          <Route path="/strava-login" element={<StravaMockLogin />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
