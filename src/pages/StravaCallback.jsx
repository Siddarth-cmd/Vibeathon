import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { exchangeCodeForToken } from '../utils/stravaAuth';

export default function StravaCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('exchanging'); // exchanging | success | error
  const [error, setError] = useState('');

  useEffect(() => {
    const code = searchParams.get('code');
    const errorParam = searchParams.get('error');

    if (errorParam === 'access_denied') {
      setStatus('error');
      setError('You denied access to Strava. You can try connecting again anytime.');
      setTimeout(() => navigate('/upload'), 3000);
      return;
    }

    if (!code) {
      setStatus('error');
      setError('No authorization code received from Strava.');
      setTimeout(() => navigate('/upload'), 3000);
      return;
    }

    exchangeCodeForToken(code)
      .then(() => {
        setStatus('success');
        setTimeout(() => navigate('/upload', { state: { stravaConnected: true } }), 1800);
      })
      .catch(err => {
        console.error('Strava callback error:', err);
        setStatus('error');
        setError(err.message || 'Failed to connect Strava. Please try again.');
        setTimeout(() => navigate('/upload'), 3000);
      });
  }, []);

  return (
    <div style={{
      minHeight: '100vh', background: '#F5F5F0',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{ textAlign: 'center', maxWidth: 400 }}
      >
        {status === 'exchanging' && (
          <>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              style={{ fontSize: 56, display: 'inline-block', marginBottom: 16 }}
            >⚙️</motion.div>
            <h2 style={{ fontWeight: 900, fontSize: 22, marginBottom: 8 }}>Connecting to Strava...</h2>
            <p style={{ color: '#666', fontWeight: 600 }}>Exchanging authorization tokens</p>
          </>
        )}

        {status === 'success' && (
          <>
            <motion.div
              initial={{ scale: 0 }} animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
              style={{ fontSize: 64, marginBottom: 16 }}
            >🎉</motion.div>
            <div style={{
              background: '#A3E635', border: '3px solid #000',
              borderRadius: 12, padding: '24px 28px',
              boxShadow: '5px 5px 0px #000'
            }}>
              <h2 style={{ fontWeight: 900, fontSize: 22, marginBottom: 8 }}>Strava Connected! 🚴</h2>
              <p style={{ fontWeight: 600 }}>Redirecting to your rides...</p>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{ fontSize: 56, marginBottom: 16 }}>❌</div>
            <div style={{
              background: '#FB7185', border: '3px solid #000',
              borderRadius: 12, padding: '24px 28px',
              boxShadow: '5px 5px 0px #000'
            }}>
              <h2 style={{ fontWeight: 900, fontSize: 20, marginBottom: 8 }}>Connection Failed</h2>
              <p style={{ fontWeight: 600, fontSize: 14 }}>{error}</p>
              <p style={{ fontSize: 12, marginTop: 8, opacity: 0.7 }}>Redirecting back...</p>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
